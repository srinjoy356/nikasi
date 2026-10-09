import { useRef, useState } from 'react';
import { briefingAudio, dispatchCrew, getBriefing } from './api';
import { useReports } from './hooks';
import { TicketMap } from './MapView';
import { Ticket } from './Ticket';
import { Severity, StatusChip, fmtHours, useCount, useTypewriter } from './ui';
import { TYPE, isOpen, riskColor, short } from './util';

const CREWS = ['Ward crew A', 'Ward crew B', 'Jet-vac team'];

export function OfficerPage() {
  const { reports, stats, error, refresh } = useReports();
  const [sel, setSel] = useState<string | undefined>(location.hash.split('/')[1] || undefined);
  const [crew, setCrew] = useState(CREWS[0]);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [brief, setBrief] = useState('');
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const audio = useRef<HTMLAudioElement>(null);
  const typed = useTypewriter(brief || 'Press play to hear today’s priorities read aloud, or show the text.');
  const nOpen = useCount(stats?.open);
  const nVerified = useCount(stats?.verified);
  const nEsc = useCount(stats?.escalated);

  const open = reports.filter(isOpen);
  const closed = reports.filter((r) => !isOpen(r));
  const current = reports.find((r) => r.reportId === sel) || open[0] || closed[0];

  async function loadBrief(l: 'en' | 'hi') { setLang(l); setBrief((await getBriefing(l)).text); }
  async function play() {
    setBusy(true); setMsg('');
    try {
      const r = await briefingAudio(lang);
      setBrief(r.text);
      const a = audio.current!;
      a.src = r.url;
      a.onplay = () => setPlaying(true);
      a.onended = a.onpause = () => setPlaying(false);
      await a.play();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  async function approve() {
    if (!current) return;
    setMsg('');
    try { await dispatchCrew(current.reportId, crew); await refresh(); }
    catch (e) { setMsg((e as Error).message); }
  }

  return (
    <div className="wrap page">
      <div className="page-h">
        <p className="eyebrow">Officer desk &middot; Ward drainage</p>
        <h1>What to clear <em style={{ color: 'var(--signal)' }}>before the rain.</em></h1>
      </div>

      <div className="strip" style={{ marginBottom: 28 }}>
        <div><b className={stats ? '' : 'skel'}>{nOpen}</b><span className="eyebrow">Open</span></div>
        <div><b className={stats ? '' : 'skel'}>{nVerified}</b><span className="eyebrow">Verified</span></div>
        <div><b className={stats ? '' : 'skel'}>{nEsc}</b><span className="eyebrow">Escalated</span></div>
        <div><b>{fmtHours(stats?.medianHoursToVerified)}</b><span className="eyebrow">Median to verified</span></div>
      </div>
      {error ? <p className="err" role="alert" style={{ marginBottom: 18 }}>{error}</p> : null}

      <div className="desk">
        <div className="desk-left">
          <div className="sheet brief">
            <div className="sheet-h">
              <span className="eyebrow">Morning brief</span>
              <div className="seg" role="group" aria-label="Language">
                <button className={lang === 'en' ? 'on' : ''} onClick={() => loadBrief('en')}>English</button>
                <button className={lang === 'hi' ? 'on' : ''} onClick={() => loadBrief('hi')} lang="hi">हिन्दी</button>
              </div>
            </div>
            <div className="sheet-b" style={{ display: 'grid', gap: 14 }}>
              <p className={`brief-text ${lang === 'hi' ? 'hi' : ''}`}>{typed}</p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn primary sm" onClick={play} disabled={busy}>{busy ? 'Preparing voice…' : 'Play brief'}</button>
                <button className="btn sm" onClick={() => loadBrief(lang)}>Show text</button>
                {playing ? <span className="bars" aria-label="Playing"><i /><i /><i /><i /><i /></span> : null}
              </div>
              <audio ref={audio} />
            </div>
          </div>

          <TicketMap reports={reports} selected={current?.reportId} onSelect={setSel} />

          <div>
            <div className="qh"><h2>Ranked by risk</h2><span className="eyebrow">{open.length} open</span></div>
            <ul className="queue">
              {open.map((r) => (
                <li key={r.reportId}>
                  <button className={`qrow ${current?.reportId === r.reportId ? 'sel' : ''}`} onClick={() => setSel(r.reportId)}>
                    <span className="risk" style={{ color: riskColor(r.risk) }}>{r.risk ?? '…'}</span>
                    <span className="t"><b>Report {short(r.reportId)}</b><span>{TYPE[r.blockType || ''] || 'Reading photo'} &middot; {r.levelName}</span></span>
                    <span className="side"><StatusChip status={r.status} /><Severity value={r.severity} /></span>
                  </button>
                </li>
              ))}
              {!open.length ? <li className="empty">No open drains. Citizen reports appear here, ranked.</li> : null}
            </ul>
          </div>

          {closed.length ? (
            <div>
              <div className="qh"><h2>Closed</h2><span className="eyebrow">{closed.length}</span></div>
              <ul className="queue">
                {closed.map((r) => (
                  <li key={r.reportId}>
                    <button className={`qrow ${current?.reportId === r.reportId ? 'sel' : ''}`} onClick={() => setSel(r.reportId)}>
                      <span className="risk" style={{ color: 'var(--teal)' }}>&#10003;</span>
                      <span className="t"><b>Report {short(r.reportId)}</b><span>{TYPE[r.blockType || ''] || ''}</span></span>
                      <span className="side"><StatusChip status={r.status} /></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="desk-right">
          {current ? (
            <Ticket key={current.reportId} r={current}>
              {current.status === 'AWAITING_DISPATCH' ? (
                <div className="dispatch">
                  <span className="label">Send a crew</span>
                  <div className="row">
                    <select value={crew} onChange={(e) => setCrew(e.target.value)} aria-label="Crew">{CREWS.map((c) => <option key={c}>{c}</option>)}</select>
                    <button className="btn primary" onClick={approve}>Approve dispatch</button>
                  </div>
                  {msg ? <p className="err" role="alert">{msg}</p> : null}
                </div>
              ) : null}
            </Ticket>
          ) : <p className="empty sheet">Select a report.</p>}
        </div>
      </div>
    </div>
  );
}
