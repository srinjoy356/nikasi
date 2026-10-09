# A drain ticket should not close until the photo says so

*Draft for AWS Builder Center. Tags: aws, step-functions, lambda, rekognition, hackathon, open-source.*

Every monsoon, the street that floods is the street whose drain was reported weeks earlier. The complaint was
logged. The ticket was marked "resolved". The drain was still full of plastic.

For the AWS x WeMakeDevs Environmental Hacks I built **Nikasi** (Hindi for drainage), a small agent whose one rule
is: a drain ticket does not close until a new photo shows a clear drain.

## The loop

A citizen sends a photo and a location. The system reads the photo, ranks the ticket against the rain forecast at
that exact spot, and shows the ward officer a ranked map plus a spoken morning brief in Hindi. The officer approves
a crew with one click. The crew uploads an after-photo, and the ticket closes only if three independent checks pass:
the drain reads as clear, the photo is within 75 metres of the reported spot, and it was taken after the dispatch.
If anyone misses a deadline, the ticket escalates up four levels, from Junior Engineer to Ward Commissioner.

## The stack

- **AWS Step Functions** runs one workflow per ticket. `waitForTaskToken` lets a human click resume the workflow,
  and the task timeout is the escalation timer. I did not write a scheduler.
- **AWS Lambda** runs the API (with AWS Lambda Powertools), the workflow tasks, and a vision model.
- **Amazon Rekognition** labels every photo as a second opinion.
- **Amazon Polly** reads the morning brief in Hindi and English.
- **DynamoDB, S3, API Gateway, EventBridge, SNS, Amplify Hosting**, all defined in the **AWS CDK**.

## What fought back

**Bedrock was blocked.** My new account answered every Bedrock call with "Operation not allowed". Instead of
waiting, I ran an open-weight model myself: SmolVLM2-2.2B served by llama.cpp inside a Lambda container, using the
AWS Lambda Web Adapter (a 4.5 GB image on 10 GB of memory).

**The small model was a bad judge and a good describer.** I measured it before building on it. Asked to score a drain
as JSON, it gave nearly the same answer for every photo. Asked yes/no questions, it said "yes" to everything, even
for a clean street. Asked to describe the photo in one sentence, it was accurate: "a polluted river with garbage
floating in it", "a black car parked next to a puddle". So the model only writes the sentence. Code reads it for
signals and cross-checks with Rekognition. The model cannot approve, close, dispatch, or escalate anything.

**Rekognition alone is not enough either.** On wide street photos it labels the scene (City, Road, Puddle, Drain)
and misses the litter. Two weak readers that disagree in different places are better than one.

**Prompt caching made the second question free.** The first request on an image takes about 20 seconds on CPU; the
follow-up questions took under a second because llama.cpp reuses the encoded image. I ended up not needing it, but
it shows how cheap multi-question probing is once the image is in the cache.

**CORS on API Gateway.** A `$default` route that forwards everything to Lambda also forwards the browser's OPTIONS
preflight, which my router answered with 404. The gateway adds the CORS headers, but the function still has to
return a 2xx.

**Docker Desktop would not start** until I deleted three stale unix-socket files in its run folder.

## What I would do next

Put Amazon Cognito in front of the officer and crew screens, and replace the simulated officer desk with a real
ward's ticketing export. And fine-tune a vision model on labelled drain photos instead of describing them.

Code: [GITHUB URL] &nbsp;|&nbsp; Live: https://main.d2gfp9oihzn5ah.amplifyapp.com
