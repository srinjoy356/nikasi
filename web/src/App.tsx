import { useEffect, useState } from 'react';
import { CrewPage } from './CrewPage';
import { OfficerPage } from './OfficerPage';
import { ReportPage } from './ReportPage';

const TABS = [
  { id: 'report', label: 'Report a drain' },
  { id: 'officer', label: 'Officer desk' },
  { id: 'crew', label: 'Crew' },
] as const;
type Tab = typeof TABS[number]['id'];

const fromHash = (): Tab => (TABS.find((t) => '#' + t.id === location.hash)?.id ?? 'report');

export default function App() {
  const [tab, setTab] = useState<Tab>(fromHash());
  useEffect(() => {
    const on = () => setTab(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return (
    <>
      <header className="top">
        <a className="brand" href="#report" aria-label="Nikasi home">
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8 8 5 11 5 15a7 7 0 0 0 14 0c0-4-3-7-7-13Z" fill="currentColor" /></svg>
          Nikasi
        </a>
        <nav aria-label="Main">
          {TABS.map((t) => <a key={t.id} href={'#' + t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined}>{t.label}</a>)}
        </nav>
      </header>
      <main>
        {tab === 'report' ? <ReportPage /> : tab === 'officer' ? <OfficerPage /> : <CrewPage />}
      </main>
      <footer>Nikasi closes a ticket only when it sees a clear drain. Built for the AWS Environmental Hacks.</footer>
    </>
  );
}
