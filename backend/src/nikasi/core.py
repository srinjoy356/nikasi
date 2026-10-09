"""Pure logic for Nikasi. No AWS calls in here, so every rule is unit-testable.

The model (Rekognition) only supplies labels. Code decides severity, risk, SLAs
and whether a fix is accepted.
"""
import json
import math
import time
import urllib.request
from datetime import datetime, timezone

# label (lowercase) -> weight. Weights are tuned against real drain photos.
BLOCKERS = {
    "garbage": 1.0, "trash": 1.0, "rubbish": 1.0, "waste": 0.9, "litter": 0.9,
    "debris": 0.8, "plastic bag": 0.9, "plastic": 0.6, "plastic wrap": 0.6,
    "bottle": 0.5, "can": 0.4, "tin": 0.4, "mud": 0.5, "soil": 0.4, "dirt road": 0.2,
    "sludge": 0.6, "pollution": 0.5, "leaf": 0.3, "foam": 0.3, "wrapper": 0.6,
}
WATER = {"flood": 1.0, "puddle": 0.8, "water": 0.35, "river": 0.3, "pond": 0.5,
         "swamp": 0.6, "sewage": 0.9}
DRAIN = {"drain", "sewer", "gutter", "manhole", "storm drain", "grate", "culvert", "ditch", "pipe"}

CATEGORY = {  # label -> blockage type shown to the officer
    "garbage": "plastic_litter", "trash": "plastic_litter", "rubbish": "plastic_litter",
    "waste": "plastic_litter", "litter": "plastic_litter", "plastic bag": "plastic_litter",
    "plastic": "plastic_litter", "plastic wrap": "plastic_litter", "bottle": "plastic_litter",
    "can": "plastic_litter", "tin": "plastic_litter", "wrapper": "plastic_litter",
    "mud": "silt", "soil": "silt", "dirt road": "silt", "sludge": "silt", "leaf": "silt",
    "debris": "debris", "pollution": "debris", "foam": "debris",
}
TYPE_EN = {"plastic_litter": "plastic and litter", "silt": "silt and mud",
           "debris": "debris", "standing_water": "standing water", "unclear": "unclear blockage"}
TYPE_HI = {"plastic_litter": "प्लास्टिक और कचरा", "silt": "मिट्टी और गाद",
           "debris": "मलबा", "standing_water": "जल जमाव", "unclear": "अस्पष्ट रुकावट"}

LEVELS = ["Junior Engineer", "Assistant Engineer", "Executive Engineer", "Ward Commissioner"]
MAX_LEVEL = len(LEVELS) - 1


def _dec(x):
    return float(x) if not isinstance(x, (int, float)) else x


def assess(labels):
    """labels: [{'Name': str, 'Confidence': float}] -> assessment dict."""
    contrib, cats, water, drain = [], {}, 0.0, False
    for lb in labels:
        n, c = lb["Name"].lower(), _dec(lb["Confidence"]) / 100.0
        if n in BLOCKERS:
            v = BLOCKERS[n] * c
            contrib.append(v)
            cat = CATEGORY.get(n, "debris")
            cats[cat] = cats.get(cat, 0.0) + v
        if n in WATER:
            water = max(water, WATER[n] * c)
        if n in DRAIN and c >= 0.5:
            drain = True
    contrib.sort(reverse=True)
    block = min(1.0, sum(contrib[:4]) / 2.0)
    raw = block + 0.35 * water
    sev = 1 if raw < 0.15 else 2 if raw < 0.35 else 3 if raw < 0.6 else 4 if raw < 0.85 else 5
    if cats:
        btype = max(cats, key=cats.get)
    else:
        btype = "standing_water" if water >= 0.3 else "unclear"
    top = sorted(((l["Name"], round(_dec(l["Confidence"]), 1)) for l in labels), key=lambda t: -t[1])[:8]
    return {"severity": sev, "blockScore": round(block, 3), "standing": round(water, 3),
            "blockType": btype, "drainContext": drain, "topLabels": top}


