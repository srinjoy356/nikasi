import { useRef, useState } from 'react';
import { compress, submitAfter, uploadPhoto, whereAmI } from './api';
import { useReports } from './hooks';
import { Ticket } from './Ticket';
import { StatusChip } from './ui';
import { TYPE, short } from './util';

export function CrewPage() {
  const { reports, error, refresh } = useReports();
  const [sel, setSel] = useState<string | undefined>();
  const [spot, setSpot] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const mine = reports.filter((r) => ['AWAITING_FIX', 'VERIFYING', 'DISPATCHED'].includes(r.status)
    || (r.crew && (r.status === 'CLOSED_VERIFIED' || r.status === 'FAILED')));
  const current = mine.find((r) => r.reportId === sel) || mine[0];

  async function onFile(f?: File) {
    if (!f || !current) return;
    setBusy(true); setMsg('');
    try {
      const blob = await compress(f);
      let geo: { lat: number; lng: number } | undefined;
      if (spot) geo = { lat: current.lat, lng: current.lng }; // demo only: pretend we are standing at the drain
      else { try { const p = await whereAmI(); geo = { lat: p.lat, lng: p.lng }; } catch { geo = undefined; } }
      const up = await uploadPhoto(blob, 'after', current.reportId);
      await submitAfter(current.reportId, { key: up.key, ...geo });
      await refresh();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  return (
    <div className="wrap page">
      <div className="page-h">
        <p className="eyebrow">Crew &middot; Field jobs</p>
        <h1>Clear it, then <em style={{ color: 'var(--signal)' }}>show us.</em></h1>
        <p className="lede">Take an after-photo at the same spot. The ticket closes only if it shows a clear drain, taken here, after you were sent.</p>
      </div>
      {error ? <p className="err" role="alert" style={{ marginBottom: 18 }}>{error}</p> : null}
      <div className="desk">
        <div className="desk-left">
          <ul className="queue">
            {mine.map((r) => (
              <li key={r.reportId}>
                <button className={`qrow ${current?.reportId === r.reportId ? 'sel' : ''}`} onClick={() => setSel(r.reportId)}>
                  <span className="risk">{short(r.reportId)}</span>
                  <span className="t"><b>{TYPE[r.blockType || ''] || 'Drain'}</b><span>{r.crew || ''}</span></span>
                  <span className="side"><StatusChip status={r.status} /></span>
                </button>
              </li>
            ))}
            {!mine.length ? <li className="empty">No jobs yet. Dispatches approved at the officer desk appear here.</li> : null}
          </ul>
        </div>
        <div className="desk-right">
          {current ? (
            <Ticket r={current}>
              {current.status === 'AWAITING_FIX' ? (
                <div className="dispatch">
                  <span className="label">After-photo</span>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                  <button className="btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? 'Uploading…' : <>Take the after-photo <span className="arrow">&rarr;</span></>}</button>
                  <label className="check"><input type="checkbox" checked={spot} onChange={(e) => setSpot(e.target.checked)} />Demo: pretend I am standing at the reported spot.</label>
                  {msg ? <p className="err" role="alert">{msg}</p> : null}
                </div>
              ) : null}
            </Ticket>
          ) : null}
        </div>
      </div>
    </div>
  );
}
