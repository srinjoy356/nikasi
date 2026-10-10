"""Builds fig-model-measurement.html from docs/measurement/model-measurement.json (rendered to PNG by headless Chrome)."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
NM = ROOT / "web" / "node_modules"
rows = json.loads((ROOT / "docs" / "measurement" / "model-measurement.json").read_text(encoding="utf-8"))
font = lambda p: (NM / p).as_uri()

LABEL = {
    "gutter-choked-with-plastic.jpg": "A gutter packed with plastic",
    "choked-gutter-in-ghana.jpg": "A choked gutter",
    "india-chennai-monsoon-01-3058208937.jpg": "A flooded street, no drain in frame",
    "gutter-with-less-plastic.jpg": "A gutter with a little plastic",
}
cards = []
for r in rows:
    s = r["scorer"]
    yn = r["yesno"]
    chips = "".join(f'<span class="{ "y" if v == "yes" else "n"}">{k}: {v}</span>' for k, v in yn.items())
    cards.append(f"""<div class="card">
<img src="{(ROOT / 'demo-photos' / r['photo']).as_uri()}">
<h3>{html.escape(LABEL.get(r['photo'], r['photo']))}</h3>
<p class="k">As a scorer</p><p class="v big">severity {s['severity']} of 5</p><p class="m">blocked: {str(s['blocked']).lower()} &middot; water standing: {str(s['water_standing']).lower()}</p>
<p class="k">As a yes/no oracle</p><p class="chips">{chips}</p>
<p class="k">As a describer</p><p class="v cap">&ldquo;{html.escape(r['describe'])}&rdquo;</p></div>""")

page = f"""<!doctype html><meta charset="utf-8"><style>
@font-face{{font-family:Plex;font-weight:400;src:url({font('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2')})}}
@font-face{{font-family:Plex;font-weight:500;src:url({font('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2')})}}
@font-face{{font-family:Hanken;font-weight:100 900;src:url({font('@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2')})}}
@font-face{{font-family:Fraunces;src:url({font('@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2')})}}
@font-face{{font-family:Fraunces;font-style:italic;src:url({font('@fontsource-variable/fraunces/files/fraunces-latin-opsz-italic.woff2')})}}
body{{margin:0;padding:34px 40px 30px;background:#f3eee3;font-family:Hanken,sans-serif;color:#13211f;width:1520px}}
h1{{font:400 30px Fraunces,serif;margin:0 0 4px}} .sub{{font:400 13px Plex,monospace;color:#6a7873;margin:0 0 22px}}
.grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}}
.card{{background:#fbf8f1;border:1px solid rgba(19,33,31,.18);padding:0 0 14px}}
.card img{{width:100%;height:260px;object-fit:cover;display:block}}
.card h3{{font:700 16px Hanken;margin:12px 14px 8px}}
.k{{font:500 10.5px Plex,monospace;letter-spacing:.12em;text-transform:uppercase;color:#6a7873;margin:12px 14px 3px}}
.v{{margin:0 14px}} .big{{font:400 30px Fraunces,serif;color:#d4451a}} .m{{font:400 12px Plex,monospace;color:#3d4d49;margin:2px 14px 0}}
.chips{{margin:2px 14px 0;display:flex;gap:6px;flex-wrap:wrap}}
.chips span{{font:500 11px Plex,monospace;padding:3px 7px}} .chips .y{{background:#f5d8cb;color:#8b2a0c}} .chips .n{{background:#d6e7e1;color:#0e5a56}}
.cap{{font:italic 400 17px/1.35 Fraunces,serif;color:#3d4d49}}
.foot{{font:400 11.5px Plex,monospace;color:#6a7873;margin-top:16px;line-height:1.6}}
</style><body>
<h1>One model, three jobs, four photographs</h1>
<p class="sub">SmolVLM2-2.2B running in Lambda, asked the same questions about each photo. Severity 3 every time.</p>
<div class="grid">{''.join(cards)}</div>
<p class="foot">Photos: Wikimedia Commons, CC BY / CC BY-SA, credited in demo-photos/CREDITS.md. Reproduce with scripts/measure_model.py; raw output in docs/measurement/model-measurement.json.</p>
</body>"""
Path(__file__).with_name("fig-model-measurement.html").write_text(page, encoding="utf-8")
print("written", len(rows), "cards")
