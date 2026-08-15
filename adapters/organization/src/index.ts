import type { OrgTask, OrgTaskTool } from '@dira/tool-contracts';

/**
 * Controlled organization task adapter (PRD §46 — a test double standing in
 * for the student org's task tracker).
 */
export class FixtureOrgTaskTool implements OrgTaskTool {
  private tasks = new Map<string, OrgTask>();
  readonly mutationLog: { op: string; id: string; owner?: string }[] = [];

  constructor(seed: OrgTask[] = []) {
    for (const t of seed) this.tasks.set(t.id, { ...t });
  }

  async getTask(id: string): Promise<OrgTask | null> {
    const t = this.tasks.get(id);
    return t ? { ...t } : null;
  }

  async updateOwner(id: string, owner: string): Promise<void> {
    const t = this.tasks.get(id);
    if (!t) throw new Error(`no org task ${id}`);
    if (t.owner === owner) return; // idempotent
    t.owner = owner;
    this.mutationLog.push({ op: 'reassign', id, owner });
  }

  async verifyAssignment(id: string): Promise<{ owner: string } | null> {
    const t = this.tasks.get(id);
    return t ? { owner: t.owner } : null;
  }
}
