# The five screenshots only you can take

Save each file in `docs/figures/` (this folder) with the exact name shown, as PNG. On Windows, **Win + Shift + S** drags a
rectangle and copies it; paste into Paint and save. Everything else in the blog is already made.

## 1. `fig-aws-support.png` (2 minutes)
1. Open the email from Amazon Web Services about Bedrock access.
2. Screenshot only the message body, from "Hello Srinjoy" down to the last paragraph.
3. Cover the agent's name at the bottom ("Best regards, ...") with a plain box in Paint, or crop above it.

## 2. `fig-budget-alert.png` (2 minutes)
1. Open the "AWS Budget Notification" email.
2. Screenshot the sentence with **$11.82** and the small table below it.
3. Cover the **AWS Account** number (a rectangle in Paint) before you save.

## 3. `fig-escalation.png` (2 minutes)
1. In your college inbox, search for **Nikasi**. You should have emails titled "Nikasi: report ... escalated to Assistant Engineer" or "... Executive Engineer".
2. Open one and screenshot the whole message, including the line "Open it: https://main.d2gfp9oihzn5ah.amplifyapp.com/#officer/..." .
3. If there are none, tell me and I will trigger a fresh escalation (it takes about 2 minutes).

## 4. `fig-stepfunctions.png` (5 minutes, needs the AWS console)
1. Sign in at https://console.aws.amazon.com and make sure the region (top right) is **N. Virginia**.
2. Open this link, which goes straight to a ticket whose fix was rejected and sent back (it shows the loop):
   https://us-east-1.console.aws.amazon.com/states/home?region=us-east-1#/v2/executions/details/arn:aws:states:us-east-1:419893468912:execution:nikasi-ticket-workflow:6a6e11d4ea
3. Make sure the **Graph view** is selected. Wait for the picture to draw.
4. Screenshot the graph area only. You want the coloured path: Triage, Wait for officer, Wait for crew fix, Verify, "Fix verified?", the escalate step, and the wait that is still running.
5. Optional second image, `fig-stepfunctions-verified.png`: the same link ending in `:2a996291cb`, which went all the way to "Close: verified".
6. Do not show the account number in the address bar. Crop the screenshot below the browser bar.

## 5. `phone-1.png`, `phone-2.png`, `phone-3.png` (10 minutes, optional but nice)
On your phone, open https://main.d2gfp9oihzn5ah.amplifyapp.com and tap **Report a drain**. Use a photo from your phone's gallery if you
have no real drain nearby. The sample "before" photo is `demo-photos/pair/newark-drain-before.jpg` in the repo.
1. After choosing the photo and tapping the map to set a pin, take screenshot **phone-1**.
2. Tap **Send report**. Within about 10 seconds take screenshot **phone-2** (the ticket says "Reading the photo").
3. Wait one to two minutes until it shows a risk score and the model's sentence. Take screenshot **phone-3**.
4. Send the three files to your PC and put them here. I will stitch them into one figure.

If you run short of time, skip step 5 and delete the Figure 2 line from `docs/blog.md`.
