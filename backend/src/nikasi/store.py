"""DynamoDB access. One table, partition key reportId."""
import json
import os
from decimal import Decimal

import boto3

from . import core

_table = None


def table():
    global _table
    if _table is None:
        _table = boto3.resource("dynamodb").Table(os.environ["TABLE"])
    return _table


def to_ddb(o):
    return json.loads(json.dumps(o), parse_float=Decimal)


def from_ddb(o):
    return json.loads(json.dumps(o, default=lambda d: int(d) if d == int(d) else float(d)))


def get(rid):
    r = table().get_item(Key={"reportId": rid}).get("Item")
    return from_ddb(r) if r else None


def put(item):
    table().put_item(Item=to_ddb(item))


def update(rid, **fields):
    names = {"#%d" % i: k for i, k in enumerate(fields)}
    values = {":%d" % i: to_ddb(v) for i, v in enumerate(fields.values())}
    expr = "SET " + ", ".join("#%d = :%d" % (i, i) for i in range(len(fields)))
    table().update_item(Key={"reportId": rid}, UpdateExpression=expr,
                        ExpressionAttributeNames=names, ExpressionAttributeValues=values)


def log(rid, what, detail=""):
    """Append a timeline event. The timeline is the audit trail shown on the ticket."""
    ev = to_ddb([{"t": core.now_iso(), "event": what, "detail": detail}])
    table().update_item(
        Key={"reportId": rid},
        UpdateExpression="SET timeline = list_append(if_not_exists(timeline, :e), :n)",
        ExpressionAttributeValues={":e": [], ":n": ev})


def all_items():
    out, kw = [], {}
    while True:
        r = table().scan(**kw)
        out += r["Items"]
        if "LastEvaluatedKey" not in r:
            return [from_ddb(i) for i in out]
        kw["ExclusiveStartKey"] = r["LastEvaluatedKey"]
