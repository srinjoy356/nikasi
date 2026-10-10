# Nikasi: submission writeup

*Paste into the Environmental Hacks submission form. Replace the two bracketed links once you have them.*

**Team:** Code Nirvana (Srinjoy Roy, Rishita Roy) &nbsp;|&nbsp; **Track:** Heat and Water (monsoon waterlogging)
**Live app:** https://main.d2gfp9oihzn5ah.amplifyapp.com &nbsp;|&nbsp; **Repo:** https://github.com/srinjoy356/nikasi
**Demo video:** [YOUTUBE URL] &nbsp;|&nbsp; **Blog:** [AWS BUILDER CENTER URL]

## The problem

Every monsoon, the street that floods is the street whose drain was reported weeks earlier. Complaint apps exist, but they
fail the same way: the ticket is marked "resolved" and the drain is still choked. Meanwhile the ward officer has hundreds
of open complaints and nothing to say which twelve should be cleared before Thursday's rain.

## What we built

Nikasi is a drain-clearing agent that does not close a ticket until it sees a clear drain.

1. A citizen sends a photo and a location from a phone. No login.
2. An open-weight vision model describes the photo in a sentence, and Amazon Rekognition labels it. Plain code fuses the two
   into a severity from one to five and a blockage type.
3. Risk is ranked against the 48-hour rain forecast at that exact spot and the density of other open reports within 300 m.
   The officer sees a ranked map and a morning brief read aloud in Hindi or English.
4. A person approves the dispatch. Nothing goes to a crew without a click.
5. The crew uploads an after-photo. The ticket closes only if three checks pass: the drain reads as clear, the photo is
   within 75 m of the reported spot, and it was taken after the dispatch.
6. If anyone misses a deadline the ticket escalates: Junior Engineer, Assistant Engineer, Executive Engineer, Ward
   Commissioner. Each step is logged and emailed with a link to the ticket. A rejected fix goes back to the crew, one level up.

The model describes, code decides, a person approves. Severity, risk, deadlines, verification and every state change are in
tested Python and a Step Functions state machine, not in a prompt.

## Where AWS fits (and where it is visible in the video)

| Service | Role |
|---|---|
| AWS Step Functions | One workflow per ticket. `waitForTaskToken` waits for people, task timeouts are the escalation timers |
| AWS Lambda | The API, the workflow tasks, and the vision model as a 4.5 GB container image |
| Amazon Rekognition | Second reader on every photo, so the model's blind spots are covered |
| Amazon Polly | The morning brief in Hindi and English |
| Amazon DynamoDB, S3 | One item per ticket with its full ledger; photos by presigned upload |
| Amazon API Gateway, EventBridge, SNS | Throttled public API; keeps the model warm; escalation emails |
| AWS Amplify Hosting | The HTTPS web app (phones need HTTPS for camera and location) |
| AWS CDK, CloudFormation, ECR, CloudWatch, IAM | Everything is infrastructure as code, one command |

AWS open-source tools: AWS Lambda Powertools for Python, the AWS Lambda Web Adapter, and the AWS CDK.

## An honest note on the model

Our new AWS account has Amazon Bedrock blocked ("Operation not allowed" on every model we tried). We opened a support case, and
AWS Support replied after a specialist review that they could not grant expanded access on this account. So we ran an
open-weight model ourselves: SmolVLM2-2.2B (Apache-2.0) with llama.cpp inside Lambda.

We measured it before relying on it (`scripts/measure_model.py`, four openly licensed photos). As a scorer it gave every photo
severity 3, including a flooded street with no drain in frame. As a describer its sentences were true but sometimes
incomplete. So the model only writes a sentence, shown to the officer as "what the model sees"; code reads it for signals and
cross-checks with Rekognition. If the model is cold or down, triage falls back to Rekognition and the ticket says so.

## What we tested, and what we did not

- 14 unit tests cover the decisions (severity, risk, deadlines, the three checks, caption reading, the not-a-drain flag).
- We ran 11 openly licensed drain photos plus a real before-and-after pair of one storm drain through the live system, and
  exercised the verified path, the rejected path, and the full escalation ladder with shortened deadlines (124 seconds from
  first owner to last).
- A warm triage takes about 30 seconds. The first photo after the model has been idle takes about two minutes.
- We have **not** measured accuracy on a labelled set of Indian drains, so we claim no accuracy number. The photos are
  openly licensed samples (credited in `demo-photos/CREDITS.md`), mostly not from the place the app is for.
- Demo controls are labelled in the app: a simulated rain forecast, fast timers, and "pretend I am at the spot". Tickets made
  with them say "simulated". The officer desk is a simulation of a ward office, not an integration. There is no login.

## What we learned

- Small models are better describers than judges. Make them describe, then judge in code you can test.
- A ticket is a workflow, not a row. `waitForTaskToken` plus timeouts gave us escalation without writing a scheduler.
- "Done" should be checkable. Three independent checks catch the lazy fix: a photo from the wrong place, an old photo, a drain
  still choked.
- The bugs that cost the most time passed every test: a CORS preflight our test script never sent, and a deleted ticket that a
  running workflow silently re-created.
- Set the budget alarm first. Ours caught an unrelated database costing about $13 a day.

## AI tools used

Claude Code (Anthropic) assisted with implementation, debugging and drafting. SmolVLM2 (Hugging Face, Apache-2.0) is part of the
product, served by llama.cpp (MIT). We chose the problem, the design and the safety rules, and ran the measurements described
here. We are responsible for the claims and the code.
