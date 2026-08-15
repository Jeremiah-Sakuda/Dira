import { getGoldenRunData } from '../../lib/replay-data';

export const dynamic = 'force-dynamic';

/**
 * The typed commitment graph, laid out by domain column. Edges are the
 * mechanism: propagation walks them, planners cite them, policy checks them.
 */
export default async function GraphPage() {
  const { commitmentsBefore, edges, run } = await getGoldenRunData();
  const nodes = commitmentsBefore.filter((c) => !c.reservesEffortFor);

  const columns: Record<string, string[]> = { academic: [], career: [], organization: [], personal: [] };
  for (const c of nodes) columns[c.domain]?.push(c.id);

  const colX: Record<string, number> = { academic: 120, career: 400, organization: 680, personal: 960 };
  const pos = new Map<string, { x: number; y: number }>();
  for (const [domain, ids] of Object.entries(columns)) {
    ids.forEach((id, i) => pos.set(id, { x: colX[domain]!, y: 90 + i * 92 }));
  }
  const maxY = Math.max(...[...pos.values()].map((p) => p.y)) + 70;
  const title = (id: string) => nodes.find((n) => n.id === id)?.title ?? id;

  const drawable = edges.filter((e) => pos.has(e.from) && pos.has(e.to));

  return (
    <main>
      <h1 className="page-title">Commitment graph</h1>
      <p className="page-sub">
        Typed edges are stored data, not prose: REQUIRES_PREPARATION carries the prep
        deadline, REQUIRES_BUFFER carries the 3h post-exam recovery constraint,
        DELEGATABLE_TO bounds who the planner may propose. Highlighted nodes were
        reached by propagation during the 48-Hour Shock.
      </p>
      <div className="panel" style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 1080 ${maxY}`}
          style={{ minWidth: 900, width: '100%', height: 'auto' }}
          role="img"
          aria-label="Typed commitment graph across academic, career, organization and personal domains"
        >
          {Object.entries(colX).map(([domain, x]) => (
            <text key={domain} x={x} y={40} textAnchor="middle" fontSize="11" letterSpacing="2"
              fill="var(--text-muted)" fontFamily="var(--mono)">
              {domain.toUpperCase()}
            </text>
          ))}
          {drawable.map((e) => {
            const a = pos.get(e.from)!;
            const b = pos.get(e.to)!;
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2 - 14;
            return (
              <g key={e.id}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--border)" strokeWidth="1.4" />
                <text x={midX} y={midY} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="var(--mono)">
                  {e.type}
                </text>
              </g>
            );
          })}
          {nodes.map((n) => {
            const p = pos.get(n.id)!;
            const hit = run.affected.includes(n.id) || n.id === 'econ402-midterm-2';
            return (
              <g key={n.id}>
                <rect
                  x={p.x - 105}
                  y={p.y - 24}
                  width={210}
                  height={48}
                  rx={9}
                  fill={hit ? 'var(--surface-2)' : 'var(--surface-1)'}
                  stroke={hit ? 'var(--accent)' : 'var(--border)'}
                  strokeWidth={hit ? 1.6 : 1}
                />
                <text x={p.x} y={p.y - 2} textAnchor="middle" fontSize="12" fill="var(--text-primary)">
                  {title(n.id).length > 30 ? `${title(n.id).slice(0, 29)}…` : title(n.id)}
                </text>
                <text x={p.x} y={p.y + 15} textAnchor="middle" fontSize="9.5" fill="var(--text-muted)" fontFamily="var(--mono)">
                  {n.flexibility}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </main>
  );
}
