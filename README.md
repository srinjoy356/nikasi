# Nikasi

**A drain-clearing agent that does not close a ticket until it sees a clear drain.**

Built by team **Code Nirvana** (Srinjoy Roy and Rishita Roy) for the WeMakeDevs x AWS *Environmental Hacks* (Heat and Water track), Oct 8-11, 2026.
*Nikasi* (निकासी) is the Hindi word for drainage and outflow.

**Live app:** https://main.d2gfp9oihzn5ah.amplifyapp.com &nbsp;|&nbsp; **Code:** https://github.com/srinjoy356/nikasi &nbsp;|&nbsp; **Architecture:** [docs/architecture.md](docs/architecture.md) &nbsp;|&nbsp; **Demo script:** [docs/demo-script.md](docs/demo-script.md)

## The problem

Every monsoon, the street that floods is the street whose drain was reported weeks earlier. Complaint apps exist,
but the failure is always the same: the ticket gets marked "resolved" and the drain is still choked. And the ward
officer has hundreds of open complaints and no way to tell which twelve to clear *before Thursday's rain*.

## What Nikasi does

1. **A citizen reports** a blocked drain with a photo and a location (phone camera and GPS, no login).
2. **The photo is read twice.** An open-weight vision model (SmolVLM2) describes it in one sentence; Amazon
   Rekognition labels it. Plain code fuses the two into a severity (1 to 5) and a blockage type.
3. **Risk is ranked against the rain.** Each ticket is scored from severity, the 48-hour rain forecast at that exact
   spot (Open-Meteo), and how many other open reports are within 300 m. The officer sees a ranked map and a spoken
   morning brief in English or Hindi (Amazon Polly).
4. **A person approves the dispatch.** Nothing is sent to a crew without an officer's click.
5. **The ticket closes only when proven.** The crew uploads an after-photo. It is accepted only if three
   independent checks pass: the drain reads as clear, the photo is within 75 m of the reported spot, and it was
   taken after the dispatch.
6. **If anyone misses a deadline, it escalates:** Junior Engineer, Assistant Engineer, Executive Engineer, Ward
   Commissioner. Every escalation is logged and emailed. If the fix is rejected, the ticket goes back to the crew
   and up one level.

The model describes; **code decides**. Severity thresholds, risk, deadlines, the verification rules and every
state transition live in plain, tested Python and a Step Functions state machine, not in a prompt.

## Where AWS fits

| Service | Job in Nikasi | Where |
|---|---|---|
| **AWS Step Functions** | The ticket lifecycle: triage, wait for dispatch, wait for fix, verify, escalate, close. Uses `waitForTaskToken` so a person's click resumes it, and timeouts drive escalation | [infra/lib/nikasi-stack.ts](infra/lib/nikasi-stack.ts) |
| **AWS Lambda** | The API, the workflow tasks, and the vision model (a 4.5 GB container, 3 GB RAM) | [backend/src/nikasi](backend/src/nikasi) |
| **Amazon Rekognition** | Second opinion on every photo (labels such as Garbage, Pollution, Puddle, Drain) | `tasks.py` |
| **Amazon Polly** | The Hindi and English morning brief for the officer (neural voice Kajal) | `api.py` |
| **Amazon DynamoDB** | Tickets, timeline and audit trail | `store.py` |
| **Amazon S3** | Photos by presigned upload, brief audio | `api.py` |
| **Amazon API Gateway (HTTP API)** | The public API | stack |
| **Amazon EventBridge** | Keeps the vision model warm | stack |
| **Amazon SNS** | Escalation notices | `tasks.py` |
| **AWS Amplify Hosting** | The HTTPS web app (needed for phone camera and GPS) | [scripts/deploy-web.sh](scripts/deploy-web.sh) |
| **Amazon ECR, CloudWatch, IAM, CloudFormation** | Image storage, workflow logs, least-privilege roles, all infrastructure as code (AWS CDK) | stack |

**AWS open-source tools used:** AWS Lambda Powertools for Python (API routing and logging), the AWS Lambda Web
Adapter (runs the model server inside Lambda), and the AWS CDK.

## An honest note on the model choice

