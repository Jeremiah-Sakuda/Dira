import type { Firestore } from '@google-cloud/firestore';
import type { GmailMessage, GmailTool } from '@dira/tool-contracts';

/**
 * CONTROLLED OUTBOUND MESSAGING (production mode) — notifications land in a
 * durable Firestore `outbound_messages` collection instead of consumer Gmail,
 * which cannot be sent from a service account without domain-wide delegation
 * (see DEVIATIONS.md #5). Inbound triggers arrive via the controlled
 * webhook; reads serve the seeded thread corpus from Firestore so provenance
 * lookups stay real reads of durable state.
 */
export class FirestoreOutboxGmailTool implements GmailTool {
  constructor(private readonly db: Firestore) {}

  private inbox() {
    return this.db.collection('gmail_inbox');
  }
  private outbox() {
    return this.db.collection('outbound_messages');
  }

  async seedInbox(messages: GmailMessage[]): Promise<void> {
    for (const m of messages) await this.inbox().doc(m.messageId).set({ ...m });
  }

  async readMessage(messageId: string): Promise<GmailMessage | null> {
    const snap = await this.inbox().doc(messageId).get();
    return snap.exists ? (snap.data() as GmailMessage) : null;
  }

  async readThread(threadId: string): Promise<GmailMessage[]> {
    const snap = await this.inbox().where('threadId', '==', threadId).get();
    return snap.docs.map((d) => d.data() as GmailMessage);
  }

  async sendReply(threadId: string, to: string, body: string): Promise<{ messageId: string }> {
    const messageId = `out-${threadId}-${Date.now()}`;
    await this.outbox().doc(messageId).set({
      threadId,
      messageId,
      from: process.env.DIRA_AGENT_EMAIL ?? 'dira-agent@dira.demo',
      to,
      subject: 're: (thread)',
      body,
      sentAtIso: new Date().toISOString(),
    });
    return { messageId };
  }

  async verifyReply(threadId: string, bodyContains: string): Promise<boolean> {
    const snap = await this.outbox().where('threadId', '==', threadId).get();
    return snap.docs.some((d) => String((d.data() as { body?: string }).body ?? '').includes(bodyContains));
  }
}
