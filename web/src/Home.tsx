import { useEffect, useMemo, useState } from 'react';
import { getReports, getStats } from './api';
import { HeroDrain } from './HeroDrain';
import type { Stats } from './types';
import { fmtHours, useCount, useReveal } from './ui';
import { clock, short } from './util';

/** Faint survey contour lines behind the hero. They drift very slowly. */
function Contours() {
  const lines = useMemo(() => Array.from({ length: 9 }, (_, i) => {
    const pts: string[] = [];
    for (let x = -40; x <= 1400; x += 24) {
      const y = 120 + i * 62 + 34 * Math.sin(x / 210 + i * 0.7) + 18 * Math.sin(x / 90 + i * 1.9);
      pts.push(`${x},${y.toFixed(1)}`);
    }
    return 'M' + pts.join(' L');
  }), []);
  return (
    <svg className="contours" viewBox="0 0 1360 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {lines.map((d, i) => <path key={i} d={d} style={{ animationDelay: `${-i * 3}s` }} />)}
    </svg>
  );
}

/** A slow ribbon of the most recent ledger events across all tickets. Real data, not decoration. */
function Ticker() {
  const [ev, setEv] = useState<{ t: string; label: string }[]>([]);
  useEffect(() => {
    getReports().then((rs) => setEv(
      rs.flatMap((r) => (r.timeline || []).map((e) => ({ t: e.t, label: `${short(r.reportId)} ${e.event}` })))
        .sort((a, b) => b.t.localeCompare(a.t)).slice(0, 16),
    )).catch(() => setEv([]));
  }, []);
  if (ev.length < 4) return null;
  const row = (hidden: boolean) => (
    <div className="ticker-row" aria-hidden={hidden}>
      {ev.map((e, i) => <span key={i}><time>{clock(e.t)}</time>{e.label}</span>)}
    </div>
  );
  return <div className="ticker" role="marquee" aria-label="Recent activity in the system"><div className="ticker-track">{row(false)}{row(true)}</div></div>;
}

const STEPS = [
  { n: '01', h: 'A photo and a pin', p: 'A citizen photographs the drain from the street. The phone adds the location. No account, no form to learn.' },
  { n: '02', h: 'Two readers, one decision', p: 'An open-weight vision model on Lambda describes the photo in a sentence. Amazon Rekognition labels it. Plain code, not a prompt, turns both into a severity from one to five.' },
  { n: '03', h: 'Ranked against the rain', p: 'Each ticket is scored against the forecast for that exact spot and the other open reports within 300 metres. The officer opens the desk to a ranked map and a morning brief read aloud in Hindi.' },
  { n: '04', h: 'A person sends the crew', p: 'Nothing leaves the desk without an officer’s click. If nobody acts before the deadline, the ticket moves up: junior engineer, assistant, executive, ward commissioner.' },
  { n: '05', h: 'Closed only when proven', p: 'The crew photographs the cleared drain. The ticket closes only if three separate checks pass. Otherwise it goes back to the crew, one level higher.' },
];

const CHECKS = [
  { e: 'Check one', h: 'The drain is clear', p: 'The new photo is read with the same two readers. Severity must fall to one, or by at least two levels.' },
  { e: 'Check two', h: 'It is the same spot', p: 'The photo carries its own location. It has to be within 75 metres of the place that was reported.' },
  { e: 'Check three', h: 'It is a new photo', p: 'It must be taken after the dispatch. An old photo, or one sent before the crew arrived, does not count.' },
];

export function Home({ go }: { go: (tab: string) => void }) {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { getStats().then(setS).catch(() => setS(null)); }, []);
  useReveal(s);
  const open = useCount(s?.open);
  const verified = useCount(s?.verified);
  const escalated = useCount(s?.escalated);
  const sk = s ? '' : 'skel';

  return (
    <>
      <section className="hero">
        <Contours />
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow rise">Heat and water &middot; <span className="deva" style={{ letterSpacing: 0, textTransform: 'none', fontSize: 14 }}>निकासी</span></p>
            <h1 className="rise d1">A drain ticket should not close until <em>the photo says so.</em></h1>
            <p className="lede rise d2">Every monsoon, the street that floods is the street whose drain was reported weeks ago. Nikasi ranks every blocked drain against the rain that is coming, and keeps the ticket open until a new photo shows a clear drain.</p>
            <div className="cta rise d3">
              <a className="btn primary" href="#report" onClick={() => go('report')}>Report a drain <span className="arrow">&rarr;</span></a>
              <a className="btn" href="#officer" onClick={() => go('officer')}>Open the officer desk</a>
            </div>
          </div>
          <div className="hero-art rise d2"><HeroDrain /></div>
        </div>
      </section>

      <Ticker />

      <div className="wrap">
        <div className="strip reveal" aria-label="Live numbers from the system">
          <div><b className={sk}>{open}</b><span className="eyebrow">Open now</span></div>
          <div><b className={sk}>{verified}</b><span className="eyebrow">Fixed and verified</span></div>
          <div><b className={sk}>{escalated}</b><span className="eyebrow">Escalated</span></div>
          <div><b className={sk}>{fmtHours(s?.medianHoursToVerified)}</b><span className="eyebrow">Median to verified</span></div>
        </div>

        <section className="band">
          <div className="band-h reveal"><p className="eyebrow">How it works</p><h2>Five steps, and the last one is the point.</h2></div>
          <div className="steps">
            {STEPS.map((st) => (
              <div className="step reveal" key={st.n}><span className="n">{st.n}</span><h3>{st.h}</h3><p>{st.p}</p></div>
            ))}
          </div>
        </section>

        <section className="band">
          <div className="band-h wide reveal"><p className="eyebrow">What &ldquo;closed&rdquo; means here</p><h2>Three checks. All three, or it stays open.</h2></div>
          <div className="stamps">
            {CHECKS.map((c, i) => (
              <div className="stamp-card reveal" style={{ transitionDelay: `${i * 120}ms` }} key={c.h}><span className="eyebrow">{c.e}</span><h4>{c.h}</h4><p>{c.p}</p></div>
            ))}
          </div>
        </section>

        <section className="band">
          <p className="quote reveal">The model describes. <em>Code decides.</em> A person approves.</p>
          <p className="lede reveal" style={{ marginTop: 18, color: 'var(--ink-2)', maxWidth: '58ch', transitionDelay: '120ms' }}>
            On real drain photos a small vision model gave the same answer to every question, but wrote an accurate sentence about every photo.
            So it only writes the sentence. Severity, risk, deadlines and the verification rules are plain, tested code, and the only thing
            that can send a crew is a human.
          </p>
        </section>
      </div>
    </>
  );
}
