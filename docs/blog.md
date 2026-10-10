# The Ticket That Will Not Close

**Summary line (for the Builder Center card):** A solo build of a drain-clearing agent whose one rule is that a complaint stays open until a new photo proves the drain is clear, and what a vision model I could not trust taught me about letting code decide.

*Tags: #aws-step-functions #aws-lambda #amazon-rekognition #amazon-polly #amazon-dynamodb #aws-cdk #aws-community-builders*

---

I showed a vision model a photograph of a wet alley with a parked car and asked: is there garbage in this image? It said yes. I showed it a river of floating plastic and asked the same thing. It said yes. I asked it to score four different drains from one to five, as structured JSON. It gave all four a three, with standing water, and no blockage.

That is the reason this post is worth reading. Everything else I built, the workflow, the verification, the escalation, the AWS wiring, worked more or less as planned. The interesting part is what I did once I knew the part I had built everything around could not be trusted, and the three other times the real world told me my tests were lying.

The thing I built is called Nikasi, Hindi for drainage. It is live at [main.d2gfp9oihzn5ah.amplifyapp.com](https://main.d2gfp9oihzn5ah.amplifyapp.com), the source is at [github.com/srinjoy356/nikasi](https://github.com/srinjoy356/nikasi), and it was built solo during the AWS and WeMakeDevs Environmental Hacks.

**The short version:** a citizen photographs a blocked drain. The system ranks it against the rain forecast for that exact spot, a person approves a crew, and the ticket closes only when a new photo passes three independent checks. If anyone misses a deadline, it climbs four levels of the ward hierarchy.

**In plain words.** Imagine reporting a leaking pipe to your housing society. Someone marks it "resolved" on a list, and the pipe is still leaking. Nikasi does one thing about that: a complaint only counts as fixed when a fresh photo, taken at the same place after the crew was sent, shows it is fixed. Otherwise it stays open and gets louder.

---

## Part one: the problem is not reporting

Every monsoon, the street that floods is the street whose drain was reported weeks earlier. Reporting apps exist. The failure is always the same: the ticket gets marked resolved and the drain is still full of plastic. And the ward officer has hundreds of open complaints and nothing to say which twelve to clear before Thursday's rain.

So the product is not a reporting form. It is a ranking, and a refusal to forget. Those two ideas, rank by the rain that is coming and do not close without proof, decided everything below.

![Figure 1. The officer desk ranks open drains by risk against the 48-hour rain forecast, with a morning brief read aloud in Hindi or English.](figures/fig-officer-desk.png)

## Part two: a ticket is a workflow, not a row

My first instinct was a table with a status column and a scheduler that wakes up to check deadlines. I did not write the scheduler.

Each ticket is one AWS Step Functions execution. When it needs a person, it stops at a state that uses `waitForTaskToken`. The Lambda stores the token on the ticket, and the officer's click calls `SendTaskSuccess` with it. The task timeout is the escalation timer:

```ts
new tasks.LambdaInvoke(this, id, {
  integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
  taskTimeout: sfn.Timeout.at('$.triage.dispatchSla'),   // seconds, set per ticket from its risk
  ...
});
waitDispatch.addCatch(escalate, { errors: ['States.Timeout'] });
```

When the timer fires, the catch moves the ticket up one rung: Junior Engineer, Assistant Engineer, Executive Engineer, Ward Commissioner. I tested the whole ladder by shrinking the deadlines from hours to seconds. A ticket nobody touched went from the first owner to the last, and closed as unresolved, in 124 seconds. Every step is written to the ticket's ledger and emailed through SNS with a link straight to it.

Between waits the workflow costs nothing, because between waits it does nothing.

## Part three: Bedrock said no

My plan was an agent on Amazon Bedrock to read the photos. My account was new and still under AWS's verification, and every call came back as `ValidationException: Operation not allowed`. Nova, Qwen and gpt-oss alike. I could list 124 models and invoke none.

I did not wait. I opened a support case, and within a day AWS Support came back after a specialist review: they could not grant expanded Bedrock access on this account, an account-level risk decision they could not override, and they pointed me to AWS Educate and AWS Sales for programs better suited to events like this. Whatever the reason, the answer was no, and by then the alternative was already running. If I had been waiting for yes, there would be no project.

So I ran a model myself: SmolVLM2-2.2B, which is Apache-2.0, served by llama.cpp inside a Lambda container image through the AWS Lambda Web Adapter. A 4.5 GB image, behind an IAM-protected function URL that only the workflow's Lambda may call.

It failed three times before it worked, and each time the real constraint was one I had not thought to check:

- **I assumed 10 GB of memory.** New accounts are capped at 3,008 MB per function, about two CPUs. The deploy was rejected with a clear message, and I re-measured the model at that size.
- **`Permission denied` on the model file.** Lambda runs as an unprivileged user. My Dockerfile used `ADD --chmod=0644` to fetch the model, and that mode also landed on the `/models` directory, removing its execute bit. The files were readable and the folder was not. Running the image locally as root had hidden it. One `chmod 755` fixed it.
- **The account allows ten concurrent executions in total.** A triage holds two for about thirty seconds, so seeding a dozen photos at once got my own API throttled. I now space them out.

## Part four: the model describes, code decides

Before building on the model, I measured it. This is where the opening came from.

As a **scorer**, asked for severity, blockage type and a boolean as JSON, it returned the same answer for every drain. As a **yes/no oracle**, it said yes to every question on every photo, including a clean street. As a **describer**, asked for one sentence, it was accurate:

> "A polluted river with garbage floating in it."
> "A black car is parked next to a puddle on the street."
> "A man is riding a bicycle through a flooded street."

So the model only writes the sentence. My code reads it for signals, and fuses that with Amazon Rekognition's labels, half and half:

```python
litter = any(w in text for w in ("garbage", "trash", "plastic", "litter", "debris", ...))
severity = 1 + (2 if litter else 0) + (1 if silt else 0) + (1 if blocked else 0) + (1 if water else 0)
final = round(0.5 * vlm_severity + 0.5 * rekognition_severity)   # model failed? Rekognition alone
```

Rekognition alone was not enough either. On a wide street photo it labelled the scene, City, Road, Puddle, Drain, and missed the litter entirely. Two weak readers that are wrong in different places are better than one.

One detail I did not need but enjoyed: the first request on an image takes 20 to 26 seconds on CPU, because the image has to be encoded. In my local tests, follow-up questions about the same image took under a second, because llama.cpp reuses the cached encoding. The model cannot approve, dispatch, close or escalate anything. It is a witness, not a judge.

## Part five: closing means proof

The crew's after-photo is read the same way, then checked three separate ways. All three must hold:

```python
cleared  = after.severity <= 1 or before.severity - after.severity >= 2
at_place = haversine_m(before_geo, after_geo) <= 75
fresh    = after_taken_at > dispatched_at
verified = cleared and at_place and fresh
```

The drain has to read as clear. The photo has to be within 75 metres of the reported spot. And it has to be newer than the dispatch, so an old photo or one sent before the crew arrived does not count. If any check fails, the ticket goes back to the crew and up a level, and the screen says which check failed and why. A passing ticket gets a stamp. I used a stamp, and not a green tick, because a tick is a state and a stamp is a decision somebody signed.

[FIGURE 2 TO ADD AFTER YOUR PHOTOS: screenshot of a verified ticket whose before and after photos are the SAME drain, showing the three ticked checks and the stamp. Caption: "Figure 2. A verified ticket: the three checks and the stamp, with the before and after photos together." Do not use sample photos for this one; they are different places and would mislead.]

## Part six: the bugs that passed every test

This is the part that still stings.

**CORS.** My end-to-end test script created a report, dispatched it, uploaded an after-photo and watched the ticket close, in about fifteen seconds. Green. Then I opened the app in a browser and every request failed. My script used Python's `urllib`, which never sends the CORS preflight request a browser sends first. My API Gateway used a `$default` route, so the preflight was forwarded to my Lambda, whose router answered 404. The gateway adds the CORS headers, but the function still has to return a 2xx. Four lines in the handler.

**The ghost ticket.** I reset the demo data while a workflow was still running. DynamoDB's `update_item` creates an item if it does not exist, so the still-running workflow quietly re-created a ticket that had a few fields and no status, no location, nothing else. The next call to list tickets crashed on it with a 500. Worse, triage for other tickets crashed when it tried to count the nearby reports and found a record with no latitude. Every update now carries `attribute_exists(reportId)`, so a deleted ticket fails loudly instead of coming back as a corpse, and the list skips any record that is not shaped like a ticket.

**The map.** I picked a nicely muted free basemap. It rendered the words "API KEY REQUIRED" across the screen, which my tests could not see, because tests do not look at maps. I switched back to the standard OpenStreetMap tiles and tinted them to match.

None of the three would have been caught by more unit tests of the same kind. All were caught by looking at the real thing.

## What it runs on

The AWS architecture is a set of boundaries, not a list of logos.

- **AWS Step Functions** holds each ticket's lifecycle and its deadlines, so no scheduler exists to forget anything.
- **AWS Lambda** runs three things with different failure modes: the API, the workflow tasks, and the vision model.
- **Amazon Rekognition** is the second reader that does not share the model's blind spots.
- **Amazon Polly** reads the morning brief in Hindi and English, because the person who needs it may not have time to read it.
- **Amazon DynamoDB** keeps one item per ticket, including its full ledger, which is the audit trail.
- **Amazon S3** takes photos by presigned upload, so the API never carries image bytes.
- **Amazon API Gateway** is the public edge, throttled so spam cannot run up the bill.
- **Amazon EventBridge** pings the vision Lambda every five minutes so a report does not meet a cold model.
- **Amazon SNS** emails each escalation with a link to the ticket.
- **AWS Amplify Hosting** serves the app over HTTPS, which phones require before they allow camera and location.
- **AWS CDK** defines all of it, and it deploys with one command.

AWS open-source pieces: AWS Lambda Powertools for Python (routing and logging), the AWS Lambda Web Adapter (running the model server in Lambda), and the CDK.

Cost to date: [fill in from Cost Explorer. It lags by about a day, so check it before you publish]. A $20 budget alarm is set. Restraint mattered as much as the architecture. I did not build logins, a native app, SMS (Indian numbers need sender registration), or any integration with a real municipal system, and I say so in the app.

## What the evidence supports today

- **Tests.** 14 unit tests cover the decisions: severity, risk, deadlines, the three checks, caption reading, and the not-a-drain flag. They run without AWS.
- **End to end.** I ran 11 openly licensed drain photos from Wikimedia Commons (CC BY and CC BY-SA, credited in the repo) through the live system, and exercised the verified path, the rejected-fix path, and the full escalation ladder with shortened deadlines.
- **Timing.** A warm triage takes about 30 seconds. The first photo after the model has been idle takes about two minutes.

What I am not claiming. I have not measured accuracy across a labelled set of drains, so there is no accuracy number in this post and I would distrust one. [Update: replace with your own sentence about photos you took on your own street, if you add them.] Until then, the photos are not from the place the app is for. The rain figure on some tickets is simulated, and the app labels it "simulated" next to the number. The officer side is a simulation of a ward desk, not an integration, and there is no login in this prototype. I have not shown that this would save any ward any time.

## Three things I would tell myself on day one

**Measure the model before you design around it.** An afternoon of asking a model simple questions on six photos told me more than any amount of prompt tuning would have. If it cannot discriminate, do not hand it a decision.

**Test through the browser, not just beside it.** A script that talks to your API is not a user. The two bugs that cost me the most time lived exactly in the gap.

**A missing record should fail loudly.** A write that quietly creates what it expected to find is a bug that waits for a reset to show up.

## What I would do next

Put Amazon Cognito in front of the officer and crew screens. Move the photo reader to a Bedrock Nova model on an account that has access, which would keep everything on AWS and is a small swap. This account will not get it: AWS has said so. And replace the sample photos and the simulated ward desk with a real ward's complaints.

If you are building something that acts in the physical world, I would like to hear one detail of your design: what is your proof that the loop actually closed?

Try Nikasi at [main.d2gfp9oihzn5ah.amplifyapp.com](https://main.d2gfp9oihzn5ah.amplifyapp.com). No login: open the Officer desk and approve a dispatch on any ticket, then follow it on the Crew page. The code is at [github.com/srinjoy356/nikasi](https://github.com/srinjoy356/nikasi).

Claude Code (Anthropic) assisted with implementation, debugging and drafting. I chose the problem, the design and the safety rules, ran the measurements described here, and I am responsible for the claims and the code.

Any opinions in this article are those of the individual author and may not reflect the opinions of AWS.
