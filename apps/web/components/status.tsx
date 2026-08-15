const STATUS_COLOR: Record<string, string> = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  serious: 'var(--status-serious)',
  critical: 'var(--status-critical)',
  neutral: 'var(--text-muted)',
  accent: 'var(--accent)',
};

/** Status is always icon/dot + label — color never carries meaning alone. */
export function StatusPill({ kind, label }: { kind: keyof typeof STATUS_COLOR & string; label: string }) {
  return (
    <span className="status-pill">
      <span className="status-dot" style={{ background: STATUS_COLOR[kind] ?? STATUS_COLOR.neutral }} />
      {label}
    </span>
  );
}

export function Tile({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="tile">
      <div className="k">{k}</div>
      <div className="v" style={tone ? { color: STATUS_COLOR[tone] } : undefined}>
        {v}
      </div>
    </div>
  );
}

export const PHASE_TONE: Record<string, string> = {
  EVENT: 'var(--text-secondary)',
  INTERPRET: 'var(--accent)',
  GRAPH: 'var(--accent)',
  PROPAGATE: 'var(--accent)',
  FEASIBILITY: 'var(--status-warning)',
  PLAN: 'var(--text-primary)',
  SELECT: 'var(--text-primary)',
  POLICY: 'var(--text-secondary)',
  LEDGER: 'var(--text-secondary)',
  ACTION: 'var(--accent)',
  ERROR: 'var(--status-critical)',
  OBSERVE: 'var(--status-serious)',
  REPLAN: 'var(--status-serious)',
  VERIFY: 'var(--status-good)',
  RESOLVED: 'var(--status-good)',
  WAITING_REVIEW: 'var(--status-warning)',
};
