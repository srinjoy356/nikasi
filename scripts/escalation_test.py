"""Creates a report nobody dispatches, with fast timers, and prints each escalation as it happens."""
import json, sys, time, urllib.request
from pathlib import Path
exec(open(Path(__file__).with_name("smoke.py")).read().split("def main")[0])  # reuse call/put helpers

img = sys.argv[1]
up = call("POST", "/upload-url", {"kind": "before", "contentType": "image/jpeg"})
put(up["url"], img)
r = call("POST", "/reports", {"reportId": up["reportId"], "photoKey": up["key"], "lat": 28.7502, "lng": 77.1183,
                              "note": "escalation test", "simulatedRainMm": 70, "slaScale": 0.005})
rid, last = r["reportId"], None
t0 = time.time()
while time.time() - t0 < 300:
    r = call("GET", "/reports/" + rid)
    cur = (r["status"], r.get("levelName"))
    if cur != last:
        print("%3ds  %-18s owner: %s" % (time.time() - t0, *cur)); last = cur
    if r["status"] in ("FAILED", "CLOSED_VERIFIED"):
        break
    time.sleep(2)
print("timeline:"); [print("  ", e["t"][11:19], e["event"], "|", e["detail"][:80]) for e in r["timeline"]]