This AWS account is new and Amazon Bedrock refuses every invocation ("Operation not allowed"). We opened a support
case, and AWS Support replied after a specialist review that they could not grant expanded Bedrock access on this
account, an account-level decision they could not override. So this is not a delay we could wait out, and Nikasi runs an **open-weight model of its own**: SmolVLM2-2.2B
(Apache-2.0) served by llama.cpp inside a Lambda container. We measured it before building on it:

- Asked to *score* four photos (a plastic-packed gutter, a lightly littered one, a choked one, and a flooded street
  with no drain in frame), it gave **severity 3 to all four**, "blocked" and "water standing" every time. On yes/no
  questions it said garbage, mud and water for all three gutters. **It cannot tell a bad drain from a mild one.**
- Asked to *describe* each photo in one sentence, its sentences were true but not always complete: "a black pipe
  is filled with garbage and debris", "a man is walking through a flooded street", but also "a narrow waterway with
  a tree next to it" for a gutter full of litter. That is why a second reader sits beside it.
  Reproduce with `scripts/measure_model.py`; the raw output is in `docs/measurement/`.

So the model only writes the description, shown to the officer as "what the model sees". Code reads it for signals
and cross-checks with Rekognition. If the model is cold or unavailable, triage falls back to Rekognition alone and
says so in the ticket timeline. The first image on a cold model takes about 20 seconds at 512 px; the workflow is
asynchronous so nobody waits on it.

## Demo controls (clearly labelled in the UI)

Real monsoon rain and a real 6-hour deadline do not fit in a 3-minute video, so the report form has two demo
switches: *pretend the forecast says N mm* and *fast timers* (hours become seconds, so escalation can be watched).
Tickets created with either show "(simulated)" next to the rain figure. The crew page has *pretend I am at the
spot*, because the person recording is not standing at the drain. There is no login: officer actions are
unauthenticated in this prototype. The officer side is a simulation of a ward desk, not an integration with any
municipal system.

## Sample photos

`demo-photos/` holds 11 drain photos from Wikimedia Commons (CC BY or CC BY-SA), with author and licence in
[demo-photos/CREDITS.md](demo-photos/CREDITS.md). They exist to test and demonstrate the pipeline. Real field photos
of local drains should replace them: `python scripts/seed.py YOUR_PHOTOS LAT LNG`.

## Limits worth knowing

- **Lambda concurrency:** a new AWS account allows 10 concurrent Lambda executions and 3,008 MB per function. One
  triage holds two executions for about 30 seconds, so a burst of more than a handful of simultaneous reports can
  be throttled; the workflow retries and falls back to Rekognition. `seed.py` spaces reports out for this reason.
- **Photo reading time:** a cold vision model takes about 2 minutes for the first photo, about 30 seconds after.
- **Deep links:** `#officer/<reportId>` opens a ticket directly; escalation emails link to it.

## Design

The interface is a deliberate "monsoon engineer's survey sheet": tracing-paper ground, a serif for statements
(Fraunces), a grotesque for reading (Hanken Grotesk), mono for anything measurable (IBM Plex Mono), and Devanagari
(Tiro Devanagari Hindi) for the wordmark and the Hindi brief. Colour is spent only on state. Fonts are self-hosted.
The home page drawing is hand-built SVG animated with CSS only.

## Run it

```bash
# tests (pure logic, no AWS needed)
cd backend && uv run --no-project --with pytest pytest -q tests

# deploy everything (needs Docker, AWS profile "nikasi")
bash backend/build.sh
cd infra && npm install && AWS_PROFILE=nikasi npx cdk deploy --outputs-file ../cdk-outputs.json
bash scripts/deploy-web.sh

# exercise the live system end to end
python scripts/smoke.py before.jpg after.jpg
python scripts/escalation_test.py before.jpg
```

## Layout

```
backend/src/nikasi/   core.py (all decisions, unit-tested) · api.py · tasks.py · store.py
backend/vlm/          Dockerfile for the open-weight vision model (llama.cpp + Lambda Web Adapter)
infra/                AWS CDK app: one stack, one command
web/                  React + Vite app: report, officer desk, crew
scripts/              deploy, smoke test, escalation test, seed, reset
docs/                 architecture, demo script, writeup, blog draft
```

## AI tools used

Claude Code (Anthropic) wrote most of the code under my direction; I chose the problem, the design, the safety
rules, and tested everything on real photos. The vision model is the open-weight SmolVLM2 (Apache-2.0) by
Hugging Face; llama.cpp (MIT) serves it.