VLM_TYPES = {"plastic_litter", "silt", "debris", "standing_water", "none"}


def parse_vlm(raw):
    """Validate the vision model's JSON. Returns a clean dict or None if unusable."""
    try:
        d = raw if isinstance(raw, dict) else json.loads(raw)
        sev = int(d["severity"])
        btype = str(d.get("blockage", "none"))
        if not 1 <= sev <= 5 or btype not in VLM_TYPES:
            return None
        return {"severity": sev, "blockage": btype, "blocked": bool(d.get("blocked", sev >= 3)),
                "water": bool(d.get("water_standing", False)), "summary": str(d.get("summary", ""))[:200]}
    except Exception:
        return None


_LITTER = ("garbage", "trash", "rubbish", "litter", "plastic", "waste", "bottle", "bags", "debris", "dump", "polluted", "wrapper")
_SILT = ("mud", "silt", "sand", "soil", "dirt", "sludge", "muddy")
_WATER = ("water", "puddle", "flood", "stagnant", "overflow", "sewage", "canal", "river", "pond", "wet")
_BLOCKED = ("block", "clog", "choke", "jam", "stuck", "overflow", "full of")


_DRAIN_WORDS = ("drain", "gutter", "sewer", "manhole", "canal", "nala", "street", "road", "alley", "lane",
                "pavement", "gully", "culvert", "ditch", "garbage", "puddle", "flood", "water", "river")


def vlm_from_caption(text):
    """The vision model writes one plain sentence; we read it for signals.
    Small models are unreliable at scoring but good at describing, so code does the judging."""
    t = (text or "").lower().strip()
    if not t:
        return None
    litter, silt = any(w in t for w in _LITTER), any(w in t for w in _SILT)
    water, blocked = any(w in t for w in _WATER), any(w in t for w in _BLOCKED)
    sev = max(1, min(5, 1 + (2 if litter else 0) + (1 if silt else 0) + (1 if blocked else 0) + (1 if water else 0)))
    kind = "plastic_litter" if litter else "silt" if silt else "standing_water" if water else "none"
    return {"severity": sev, "blockage": kind, "blocked": blocked or sev >= 4, "water": water, "summary": text.strip()[:200]}


def combine(rek, vlm):
    """Final assessment. The vision model leads; Rekognition is the second opinion."""
    out = dict(rek)
    out["sources"] = {"rekognition": rek["severity"], "vlm": vlm["severity"] if vlm else None}
    if vlm:
        out["severity"] = max(1, min(5, round(0.5 * vlm["severity"] + 0.5 * rek["severity"])))
        if vlm["blockage"] != "none":
            out["blockType"] = vlm["blockage"]
        elif vlm["water"]:
            out["blockType"] = "standing_water"
        out["summary"] = vlm["summary"]
        out["standing"] = max(out["standing"], 0.8 if vlm["water"] else 0.0)
    out["blockScore"] = round((out["severity"] - 1) / 4.0, 3)
    cap = ((vlm or {}).get("summary") or "").lower()
    out["drainLikely"] = bool(rek.get("drainContext")) or out["severity"] >= 3 or any(w in cap for w in _DRAIN_WORDS)
    return out


def haversine_m(lat1, lng1, lat2, lng2):
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def cluster_count(items, lat, lng, exclude_id=None, radius_m=300):
    n = 0
    for it in items:
        if it.get("reportId") == exclude_id or str(it.get("status", "")).startswith(("CLOSED", "FAILED")):
            continue
        if haversine_m(lat, lng, _dec(it["lat"]), _dec(it["lng"])) <= radius_m:
            n += 1
    return n


def risk_score(severity, rain_mm, clusters):
    rain = min(1.0, (rain_mm or 0.0) / 60.0)
    clus = min(1.0, clusters / 5.0)
    return int(round(100 * (0.45 * severity / 5.0 + 0.35 * rain + 0.20 * clus)))


