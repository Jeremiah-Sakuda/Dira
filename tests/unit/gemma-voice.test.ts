import { describe, expect, it, vi } from 'vitest';
import { Gemma3nVoiceClient, transcriptToVoiceEvent } from '@dira/gemma-voice';
import type { RawVoiceNote } from '@dira/event-schema';

const note: RawVoiceNote = {
  eventId: 'voice-event-1',
  noteId: 'note-1',
  recordedBy: 'sam.adeyemi@dira.demo',
  audioBase64: 'A'.repeat(40),
  mimeType: 'audio/webm',
  receivedAtIso: '2026-08-18T08:30:00-05:00',
};

describe('Gemma 3n voice intake boundary', () => {
  it('forwards audio only to the narrow transcription endpoint', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      transcript: 'Professor Chen moved ECON 402 Midterm 2 to Wednesday at 2 PM.',
      model: 'google/gemma-3n-E2B-it',
      latencyMs: 481,
    }), { status: 200 }));
    const client = new Gemma3nVoiceClient({
      endpointUrl: 'https://gemma.example/', token: 'voice-secret', fetchImpl,
    });

    const result = await client.transcribe(note);

    expect(result.model).toBe('google/gemma-3n-E2B-it');
    expect(fetchImpl).toHaveBeenCalledWith('https://gemma.example/transcribe', expect.objectContaining({
      headers: expect.objectContaining({ 'x-dira-gemma-token': 'voice-secret' }),
    }));
    const request = fetchImpl.mock.calls[0]?.[1];
    expect(String(request?.body)).toContain(note.audioBase64);
  });

  it('turns the transcript into a visibly untrusted, owner-scoped voice event', () => {
    const event = transcriptToVoiceEvent(note, {
      transcript: 'Move my ECON 402 Midterm 2 to Wednesday at 2 PM.',
      model: 'google/gemma-3n-E2B-it', latencyMs: 481,
    });
    expect(event.source).toBe('gemma_voice_note');
    expect(event.from).toBe(note.recordedBy);
    expect(event.body).toContain('ECON 402');
  });
});
