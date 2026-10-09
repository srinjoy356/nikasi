import { useEffect, useState } from 'react';
import { getStats } from './api';
import { HeroDrain } from './HeroDrain';
import type { Stats } from './types';
import { fmtHours } from './ui';

function useCount(target: number | undefined, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target === undefined) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return target === undefined ? '—' : String(v);
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
  const open = useCount(s?.open);
  const verified = useCount(s?.verified);
  const escalated = useCount(s?.escalated);

  return (
    <>
      <section className="hero">
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

      <div className="wrap">
        <div className="strip" aria-label="Live numbers from the system">
          <div><b>{open}</b><span className="eyebrow">Open now</span></div>
          <div><b>{verified}</b><span className="eyebrow">Fixed and verified</span></div>
          <div><b>{escalated}</b><span className="eyebrow">Escalated</span></div>
          <div><b>{fmtHours(s?.medianHoursToVerified)}</b><span className="eyebrow">Median to verified</span></div>
        </div>

        <section className="band">
          <div className="band-h"><p className="eyebrow">How it works</p><h2>Five steps, and the last one is the point.</h2></div>
          <div className="steps">
            {STEPS.map((st) => (
              <div className="step" key={st.n}><span className="n">{st.n}</span><h3>{st.h}</h3><p>{st.p}</p></div>
            ))}
          </div>
        </section>

        <section className="band">
          <div className="band-h wide"><p className="eyebrow">What &ldquo;closed&rdquo; means here</p><h2>Three checks. All three, or it stays open.</h2></div>
          <div className="stamps">
            {CHECKS.map((c) => (
              <div className="stamp-card" key={c.h}><span className="eyebrow">{c.e}</span><h4>{c.h}</h4><p>{c.p}</p></div>
            ))}
          </div>
        </section>

        <section className="band">
          <p className="quote">The model describes. <em>Code decides.</em> A person approves.</p>
          <p className="lede" style={{ marginTop: 18, color: 'var(--ink-2)', maxWidth: '58ch' }}>
            On real drain photos a small vision model gave the same answer to every question, but wrote an accurate sentence about every photo.
            So it only writes the sentence. Severity, risk, deadlines and the verification rules are plain, tested code, and the only thing
            that can send a crew is a human.
          </p>
        </section>
      </div>
    </>
  );
}
