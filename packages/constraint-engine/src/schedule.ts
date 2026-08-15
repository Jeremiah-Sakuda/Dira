import {
  type Commitment,
  type DomainState,
  type Interval,
  remainingEffortMin,
} from '@dira/commitment-model';
import { freeSegments } from './capacity.js';
import { effectiveDeadline } from './slack.js';

export interface EffortSession {
  taskId: string;
  interval: Interval; // includes session overhead at the start
  workMinutes: number;
}

/**
 * Deterministic earliest-deadline-first placement of pooled effort into free
 * segments. Used to rebuild the concrete study plan after a repair so the
 * calendar reflects where the solver actually found the hours.
 *
 * Overhead is paid once per sitting (per segment actually used).
 */
export function scheduleEffort(
  state: DomainState,
  extraBusy: Interval[] = [],
): { sessions: EffortSession[]; unplacedMinutes: Record<string, number> } {
  const overhead = state.config.sessionOverheadMin;
  const segments = freeSegments(state, extraBusy);

  const tasks = Object.values(state.commitments)
    .filter((c): c is Commitment => c.kind === 'effort' && c.owner === state.userId)
    .filter((c) => c.status !== 'DROPPED' && c.status !== 'COMPLETE')
    .map((c) => ({ task: c, deadline: effectiveDeadline(state, c), remaining: remainingEffortMin(c) }))
    .filter((t): t is { task: Commitment; deadline: number; remaining: number } =>
      t.deadline !== undefined && t.remaining > 0)
    .sort((a, b) => a.deadline - b.deadline);

  const sessions: EffortSession[] = [];
  const remaining = new Map(tasks.map((t) => [t.task.id, t.remaining]));

  for (const seg of segments) {
    let cursor = seg.start;
    let paidOverhead = false;
    for (const t of tasks) {
      const left = remaining.get(t.task.id)!;
      if (left <= 0) continue;
      if (cursor >= t.deadline) continue;
      const usableEnd = Math.min(seg.end, t.deadline);
      const setup = paidOverhead ? 0 : overhead;
      const room = usableEnd - cursor - setup;
      if (room <= 0) continue;
      const work = Math.min(room, left);
      sessions.push({
        taskId: t.task.id,
        interval: { start: cursor, end: cursor + setup + work },
        workMinutes: work,
      });
      cursor += setup + work;
      paidOverhead = true;
      remaining.set(t.task.id, left - work);
      if (cursor >= seg.end) break;
    }
  }

  const unplacedMinutes: Record<string, number> = {};
  for (const [id, left] of remaining) {
    if (left > 0) unplacedMinutes[id] = left;
  }
  return { sessions, unplacedMinutes };
}
