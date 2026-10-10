# Demo video: script and recording plan

**Rules from the organisers.** Up to 3:00. On YouTube, public or unlisted. Judges see only the video, so there is no live demo.
AWS must be visible in it (the console), and mentioning AWS in the writeup is not enough. Target a final cut of 2:50 to 2:58.

The voice-over below is 328 words, about 2:10 of speech. The rest of the 3:00 is deliberate silence over visuals: the Hindi
brief playing, the stamp coming down, the ladder climbing.

## The cut

| Time | On screen | You say | AWS visible |
|---|---|---|---|
| 0:00-0:15 | **Facecam**, full screen | "Every monsoon, the street that floods is the street whose drain was reported weeks ago. The ticket said resolved. The drain was never cleared. We are Code Nirvana, and this is Nikasi: a drain ticket that will not close until a photo says so." | none, it is the problem |
| 0:15-0:38 | **Phone** screen recording: pick the photo, tap the pin, Send, "Reading photo", then the triaged ticket. Last 5 s: **Lambda console**, the vision function | "A citizen photographs a blocked drain, and the phone adds the location. A vision model running in AWS Lambda describes the photo, Amazon Rekognition labels it, and the rain forecast for that exact spot sets the risk." | Lambda console (container image, 3008 MB) |
| 0:38-1:04 | **Officer desk**: ranked list, map pins, click the top ticket, switch to Hindi, **Play brief** (let 4 s of Hindi play) | "The ward officer opens the desk and sees every open drain ranked against the rain that is coming. Amazon Polly reads the morning brief aloud, in Hindi if you prefer. Each ticket shows what the model saw, who owns it, and how long before it escalates." | label "Amazon Polly" |
| 1:04-1:22 | Click **Approve dispatch**, then cut to **Step Functions**: the execution graph with "Wait for crew fix" in blue | "Nothing goes to a crew without a person. One click approves the dispatch, and the ticket's Step Functions workflow moves from waiting for the officer to waiting for the crew." | Step Functions graph |
| 1:22-1:56 | **Crew page**: upload the after-photo. Scan and spinners (jump-cut the wait), three ticks draw, meter fills, stamp slams, slider sweeps. Drag the slider once | "The crew clears the drain and takes a new photo. The ticket closes only if three checks pass: the drain reads as clear, the photo is within seventy-five metres of the spot, and it was taken after the dispatch. Three of three. Verified. Before, and after, the same drain." | Step Functions, green path (3 s at the end) |
| 1:56-2:26 | **Escalation**: the fast-timer ticket, ladder JE to WC (speed up 4x), the email arriving in the inbox, then 5 s of a rejected fix | "If anyone misses a deadline, the ticket climbs: junior engineer, assistant, executive, ward commissioner, and every step is emailed. We shortened the clock so you can watch it. And if the new photo still shows the blockage, the fix is rejected and the ticket goes back, one level higher." | Amazon SNS email |
| 2:26-2:52 | **Facecam**, then `fig-model-measurement.png` full screen for the last 12 s | "One honest note. Amazon Bedrock is blocked on our new account, and AWS support reviewed it and said no. So we ran an open-weight model inside Lambda, and we measured it. It scored every test photo a three, even a flooded street with no drain. So the model only writes a sentence, code decides, and a person approves." | the measurement figure |
| 2:52-3:00 | End card: `fig-architecture.png` with the repo and live URLs as text | "Built on AWS by Code Nirvana. The code and the live app are linked below." | architecture diagram |

Do not claim an accuracy number, or that this saves a ward time. We have not measured either.

## Before you record (15 minutes)

**The live data is ready.** I reset the site and seeded 8 clean tickets around central Kolkata. They finish triaging about 5 minutes
after I message you; the keep-warm schedule means the model will be warm.

**Phone**
1. Chrome, open the site. Menu, Settings, Site settings, Location, **Block** for this site. Otherwise the app fills in your real GPS position and it shows on screen.
2. Put `demo-photos/pair/newark-drain-before.jpg` in the phone gallery (send it by WhatsApp or Drive).
3. Turn on Do Not Disturb. Start the built-in screen recorder to test it.

