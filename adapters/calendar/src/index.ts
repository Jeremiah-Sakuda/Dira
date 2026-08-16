import {
  ToolError,
  type CalendarEvent,
  type CalendarTool,
} from '@dira/tool-contracts';

/**
 * Fixture Calendar adapter — a faithful, stateful stand-in for the Google
 * Calendar API used by the credential-free replay (PRD §38/§46). Supports
 * chaos fault injection: transient 500s on the next N mutating calls.
 *
 * The production adapter in `google-calendar.ts` implements the same
 * contract against one service-account-managed Google Calendar.
 */
export class FixtureCalendarTool implements CalendarTool {
  private events = new Map<string, CalendarEvent>();
  private transientFailuresRemaining = 0;
  /** Every mutation is recorded so tests can assert on external history. */
  readonly mutationLog: { op: string; id: string }[] = [];

  constructor(seed: CalendarEvent[] = []) {
    for (const e of seed) this.events.set(e.id, { ...e });
  }

  injectTransientFailures(count: number): void {
    this.transientFailuresRemaining = count;
  }

  private maybeFail(op: string): void {
    if (this.transientFailuresRemaining > 0) {
      this.transientFailuresRemaining -= 1;
      throw new ToolError(`calendar backend 500 during ${op}`, 'INTERNAL', true);
    }
  }

  async getEvents(): Promise<CalendarEvent[]> {
    return [...this.events.values()].map((e) => ({ ...e }));
  }

  async createEvent(event: CalendarEvent): Promise<{ id: string }> {
    this.maybeFail('createEvent');
    if (this.events.has(event.id)) return { id: event.id }; // idempotent
    this.events.set(event.id, { ...event });
    this.mutationLog.push({ op: 'create', id: event.id });
    return { id: event.id };
  }

  async moveEvent(id: string, startIso: string, endIso: string): Promise<void> {
    this.maybeFail('moveEvent');
    const e = this.events.get(id);
    if (!e) throw new ToolError(`no event ${id}`, 'NOT_FOUND', false);
    e.startIso = startIso;
    e.endIso = endIso;
    this.mutationLog.push({ op: 'move', id });
  }

  async deleteEvent(id: string): Promise<void> {
    this.maybeFail('deleteEvent');
    if (this.events.delete(id)) this.mutationLog.push({ op: 'delete', id });
  }

  async verifyEvent(query: {
    id?: string;
    title?: string;
    startIso?: string;
  }): Promise<CalendarEvent | null> {
    for (const e of this.events.values()) {
      if (query.id && e.id !== query.id) continue;
      if (query.title && e.title !== query.title) continue;
      if (query.startIso && e.startIso !== query.startIso) continue;
      return { ...e };
    }
    return null;
  }
}
