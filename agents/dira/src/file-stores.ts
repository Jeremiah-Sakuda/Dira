import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { WorkflowRun, WorkflowStore } from './orchestrator.js';

/**
 * File-backed workflow store: the local stand-in for the Firestore
 * `workflow_runs` collection. Atomic writes (tmp + rename) so a crashed
 * process can always be resumed by another worker (PRD §28).
 */
export class FileWorkflowStore implements WorkflowStore {
  constructor(private readonly path: string) {}

  private read(): Record<string, WorkflowRun> {
    if (!existsSync(this.path)) return {};
    return JSON.parse(readFileSync(this.path, 'utf8')) as Record<string, WorkflowRun>;
  }

  async get(id: string): Promise<WorkflowRun | undefined> {
    return this.read()[id];
  }

  async save(run: WorkflowRun): Promise<void> {
    const all = this.read();
    all[run.id] = run;
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = join(dirname(this.path), `.wf-${process.pid}.tmp`);
    writeFileSync(tmp, JSON.stringify(all, null, 2));
    renameSync(tmp, this.path);
  }
}