**PC**
1. Chrome tabs, in this order: Officer desk, Crew, Report (all at https://main.d2gfp9oihzn5ah.amplifyapp.com), then the Step Functions list, the Lambda list and Gmail.
   - Step Functions: https://us-east-1.console.aws.amazon.com/states/home?region=us-east-1#/statemachines
   - Lambda: https://us-east-1.console.aws.amazon.com/lambda/home?region=us-east-1#/functions
2. Browser zoom 110%, bookmarks bar hidden, Windows notifications off, personal tabs closed.
3. In the console, **do not open the account menu** (top right); it shows your account number. If it appears in a take, blur it in the edit.
4. Files ready: `demo-photos/pair/newark-drain-before.jpg`, `newark-drain-after.jpg`, `docs/figures/fig-model-measurement.png`, `fig-architecture.png`.
5. OBS Studio: canvas 1920x1080, 30 fps. Two scenes: "Screen" (display capture, no audio) and "Cam" (webcam full screen with microphone).

## The takes (record in this order, it saves waiting)

**Take 1, escalation ticket first (it needs 2 to 3 minutes to play out).** PC, Report page. Choose `newark-drain-before.jpg`. Tap the map at a generic
spot, not your home. Open **Demo controls**: forecast **80** mm, tick **Fast timers**. Send. Then open Officer desk and select that ticket. **Do nothing.**
Record the screen for 2.5 minutes while the ladder climbs by itself (about every 30 seconds). Keep Gmail visible in a second window and record the
moment the "escalated to Assistant Engineer" email arrives. The ticket ends as "Unresolved".

**Take 2, the hero ticket from the phone.** Start the phone screen recorder. Report, Add a photo, gallery, the Newark before photo, tap a generic point on
the map, Send. Keep recording through "Reading photo" until the risk score and the model's sentence appear (30 to 90 seconds), then scroll slowly.
Next, on the PC, record Lambda: the list, click the vision function (name contains "VisionModelFn"), Configuration tab, show "Image" and 3008 MB. 8 seconds.

**Take 3, officer desk.** Officer desk tab. Slow pan over the ranked list and map, click the hero ticket, press **हिन्दी**, then **Play brief**. For this take
turn **desktop audio ON** in OBS so the Polly voice is captured. Let it play for 5 seconds.

**Take 4, dispatch.** Select the hero ticket, click **Approve dispatch**. Right away switch to the Step Functions tab, open `nikasi-ticket-workflow`, the Executions tab,
the newest running execution, Graph view. Hold 6 seconds on the blue "Wait for crew fix".

**Take 5, verification (the money shot).** Crew tab, select the hero ticket. Tick "Demo: pretend I am standing at the reported spot". Click **Take the after-photo**
and pick `newark-drain-after.jpg`. Record all of it: the scan and spinners, then three ticks drawing, the meter, the stamp, the slider sweep. Wait for the end, then drag the
slider by hand once. Finish on the Step Functions execution, now green, 3 seconds.

**Take 6, rejected fix (optional, 5 seconds in the cut).** Make one more ticket as in Take 1 but with normal timers. Dispatch it. On the Crew tab submit
`newark-drain-before.jpg` again as the after-photo. Record the red cross and the orange "Rejected" stamp.

**Take 7, facecam.** OBS scene "Cam". Read segments 1 and 7 from the table. Two takes each. Look at the camera, not the screen.

## Editing (CapCut, Clipchamp or DaVinci Resolve, all free)
1. Lay the takes out on the timeline in the order of the table. Cut every wait: the scan (keep 8 s), the model reading the photo, the ladder (play at 4x).
2. Record the voice-over last, in one pass, while watching the timeline. Use the facecam audio for segments 1 and 7. Duck the Polly audio under your voice.
3. Add a small label the first time each service appears: "AWS Lambda", "Amazon Rekognition", "Amazon Polly", "AWS Step Functions", "Amazon SNS". These make AWS visible.
4. Captions: import `docs/video/captions.srt` (CapCut: Captions, Local captions, Import). If your cut differs, shift the cues.
5. Export MP4, 1920x1080, 30 fps, H.264. **Check the length is under 3:00.**

## Upload
1. YouTube Studio, Create, Upload. Title: "Nikasi: a drain ticket that will not close until a photo says so | Code Nirvana | AWS Environmental Hacks".
2. Description: the repo https://github.com/srinjoy356/nikasi and the live app https://main.d2gfp9oihzn5ah.amplifyapp.com.
3. Visibility **Unlisted** (or Public). Subtitles, Upload file, `captions.srt`.
4. **Open the link in a private window** and play it to the end before you submit.

## If something goes wrong during a take
| Problem | Do |
|---|---|
| The model is slow ("Reading photo" for over 2 minutes) | Keep recording, cut the wait in the edit. If it fails, press Report another drain and retry once. |
| The ladder is slower than 30 s per step | The ticket's risk was under 75. Use forecast 80 mm and the Newark before photo, as in Take 1. |
| The phone puts your real location on the map | Block location for the site (setup step 1) and tap the map instead. |
| The Hindi brief does not play | Press English, then हिन्दी, then Play brief again. Browsers sometimes block audio until you click once. |
| The console shows your account number | Blur it in the edit. |
