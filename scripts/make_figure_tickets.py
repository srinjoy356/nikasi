"""Creates two tickets from the CC0 Newark drain pair, for the blog figures: one fix accepted, one fix rejected.

The rejected case re-submits the BEFORE photo as the after-photo, which is what a crew that did not clear the drain would send.
usage: python make_figure_tickets.py [LAT LNG]
"""
import sys
import time
from pathlib import Path

g = {"__file__": str(Path(__file__).resolve())}
exec(open(Path(__file__).with_name("smoke.py")).read().split("def main")[0], g)
call, put, wait = g["call"], g["put"], g["wait"]

PAIR = Path(__file__).resolve().parents[1] / "demo-photos" / "pair"
BEFORE, AFTER = PAIR / "newark-drain-before.jpg", PAIR / "newark-drain-after.jpg"
lat, lng = (float(sys.argv[1]), float(sys.argv[2])) if len(sys.argv) > 2 else (28.7512, 77.1148)


def run(after_photo, dlat):
    up = call("POST", "/upload-url", {"kind": "before", "contentType": "image/jpeg"})
    put(up["url"], BEFORE)
    la = lat + dlat
    r = call("POST", "/reports", {"reportId": up["reportId"], "photoKey": up["key"], "lat": la, "lng": lng, "note": "", "simulatedRainMm": 58})
    rid = r["reportId"]
    wait(rid, {"AWAITING_DISPATCH"})
    call("POST", "/reports/%s/dispatch" % rid, {"crew": "Ward crew A"})
    wait(rid, {"AWAITING_FIX"})
    a = call("POST", "/upload-url", {"kind": "after", "reportId": rid, "contentType": "image/jpeg"})
    put(a["url"], after_photo)
    call("POST", "/reports/%s/after-photo" % rid, {"key": a["key"], "lat": la, "lng": lng})
    res = wait(rid, {"CLOSED_VERIFIED", "AWAITING_FIX"}, 300)
    print(rid, res["status"], {k: v["ok"] for k, v in res["verification"]["checks"].items()}, flush=True)
    return rid


print("verified:", run(AFTER, 0.0))
time.sleep(5)
print("rejected:", run(BEFORE, 0.0015))
