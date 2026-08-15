import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '../components/nav';

export const metadata: Metadata = {
  title: 'Dira — self-healing operating system for your commitments',
  description:
    'Dira detects changes to your commitments, propagates their consequences across your life, and autonomously repairs your plan. One thing changes. Everything adapts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="wordmark">
              DIRA<span>▮</span>
            </div>
            <Nav />
            <div className="tagline">One thing changes. Everything adapts.</div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
