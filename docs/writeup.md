# Nikasi: submission writeup

*Paste into the Environmental Hacks submission form. Replace the bracketed links.*

**Track:** Heat and Water (monsoon waterlogging) &nbsp;|&nbsp; **Team:** solo
**Live app:** https://main.d2gfp9oihzn5ah.amplifyapp.com &nbsp;|&nbsp; **Repo:** https://github.com/srinjoy356/nikasi &nbsp;|&nbsp; **Video:** [YOUTUBE URL] &nbsp;|&nbsp; **Blog:** [BUILDER CENTER URL]

## The problem

Every monsoon, the street that floods is the street whose drain was reported weeks earlier. Complaint apps exist, but
they all fail the same way: the ticket is marked "resolved" and the drain is still choked. Meanwhile the ward
officer has hundreds of open complaints and nothing to say which twelve should be cleared before Thursday's rain.

## What I built

Nikasi is a drain-clearing agent that does not close a ticket until it sees a clear drain.

1. A citizen sends a photo and location from a phone (no login).
2. An open-weight vision model describes the photo and Amazon Rekognition labels it. Plain code fuses them into a
   severity and blockage type.
3. Risk is ranked against the 48-hour rain forecast at that exact spot and the density of other open reports. The
   officer sees a ranked map and a morning brief read aloud in Hindi or English.
4. A person approves the dispatch. Nothing goes to a crew without a click.
5. The crew uploads an after-photo. The ticket closes only if three checks pass: the drain reads as clear, the photo
   is within 75 m of the spot, and it was taken after the dispatch.
6. If anyone misses a deadline the ticket escalates Junior Engineer, Assistant Engineer, Executive Engineer, Ward
   Commissioner, with every step logged and emailed.

The model describes; code decides. Severity, risk, deadlines, verification and every state change are in tested
Python and a Step Functions state machine, not in a prompt.

## Where AWS fits (and where it is visible in the video)

| Service | Role |
|---|---|
| AWS Step Functions | The ticket lifecycle with `waitForTaskToken`, timeouts that drive escalation, retries |
| AWS Lambda | API, workflow tasks, and the vision model as a 4.5 GB container on 3 GB RAM |
| Amazon Rekognition | Second opinion on every photo |
| Amazon Polly | Hindi and English morning brief (neural voice Kajal) |
| Amazon DynamoDB, S3, API Gateway, EventBridge, SNS | Tickets and audit trail, photos by presigned upload, the API, keep-warm schedule, escalation emails |
| AWS Amplify Hosting | The HTTPS web app (the phone camera and GPS need HTTPS) |
| AWS CDK, CloudFormation, ECR, CloudWatch, IAM | All infrastructure as code, one command |

AWS open-source tools: AWS Lambda Powertools for Python, the AWS Lambda Web Adapter, and the AWS CDK.

## An honest note on the model

My new AWS account has Amazon Bedrock blocked ("Operation not allowed" on every model). I asked AWS Support to review
it and they declined expanded access on an account-level risk assessment, so I could not wait it out. I ran an open-weight model myself: SmolVLM2-2.2B (Apache-2.0) with llama.cpp inside Lambda. I measured it
on real drain photos before relying on it. As a *scorer* it was useless: the same JSON for every photo, and "yes"
to every yes/no question. As a *describer* it was accurate. So the model only writes a sentence, shown to the
officer as "what the model sees"; code reads it for signals and cross-checks with Rekognition. If the model is cold
or down, triage falls back to Rekognition and the ticket timeline says so.

## Photos

The sample photos in the repo are openly licensed images from Wikimedia Commons, credited in `demo-photos/CREDITS.md`. [Replace with: my own field photos of drains taken on DATE, if you add them.]

## What I learned

- Small models are better describers than judges. Make them describe, then judge in code you can test.
- A ticket system is a workflow, not a database row: Step Functions' `waitForTaskToken` plus timeouts gave me
  escalation without writing a scheduler.
- "Done" should be something you can check. Three independent checks on the after-photo catch the lazy fix
  (a photo from the wrong spot, an old photo, a drain still choked).
- API Gateway's automatic CORS handling does not cover a `$default` Lambda route: the function must answer the
  OPTIONS preflight itself.
- Docker Desktop on Windows can fail to start on stale socket files; deleting them fixed it.

## Demo controls and limits

The report form has clearly labelled demo switches (simulate the forecast, fast timers) and the crew page has
"pretend I am at the spot", because real rain and six-hour deadlines do not fit in three minutes. Tickets made with
them are marked "(simulated)". There is no login in this prototype; officer and crew screens are open. The officer
desk is a simulation of a ward office, not an integration with a municipal system.

## AI tools used

Claude Code (Anthropic) wrote most of the code under my direction. SmolVLM2 (Hugging Face, Apache-2.0) is part of
the product, served by llama.cpp (MIT). I chose the problem and design and tested on real photos.
