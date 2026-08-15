import {
  type Commitment,
  type DomainState,
  type Interval,
  eventInterval,
  mergeIntervals,
  subtractIntervals,
} from '@dira/commitment-model';

/**
 * CapacityMap — which parts of the user's declared focus windows are actually
 * free for effort work.
 *
 * Busy time = scheduled events + movable blocks + placed windowed tasks owned
 * by the user. Study reservations (`reservesEffortFor`) are deliberately
 * transparent: they mark where pooled effort is intended to happen, they do
 * not consume the capacity that effort is drawn from (that would double
 * count).
 */

export function isSchedulable(c: Commitment): boolean {
  return c.status !== 'DROPPED' && c.status !== 'COMPLETE';
}

export function userBusyIntervals(state: DomainState): Interval[] {
  const busy: Interval[] = [];
  for (const c of Object.values(state.commitments)) {
    if (!isSchedulable(c)) continue;
    if (c.owner !== state.userId) continue;
    if (c.reservesEffortFor) continue; // transparent reservation
    if (c.startMin === undefined || !c.durationMin) continue;
    busy.push(eventInterval(c));
  }
  return mergeIntervals(busy);
}

/** Free focus segments: declared availability minus busy time. */
export function freeSegments(state: DomainState, extraBusy: Interval[] = []): Interval[] {
  const busy = mergeIntervals([...userBusyIntervals(state), ...extraBusy]);
  const out: Interval[] = [];
  for (const window of state.availability) {
    out.push(...subtractIntervals(window, busy));
  }
  return out.sort((a, b) => a.start - b.start);
}

/**
 * Usable minutes of a segment, optionally clipped to end before `before`.
 * Every distinct work session pays a context-switch overhead — a 10-minute
 * gap is not 10 minutes of usable study time.
 */
export function usableMinutes(
  segment: Interval,
  overheadMin: number,
  before?: number,
): number {
  const end = before === undefined ? segment.end : Math.min(segment.end, before);
  const len = end - segment.start;
  return Math.max(0, len - overheadMin);
}

/** Total usable capacity before a deadline across all free segments. */
export function capacityBefore(
  segments: Interval[],
  deadlineMin: number,
  overheadMin: number,
): number {
  let total = 0;
  for (const s of segments) {
    if (s.start >= deadlineMin) continue;
    total += usableMinutes(s, overheadMin, deadlineMin);
  }
  return total;
}
