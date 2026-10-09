import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from nikasi import core  # noqa: E402


def L(**kw):
    return [{"Name": k.replace("_", " ").title(), "Confidence": v} for k, v in kw.items()]


def test_clean_drain_is_low_severity():
    a = core.assess(L(drain=95, road=90, grate=80))
    assert a["severity"] == 1 and a["drainContext"] is True


def test_garbage_drain_is_high_severity_plastic():
    a = core.assess(L(garbage=98, plastic_bag=92, litter=90, drain=88))
    assert a["severity"] >= 4 and a["blockType"] == "plastic_litter"


def test_standing_water_counts():
    a = core.assess(L(flood=90, puddle=80))
    assert a["blockType"] == "standing_water" and a["severity"] >= 2


def test_risk_rises_with_rain_and_clusters():
    base = core.risk_score(3, 0, 0)
    assert core.risk_score(3, 60, 0) > base
    assert core.risk_score(3, 0, 5) > base
    assert 0 <= core.risk_score(5, 100, 9) <= 100


def test_sla_scales_for_demo():
    d, f = core.sla(90, 1.0)
    assert f == 6 * 3600 and d == f // 4
    d, f = core.sla(90, 0.005)
    assert f == 108 and d >= 30


def test_cluster_ignores_closed_and_far():
    items = [{"reportId": "a", "lat": 28.75, "lng": 77.12, "status": "AWAITING_FIX"},
             {"reportId": "b", "lat": 28.75, "lng": 77.12, "status": "CLOSED_VERIFIED"},
             {"reportId": "c", "lat": 28.90, "lng": 77.12, "status": "AWAITING_FIX"}]
    assert core.cluster_count(items, 28.7501, 77.1201) == 1


def test_verify_passes_only_when_all_three_hold():
    before = core.assess(L(garbage=98, litter=90, plastic_bag=90))
    after = core.assess(L(drain=95, road=90))
    ok = core.verify_after(before, after, (28.75, 77.12), (28.7501, 77.1201), 100.0, 200.0)
    assert ok["verified"]
    far = core.verify_after(before, after, (28.75, 77.12), (28.76, 77.13), 100.0, 200.0)
    assert not far["verified"] and not far["checks"]["atPlace"]["ok"]
    stale = core.verify_after(before, after, (28.75, 77.12), (28.75, 77.12), 300.0, 200.0)
    assert not stale["checks"]["afterDispatch"]["ok"]
    still = core.verify_after(before, before, (28.75, 77.12), (28.75, 77.12), 100.0, 200.0)
    assert not still["checks"]["cleared"]["ok"]


def test_no_after_location_fails_place_check():
    before = core.assess(L(garbage=98))
    after = core.assess(L(drain=95))
    r = core.verify_after(before, after, (28.75, 77.12), None, 1.0, 2.0)
    assert not r["verified"]


def test_briefing_both_languages():
    items = [{"reportId": "abcd1234", "risk": 80, "severity": 4, "blockType": "plastic_litter",
              "status": "AWAITING_FIX", "rainMm": 40}]
    assert "plastic and litter" in core.briefing(items, "en")
    assert "प्लास्टिक" in core.briefing(items, "hi")
