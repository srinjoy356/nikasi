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

export function Tick({ ok, i = 0 }: { ok: boolean; i?: number }) {
  return (
    <svg className="tick" style={{ ['--i' as string]: i }} viewBox="0 0 24 24" fill="none" stroke={ok ? 'var(--teal)' : 'var(--signal)'}
      strokeWidth="2.4" strokeLinecap="square" role="img" aria-label={ok ? 'passed' : 'failed'}>
      <circle cx="12" cy="12" r="10" strokeWidth="1.6" pathLength={1} />
      <path d={ok ? 'M7 12.5l3.2 3.2L17 8.8' : 'M8 8l8 8M16 8l-8 8'} pathLength={1} />
    </svg>
  );
}

export function fmtHours(h?: number | null) {
  if (h === null || h === undefined) return '—';
  return h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : `${h.toFixed(1)} h`;
}

/** Counts up to `target` on mount and whenever it changes. Shows an em dash until the value exists. */
export function useCount(target: number | undefined, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target === undefined) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return target === undefined ? '—' : String(v);
}

/** Adds `.in` to every `.reveal` element as it scrolls into view. Re-runs when `dep` changes. */
export function useReveal(dep: unknown) {
  useEffect(() => {
    const els = [...document.querySelectorAll('.reveal:not(.in)')];
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [dep]);
}

/** Reveals `text` a few characters at a time. Instant under reduced motion. */
export function useTypewriter(text: string, cps = 80) {
  const [n, setN] = useState(text.length);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(text.length); return; }
    setN(0);
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(text.length, Math.floor(((t - t0) / 1000) * cps));
      setN(k);
      if (k < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, cps]);
  return text.slice(0, n);
}
