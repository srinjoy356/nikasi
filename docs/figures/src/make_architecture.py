"""Generates fig-architecture.html (then rendered to PNG by headless Chrome). Same visual language as the app."""
from pathlib import Path

NM = Path(__file__).resolve().parents[3] / "web" / "node_modules"
FONT = lambda p: (NM / p).as_uri()

INK, TEAL, SIGNAL, WATER, PAPER, CARD, MUTE = "#13211f", "#0e5a56", "#d4451a", "#2a6890", "#f3eee3", "#fbf8f1", "#6a7873"
out = []


def box(x, y, w, h, title, sub="", color=INK, fill=CARD, dash=False, tsize=15):
    d = ' stroke-dasharray="5 4"' if dash else ""
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{color}" stroke-width="1.6"{d}/>')
    ty = y + (h / 2 - (8 if sub else -5))
    out.append(f'<text x="{x + w / 2}" y="{ty}" text-anchor="middle" class="t" fill="{INK}" font-size="{tsize}">{title}</text>')
    if sub:
        for i, line in enumerate(sub.split("|")):
            out.append(f'<text x="{x + w / 2}" y="{ty + 17 + i * 14}" text-anchor="middle" class="m" fill="{MUTE}">{line}</text>')


def arrow(x1, y1, x2, y2, color=INK, label="", dash=False, lx=0, ly=-6, curve=None):
    d = ' stroke-dasharray="5 4"' if dash else ""
    path = f"M{x1} {y1} L{x2} {y2}" if curve is None else f"M{x1} {y1} Q{curve[0]} {curve[1]} {x2} {y2}"
    out.append(f'<path d="{path}" fill="none" stroke="{color}" stroke-width="1.6" marker-end="url(#a-{color[1:]})"{d}/>')
    if label:
        out.append(f'<text x="{(x1 + x2) / 2 + lx}" y="{(y1 + y2) / 2 + ly}" text-anchor="middle" class="m" fill="{color}">{label}</text>')


# people and web
for i, (n, s) in enumerate([("Citizen", "phone camera + GPS"), ("Officer", "ranked desk + Hindi brief"), ("Crew", "after-photo")]):
    box(40, 70 + i * 70, 180, 54, n, s, fill=PAPER)
for y in (97, 167, 237):
    arrow(220, y, 270, 167 if y != 167 else 167)
box(270, 120, 150, 94, "AWS Amplify", "React app|served over HTTPS", TEAL)
arrow(420, 167, 470, 167)
box(470, 120, 140, 94, "API Gateway", "HTTP API|throttled", TEAL)
arrow(610, 167, 660, 167)
box(660, 120, 160, 94, "Lambda: API", "Powertools routing|presigned uploads", TEAL)
# data
box(920, 70, 170, 50, "DynamoDB", "one item per ticket", TEAL)
box(920, 135, 170, 50, "S3", "photos, brief audio", TEAL)
box(920, 200, 170, 50, "Polly", "Hindi + English brief", TEAL)
arrow(820, 150, 920, 95)
arrow(820, 167, 920, 160)
arrow(820, 185, 920, 225)

# workflow
out.append(f'<rect x="250" y="320" width="780" height="270" fill="none" stroke="{SIGNAL}" stroke-width="1.6" stroke-dasharray="2 5"/>')
out.append(f'<text x="266" y="346" class="m" fill="{SIGNAL}" font-size="12.5">AWS STEP FUNCTIONS  ·  ONE WORKFLOW PER TICKET</text>')
steps = [(274, "Triage photo", "reads, ranks"), (432, "Wait: officer", "timeout = deadline"), (612, "Wait: crew fix", "timeout = deadline"),
         (792, "Verify", "3 checks"), (936, "Close", "")]
widths = [128, 140, 140, 120, 80]
for (x, t, s), w in zip(steps, widths):
    box(x, 378, w, 58, t, s, INK, CARD, tsize=14)
for a, b in zip(range(4), range(1, 5)):
    arrow(steps[a][0] + widths[a], 407, steps[b][0], 407)
box(432, 490, 320, 52, "Escalate one level, then wait again", "JE  >  AE  >  EE  >  WC", SIGNAL, "#fbeee8", tsize=14)
arrow(502, 436, 502, 490, SIGNAL, "timeout", lx=-30, ly=0)
arrow(682, 436, 682, 490, SIGNAL, "timeout", lx=30, ly=0)
arrow(852, 436, 752, 502, SIGNAL, "rejected", lx=40, ly=-4)
arrow(735, 214, 735, 320, label="start, resume", lx=48, ly=0)

# readers
box(1070, 330, 190, 56, "Lambda: tasks", "triage, verify, escalate", TEAL)
box(1070, 430, 190, 74, "Lambda: vision model", "SmolVLM2 on llama.cpp|Lambda Web Adapter", TEAL)
box(1310, 330, 190, 50, "Rekognition", "second opinion", TEAL)
box(1310, 400, 190, 46, "Open-Meteo", "48 h rain forecast", MUTE, PAPER, dash=True)
box(1310, 466, 190, 50, "EventBridge", "keeps the model warm", TEAL)
arrow(1030, 358, 1070, 358)
arrow(1165, 386, 1165, 430)
arrow(1260, 350, 1310, 352)
arrow(1260, 372, 1310, 424, color=MUTE, dash=True)
arrow(1310, 491, 1260, 478, color=MUTE, dash=True)

# side service
box(40, 490, 180, 56, "SNS", "emails every escalation", TEAL)
arrow(432, 516, 220, 518, SIGNAL)

out.append(f'<text x="40" y="654" class="m" fill="{MUTE}" font-size="12">Solid arrows: requests. Red: escalation. Dashed: background or external. The model describes, code decides, a person approves.</text>')
out.append(f'<text x="40" y="676" class="m" fill="{MUTE}" font-size="12">Infrastructure: AWS CDK. Logs and metrics: CloudWatch. Access: IAM, with the model reachable only from the tasks Lambda.</text>')

markers = "".join(
    f'<marker id="a-{c[1:]}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="{c}"/></marker>'
    for c in (INK, SIGNAL, MUTE, TEAL, WATER))
html = f"""<!doctype html><meta charset="utf-8"><style>
@font-face{{font-family:Plex;font-weight:400;src:url({FONT('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2')})}}
@font-face{{font-family:Plex;font-weight:500;src:url({FONT('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2')})}}
@font-face{{font-family:Hanken;font-weight:100 900;src:url({FONT('@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2')})}}
@font-face{{font-family:Fraunces;src:url({FONT('@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2')})}}
body{{margin:0;background:{PAPER}}} .t{{font-family:Hanken,sans-serif;font-weight:700}} .m{{font-family:Plex,monospace;font-size:11px}}
h1{{font:400 26px Fraunces,serif;letter-spacing:-.01em;margin:0}}
</style><body><svg width="1540" height="700" viewBox="0 0 1540 700"><defs>{markers}</defs>
<rect width="1540" height="700" fill="{PAPER}"/>
<text x="40" y="40" font-family="Fraunces,serif" font-size="26" fill="{INK}">How a ticket moves</text>
{''.join(out)}</svg></body>"""
Path(__file__).with_name("fig-architecture.html").write_text(html, encoding="utf-8")
print("written")
