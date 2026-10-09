import type { Report } from './types';

export const TYPE: Record<string, string> = {
  plastic_litter: 'Plastic and litter', silt: 'Silt and mud', debris: 'Debris',
  standing_water: 'Standing water', unclear: 'Unclear',
};
export const isOpen = (r: Report) => !r.status.startsWith('CLOSED') && r.status !== 'FAILED';

/** Risk ramp: calm teal to alarm orange. Colour here is information, never decoration. */
export function riskColor(risk = 0) {
  return risk >= 75 ? '#d4451a' : risk >= 50 ? '#c47d10' : risk >= 25 ? '#6f8f3a' : '#0e5a56';
}
export const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const short = (id: string) => id.slice(0, 4).toUpperCase();
