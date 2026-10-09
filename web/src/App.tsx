import { useCallback, useEffect, useState } from 'react';
import './fonts';
import { CrewPage } from './CrewPage';
import { Home } from './Home';
import { OfficerPage } from './OfficerPage';
import { ReportPage } from './ReportPage';

const TABS = [
  { id: 'home', label: 'Nikasi', n: '00' },
  { id: 'report', label: 'Report', n: '01' },
  { id: 'officer', label: 'Officer desk', n: '02' },
  { id: 'crew', label: 'Crew', n: '03' },
] as const;
type Tab = typeof TABS[number]['id'];

const fromHash = (): Tab => (TABS.find((t) => t.id === location.hash.slice(1).split('/')[0])?.id ?? 'home');

export default function App() {
  const [tab, setTab] = useState<Tab>(fromHash());
  useEffect(() => {
    const on = () => { setTab(fromHash()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((t: string) => setTab(t as Tab), []);
  useEffect(() => {
    const on = () => document.querySelector('.top')?.classList.toggle('scrolled', scrollY > 8);
    on();
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, []);

  return (
    <>
      <header className="top">
        <div className="top-in">
          <a className="brand" href="#home" aria-label="Nikasi, home"><b>Nikasi</b><span lang="hi">निकासी</span></a>
          <nav className="nav" aria-label="Main">
            {TABS.filter((t) => t.id !== 'home').map((t) => (
              <a key={t.id} href={'#' + t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined}><i>{t.n}</i>{t.label}</a>
            ))}
          </nav>
        </div>
      </header>
      <main key={tab} className="page-in">
        {tab === 'home' ? <Home go={go} /> : null}
        {tab === 'report' ? <ReportPage /> : null}
        {tab === 'officer' ? <OfficerPage /> : null}
        {tab === 'crew' ? <CrewPage /> : null}
      </main>
      <footer className="foot">
        <div className="wrap">
          <p>Nikasi closes a ticket only when it sees a clear drain. Built solo for the AWS Environmental Hacks, Heat and Water track.</p>
          <p>AWS Step Functions &middot; Lambda &middot; Rekognition &middot; Polly &middot; DynamoDB &middot; S3 &middot; API Gateway &middot; Amplify. Map &copy; OpenStreetMap contributors.</p>
        </div>
      </footer>
    </>
  );
}
