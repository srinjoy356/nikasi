import { useRef, useState } from 'react';
import { briefingAudio, dispatchCrew, getBriefing } from './api';
import { useReports } from './hooks';
import { TicketMap } from './MapView';
import { Pill, Severity, Ticket } from './Ticket';
import { TYPE, isOpen, riskColor } from './util';

function fmtHours(h?: number | null) {
  if (h === null || h === undefined) return '-';
  return h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${h.toFixed(1)} h`;
}

const CREWS = ['Ward crew A', 'Ward crew B', 'Jet-vac team'];

export function OfficerPage() {
  const { reports, stats, error, refresh } = useReports();
  const [sel, setSel] = useState<string | undefined>();
  const [crew, setCrew] = useState(CREWS[0]);
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [brief, setBrief] = useState('');
  const [playing, setPlaying] = useState(false);
  const [msg, setMsg] = useState('');
  const audio = useRef<HTMLAudioElement>(null);

  const open = reports.filter(isOpen);
  const closed = reports.filter((r) => !isOpen(r));
  const current = reports.find((r) => r.reportId === sel) || open[0] || closed[0];

  async function loadBrief(l = lang) { setBrief((await getBriefing(l)).text); }
  async function play() {
    setPlaying(true); setMsg('');
    try {
      const r = await briefingAudio(lang);
      setBrief(r.text);
      if (audio.current) { audio.current.src = r.url; await audio.current.play(); }
    } catch (e) { setMsg((e as Error).message); }
    setPlaying(false);
  }
  async function approve() {
    if (!current) return;
    setMsg('');
    try { await dispatchCrew(current.reportId, crew); await refresh(); }
    catch (e) { setMsg((e as Error).message); }
  }

  return (
    <section className="page wide">
      <div className="stats">
        <div><b>{stats?.open ?? '-'}</b><span>open</span></div>
        <div><b>{stats?.verified ?? '-'}</b><span>fixed and verified</span></div>
        <div><b>{stats?.escalated ?? '-'}</b><span>escalated</span></div>
        <div><b>{fmtHours(stats?.medianHoursToVerified)}</b><span>median time to verified</span></div>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}

      <div className="brief card">
        <div className="row between">
          <h3>Morning brief</h3>
          <div className="seg" role="group" aria-label="Language">
            <button className={lang === 'en' ? 'on' : ''} onClick={() => { setLang('en'); loadBrief('en'); }}>English</button>
            <button className={lang === 'hi' ? 'on' : ''} onClick={() => { setLang('hi'); loadBrief('hi'); }}>हिन्दी</button>
          </div>
        </div>
        <p className="brief-text">{brief || 'Tap play to hear today\'s priorities, or show the text.'}</p>
        <div className="row">
          <button className="btn small primary" onClick={play} disabled={playing}>{playing ? 'Preparing voice…' : 'Play brief'}</button>
          <button className="btn small" onClick={() => loadBrief()}>Show text</button>
        </div>
        <audio ref={audio} />
      </div>

      <div className="split">
        <div>
          <TicketMap reports={reports} selected={current?.reportId} onSelect={setSel} />
          <h3 className="list-h">Ranked by risk</h3>
          <ul className="queue">
            {open.map((r) => (
              <li key={r.reportId}>
                <button className={current?.reportId === r.reportId ? 'sel' : ''} onClick={() => setSel(r.reportId)}>
                  <span className="score" style={{ background: riskColor(r.risk) }}>{r.risk ?? '…'}</span>
                  <span className="q-main"><b>Report {r.reportId.slice(0, 4)}</b><small>{TYPE[r.blockType || ''] || 'Reading photo'} · {r.levelName}</small></span>
                  <Severity value={r.severity} />
                  <Pill status={r.status} />
                </button>
              </li>
            ))}
            {!open.length ? <li className="empty">No open drains. Reports from citizens appear here.</li> : null}
          </ul>
          {closed.length ? (
            <>
              <h3 className="list-h">Closed</h3>
              <ul className="queue">
                {closed.map((r) => (
                  <li key={r.reportId}>
                    <button className={current?.reportId === r.reportId ? 'sel' : ''} onClick={() => setSel(r.reportId)}>
                      <span className="score" style={{ background: '#2e7d5b' }}>✔</span>
                      <span className="q-main"><b>Report {r.reportId.slice(0, 4)}</b><small>{TYPE[r.blockType || ''] || ''}</small></span>
                      <Pill status={r.status} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div>
          {current ? (
            <Ticket r={current}>
              {current.status === 'AWAITING_DISPATCH' ? (
                <div className="dispatch">
                  <label>Crew
                    <select value={crew} onChange={(e) => setCrew(e.target.value)}>{CREWS.map((c) => <option key={c}>{c}</option>)}</select>
                  </label>
                  <button className="btn primary" onClick={approve}>Approve dispatch</button>
                </div>
              ) : null}
              {msg ? <p className="error" role="alert">{msg}</p> : null}
            </Ticket>
          ) : <p className="empty">Select a report.</p>}
        </div>
      </div>
    </section>
  );
}
