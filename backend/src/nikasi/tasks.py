"""Step Functions task handlers. One Lambda, one action per state."""
import base64
import json
import os
import time
import urllib.request

import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

from . import core, store

rek = boto3.client("rekognition")
sns = boto3.client("sns")


REGION = os.environ.get("AWS_REGION", "us-east-1")
s3 = boto3.client("s3")

PROMPT = "Describe this photo in one sentence."


def vlm_call(path, payload=None, timeout=100):
    """Signed call to the vision-model Lambda (function URL, IAM auth). payload=None means GET."""
    url = os.environ["VLM_URL"].rstrip("/") + path
    body = json.dumps(payload).encode() if payload is not None else None
    req = AWSRequest(method="POST" if body else "GET", url=url, data=body,
                     headers={"Content-Type": "application/json"} if body else {})
    SigV4Auth(boto3.Session().get_credentials().get_frozen_credentials(), "lambda", REGION).add_auth(req)
    r = urllib.request.Request(url, data=body, headers=dict(req.headers), method=req.method)
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.load(resp)


def read_with_vlm(key):
    """Ask the open-weight vision model for a one-sentence description. Never raises: None if unavailable."""
    if not os.environ.get("VLM_URL"):
        return None
    try:
        img = s3.get_object(Bucket=os.environ["BUCKET"], Key=key)["Body"].read()
        mime = "image/png" if key.endswith(".png") else "image/jpeg"
        out = vlm_call("/v1/chat/completions", {
            "messages": [{"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": "data:%s;base64,%s" % (mime, base64.b64encode(img).decode())}},
                {"type": "text", "text": PROMPT}]}],
            "max_tokens": 60, "temperature": 0, "cache_prompt": True})
        return core.vlm_from_caption(out["choices"][0]["message"]["content"])
    except Exception as e:
        print("vlm unavailable:", repr(e))
        return None


def detect(key):
    r = rek.detect_labels(Image={"S3Object": {"Bucket": os.environ["BUCKET"], "Name": key}},
                          MaxLabels=40, MinConfidence=50)
    return core.combine(core.assess(r["Labels"]), read_with_vlm(key))


def warm(e):
    """Keep the vision model's Lambda warm so triage is fast when a report arrives."""
    try:
        vlm_call("/health", timeout=60)
        return {"warm": True}
    except Exception as ex:
        return {"warm": False, "error": repr(ex)}


def triage(e):
    rid = e["reportId"]
    item = store.get(rid)
    a = detect(item["photoKey"])
    sim = item.get("simulatedRainMm")
    rain = sim if sim is not None else core.rain_forecast(item["lat"], item["lng"])
    clusters = core.cluster_count(store.all_items(), item["lat"], item["lng"], exclude_id=rid)
    risk = core.risk_score(a["severity"], rain, clusters)
    d, f = core.sla(risk, float(e.get("slaScale", 1.0)))
    store.update(rid, assessment=a, severity=a["severity"], blockType=a["blockType"],
                 rainMm=rain if rain is not None else 0, rainSource="simulated" if sim is not None
                 else ("forecast" if rain is not None else "unavailable"),
                 clusterCount=clusters, risk=risk, dispatchSla=d, fixSla=f, level=0)
    src = a.get("sources", {})
    store.log(rid, "Triaged", "severity %d/5 (vision model %s, Rekognition %s), %s, rain %s mm, %d nearby, risk %d. %s"
              % (a["severity"], src.get("vlm"), src.get("rekognition"), core.TYPE_EN[a["blockType"]], rain,
                 clusters, risk, a.get("summary", "")))
    return {"risk": risk, "severity": a["severity"], "dispatchSla": d, "fixSla": f}


def register_wait(e):
    rid, phase, secs = e["reportId"], e["phase"], int(e["timeoutSeconds"])
    status = "AWAITING_DISPATCH" if phase == "dispatch" else "AWAITING_FIX"
    due = core.datetime.fromtimestamp(time.time() + secs, core.timezone.utc).isoformat(timespec="seconds")
    store.update(rid, status=status, taskToken=e["token"], phase=phase, dueAt=due, level=int(e.get("level", 0)))
    who = core.LEVELS[min(int(e.get("level", 0)), core.MAX_LEVEL)]
    store.log(rid, "Waiting for dispatch" if phase == "dispatch" else "Waiting for the fix",
              "owner: %s, due %s" % (who, due))


def escalate(e):
    rid, level = e["reportId"], int(e["level"])
    new = min(level + 1, core.MAX_LEVEL)
    who = core.LEVELS[new]
    store.update(rid, level=new)
    store.log(rid, "Escalated to %s" % who, e["reason"])
    topic = os.environ.get("TOPIC_ARN")
    if topic:
        sns.publish(TopicArn=topic, Subject="Nikasi: report %s escalated to %s" % (rid[:4], who),
                    Message="Report %s was escalated to %s.\nReason: %s\n" % (rid, who, e["reason"]))
    return new


def verify(e):
    rid = e["reportId"]
    item = store.get(rid)
    store.update(rid, status="VERIFYING")
    after = detect(item["afterKey"])
    res = core.verify_after(item["assessment"], after, (item["lat"], item["lng"]), item.get("afterGeo"),
                            core.parse_iso(item["dispatchedAt"]), core.parse_iso(item["afterAt"]))
    store.update(rid, verification=res, afterAssessment=after)
    c = res["checks"]
    store.log(rid, "Verified: fix accepted" if res["verified"] else "Verification failed: fix rejected",
              "; ".join("%s: %s (%s)" % (k, "ok" if v["ok"] else "FAIL", v["detail"]) for k, v in c.items()))
    return res


def close(e):
    rid = e["reportId"]
    status = "CLOSED_VERIFIED" if e["outcome"] == "verified" else "FAILED"
    store.update(rid, status=status, closedAt=core.now_iso(), taskToken="")
    store.log(rid, "Ticket closed" if status == "CLOSED_VERIFIED" else "Ticket left open: unresolved after escalation")
    return {"status": status}


ACTIONS = {"warm": warm, "triage": triage, "registerWait": register_wait, "escalate": escalate,
           "verify": verify, "close": close}


def handler(event, context):
    return ACTIONS[event["action"]](event)
