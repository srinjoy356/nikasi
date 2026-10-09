import { useEffect, useState } from 'react';
import type { Report } from './types';

export function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}

const STATUS: Record<string, { label: string; tone: string }> = {
  NEW: { label: 'Reading photo', tone: 'info' },
  AWAITING_DISPATCH: { label: 'Needs officer', tone: 'hot' },
  DISPATCHED: { label: 'Crew assigned', tone: 'info' },
  AWAITING_FIX: { label: 'Crew on it', tone: 'info' },
  VERIFYING: { label: 'Checking fix', tone: 'info' },
  CLOSED_VERIFIED: { label: 'Verified', tone: 'ok' },
  FAILED: { label: 'Unresolved', tone: 'hot' },
};
export const statusLabel = (s: string) => STATUS[s]?.label ?? s;
export function StatusChip({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: '' };
  return <span className={`chip ${s.tone}`}>{s.label}</span>;
}

export function Severity({ value = 0 }: { value?: number }) {
  return (
    <span className={`sev ${value >= 4 ? 'hot' : ''}`} role="img" aria-label={`Severity ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= value ? 'on' : ''} />)}
    </span>
  );
}

export const RUNGS = [
  { code: 'JE', name: 'Junior Engineer' },
  { code: 'AE', name: 'Assistant Engineer' },
  { code: 'EE', name: 'Executive Engineer' },
  { code: 'WC', name: 'Ward Commissioner' },
];
export function Ladder({ level }: { level: number }) {
  return (
    <div className="ladder" role="img" aria-label={`Owned by ${RUNGS[Math.min(level, 3)].name}`}>
      {RUNGS.map((r, i) => (
        <div key={r.code} className={`rung ${i < level ? 'past' : i === level ? 'now' : ''}`} title={r.name}>
          <b className="dot" /><span>{r.code}</span>
        </div>
      ))}
    </div>
  );
}

export function fmtLeft(ms: number) {
  const a = Math.abs(Math.round(ms / 1000));
  const t = a >= 3600 ? `${Math.floor(a / 3600)}h ${String(Math.floor((a % 3600) / 60)).padStart(2, '0')}m`
    : a >= 60 ? `${Math.floor(a / 60)}m ${String(a % 60).padStart(2, '0')}s` : `${a}s`;
  return ms >= 0 ? `${t} left` : `${t} overdue`;
}
export function SlaBar({ r }: { r: Report }) {
  const now = useNow();
  if (!r.dueAt || !(r.status === 'AWAITING_DISPATCH' || r.status === 'AWAITING_FIX')) return null;
  const total = (r.status === 'AWAITING_DISPATCH' ? r.dispatchSla : r.fixSla) ?? 0;
  const left = new Date(r.dueAt).getTime() - now;
  const pct = total > 0 ? Math.max(0, Math.min(100, (left / (total * 1000)) * 100)) : 0;
  return (
    <div className={`sla ${left < 0 ? 'late' : ''}`}>
      <div className="row"><span>{r.status === 'AWAITING_DISPATCH' ? 'Dispatch deadline' : 'Fix deadline'}</span><b>{fmtLeft(left)}</b></div>
      <div className="track"><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function Tick({ ok }: { ok: boolean }) {
  return ok ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.4" strokeLinecap="square" aria-label="passed"><circle cx="12" cy="12" r="10" strokeWidth="1.6" /><path d="M7 12.5l3.2 3.2L17 8.8" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--signal)" strokeWidth="2.4" strokeLinecap="square" aria-label="failed"><circle cx="12" cy="12" r="10" strokeWidth="1.6" /><path d="M8 8l8 8M16 8l-8 8" /></svg>
  );
}

export function fmtHours(h?: number | null) {
  if (h === null || h === undefined) return '—';
  return h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${h.toFixed(1)} h`;
}
