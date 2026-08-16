import type { GmailMessage, GmailTool } from '@dira/tool-contracts';

/**
 * Fixture Gmail adapter for the credential-free replay. Read operations serve
 * the seeded inbox; sendReply appends to the thread so verifyReply performs a
 * genuine independent read of "external" state.
 *
 * Production intentionally uses a Firestore inbox/outbox adapter: it is a
 * controlled integration surface and is not presented as Gmail delivery.
 * See `firestore-outbox.ts` and DEVIATIONS.md #5.
 */
export class FixtureGmailTool implements GmailTool {
  private messages: GmailMessage[] = [];
  private sentCounter = 0;

  constructor(seed: GmailMessage[] = []) {
    this.messages = seed.map((m) => ({ ...m }));
  }

  async readMessage(messageId: string): Promise<GmailMessage | null> {
    return this.messages.find((m) => m.messageId === messageId) ?? null;
  }

  async readThread(threadId: string): Promise<GmailMessage[]> {
    return this.messages.filter((m) => m.threadId === threadId).map((m) => ({ ...m }));
  }

  async sendReply(threadId: string, to: string, body: string): Promise<{ messageId: string }> {
    const messageId = `sent-${++this.sentCounter}`;
    this.messages.push({
      threadId,
      messageId,
      from: 'dira@student.demo',
      to,
      subject: 're: (thread)',
      body,
    });
    return { messageId };
  }

  async verifyReply(threadId: string, bodyContains: string): Promise<boolean> {
    return this.messages.some(
      (m) => m.threadId === threadId && m.from === 'dira@student.demo' && m.body.includes(bodyContains),
    );
  }

  sent(): GmailMessage[] {
    return this.messages.filter((m) => m.from === 'dira@student.demo').map((m) => ({ ...m }));
  }
}
