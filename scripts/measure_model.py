"""Measure the deployed vision model three ways on a few photos: as a JSON scorer, as a yes/no oracle, as a describer.

This is the measurement behind the blog's claim that the model is a poor judge and a good describer.

usage: AWS_PROFILE=nikasi uv run --with boto3 --with "botocore[crt]" --with pillow python scripts/measure_model.py PHOTO... > out.json
"""
import base64
import io
import json
import sys
import time
import urllib.request

import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from PIL import Image

REGION = "us-east-1"
SCORER = ("You are a drainage inspector looking at a photo from a citizen. Judge only the street drain, gutter or nala in the "
          "photo. Reply with JSON only: severity 1 to 5 (1 = clear and flowing, 3 = half blocked, 5 = fully blocked or "
          "overflowing), blockage one of plastic_litter, silt, debris, standing_water, none, blocked true or false, "
          "water_standing true or false, summary one short plain sentence.")
SCHEMA = {"type": "object", "properties": {
    "severity": {"type": "integer", "minimum": 1, "maximum": 5},
    "blockage": {"type": "string", "enum": ["plastic_litter", "silt", "debris", "standing_water", "none"]},
    "blocked": {"type": "boolean"}, "water_standing": {"type": "boolean"}, "summary": {"type": "string"}},
    "required": ["severity", "blockage", "blocked", "water_standing", "summary"]}
YESNO = {"garbage": "Is there garbage, plastic bags, bottles or litter visible? Answer only yes or no.",
         "mud": "Is there mud, silt, sand or soil piled on or around a drain or gutter? Answer only yes or no.",
         "water": "Is there standing or stagnant water on the ground? Answer only yes or no."}
DESCRIBE = "Describe this photo in one sentence."

session = boto3.Session()
URL = next(session.client("lambda", region_name=REGION).get_function_url_config(FunctionName=f["FunctionName"])["FunctionUrl"]
           for f in session.client("lambda", region_name=REGION).list_functions()["Functions"] if "VisionModelFn" in f["FunctionName"]).rstrip("/")


def call(path, body=None, timeout=300):
    data = json.dumps(body).encode() if body is not None else None
    req = AWSRequest(method="POST" if data else "GET", url=URL + path, data=data, headers={"Content-Type": "application/json"} if data else {})
    SigV4Auth(session.get_credentials().get_frozen_credentials(), "lambda", REGION).add_auth(req)
    r = urllib.request.Request(URL + path, data=data, headers=dict(req.headers), method=req.method)
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.load(resp)


def ask(img_b64, text, tokens, extra=None):
    body = {"messages": [{"role": "user", "content": [
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + img_b64}}, {"type": "text", "text": text}]}],
        "max_tokens": tokens, "temperature": 0, "cache_prompt": True, **(extra or {})}
    t = time.time()
    out = call("/v1/chat/completions", body)["choices"][0]["message"]["content"].strip()
    return out, round(time.time() - t, 1)


results = []
print("warming the model (a cold start can take 2 minutes)...", file=sys.stderr)
call("/health", timeout=300)
for path in sys.argv[1:]:
    im = Image.open(path).convert("RGB")
    im.thumbnail((512, 512))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode()
    row = {"photo": path.replace("\\", "/").split("/")[-1]}
    row["describe"], row["describe_s"] = ask(b64, DESCRIBE, 60)
    raw, _ = ask(b64, SCORER, 200, {"response_format": {"type": "json_object", "schema": SCHEMA}})
    try:
        d = json.loads(raw)
        row["scorer"] = {k: d[k] for k in ("severity", "blockage", "blocked", "water_standing")}
    except Exception:
        row["scorer"] = {"error": raw[:80]}
    row["yesno"] = {k: ask(b64, q, 3)[0].strip(". ").lower() for k, q in YESNO.items()}
    results.append(row)
    print(row["photo"], row["scorer"], row["yesno"], "|", row["describe"], file=sys.stderr)
print(json.dumps(results, indent=2, ensure_ascii=False))
