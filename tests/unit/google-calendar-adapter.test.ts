import { describe, expect, it, vi } from 'vitest';
import { GoogleCalendarTool } from '@dira/adapter-calendar/google';
import { ToolError, type CalendarEvent } from '@dira/tool-contracts';

interface StoredEvent {
  id: string;
  summary?: string | null;
  start?: { dateTime?: string | null };
  end?: { dateTime?: string | null };
  extendedProperties?: { private?: Record<string, string> | null };
}

function fakeCalendar() {
  const events = new Map<string, StoredEvent>();
  let sequence = 0;
  const list = vi.fn(async (params: { privateExtendedProperty?: string[] }) => {
    const requested = params.privateExtendedProperty?.[0]?.replace('diraId=', '');
    const items = [...events.values()].filter(
      (event) => !requested || event.extendedProperties?.private?.diraId === requested,
    );
    return { data: { items } };
  });
  const insert = vi.fn(async (params: { requestBody?: Omit<StoredEvent, 'id'> }) => {
    const id = `google-${++sequence}`;
    events.set(id, { id, ...params.requestBody });
    return { data: { id } };
  });
  const patch = vi.fn(async (params: { eventId: string; requestBody?: Partial<StoredEvent> }) => {
    const existing = events.get(params.eventId)!;
    events.set(params.eventId, { ...existing, ...params.requestBody });
    return { data: events.get(params.eventId) };
  });
  const remove = vi.fn(async (params: { eventId: string }) => {
    events.delete(params.eventId);
    return { data: {} };
  });
  const api = { events: { list, insert, patch, delete: remove } };
  return { api, events, list, insert, patch, remove };
}

const seed: CalendarEvent = {
  id: 'study-econ-1',
  title: 'ECON study',
  startIso: '2026-09-08T09:00:00-05:00',
  endIso: '2026-09-08T10:00:00-05:00',
};

describe('GoogleCalendarTool contract', () => {
  it('creates idempotently, moves, freshly verifies, and deletes idempotently', async () => {
    const fake = fakeCalendar();
    const tool = new GoogleCalendarTool(
      fake.api as unknown as ConstructorParameters<typeof GoogleCalendarTool>[0],
      'dira-demo-calendar',
    );

    await tool.createEvent(seed);
    await tool.createEvent(seed);
    expect(fake.insert).toHaveBeenCalledTimes(1);
    expect([...fake.events.values()][0]?.extendedProperties?.private).toEqual({
      diraId: seed.id,
      managedBy: 'dira',
    });

    await tool.moveEvent(
      seed.id,
      '2026-09-08T15:00:00Z',
      '2026-09-08T16:00:00Z',
    );
    expect(fake.patch).toHaveBeenCalledTimes(1);
    await expect(
      tool.verifyEvent({ id: seed.id, startIso: '2026-09-08T10:00:00-05:00' }),
    ).resolves.toMatchObject({ id: seed.id, title: seed.title });

    await tool.deleteEvent(seed.id);
    await tool.deleteEvent(seed.id);
    expect(fake.remove).toHaveBeenCalledTimes(1);
    await expect(tool.verifyEvent({ id: seed.id })).resolves.toBeNull();
  });

  it('classifies retryable Google API failures as transient tool errors', async () => {
    const fake = fakeCalendar();
    fake.list.mockRejectedValueOnce(Object.assign(new Error('backend unavailable'), { code: 503 }));
    const tool = new GoogleCalendarTool(
      fake.api as unknown as ConstructorParameters<typeof GoogleCalendarTool>[0],
      'dira-demo-calendar',
    );

    const failure = await tool.createEvent(seed).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ToolError);
    expect(failure).toMatchObject({ code: 'HTTP_503', transient: true });
  });
});
