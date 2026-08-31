import type { RawEmailEvent, RawVoiceNote } from '@dira/event-schema';

export interface Gemma3nTranscript {
  transcript: string;
  model: string;
  latencyMs: number;
}

export interface Gemma3nVoiceClientOptions {
  endpointUrl: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Narrow client for a self-hosted Gemma 3n audio service. The service owns
 * audio decoding and model inference; this process only receives a transcript
 * and therefore never grants the open model tool access or planning authority.
 */
export class Gemma3nVoiceClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: Gemma3nVoiceClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async transcribe(note: RawVoiceNote): Promise<Gemma3nTranscript> {
    const response = await this.fetchImpl(`${this.options.endpointUrl.replace(/\/$/, '')}/transcribe`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.options.token ? { 'x-dira-gemma-token': this.options.token } : {}),
      },
      body: JSON.stringify({ audioBase64: note.audioBase64, mimeType: note.mimeType }),
    });
    if (!response.ok) throw new Error(`Gemma 3n transcription failed (${response.status})`);
    const result = await response.json() as Partial<Gemma3nTranscript>;
    if (!result.transcript || !result.model || !Number.isFinite(result.latencyMs)) {
      throw new Error('Gemma 3n service returned an invalid transcript response');
    }
    return result as Gemma3nTranscript;
  }
}

/**
 * The transcript deliberately uses the same event contract as email. Its
 * source remains visible so the interpreter can apply the voice-note-specific
 * owner restriction before a plan can be considered.
 */
export function transcriptToVoiceEvent(note: RawVoiceNote, transcript: Gemma3nTranscript): RawEmailEvent {
  return {
    eventId: note.eventId,
    source: 'gemma_voice_note',
    threadId: `voice-${note.noteId}`,
    messageId: `voice-${note.noteId}`,
    from: note.recordedBy,
    to: 'dira@local',
    subject: 'User voice note — untrusted schedule-change proposal',
    body: transcript.transcript,
    receivedAtIso: note.receivedAtIso,
  };
}
