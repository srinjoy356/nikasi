"""Step Functions task handlers. One Lambda, one action per state."""
import os
import time

import boto3

from . import core, store

rek = boto3.client("rekognition")
sns = boto3.client("sns")


def detect(key):
    r = rek.detect_labels(Image={"S3Object": {"Bucket": os.environ["BUCKET"], "Name": key}},
                          MaxLabels=40, MinConfidence=50)
    return core.assess(r["Labels"])


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
    store.log(rid, "Triaged", "severity %d/5, %s, rain %s mm, %d nearby, risk %d"
              % (a["severity"], core.TYPE_EN[a["blockType"]], rain, clusters, risk))
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


ACTIONS = {"triage": triage, "registerWait": register_wait, "escalate": escalate,
           "verify": verify, "close": close}


def handler(event, context):
    return ACTIONS[event["action"]](event)
