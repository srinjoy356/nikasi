import type { ReactNode } from 'react';
import type { Report } from './types';
import { TYPE, clock, riskColor, short } from './util';
import { Compare } from './Compare';
import { Ladder, Severity, SlaBar, StatusChip, Tick, useCount } from './ui';

const CHECK_LABEL: Record<string, string> = {
  cleared: 'The drain is clear',
  atPlace: 'Photo taken at the spot',
  afterDispatch: 'Taken after dispatch',
};

const ORDER = ['cleared', 'atPlace', 'afterDispatch'];
const PENDING: Record<string, string> = {
  cleared: 'reading the new photo',
  atPlace: 'comparing its location with the report',
  afterDispatch: 'comparing its time with the dispatch',
};
const delay = (n: number) => ({ ['--i' as string]: n });

export function Ticket({ r, children }: { r: Report; children?: ReactNode }) {
  const v = r.verification;
  const riskShown = useCount(r.risk, 700);
  const closed = r.status === 'CLOSED_VERIFIED';
  const verifying = r.status === 'VERIFYING' && !v;
  const passed = v ? Object.values(v.checks).filter((c) => c.ok).length : 0;
  return (
    <article className={`sheet case ${v ? (v.verified ? 'ring-ok' : 'ring-no') : ''}`} aria-label={`Report ${short(r.reportId)}`}>
      {r.photoUrl && r.afterUrl && v ? <Compare before={r.photoUrl} after={r.afterUrl} /> : r.photoUrl || r.afterUrl ? (
        <div className="case-photos">
          {r.photoUrl ? <figure><img src={r.photoUrl} alt="The reported drain" /><figcaption>Before</figcaption></figure> : null}
          {r.afterUrl ? (
            <figure>
              <img src={r.afterUrl} alt="The drain after the fix" /><figcaption>After</figcaption>
              {verifying ? <div className="scan" aria-hidden="true"><span>Reading after-photo</span></div> : null}
            </figure>
          ) : null}
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

      {verifying ? (
        <div className="case-sec" aria-live="polite">
          <span className="label">Checking the after-photo</span>
          <div className="checks">
            {ORDER.map((k, n) => (
              <div className="check-row wait" style={delay(n)} key={k}>
                <span className="spin" aria-hidden="true" />
                <div><b>{CHECK_LABEL[k]}</b><span>{PENDING[k]}</span></div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {v ? (
        <div className="case-sec verdict">
          <div className="checks">
            {ORDER.filter((k) => v.checks[k]).map((k, n) => (
              <div className="check-row res" style={delay(n)} key={k}>
                <Tick ok={v.checks[k].ok} i={n} />
                <div><b>{CHECK_LABEL[k]}</b><span>{v.checks[k].detail}</span></div>
              </div>
            ))}
          </div>
          <div className="meter" role="img" aria-label={`${passed} of 3 checks passed`}>
            {ORDER.map((k, n) => <i key={k} className={v.checks[k]?.ok ? 'ok' : 'no'} style={delay(n)} />)}
            <span className="mono">{passed} of 3</span>
          </div>
          <div className={`stamp ${v.verified ? '' : 'no'}`} style={{ ['--d' as string]: '1.8s' }}>
            {v.verified ? 'Verified' : 'Rejected'}
            <small>{v.verified ? 'three of three checks' : 'sent back to the crew, one level up'}</small>
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
