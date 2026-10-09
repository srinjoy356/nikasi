import { useCallback, useEffect, useState } from 'react';
import { getReports, getStats } from './api';
import type { Report, Stats } from './types';

/** Polls the API so every screen shows the workflow moving in near real time. */
export function useReports(ms = 3000) {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([getReports(), getStats()]);
      setReports(r); setStats(s); setError('');
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, ms);
    return () => clearInterval(t);
  }, [refresh, ms]);
  return { reports, stats, error, refresh };
}
