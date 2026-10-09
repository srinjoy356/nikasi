import type { ReactNode } from 'react';
import type { Report } from './types';
import { TYPE, clock, riskColor, short } from './util';
import { Ladder, Severity, SlaBar, StatusChip, Tick, useCount } from './ui';

const CHECK_LABEL: Record<string, string> = {
  cleared: 'The drain is clear',
  atPlace: 'Photo taken at the spot',
  afterDispatch: 'Taken after dispatch',
};

export function Ticket({ r, children }: { r: Report; children?: ReactNode }) {
  const v = r.verification;
  const riskShown = useCount(r.risk, 700);
  const closed = r.status === 'CLOSED_VERIFIED';
  return (
    <article className="sheet case" aria-label={`Report ${short(r.reportId)}`}>
      {r.photoUrl || r.afterUrl ? (
        <div className="case-photos">
          {r.photoUrl ? <figure><img src={r.photoUrl} alt="The reported drain" /><figcaption>Before</figcaption></figure> : null}
          {r.afterUrl ? <figure><img src={r.afterUrl} alt="The drain after the fix" /><figcaption>After</figcaption></figure> : null}
        </div>
      ) : null}

      <div className="case-top">
        <h3>Report {short(r.reportId)}<small>{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</small></h3>
        <StatusChip status={r.status} />
      </div>

      {r.note ? <div className="case-sec"><p className="reads">{r.note}</p></div> : null}

      {r.risk !== undefined ? (
        <div className="case-sec">
          <dl className="facts">
            <div>
              <dt>Risk</dt>
              <dd className="big" style={{ color: riskColor(r.risk) }}>{riskShown}<small>/100</small></dd>
              <div className="riskbar"><i style={{ width: `${r.risk}%`, background: riskColor(r.risk) }} /></div>
            </div>
            <div><dt>Severity</dt><dd><Severity value={r.severity} /></dd></div>
            <div><dt>Blockage</dt><dd>{TYPE[r.blockType || ''] || '—'}</dd></div>
            <div><dt>Rain, 48 h</dt><dd>{r.rainMm ?? 0} mm{r.rainSource === 'simulated' ? <span className="chip warn" style={{ marginLeft: 6 }}>simulated</span> : null}</dd></div>
            <div><dt>Open nearby</dt><dd>{r.clusterCount ?? 0} within 300 m</dd></div>
            <div><dt>Reported</dt><dd className="mono" style={{ fontWeight: 500, fontSize: 13 }}>{clock(r.createdAt)}</dd></div>
          </dl>
        </div>
      ) : null}

      {r.assessment && r.assessment.drainLikely === false ? (
        <div className="case-sec"><p className="warnline" role="note">This photo may not show a drain. Look before sending a crew.</p></div>
      ) : null}

      {r.assessment?.summary ? (
        <div className="case-sec">
          <p className="reads"><span className="eyebrow">What the model sees</span>{r.assessment.summary}</p>
        </div>
      ) : null}

      {r.risk !== undefined && !closed && r.status !== 'FAILED' ? (
        <div className="case-sec">
          <span className="label">Owned by {r.levelName}</span>
          <Ladder level={r.level} />
          <SlaBar r={r} />
        </div>
      ) : null}

      {v ? (
        <div className="case-sec">
          <div className="checks">
            {Object.entries(v.checks).map(([k, c]) => (
              <div className="check-row" key={k}>
                <Tick ok={c.ok} />
                <div><b>{CHECK_LABEL[k] || k}</b><span>{c.detail}</span></div>
              </div>
            ))}
          </div>
          <div className={`stamp ${v.verified ? '' : 'no'}`}>
            {v.verified ? 'Verified' : 'Rejected'}
            <small>{v.verified ? 'three of three checks' : 'sent back to the crew'}</small>
          </div>
        </div>
      ) : null}

      {children ? <div className="case-sec">{children}</div> : null}

      {r.timeline?.length ? (
        <div className="case-sec">
          <details className="fold">
            <summary>Ledger ({r.timeline.length})</summary>
            <ol className="ledger">
              {r.timeline.map((e, i) => (
                <li key={i}><time>{clock(e.t)}</time><div><b>{e.event}</b>{e.detail ? <span>{e.detail}</span> : null}</div></li>
              ))}
            </ol>
          </details>
        </div>
      ) : null}
    </article>
  );
}
