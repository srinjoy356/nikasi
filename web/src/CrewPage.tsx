import { useRef, useState } from 'react';
import { compress, submitAfter, uploadPhoto, whereAmI } from './api';
import { useReports } from './hooks';
import { Pill, Ticket } from './Ticket';
import { TYPE } from './util';

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
    <section className="page narrow">
      <h2>Crew</h2>
      <p className="lede">Clear the drain, then take an after-photo at the same spot. The ticket closes only if the photo shows a clear drain.</p>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {!mine.length ? <p className="empty">No jobs yet. Approved dispatches appear here.</p> : null}
      <ul className="queue">
        {mine.map((r) => (
          <li key={r.reportId}>
            <button className={current?.reportId === r.reportId ? 'sel' : ''} onClick={() => setSel(r.reportId)}>
              <span className="q-main"><b>Report {r.reportId.slice(0, 4)}</b><small>{TYPE[r.blockType || ''] || ''} · {r.crew || ''}</small></span>
              <Pill status={r.status} />
            </button>
          </li>
        ))}
      </ul>
      {current ? (
        <Ticket r={current}>
          {current.status === 'AWAITING_FIX' ? (
            <div className="dispatch">
              <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
              <button className="btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? 'Uploading…' : 'Take the after-photo'}</button>
              <label className="check"><input type="checkbox" checked={spot} onChange={(e) => setSpot(e.target.checked)} /> Demo: pretend I am at the reported spot</label>
            </div>
          ) : null}
          {msg ? <p className="error" role="alert">{msg}</p> : null}
        </Ticket>
      ) : null}
    </section>
  );
}
