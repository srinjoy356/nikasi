import { useEffect, useState } from 'react';
import type { Report } from './types';
import { STATUS, TYPE, clock, riskColor, timeLeft } from './util';

export function Pill({ status }: { status: string }) {
  const s = STATUS[status] || { label: status, tone: 'info' };
  return <span className={`pill ${s.tone}`}>{s.label}</span>;
}

export function Severity({ value = 0 }: { value?: number }) {
  return (
    <span className="sev" aria-label={`Severity ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= value ? 'on' : ''} />)}
    </span>
  );
}

export function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}

const CHECK_LABEL: Record<string, string> = {
  cleared: 'Drain is clear', atPlace: 'Photo is at the spot', afterDispatch: 'Taken after dispatch',
};

export function Ticket({ r, children }: { r: Report; children?: React.ReactNode }) {
  const now = useNow();
  const waiting = r.status === 'AWAITING_DISPATCH' || r.status === 'AWAITING_FIX';
  return (
    <article className="ticket">
      <div className="photos">
        {r.photoUrl ? <figure><img src={r.photoUrl} alt="Reported drain" /><figcaption>Reported</figcaption></figure> : null}
        {r.afterUrl ? <figure><img src={r.afterUrl} alt="After the fix" /><figcaption>After the fix</figcaption></figure> : null}
      </div>
      <header>
        <h3>Report {r.reportId.slice(0, 4)}</h3>
        <Pill status={r.status} />
      </header>
      {r.note ? <p className="note">&ldquo;{r.note}&rdquo;</p> : null}
      {r.risk !== undefined ? (
        <dl className="facts">
          <div><dt>Risk</dt><dd><b style={{ color: riskColor(r.risk) }}>{r.risk}</b> / 100</dd></div>
          <div><dt>Severity</dt><dd><Severity value={r.severity} /></dd></div>
          <div><dt>Blockage</dt><dd>{TYPE[r.blockType || ''] || '-'}</dd></div>
          <div><dt>Rain, next 48h</dt><dd>{r.rainMm ?? 0} mm{r.rainSource === 'simulated' ? ' (simulated)' : ''}</dd></div>
          <div><dt>Other reports nearby</dt><dd>{r.clusterCount ?? 0}</dd></div>
          <div><dt>Owner</dt><dd>{r.levelName}</dd></div>
        </dl>
      ) : null}
      {r.assessment && r.assessment.drainLikely === false ? (
        <p className="warnline" role="note">This photo may not show a drain. Check it before sending a crew.</p>
      ) : null}
      {r.assessment?.summary ? <p className="reads"><b>What the model sees:</b> {r.assessment.summary}</p> : null}
      {waiting && r.dueAt ? (
        <p className={`due ${new Date(r.dueAt).getTime() < now ? 'late' : ''}`}>{timeLeft(r.dueAt, now)} before it escalates</p>
      ) : null}
      {r.verification ? (
        <div className={`verify ${r.verification.verified ? 'ok' : 'bad'}`}>
          <strong>{r.verification.verified ? 'Fix verified' : 'Fix rejected'}</strong>
          <ul>
            {Object.entries(r.verification.checks).map(([k, c]) => (
              <li key={k}><span>{c.ok ? '✔' : '✘'}</span> {CHECK_LABEL[k] || k}: {c.detail}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {children}
      {r.timeline?.length ? (
        <details className="timeline">
          <summary>Timeline ({r.timeline.length})</summary>
          <ol>
            {r.timeline.map((e, i) => (
              <li key={i}><time>{clock(e.t)}</time><b>{e.event}</b>{e.detail ? <span>{e.detail}</span> : null}</li>
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  );
}
