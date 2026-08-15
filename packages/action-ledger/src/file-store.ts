import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ActionRecord, LedgerStore } from './index.js';

/**
 * File-backed ledger store used by the local replay so that a killed process
 * can be resumed by a fresh worker without duplicating external mutations
 * (chaos test: process interruption). Writes are atomic (tmp + rename).
 */
export class FileLedgerStore implements LedgerStore {
  constructor(private readonly path: string) {}

  async load(): Promise<ActionRecord[]> {
    if (!existsSync(this.path)) return [];
    return JSON.parse(readFileSync(this.path, 'utf8')) as ActionRecord[];
  }

  async save(records: ActionRecord[]): Promise<void> {
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = join(dirname(this.path), `.ledger-${process.pid}.tmp`);
    writeFileSync(tmp, JSON.stringify(records, null, 2));
    renameSync(tmp, this.path);
  }
}
