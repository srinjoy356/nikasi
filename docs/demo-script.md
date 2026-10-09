# Demo video script (3:00)

**Rules from the organisers:** under 3 minutes, YouTube (public or unlisted), judges see only the video, AWS must be
*visible* in it (naming AWS in the writeup is not enough). Record at 1080p with a headset mic, captions on every
spoken line, the real clock visible.

## Before recording (10 minutes)

1. `uv run --with boto3 --with "botocore[crt]" python scripts/reset.py` to clear old tickets.
2. Seed with 5 to 6 real drain photos around the demo spot: `python scripts/seed.py PHOTOS LAT LNG --rain 55`.
3. Open these tabs, in order: the web app (Officer desk), the Step Functions console (state machine `nikasi-ticket-workflow`),
   the DynamoDB table, CloudWatch Logs for the workflow, the S3 bucket, the Lambda console showing the vision-model function.
4. Warm the model: wait for the 5-minute keep-warm to run, or file one report and let it triage.
5. Rehearse the fast-timers escalation once. Do not skip this; it is the only part with waiting.

## Shots

| Time | On screen | Voice-over | AWS visible |
|---|---|---|---|
| 0:00-0:15 | A flooded street in monsoon (your own footage or a still), then the officer desk with 300 open complaints | "Every monsoon the street that floods is the street whose drain was reported weeks ago. The ticket was marked resolved. The drain was never cleared." | none (the problem) |
| 0:15-0:40 | Phone: take a photo of a blocked drain, location fills in, tap send. Cut to the ticket: "Reading the photo", then severity, blockage type, risk | "A citizen sends one photo. An open-weight vision model on Lambda describes it, Rekognition checks it, and the forecast for that exact spot sets the risk." | Lambda console (model function, 3 GB), Rekognition labels in the timeline |
| 0:40-1:10 | Officer desk: ranked map, tap the top ticket, play the Hindi brief | "The officer sees what to clear before the rain. Polly reads the morning brief in Hindi." | Polly, DynamoDB item |
| 1:10-1:30 | Tap "Approve dispatch". Cut to Step Functions: the execution moves from Wait for dispatch to Wait for crew fix | "Nothing goes to a crew until a person approves. The ticket lives in a Step Functions workflow that waits for people." | Step Functions graph |
| 1:30-2:05 | Crew page: take the after-photo. The ticket shows three checks: drain clear, at the spot, after dispatch. Ticket closes | "The ticket closes only when three independent checks pass on the new photo." | Step Functions Verify state |
| 2:05-2:40 | Second ticket with fast timers, nobody dispatches: owner climbs Junior Engineer, Assistant, Executive, Commissioner, then "Unresolved". Step Functions graph shows the escalation loop; SNS email | "If anyone misses a deadline it escalates, and every step is on the record. No ticket quietly disappears." | Step Functions escalation path, SNS email |
| 2:40-3:00 | Stats tile and services list | "Built solo this weekend on AWS. Nikasi does not close a ticket until it sees a clear drain." | services list on screen |

## If something goes wrong during a take

| Symptom | Do |
|---|---|
| Model Lambda is cold and triage is slow | Show the "Reading the photo" state, cut to the next shot, come back (the workflow is asynchronous) |
| Phone GPS is blocked | Tap the map to place the pin; say so in the caption |
| The brief audio does not play | Show the text, then the Polly call in CloudWatch |
