"""End-to-end test against the deployed API: report -> triage -> dispatch -> after-photo -> verify.

usage: python smoke.py BEFORE.jpg AFTER.jpg [lat lng] [--fast]
"""
import json
import sys
import time
import urllib.request
from pathlib import Path

OUT = json.load(open(Path(__file__).resolve().parents[1] / "cdk-outputs.json"))["Nikasi"]
API = OUT["ApiUrl"].rstrip("/")


def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {"_error": e.code, **json.loads(e.read() or b"{}")}


def put(url, path):
    req = urllib.request.Request(url, method="PUT", data=Path(path).read_bytes(), headers={"Content-Type": "image/jpeg"})
    urllib.request.urlopen(req, timeout=60).read()


def wait(rid, statuses, secs=240):
    t0 = time.time()
    while time.time() - t0 < secs:
        r = call("GET", "/reports/" + rid)
        if r.get("status") in statuses:
            return r
        time.sleep(3)
    raise SystemExit("timed out waiting for %s; last status %s" % (statuses, r.get("status")))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    before, after = args[0], args[1]
    lat, lng = (float(args[2]), float(args[3])) if len(args) > 3 else (28.7499, 77.1180)
    up = call("POST", "/upload-url", {"kind": "before", "contentType": "image/jpeg"})
    put(up["url"], before)
    r = call("POST", "/reports", {"reportId": up["reportId"], "photoKey": up["key"], "lat": lat, "lng": lng,
                                  "note": "smoke test", "simulatedRainMm": 55, "slaScale": 1.0})
    rid = r["reportId"]
    print("created", rid)
    r = wait(rid, {"AWAITING_DISPATCH"})
    print("triaged: severity", r["severity"], "risk", r["risk"], r["blockType"], "| owner:", r["levelName"])
    print("  reads:", r["assessment"].get("summary"), r["assessment"].get("sources"))
    print("dispatch ->", call("POST", "/reports/%s/dispatch" % rid, {"crew": "Smoke crew"}).get("status"))
    r = wait(rid, {"AWAITING_FIX"})
    up2 = call("POST", "/upload-url", {"kind": "after", "reportId": rid, "contentType": "image/jpeg"})
    put(up2["url"], after)
    print("after-photo ->", call("POST", "/reports/%s/after-photo" % rid, {"key": up2["key"], "lat": lat, "lng": lng}).get("status"))
    r = wait(rid, {"CLOSED_VERIFIED", "FAILED", "AWAITING_FIX"})
    print("result:", r["status"], "| verified:", r["verification"]["verified"])
    for k, c in r["verification"]["checks"].items():
        print("  ", "ok " if c["ok"] else "FAIL", k, "-", c["detail"])
    print("timeline:")
    for e in r["timeline"]:
        print("  ", e["t"][11:19], e["event"], "|", e["detail"][:110])


main()
