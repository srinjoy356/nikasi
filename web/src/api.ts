import type { Report, Stats } from './types';

const API = (import.meta.env.VITE_API_URL as string).replace(/\/$/, '');

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(API + path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const text = await r.text();
  const data = text ? JSON.parse(text) : {};
  if (!r.ok) throw new Error(data.message || `Request failed (${r.status})`);
  return data as T;
}
const post = <T,>(path: string, body: unknown) => call<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const getReports = () => call<{ reports: Report[] }>('/reports').then((r) => r.reports);
export const getStats = () => call<Stats>('/stats');
export const getBriefing = (lang: string) => call<{ text: string }>(`/briefing?lang=${lang}`);
export const briefingAudio = (lang: string) => post<{ text: string; url: string }>('/briefing/audio', { lang });
export const dispatchCrew = (id: string, crew: string) => post<Report>(`/reports/${id}/dispatch`, { crew });

export async function uploadPhoto(blob: Blob, kind: 'before' | 'after', reportId?: string) {
  const up = await post<{ reportId: string; key: string; url: string; contentType: string }>('/upload-url', { kind, reportId, contentType: 'image/jpeg' });
  const r = await fetch(up.url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
  if (!r.ok) throw new Error('Photo upload failed');
  return up;
}
export const createReport = (b: { reportId: string; photoKey: string; lat: number; lng: number; note: string; simulatedRainMm?: number; slaScale?: number }) =>
  post<Report>('/reports', b);
export const submitAfter = (id: string, b: { key: string; lat?: number; lng?: number }) => post<Report>(`/reports/${id}/after-photo`, b);

/** Shrink a phone photo to ~720px JPEG so uploads work on slow networks. */
export async function compress(file: File, max = 720): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('compress failed'))), 'image/jpeg', 0.82));
}

export function whereAmI(): Promise<{ lat: number; lng: number; acc: number }> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('Location is not available on this device'));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      (e) => rej(new Error(e.message || 'Could not get your location')),
      { enableHighAccuracy: true, timeout: 12000 });
  });
}

export const getReport = (id: string) => call<Report>(`/reports/${id}`);
