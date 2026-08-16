import type { Firestore } from '@google-cloud/firestore';
import type { OrgTask, OrgTaskTool } from '@dira/tool-contracts';

/**
 * CONTROLLED TEST INTEGRATION (PRD §46) — Firestore-backed org task tracker
 * standing in for the student org's tool. Durable across restarts; owner
 * reassignment is externally inspectable in the Firestore console.
 */
export class FirestoreOrgTaskTool implements OrgTaskTool {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection('org_tasks');
  }

  async seed(tasks: OrgTask[]): Promise<void> {
    for (const t of tasks) await this.col().doc(t.id).set({ ...t });
  }

  async getTask(id: string): Promise<OrgTask | null> {
    const snap = await this.col().doc(id).get();
    return snap.exists ? (snap.data() as OrgTask) : null;
  }

  async updateOwner(id: string, owner: string): Promise<void> {
    const ref = this.col().doc(id);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error(`no org task ${id}`);
      tx.update(ref, { owner });
    });
  }

  async verifyAssignment(id: string): Promise<{ owner: string } | null> {
    const snap = await this.col().doc(id).get();
    return snap.exists ? { owner: (snap.data() as OrgTask).owner } : null;
  }
}
