import { useEffect, useRef, useState } from 'react';
import { compress, createReport, getReport, uploadPhoto, whereAmI } from './api';
import { PickMap } from './MapView';
import { Ticket } from './Ticket';
import type { Report } from './types';

export function ReportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState('');
  const [pos, setPos] = useState<[number, number] | undefined>();
  const [acc, setAcc] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [rain, setRain] = useState('');
  const [fast, setFast] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [sent, setSent] = useState<Report | null>(null);

  useEffect(() => { locate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sent) return;
    const t = setInterval(async () => { try { setSent(await getReport(sent.reportId)); } catch { /* keep last */ } }, 3000);
    return () => clearInterval(t);
  }, [sent?.reportId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function locate() {
    try { const p = await whereAmI(); setPos([p.lat, p.lng]); setAcc(Math.round(p.acc)); setMsg(''); }
    catch (e) { setMsg((e as Error).message + '. Tap the map to mark the drain instead.'); }
  }
  async function onFile(f?: File) {
    if (!f) return;
    const b = await compress(f);
    setBlob(b); setPreview(URL.createObjectURL(b));
  }
  async function submit() {
    if (!blob || !pos) return;
    setBusy(true); setMsg('');
    try {
      const up = await uploadPhoto(blob, 'before');
      const r = await createReport({
        reportId: up.reportId, photoKey: up.key, lat: pos[0], lng: pos[1], note,
        simulatedRainMm: rain === '' ? undefined : Number(rain), slaScale: fast ? 0.005 : 1,
      });
      setSent(r);
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  function again() { setSent(null); setBlob(null); setPreview(''); setNote(''); }

  if (sent) {
    return (
      <section className="page narrow">
        <h2>Thank you. We have it.</h2>
        <p className="lede">Your report is being read now. This page updates as it moves, and the ticket is only closed once a new photo shows the drain is clear.</p>
        <Ticket r={sent} />
        <button className="btn ghost" onClick={again}>Report another drain</button>
      </section>
    );
  }
  return (
    <section className="page narrow">
      <h2>Report a blocked drain</h2>
      <p className="lede">One photo and your location. We rank it against the rain forecast and send it to the ward officer.</p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <button className={`photo-btn ${preview ? 'has' : ''}`} onClick={() => fileRef.current?.click()} aria-label="Take or choose a photo of the drain">
        {preview ? <img src={preview} alt="Your drain photo" /> : <span><b>Take a photo of the drain</b><small>Get close enough to see what is blocking it</small></span>}
      </button>

      <div className="field">
        <label>Where is it</label>
        <div className="row">
          <button className="btn small" onClick={locate}>Use my location</button>
          <span className="muted">{pos ? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}${acc ? ` (±${acc} m)` : ''}` : 'No location yet'}</span>
        </div>
        <PickMap value={pos} onPick={(p) => { setPos(p); setAcc(null); }} />
      </div>

      <div className="field">
        <label htmlFor="note">Anything we should know? (optional, Hindi or English)</label>
        <input id="note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. water stands here every monsoon" />
      </div>

      <details className="demo">
        <summary>Demo controls</summary>
        <label>Pretend the forecast says (mm of rain in 48h)
          <input type="number" min="0" value={rain} onChange={(e) => setRain(e.target.value)} placeholder="leave empty for the real forecast" />
        </label>
        <label className="check"><input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} /> Fast timers (minutes become seconds, to watch escalation)</label>
      </details>

      {msg ? <p className="error" role="alert">{msg}</p> : null}
      <button className="btn primary" disabled={!blob || !pos || busy} onClick={submit}>{busy ? 'Sending…' : 'Send report'}</button>
    </section>
  );
}
