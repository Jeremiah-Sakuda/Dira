'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PHASE_TONE } from './status';

interface Entry {
  seq: number;
  atIso: string;
  phase: string;
  message: string;
}

interface DoneSummary {
  status: string;
  slackFinalMin?: number;
  failuresRecovered: number;
  userInterventions: number;
}

/**
 * Watch the engine run live: streams a fresh, real execution of the golden
 * workflow (including the injected 409 and the replan) over SSE.
 */
export function LiveReplay() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<DoneSummary | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<EventSource | null>(null);

  // Close the stream if the viewer navigates away mid-run.
  useEffect(() => () => sourceRef.current?.close(), []);

  const start = useCallback(() => {
    setEntries([]);
    setSummary(null);
    setRunning(true);
    sourceRef.current?.close();
    const source = new EventSource('/api/replay/stream');
    sourceRef.current = source;
    source.addEventListener('entry', (e) => {
      const entry = JSON.parse((e as MessageEvent).data) as Entry;
      setEntries((prev) => [...prev, entry]);
      requestAnimationFrame(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
      });
    });
    source.addEventListener('done', (e) => {
      setSummary(JSON.parse((e as MessageEvent).data) as DoneSummary);
      setRunning(false);
      source.close();
    });
    source.addEventListener('error', () => {
      setRunning(false);
      source.close();
    });
  }, []);

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <div className="section-label" style={{ margin: 0 }}>
          Live run
        </div>
        <button className="btn" onClick={start} disabled={running}>
          {running ? 'Engine running…' : summary ? 'Run it again' : 'Run the 48-Hour Shock live'}
        </button>
        {summary && (
          <span className="mono" style={{ color: 'var(--status-good)' }}>
            {summary.status} · {summary.failuresRecovered} failure recovered ·{' '}
            {summary.userInterventions} user interventions
          </span>
        )}
      </div>
      <div
        ref={logRef}
        className="flight"
        style={{ maxHeight: 420, overflowY: 'auto', minHeight: entries.length ? undefined : 64 }}
      >
        {entries.length === 0 && !running && (
          <div className="muted" style={{ fontFamily: 'inherit' }}>
            Each run executes the full engine server-side — detection, propagation,
            planning, the injected 409, replanning, execution and verification.
          </div>
        )}
        {entries.map((e) => (
          <div className="flight-row" key={e.seq}>
            <span className="flight-time">{e.atIso.slice(11, 19)}</span>
            <span className="flight-phase" style={{ color: PHASE_TONE[e.phase] ?? 'var(--text-primary)' }}>
              {e.phase}
            </span>
            <span className="flight-msg">{e.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
