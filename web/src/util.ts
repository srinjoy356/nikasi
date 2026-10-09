import type { Report } from './types';

export const STATUS: Record<string, { label: string; tone: 'info' | 'warn' | 'ok' | 'bad' }> = {
  NEW: { label: 'Reading the photo', tone: 'info' },
  AWAITING_DISPATCH: { label: 'Waiting for an officer', tone: 'warn' },
  DISPATCHED: { label: 'Crew assigned', tone: 'info' },
  AWAITING_FIX: { label: 'Crew is on it', tone: 'info' },
  VERIFYING: { label: 'Checking the fix', tone: 'info' },
  CLOSED_VERIFIED: { label: 'Fixed and verified', tone: 'ok' },
  FAILED: { label: 'Unresolved', tone: 'bad' },
};
export const TYPE: Record<string, string> = {
  plastic_litter: 'Plastic and litter', silt: 'Silt and mud', debris: 'Debris',
  standing_water: 'Standing water', unclear: 'Unclear',
};
export const isOpen = (r: Report) => !r.status.startsWith('CLOSED') && r.status !== 'FAILED';
export const riskColor = (risk = 0) => (risk >= 75 ? '#c62828' : risk >= 50 ? '#e08600' : risk >= 25 ? '#b59a00' : '#2e7d5b');

export function timeLeft(due?: string, now = Date.now()) {
  if (!due) return '';
  const s = Math.round((new Date(due).getTime() - now) / 1000);
  const a = Math.abs(s);
  const t = a >= 3600 ? `${Math.floor(a / 3600)}h ${Math.floor((a % 3600) / 60)}m` : a >= 60 ? `${Math.floor(a / 60)}m ${a % 60}s` : `${a}s`;
  return s >= 0 ? `${t} left` : `${t} overdue`;
}
export const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