def sla(risk, scale=1.0):
    """(dispatch_seconds, fix_seconds). scale<1 shrinks timers for demos."""
    hours = 6 if risk >= 75 else 24 if risk >= 50 else 72
    fix = max(60, int(hours * 3600 * scale))
    return max(30, fix // 4), fix


def rain_forecast(lat, lng, timeout=4):
    """Millimetres expected in the next 48 hours from Open-Meteo. None if unreachable."""
    url = ("https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s"
           "&hourly=precipitation&forecast_days=3&timezone=UTC" % (lat, lng))
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            h = json.load(r)["hourly"]
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00")
        i = h["time"].index(now) if now in h["time"] else 0
        window = [x or 0.0 for x in h["precipitation"][i:i + 48]]
        return round(sum(window), 1)
    except Exception:
        return None


def verify_after(before, after, before_geo, after_geo, dispatched_at, after_at, max_m=75):
    """Three independent checks. All must pass for a ticket to close."""
    b_block, a_block = _dec(before["blockScore"]), _dec(after["blockScore"])
    cleared = after["severity"] <= 1 or before["severity"] - after["severity"] >= 2
    if after_geo and before_geo:
        dist = haversine_m(_dec(before_geo[0]), _dec(before_geo[1]), _dec(after_geo[0]), _dec(after_geo[1]))
        at_place, dist_txt = dist <= max_m, "%d m from the reported spot" % dist
    else:
        at_place, dist_txt = False, "no location on the after-photo"
    fresh = after_at > dispatched_at
    checks = {
        "cleared": {"ok": bool(cleared), "detail": "severity %s of 5 before, %s of 5 after"
                    % (before["severity"], after["severity"])},
        "atPlace": {"ok": bool(at_place), "detail": dist_txt},
        "afterDispatch": {"ok": bool(fresh), "detail": "photo taken %s the dispatch" % ("after" if fresh else "before")},
    }
    return {"verified": all(c["ok"] for c in checks.values()), "checks": checks}


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse_iso(s):
    return datetime.fromisoformat(s).timestamp()


def briefing(items, lang="en", limit=3):
    """Plain-language morning brief for the officer, built from ranked tickets."""
    open_items = [i for i in items if not str(i.get("status", "")).startswith(("CLOSED", "FAILED"))]
    open_items.sort(key=lambda i: -_dec(i.get("risk", 0)))
    top = open_items[:limit]
    rain = max([_dec(i.get("rainMm") or 0) for i in open_items] or [0])
    if lang == "hi":
        t = ["नमस्ते। अगले अड़तालीस घंटों में %d मिलीमीटर बारिश की संभावना है। "
             "अभी %d नालियाँ खुली हैं। सबसे ज़रूरी %d ये हैं।" % (rain, len(open_items), len(top))]
        for n, i in enumerate(top, 1):
            t.append("नंबर %d: रिपोर्ट %s, %s, गंभीरता पाँच में से %d।"
                     % (n, i["reportId"][:4], TYPE_HI.get(i.get("blockType"), ""), i.get("severity", 0)))
        t.append("कृपया पहले इन्हीं की सफाई करवाएँ।" if top else "अभी कोई खुली नाली नहीं है।")
        return " ".join(t)
    t = ["Good morning. About %d millimetres of rain are forecast over the next 48 hours, "
         "and %d drains are open. These %d come first." % (rain, len(open_items), len(top))]
    for n, i in enumerate(top, 1):
        t.append("Number %d: report %s, %s, severity %d of 5, risk %d."
                 % (n, i["reportId"][:4], TYPE_EN.get(i.get("blockType"), ""), i.get("severity", 0), _dec(i.get("risk", 0))))
    t.append("Please clear these before the rain." if top else "No open drains right now.")
    return " ".join(t)
