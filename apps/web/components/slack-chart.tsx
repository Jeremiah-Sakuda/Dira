/**
 * Global Slack trajectory — a single-series step line (one hue, no legend:
 * the title names the series). Direct labels at each phase point; recessive
 * grid; zero line emphasized because the sign is the story.
 */
export function SlackChart({ points }: { points: { label: string; minutes: number }[] }) {
  const w = 460;
  const h = 170;
  const pad = { l: 46, r: 44, t: 26, b: 30 };
  const values = points.map((p) => p.minutes / 60);
  const min = Math.min(...values, -4);
  const max = Math.max(...values, 5);
  const x = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / (points.length - 1);
  const y = (v: number) => pad.t + ((max - v) * (h - pad.t - pad.b)) / (max - min);

  const path = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Global slack trajectory in hours" style={{ width: '100%', height: 'auto' }}>
      {[4, 0, -4].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'var(--text-muted)' : 'var(--surface-2)'} strokeWidth={v === 0 ? 1.2 : 1} strokeDasharray={v === 0 ? undefined : '3 4'} />
          <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill="var(--text-muted)" fontFamily="var(--mono)">
            {v > 0 ? `+${v.toFixed(0)}h` : `${v.toFixed(0)}h`}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
      {values.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="4.5" fill="var(--accent)" stroke="var(--surface-1)" strokeWidth="2" />
          <text
            x={x(i)}
            y={y(v) + (v >= 0 ? -10 : 16)}
            textAnchor="middle"
            fontSize="11.5"
            fontWeight="700"
            fill="var(--text-primary)"
            fontFamily="var(--mono)"
          >
            {v >= 0 ? '+' : ''}
            {v.toFixed(1)}h
          </text>
          <text x={x(i)} y={h - 8} textAnchor="middle" fontSize="10.5" fill="var(--text-muted)">
            {points[i]!.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
