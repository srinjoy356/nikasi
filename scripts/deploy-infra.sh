#!/usr/bin/env bash
# Builds the Lambda bundle and deploys the stack. The escalation email comes from .alert-email (gitignored) or NIKASI_ALERT_EMAIL.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PATH:/c/Program Files/Amazon/AWSCLIV2"
[ -f .alert-email ] && export NIKASI_ALERT_EMAIL="$(tr -d '\r\n' < .alert-email)"
UV_LINK_MODE=copy bash backend/build.sh
cd infra && npm install --silent && AWS_PROFILE=${AWS_PROFILE:-nikasi} npx cdk deploy --require-approval never --outputs-file ../cdk-outputs.json
