"""HTTP API behind API Gateway. CORS is configured on the gateway, not here."""
import hashlib
import json
import os
import statistics
import uuid

import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.event_handler.exceptions import BadRequestError, NotFoundError
from botocore.config import Config
from botocore.exceptions import ClientError

from . import core, store

log = Logger(service="nikasi-api")
app = APIGatewayHttpResolver()
REGION = os.environ.get("AWS_REGION", "us-east-1")
BUCKET = os.environ["BUCKET"]
s3 = boto3.client("s3", region_name=REGION, endpoint_url="https://s3.%s.amazonaws.com" % REGION,
                  config=Config(signature_version="s3v4"))
sfn = boto3.client("stepfunctions")
polly = boto3.client("polly")
EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def presign_get(key, secs=3600):
    return s3.generate_presigned_url("get_object", Params={"Bucket": BUCKET, "Key": key}, ExpiresIn=secs) if key else None


def public(item):
    """Item as the client sees it: no task token, photos as signed URLs."""
    out = {k: v for k, v in item.items() if k != "taskToken"}
    out["photoUrl"] = presign_get(item.get("photoKey"))
    out["afterUrl"] = presign_get(item.get("afterKey"))
    out["levelName"] = core.LEVELS[min(int(item.get("level", 0)), core.MAX_LEVEL)]
    return out


def need(body, *keys):
    miss = [k for k in keys if body.get(k) in (None, "")]
    if miss:
        raise BadRequestError("missing: " + ", ".join(miss))


@app.post("/upload-url")
def upload_url():
    b = app.current_event.json_body or {}
    ctype = b.get("contentType", "image/jpeg")
    if ctype not in EXT:
        raise BadRequestError("unsupported image type")
    kind = b.get("kind", "before")
    rid = b.get("reportId") or uuid.uuid4().hex[:10]
    key = "photos/%s/%s.%s" % (rid, kind, EXT[ctype])
    url = s3.generate_presigned_url("put_object", Params={"Bucket": BUCKET, "Key": key, "ContentType": ctype}, ExpiresIn=600)
    return {"reportId": rid, "key": key, "url": url, "contentType": ctype}


@app.post("/reports")
def create_report():
    b = app.current_event.json_body or {}
    need(b, "reportId", "photoKey", "lat", "lng")
    if store.get(b["reportId"]):
        raise BadRequestError("report already exists")
    try:
        s3.head_object(Bucket=BUCKET, Key=b["photoKey"])
    except ClientError:
        raise BadRequestError("photo not uploaded")
    item = {"reportId": b["reportId"], "createdAt": core.now_iso(), "status": "NEW",
            "lat": float(b["lat"]), "lng": float(b["lng"]), "note": (b.get("note") or "")[:300],
            "photoKey": b["photoKey"], "level": 0, "timeline": []}
    if b.get("simulatedRainMm") is not None:
        item["simulatedRainMm"] = float(b["simulatedRainMm"])
    store.put(item)
    store.log(item["reportId"], "Reported by citizen", item["note"])
    sfn.start_execution(stateMachineArn=os.environ["STATE_MACHINE_ARN"], name=item["reportId"],
                        input=json.dumps({"reportId": item["reportId"], "slaScale": float(b.get("slaScale", 1.0))}))
    return public(store.get(item["reportId"]))


@app.get("/reports")
def list_reports():
    items = store.all_items()
    open_ = sorted([i for i in items if not i["status"].startswith(("CLOSED", "FAILED"))], key=lambda i: -i.get("risk", 0))
    done = sorted([i for i in items if i["status"].startswith(("CLOSED", "FAILED"))], key=lambda i: i.get("closedAt", ""), reverse=True)
    return {"reports": [public(i) for i in open_ + done]}


@app.get("/reports/<rid>")
def get_report(rid: str):
    item = store.get(rid)
    if not item:
        raise NotFoundError("no such report")
    return public(item)


def callback(rid, expect, output, updates):
    item = store.get(rid)
    if not item:
        raise NotFoundError("no such report")
    if item["status"] != expect or not item.get("taskToken"):
        raise BadRequestError("report is not waiting for this step (status %s)" % item["status"])
    store.update(rid, **updates)
    try:
        sfn.send_task_success(taskToken=item["taskToken"], output=json.dumps(output))
    except ClientError as e:
        raise BadRequestError("the workflow already moved on: %s" % e.response["Error"]["Code"])
    return public(store.get(rid))


@app.post("/reports/<rid>/dispatch")
def dispatch(rid: str):
    b = app.current_event.json_body or {}
    crew = (b.get("crew") or "Ward crew A")[:60]
    r = callback(rid, "AWAITING_DISPATCH", {"crew": crew},
                 {"crew": crew, "dispatchedAt": core.now_iso(), "status": "DISPATCHED"})
    store.log(rid, "Dispatched", "approved by officer, crew: " + crew)
    return r


@app.post("/reports/<rid>/after-photo")
def after_photo(rid: str):
    b = app.current_event.json_body or {}
    need(b, "key")
    geo = [float(b["lat"]), float(b["lng"])] if b.get("lat") is not None and b.get("lng") is not None else None
    r = callback(rid, "AWAITING_FIX", {"submitted": True},
                 {"afterKey": b["key"], "afterGeo": geo, "afterAt": core.now_iso(), "status": "VERIFYING"})
    store.log(rid, "After-photo submitted by crew")
    return r


@app.get("/stats")
def stats():
    items = store.all_items()
    done = [i for i in items if i["status"] == "CLOSED_VERIFIED"]
    hrs = [(core.parse_iso(i["closedAt"]) - core.parse_iso(i["createdAt"])) / 3600 for i in done if i.get("closedAt")]
    esc = sum(1 for i in items if int(i.get("level", 0)) > 0)
    return {"total": len(items), "open": sum(1 for i in items if not i["status"].startswith(("CLOSED", "FAILED"))),
            "verified": len(done), "escalated": esc,
            "medianHoursToVerified": round(statistics.median(hrs), 2) if hrs else None}


@app.get("/briefing")
def briefing():
    lang = app.current_event.get_query_string_value("lang", "en")
    return {"lang": lang, "text": core.briefing(store.all_items(), lang)}


@app.post("/briefing/audio")
def briefing_audio():
    lang = (app.current_event.json_body or {}).get("lang", "en")
    text = core.briefing(store.all_items(), lang)
    key = "audio/%s.mp3" % hashlib.sha1((lang + text).encode()).hexdigest()[:16]
    try:
        s3.head_object(Bucket=BUCKET, Key=key)
    except ClientError:
        r = polly.synthesize_speech(Text=text, VoiceId="Kajal", Engine="neural", OutputFormat="mp3",
                                    LanguageCode="hi-IN" if lang == "hi" else "en-IN")
        s3.put_object(Bucket=BUCKET, Key=key, Body=r["AudioStream"].read(), ContentType="audio/mpeg")
    return {"text": text, "url": presign_get(key, 600)}


def handler(event, context):
    return app.resolve(event, context)
