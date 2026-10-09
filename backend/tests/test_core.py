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


def test_parse_vlm_accepts_valid_and_rejects_junk():
    ok = core.parse_vlm('{"severity": 4, "blockage": "plastic_litter", "blocked": true, "summary": "full of bags"}')
    assert ok and ok["severity"] == 4
    assert core.parse_vlm("not json") is None
    assert core.parse_vlm('{"severity": 9, "blockage": "none"}') is None
    assert core.parse_vlm('{"severity": 2, "blockage": "lava"}') is None


def test_combine_vlm_leads_but_rekognition_counts():
    rek = core.assess(L(drain=90))                      # severity 1
    vlm = core.parse_vlm({"severity": 5, "blockage": "plastic_litter", "blocked": True, "summary": "x"})
    c = core.combine(rek, vlm)
    assert c["severity"] == 3 and c["blockType"] == "plastic_litter"  # 0.5*5 + 0.5*1 = 3
    assert core.combine(rek, None)["severity"] == 1


def test_clearing_rule_needs_real_improvement():
    two = {"severity": 2, "blockScore": 0.25}
    three = {"severity": 3, "blockScore": 0.5}
    one = {"severity": 1, "blockScore": 0.0}
    g = ((1, 1), (1, 1), 1.0, 2.0)
    assert core.verify_after(three, one, *g)["verified"]
    assert not core.verify_after(three, two, *g)["verified"]
    assert core.verify_after(two, one, *g)["verified"]


def test_caption_reading():
    dirty = core.vlm_from_caption("A polluted river with garbage floating in it.")
    assert dirty["severity"] >= 4 and dirty["blockage"] == "plastic_litter"
    car = core.vlm_from_caption("A black car is parked next to a puddle on the street.")
    assert car["severity"] == 2 and car["blockage"] == "standing_water"
    clean = core.vlm_from_caption("A clean paved street with a drain cover.")
    assert clean["severity"] == 1 and clean["blockage"] == "none"
    assert core.vlm_from_caption("") is None


def test_flags_photos_that_do_not_look_like_a_drain():
    nope = core.combine(core.assess(L(person=90)), core.vlm_from_caption("A mosaic of coloured blocks."))
    assert nope["drainLikely"] is False
    yes = core.combine(core.assess(L(drain=80)), core.vlm_from_caption("A wet street with a car."))
    assert yes["drainLikely"] is True
    assert core.combine(core.assess(L(person=90)), None)["drainLikely"] is False
