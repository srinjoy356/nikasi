# Submission cheat sheet

Copy-paste fields for the Environmental Hacks form. The organisers' rules require: a public repo, a YouTube demo of up to
3 minutes (public or unlisted), and a short writeup. One submission per team. The form closes at the deadline, so submit early.

## Before you press submit
- [ ] Both of you have checked in on the event page and have a verified student profile on AWS Builder Center.
- [ ] The repo is public: https://github.com/srinjoy356/nikasi (it is).
- [ ] The video is on YouTube, **public or unlisted**, under 3:00, and opens in a signed-out or private window.
- [ ] The video shows AWS (the console), not just the app. Naming AWS in the writeup alone does not count.
- [ ] The live app opens: https://main.d2gfp9oihzn5ah.amplifyapp.com
- [ ] The blog (optional, only for the blog prize) is published on AWS Builder Center and its link is ready.

## Fields

**Project name:** Nikasi

**Tagline (one line):** A drain-clearing agent that does not close a ticket until it sees a clear drain.

**Track:** Heat and Water

**Team name:** Code Nirvana

**Team members:** Srinjoy Roy, Rishita Roy

**Live app URL:** https://main.d2gfp9oihzn5ah.amplifyapp.com

**Repository URL:** https://github.com/srinjoy356/nikasi

**Demo video URL:** [YOUTUBE URL]

**Blog URL (for the blog prize):** [AWS BUILDER CENTER URL]

**Short description (about 300 characters):**
Citizens photograph a blocked drain. Nikasi ranks it against the rain forecast, a person approves a crew, and the ticket closes only when a new photo passes three checks: the drain is clear, it is the same spot, and it was taken after dispatch. Missed deadlines escalate four levels.

**Which AWS services or open-source tools does it use?**
AWS Step Functions, Lambda (including a container image), Rekognition, Polly, DynamoDB, S3, API Gateway, EventBridge, SNS, Amplify Hosting, CDK, CloudFormation, ECR, CloudWatch, IAM. AWS open-source: Lambda Powertools for Python, the AWS Lambda Web Adapter, the AWS CDK.

**Build It or Ship It?** Ship It: it is deployed on AWS with a live URL (the vision model also runs in Lambda).

**AI tools used:** Claude Code (Anthropic) for implementation, debugging and drafting. The product itself uses the open-weight SmolVLM2-2.2B vision model (Apache-2.0) served by llama.cpp.

**Writeup:** paste the contents of `docs/writeup.md` (after filling the two links).

## Two sentences if a field asks "what is novel"
Most complaint apps let a ticket be marked resolved by whoever closes it. Nikasi makes closing a decision the system can check: three independent checks on a new photo, with escalation if anyone misses a deadline.

## Known limits (be upfront if asked)
- No login in this prototype; the officer desk is a simulation of a ward office, not an integration.
- Sample photos are openly licensed (credited in `demo-photos/CREDITS.md`); no accuracy number is claimed.
- Amazon Bedrock is blocked on this account (AWS Support declined expanded access), so the photo reader is an open-weight model in Lambda plus Rekognition.
