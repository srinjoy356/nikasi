#!/usr/bin/env bash
# Bundles the Lambda code and its one dependency (AWS Lambda Powertools, pure Python).
set -euo pipefail
cd "$(dirname "$0")"
rm -rf build && mkdir build
uv pip install --quiet --target build --python-platform x86_64-manylinux2014 --python-version 3.12 aws-lambda-powertools
cp -r src/nikasi build/nikasi
find build -name __pycache__ -type d -prune -exec rm -rf {} +
echo "built backend/build"
