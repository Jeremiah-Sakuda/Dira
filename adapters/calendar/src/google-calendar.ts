import type { calendar_v3 } from 'googleapis';
import {
  ToolError,
  type CalendarEvent,
  type CalendarTool,
} from '@dira/tool-contracts';

/**
 * REAL Google Calendar adapter (production mode).
 *
 * Runs as the Cloud Run service account against a calendar the service
 * account itself owns (created by `ensureDemoCalendar`, then shared to the
 * demo user's Google account via an ACL grant) — narrow authority by
 * construction: the agent can only touch this one calendar.
 *
 * Dira's stable ids ride in `extendedProperties.private.diraId` because
 * Calendar's own event ids don't accept our id alphabet. Every mutation is
 * verifiable by an independent re-read keyed on that property.
 */
export class GoogleCalendarTool implements CalendarTool {
  constructor(
    private readonly api: calendar_v3.Calendar,
    private readonly calendarId: string,
  ) {}

  static async create(calendarId: string): Promise<GoogleCalendarTool> {
    const api = await calendarClient();
    return new GoogleCalendarTool(api, calendarId);
  }

  private async findByDiraId(diraId: string): Promise<calendar_v3.Schema$Event | null> {
    const res = await this.api.events.list({
      calendarId: this.calendarId,
      privateExtendedProperty: [`diraId=${diraId}`],
      maxResults: 2,
      showDeleted: false,
      singleEvents: true,
    });
    return res.data.items?.[0] ?? null;
  }

  private toCalendarEvent(e: calendar_v3.Schema$Event): CalendarEvent {
    return {
      id: e.extendedProperties?.private?.diraId ?? e.id ?? '',
      title: e.summary ?? '',
      startIso: e.start?.dateTime ?? '',
      endIso: e.end?.dateTime ?? '',
      metadata: { googleEventId: e.id ?? '' },
    };
  }

  async getEvents(): Promise<CalendarEvent[]> {
    const res = await this.api.events.list({
      calendarId: this.calendarId,
      maxResults: 250,
      singleEvents: true,
      showDeleted: false,
    });
    return (res.data.items ?? [])
      .filter((e: calendar_v3.Schema$Event) => e.extendedProperties?.private?.diraId)
      .map((e: calendar_v3.Schema$Event) => this.toCalendarEvent(e));
  }

  async createEvent(event: CalendarEvent): Promise<{ id: string }> {
    try {
      const existing = await this.findByDiraId(event.id);
      if (existing) return { id: event.id }; // idempotent
      await this.api.events.insert({
        calendarId: this.calendarId,
        requestBody: {
          summary: event.title,
          start: { dateTime: event.startIso },
          end: { dateTime: event.endIso },
          extendedProperties: { private: { diraId: event.id, managedBy: 'dira' } },
        },
      });
      return { id: event.id };
    } catch (err) {
      throw asToolError(err, 'createEvent');
    }
  }

  async moveEvent(id: string, startIso: string, endIso: string): Promise<void> {
    try {
      const existing = await this.findByDiraId(id);
      if (!existing?.id) throw new ToolError(`no calendar event for ${id}`, 'NOT_FOUND', false);
      await this.api.events.patch({
        calendarId: this.calendarId,
        eventId: existing.id,
        requestBody: {
          start: { dateTime: startIso },
          end: { dateTime: endIso },
        },
      });
    } catch (err) {
      throw asToolError(err, 'moveEvent');
    }
  }

  async deleteEvent(id: string): Promise<void> {
    try {
      const existing = await this.findByDiraId(id);
      if (!existing?.id) return; // idempotent
      await this.api.events.delete({ calendarId: this.calendarId, eventId: existing.id });
    } catch (err) {
      throw asToolError(err, 'deleteEvent');
    }
  }

  /** Independent verification read — a fresh query, never a cached response. */
  async verifyEvent(query: {
    id?: string;
    title?: string;
    startIso?: string;
  }): Promise<CalendarEvent | null> {
    if (!query.id) return null;
    const found = await this.findByDiraId(query.id);
    if (!found) return null;
    const event = this.toCalendarEvent(found);
    if (query.title && event.title !== query.title) return null;
    if (query.startIso && !sameInstant(event.startIso, query.startIso)) return null;
    return event;
  }
}

function sameInstant(a: string, b: string): boolean {
  return !!a && !!b && Date.parse(a) === Date.parse(b);
}

function asToolError(err: unknown, op: string): ToolError {
  if (err instanceof ToolError) return err;
  const e = err as { code?: number; message?: string };
  const status = typeof e.code === 'number' ? e.code : 0;
  const transient = status >= 500 || status === 429;
  return new ToolError(`calendar ${op} failed: ${e.message ?? String(err)}`, `HTTP_${status || 'ERR'}`, transient);
}

async function calendarClient(): Promise<calendar_v3.Calendar> {
  const { google } = await import('googleapis');
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

/**
 * Create (or fetch) the service-account-owned demo calendar and share it with
 * the human demo account so the judge/video can watch mutations land in the
 * real Google Calendar UI.
 */
export async function ensureDemoCalendar(
  summary: string,
  shareWithEmail?: string,
): Promise<{ calendarId: string; created: boolean }> {
  const api = await calendarClient();
  const list = await api.calendarList.list({ maxResults: 100 });
  const existing = list.data.items?.find((c: calendar_v3.Schema$CalendarListEntry) => c.summary === summary);
  if (existing?.id) return { calendarId: existing.id, created: false };

  const created = await api.calendars.insert({
    requestBody: { summary, timeZone: 'America/Chicago' },
  });
  const calendarId = created.data.id!;
  if (shareWithEmail) {
    await api.acl.insert({
      calendarId,
      requestBody: {
        role: 'writer',
        scope: { type: 'user', value: shareWithEmail },
      },
    });
  }
  return { calendarId, created: true };
}
