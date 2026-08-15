/**
 * Time utilities.
 *
 * All engine arithmetic happens in integer minutes relative to the planning
 * horizon start. ISO strings (with explicit UTC offsets) exist only at the
 * boundary: fixtures, adapters, and UI. The demo fixture lives in
 * America/Chicago (-05:00 in August), matching the PRD's example payloads.
 */

export const DEMO_UTC_OFFSET = '-05:00';

/** Minutes since the given horizon start for an ISO-8601 timestamp. */
export function isoToMinutes(iso: string, horizonStartIso: string): number {
  const ms = Date.parse(iso) - Date.parse(horizonStartIso);
  if (Number.isNaN(ms)) throw new Error(`Unparseable timestamp: ${iso}`);
  return Math.round(ms / 60_000);
}

/** ISO-8601 timestamp (fixed demo offset) for minutes past the horizon start. */
export function minutesToIso(minutes: number, horizonStartIso: string): string {
  const startMs = Date.parse(horizonStartIso);
  const d = new Date(startMs + minutes * 60_000);
  // Render in the demo offset rather than the host timezone.
  const offsetMin = 5 * 60; // -05:00
  const local = new Date(d.getTime() - offsetMin * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:00${DEMO_UTC_OFFSET}`
  );
}

/** Pretty "Wed 14:00" label for logs and the flight recorder. */
export function minutesToLabel(minutes: number, horizonStartIso: string): string {
  const iso = minutesToIso(minutes, horizonStartIso);
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
    new Date(Date.parse(iso)).getUTCDay() // offset-shifted below
  ];
  // Recompute weekday in demo-local terms.
  const localMs = Date.parse(iso); // absolute instant
  const shifted = new Date(localMs - 5 * 3600_000);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][shifted.getUTCDay()];
  return `${weekday} ${iso.slice(11, 16)}`;
}

/** Format a signed minute count as hours with one decimal, e.g. +4.1h / -3.6h. */
export function formatSlackHours(minutes: number): string {
  const hours = minutes / 60;
  const sign = hours >= 0 ? '+' : '';
  return `${sign}${hours.toFixed(1)}h`;
}

export interface Interval {
  /** inclusive start, minutes from horizon start */
  start: number;
  /** exclusive end, minutes from horizon start */
  end: number;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Subtract a set of busy intervals from a window, returning free segments. */
export function subtractIntervals(window: Interval, busy: Interval[]): Interval[] {
  const sorted = [...busy]
    .filter((b) => overlaps(window, b))
    .sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  let cursor = window.start;
  for (const b of sorted) {
    if (b.start > cursor) out.push({ start: cursor, end: Math.min(b.start, window.end) });
    cursor = Math.max(cursor, b.end);
    if (cursor >= window.end) break;
  }
  if (cursor < window.end) out.push({ start: cursor, end: window.end });
  return out.filter((s) => s.end > s.start);
}

/** Merge touching/overlapping intervals. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else out.push({ ...iv });
  }
  return out;
}
