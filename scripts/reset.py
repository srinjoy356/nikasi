"""Wipe all reports, stop running workflows and delete uploaded photos. For re-recording the demo.

usage: uv run --with boto3 python scripts/reset.py   (AWS_PROFILE=nikasi)
"""
import json
import os
from pathlib import Path

import boto3

os.environ.setdefault("AWS_PROFILE", "nikasi")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
out = json.load(open(Path(__file__).resolve().parents[1] / "cdk-outputs.json"))["Nikasi"]
table = boto3.resource("dynamodb").Table(out["TableName"])
sfn = boto3.client("stepfunctions")
bucket = boto3.resource("s3").Bucket(out["BucketName"])

stopped = 0
for page in sfn.get_paginator("list_executions").paginate(stateMachineArn=out["StateMachineArn"], statusFilter="RUNNING"):
    for ex in page["executions"]:
        sfn.stop_execution(executionArn=ex["executionArn"], cause="demo reset")
        stopped += 1
items = table.scan(ProjectionExpression="reportId")["Items"]
for it in items:
    table.delete_item(Key={"reportId": it["reportId"]})
deleted = sum(1 for _ in bucket.objects.filter(Prefix="photos/").delete()) if items else 0
print(f"stopped {stopped} workflows, deleted {len(items)} reports, photo batches deleted: {deleted}")
