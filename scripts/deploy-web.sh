#!/usr/bin/env bash
# Builds the web app against the deployed API and publishes it to Amplify Hosting (HTTPS).
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PATH:/c/Program Files/Amazon/AWSCLIV2"
P="--profile ${AWS_PROFILE:-nikasi} --region us-east-1"
OUT=cdk-outputs.json
API=$(python -I -c "import json;print(json.load(open('$OUT'))['Nikasi']['ApiUrl'])")
APP=$(python -I -c "import json;print(json.load(open('$OUT'))['Nikasi']['AmplifyAppId'])")
(cd web && VITE_API_URL="$API" npm run build --silent)
python -I - <<PY
import zipfile, os
z = zipfile.ZipFile('web/dist.zip', 'w', zipfile.ZIP_DEFLATED)
for root, _, files in os.walk('web/dist'):
    for f in files:
        p = os.path.join(root, f); z.write(p, os.path.relpath(p, 'web/dist'))
z.close()
PY
DEP=$(aws amplify create-deployment --app-id "$APP" --branch-name main $P --query '[jobId,zipUploadUrl]' --output text)
JOB=$(echo "$DEP" | cut -f1); URL=$(echo "$DEP" | cut -f2)
curl -s -X PUT -H "Content-Type: application/zip" --data-binary @web/dist.zip "$URL" > /dev/null
aws amplify start-deployment --app-id "$APP" --branch-name main --job-id "$JOB" $P --query 'jobSummary.status' --output text
for i in $(seq 1 30); do
  S=$(aws amplify get-job --app-id "$APP" --branch-name main --job-id "$JOB" $P --query 'job.summary.status' --output text)
  echo "amplify: $S"; [ "$S" = SUCCEED ] && break; [ "$S" = FAILED ] && exit 1; sleep 4
done
echo "https://main.$APP.amplifyapp.com"
