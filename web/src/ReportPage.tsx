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
    const t = setInterval(async () => { try { setSent(await getReport(sent.reportId)); } catch { /* keep the last view */ } }, 3000);
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
      setSent(await createReport({
        reportId: up.reportId, photoKey: up.key, lat: pos[0], lng: pos[1], note,
        simulatedRainMm: rain === '' ? undefined : Number(rain), slaScale: fast ? 0.005 : 1,
      }));
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  function again() { setSent(null); setBlob(null); setPreview(''); setNote(''); }

  return (
    <div className="wrap page">
      <div className="report-grid">
        <aside className="report-aside">
          <div className="page-h">
            <p className="eyebrow">Citizen report</p>
            <h1>{sent ? <>We have it. <em style={{ color: 'var(--signal)' }}>Thank you.</em></> : 'Report a blocked drain.'}</h1>
            <p className="lede">
              {sent
                ? 'This page keeps updating as your report moves. It is only closed when a new photo shows the drain is clear.'
                : 'One photo and a pin. You do not need an account, and you do not need to know whose drain it is.'}
            </p>
          </div>
          <div className="slip">
            <div className="slip-step"><i>1</i><div><b>Photograph the drain</b><p style={{ color: 'var(--ink-2)' }}>Stand close enough that the blockage fills the frame.</p></div></div>
            <div className="slip-step"><i>2</i><div><b>Confirm where</b><p style={{ color: 'var(--ink-2)' }}>Your phone places the pin. Tap the map to correct it.</p></div></div>
            <div className="slip-step"><i>3</i><div><b>We do the rest</b><p style={{ color: 'var(--ink-2)' }}>It is read, ranked against the rain, and sent to the ward desk.</p></div></div>
          </div>
        </aside>

        {sent ? (
          <div className="rise">
            <Ticket r={sent} />
            <p style={{ marginTop: 18 }}><button className="btn" onClick={again}>Report another drain</button></p>
          </div>
        ) : (
          <div className="sheet rise">
            <div className="sheet-h"><span className="eyebrow">Field slip</span><span className="eyebrow">No login</span></div>
            <div className="sheet-b" style={{ display: 'grid', gap: 22 }}>
              <div className="field">
                <span className="label">1 &middot; Photo</span>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                <button className={`viewfinder ${preview ? 'has' : ''}`} onClick={() => fileRef.current?.click()} aria-label="Take or choose a photo of the drain">
                  {preview ? <img src={preview} alt="Your drain photo" /> : <span className="ph"><b>Add a photo</b><span>take one now or pick from your gallery</span></span>}
                  <i /><i /><i /><i />
                </button>
              </div>

              <div className="field">
                <span className="label">2 &middot; Location</span>
                <div className="row" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn sm" onClick={locate}>Use my location</button>
                  <span className="coords">{pos ? `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}${acc ? `  ±${acc} m` : ''}` : 'No pin yet'}</span>
                </div>
                <PickMap value={pos} onPick={(p) => { setPos(p); setAcc(null); }} />
              </div>

              <div className="field">
                <label htmlFor="note">3 &middot; Anything we should know (optional)</label>
                <input id="note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Hindi or English. For example: water stands here every monsoon" />
              </div>

              <details className="demo">
                <summary>Demo controls</summary>
                <div className="field">
                  <label htmlFor="rain">Pretend the 48 h forecast says (mm)</label>
                  <input id="rain" type="number" min="0" value={rain} onChange={(e) => setRain(e.target.value)} placeholder="Empty uses the real forecast" />
                </div>
                <label className="check"><input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} />Fast timers. Hours become seconds, so you can watch a ticket escalate.</label>
              </details>

              {msg ? <p className="err" role="alert">{msg}</p> : null}
              <button className="btn primary" disabled={!blob || !pos || busy} onClick={submit}>{busy ? 'Sending…' : <>Send report <span className="arrow">&rarr;</span></>}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
