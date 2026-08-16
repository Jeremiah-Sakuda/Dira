'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEMO_SCENARIOS,
  type DemoScenarioId,
} from '../lib/demo-scenarios';
import { PHASE_TONE, StatusPill, Tile } from './status';

interface Entry {
  seq: number;
  atIso: string;
  phase: string;
  message: string;
}

interface DoneSummary {
  status: string;
  slackBeforeMin?: number;
  slackAfterMutationMin?: number;
  slackFinalMin?: number;
  failuresRecovered: number;
  userInterventions: number;
  runtime: 'production' | 'deterministic';
  gemini?: { model: string; latencyMs: number; vertexai: boolean };
}

interface RuntimeStatus {
  mode: 'production' | 'deterministic' | 'unavailable';
  connected: boolean;
  detail: string;
  seeded?: boolean;
}

const fmtSlack = (minutes?: number) =>
  minutes === undefined
    ? '—'
    : `${minutes >= 0 ? '+' : '−'}${(Math.abs(minutes) / 60).toFixed(1)}h`;

/** A judge-controlled run, with its execution boundary visible at all times. */
export function LiveReplay() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<DoneSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<DemoScenarioId>('default');
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    fetch('/api/runtime/status', { cache: 'no-store' })
      .then(async (response) => {
        const status = (await response.json()) as RuntimeStatus;
        setRuntime(status);
      })
      .catch(() =>
        setRuntime({
          mode: 'unavailable',
          connected: false,
          detail: 'Unable to determine runtime status',
        }),
      );
  }, []);

  useEffect(() => () => sourceRef.current?.close(), []);

  const start = useCallback(() => {
    setEntries([]);
    setSummary(null);
    setError(null);
    setRunning(true);
    completedRef.current = false;
    sourceRef.current?.close();

    const source = new EventSource(`/api/replay/stream?scenario=${encodeURIComponent(scenario)}`);
    sourceRef.current = source;
    source.addEventListener('entry', (event) => {
      const entry = JSON.parse((event as MessageEvent).data) as Entry;
      setEntries((previous) => [...previous, entry]);
      requestAnimationFrame(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
      });
    });
    source.addEventListener('done', (event) => {
      completedRef.current = true;
      setSummary(JSON.parse((event as MessageEvent).data) as DoneSummary);
      setRunning(false);
      source.close();
    });
    source.addEventListener('error', (event) => {
      if (event instanceof MessageEvent && event.data) {
        const detail = JSON.parse(event.data) as { message?: string };
        setError(detail.message ?? 'The workflow run failed.');
      } else if (!completedRef.current) {
        setError('The replay stream disconnected before producing a result.');
      }
      setRunning(false);
      source.close();
    });
  }, [scenario]);

  const selected = DEMO_SCENARIOS[scenario];
  const runtimeKind = !runtime
    ? 'neutral'
    : runtime.mode === 'production'
      ? 'good'
      : runtime.mode === 'unavailable'
        ? 'critical'
        : 'warning';

  return (
    <section className="panel live-replay" aria-labelledby="live-run-title">
      <div className="live-heading">
        <div>
          <div className="section-label" id="live-run-title">Judge-controlled run</div>
          <p className="muted">
            Change an input, execute the complete workflow, and inspect every decision and side effect.
          </p>
        </div>
        <div className="runtime-evidence" aria-live="polite">
          <StatusPill
            kind={runtimeKind}
            label={!runtime ? 'CHECKING RUNTIME' : runtime.mode === 'production' ? 'LIVE CLOUD' : runtime.mode === 'unavailable' ? 'CLOUD UNAVAILABLE' : 'DETERMINISTIC EVIDENCE'}
          />
          <span className="muted">{runtime?.detail ?? 'Checking runtime…'}</span>
        </div>
      </div>

      <div className="scenario-controls">
        <label htmlFor="demo-scenario">Test scenario</label>
        <select
          id="demo-scenario"
          value={scenario}
          onChange={(event) => setScenario(event.target.value as DemoScenarioId)}
          disabled={running}
        >
          {Object.entries(DEMO_SCENARIOS).map(([id, item]) => (
            <option key={id} value={id}>{item.label}</option>
          ))}
        </select>
        <button className="btn" onClick={start} disabled={running}>
          {running ? 'Engine running…' : summary ? 'Run selected scenario again' : 'Run selected scenario'}
        </button>
      </div>
      <p className="scenario-description">{selected.description}</p>

      {runtime && runtime.mode !== 'production' && (
        <p className="evidence-note">
          This mode executes the real orchestration, constraint, policy, ledger, replan, and verification code against stateful integration simulators. It does not claim live Google side effects. Configure the server-only Cloud Run URL and demo token to switch this panel to production.
        </p>
      )}
      {error && <p className="error-note" role="alert">{error}</p>}

      {summary && (
        <div className="run-outcome" aria-live="polite">
          <div className="run-outcome-heading">
            <StatusPill kind={summary.status === 'RESOLVED' ? 'good' : 'warning'} label={summary.status} />
            <span>
              {summary.status === 'RESOLVED'
                ? 'Dira repaired the dependency cascade and verified the resulting state.'
                : 'Dira stopped safely because no policy-compliant repair was available.'}
            </span>
          </div>
          <div className="tile-row compact-tiles">
            <Tile k="Slack before" v={fmtSlack(summary.slackBeforeMin)} />
            <Tile k="After trigger" v={fmtSlack(summary.slackAfterMutationMin)} tone={(summary.slackAfterMutationMin ?? 0) < 0 ? 'critical' : 'good'} />
            <Tile k="After repair" v={fmtSlack(summary.slackFinalMin)} tone={(summary.slackFinalMin ?? 0) > 0 ? 'good' : 'warning'} />
            <Tile k="Human actions" v={String(summary.userInterventions)} />
          </div>
          <p className="footnote">
            {summary.failuresRecovered} tool failure{summary.failuresRecovered === 1 ? '' : 's'} {summary.status === 'RESOLVED' ? 'handled' : 'observed'} · runtime: {summary.runtime}
            {summary.gemini ? ` · ${summary.gemini.model} on Vertex AI · ${summary.gemini.latencyMs} ms` : ''}
          </p>
        </div>
      )}

      <div
        ref={logRef}
        className="flight live-flight"
        aria-live="polite"
      >
        {entries.length === 0 && !running && (
          <div className="muted" style={{ fontFamily: 'inherit' }}>
            The recording will show detection, interpretation, graph propagation, planning, policy review, ledgered actions, failure recovery, and postcondition verification.
          </div>
        )}
        {entries.map((entry) => (
          <div className="flight-row" key={entry.seq}>
            <span className="flight-time">{entry.atIso.slice(11, 19)}</span>
            <span className="flight-phase" style={{ color: PHASE_TONE[entry.phase] ?? 'var(--text-primary)' }}>
              {entry.phase}
            </span>
            <span className="flight-msg">{entry.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
