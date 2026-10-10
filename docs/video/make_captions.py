"""Single source of truth for the demo video voice-over. Writes captions.srt and prints the timing table.

Edit the text here, run `python make_captions.py`, and upload captions.srt to YouTube Studio (Subtitles, Upload file).
Timings are the target edit points; shift them if your cut differs.
"""
import re
from pathlib import Path

# (start seconds, end seconds, label, voice-over)
SEGMENTS = [
    (0, 15, "Facecam", "Every monsoon, the street that floods is the street whose drain was reported weeks ago. "
                       "The ticket said resolved. The drain was never cleared. "
                       "We are Code Nirvana, and this is Nikasi: a drain ticket that will not close until a photo says so."),
    (15, 38, "Phone + Lambda", "A citizen photographs a blocked drain, and the phone adds the location. "
                              "A vision model running in AWS Lambda describes the photo, Amazon Rekognition labels it, "
                              "and the rain forecast for that exact spot sets the risk."),
    (38, 64, "Officer desk", "The ward officer opens the desk and sees every open drain ranked against the rain that is coming. "
                            "Amazon Polly reads the morning brief aloud, in Hindi if you prefer. "
                            "Each ticket shows what the model saw, who owns it, and how long before it escalates."),
    (64, 82, "Dispatch + Step Functions", "Nothing goes to a crew without a person. "
                                         "One click approves the dispatch, and the ticket's Step Functions workflow moves "
                                         "from waiting for the officer to waiting for the crew."),
    (82, 116, "Crew + verification", "The crew clears the drain and takes a new photo. "
                                    "The ticket closes only if three checks pass: the drain reads as clear, "
                                    "the photo is within seventy-five metres of the spot, and it was taken after the dispatch. "
                                    "Three of three. Verified. Before, and after, the same drain."),
    (116, 146, "Escalation", "If anyone misses a deadline, the ticket climbs: junior engineer, assistant, executive, ward commissioner, "
                            "and every step is emailed. We shortened the clock so you can watch it. "
                            "And if the new photo still shows the blockage, the fix is rejected and the ticket goes back, one level higher."),
    (146, 172, "Facecam + measurement figure", "One honest note. Amazon Bedrock is blocked on our new account, and AWS support reviewed it and said no. "
                                              "So we ran an open-weight model inside Lambda, and we measured it. "
                                              "It scored every test photo a three, even a flooded street with no drain. "
                                              "So the model only writes a sentence, code decides, and a person approves."),
    (172, 180, "End card", "Built on AWS by Code Nirvana. The code and the live app are linked below."),
]


def ts(t):
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"


cues, n = [], 1
for start, end, _, text in SEGMENTS:
    sents = [x.strip() for x in re.split(r"(?<=[.:?!])\s+", text) if x.strip()]
    words = [len(x.split()) for x in sents]
    span = (end - start) - 0.8
    t = start + 0.3
    for sent, w in zip(sents, words):
        d = span * w / sum(words)
        cues.append(f"{n}\n{ts(t)} --> {ts(t + d - 0.05)}\n{sent}\n")
        n += 1
        t += d
Path(__file__).with_name("captions.srt").write_text("\n".join(cues), encoding="utf-8")

total_words = sum(len(s[3].split()) for s in SEGMENTS)
print(f"{len(cues)} caption cues, {total_words} words (about {total_words / 150 * 60:.0f} s of speech at 150 wpm)")
for a, b, label, text in SEGMENTS:
    m = lambda x: f"{x // 60}:{x % 60:02d}"
    print(f"{m(a)}-{m(b)}  {label:<30} {len(text.split()):>3} words")
