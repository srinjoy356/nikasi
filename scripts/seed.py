"""Fill the demo with reports from a folder of real drain photos, through the public API (same path a citizen uses).

usage: python seed.py PHOTO_DIR LAT LNG [--rain MM] [--fast]
Photos are spread within ~400 m of LAT,LNG. Use your own photos: every report is a real triage run.
"""
import json
import random
import sys
from pathlib import Path

exec(open(Path(__file__).with_name("smoke.py")).read().split("def main")[0])  # call(), put()

args = [a for a in sys.argv[1:] if not a.startswith("--")]
folder, lat, lng = Path(args[0]), float(args[1]), float(args[2])
rain = float(sys.argv[sys.argv.index("--rain") + 1]) if "--rain" in sys.argv else None
scale = 0.005 if "--fast" in sys.argv else 1.0
random.seed(7)
for img in sorted(p for p in folder.iterdir() if p.suffix.lower() in (".jpg", ".jpeg")):
    up = call("POST", "/upload-url", {"kind": "before", "contentType": "image/jpeg"})
    put(up["url"], img)
    body = {"reportId": up["reportId"], "photoKey": up["key"], "slaScale": scale, "note": "",
            "lat": lat + random.uniform(-0.0035, 0.0035), "lng": lng + random.uniform(-0.0035, 0.0035)}
    if rain is not None:
        body["simulatedRainMm"] = rain
    r = call("POST", "/reports", body)
    print(img.name, "->", r.get("reportId"), r.get("status"), r.get("_error", ""))
