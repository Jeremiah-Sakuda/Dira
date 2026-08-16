import { describe, expect, it } from 'vitest';
import { FirestoreRecruiterTool } from '@dira/adapter-recruiter/firestore';
import { ToolError } from '@dira/tool-contracts';

type DocumentData = Record<string, unknown>;

class FakeDocRef {
  constructor(
    readonly store: Map<string, DocumentData>,
    readonly path: string,
  ) {}

  collection(name: string) {
    return new FakeCollection(this.store, `${this.path}/${name}`);
  }

  async set(data: DocumentData) {
    this.store.set(this.path, structuredClone(data));
  }

  async delete() {
    this.store.delete(this.path);
  }
}

class FakeCollection {
  constructor(
    readonly store: Map<string, DocumentData>,
    readonly path: string,
  ) {}

  doc(id: string) {
    return new FakeDocRef(this.store, `${this.path}/${id}`);
  }

  async get() {
    const prefix = `${this.path}/`;
    const docs = [...this.store.entries()]
      .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
      .map(([key, value]) => ({
        id: key.slice(prefix.length),
        ref: new FakeDocRef(this.store, key),
        data: () => structuredClone(value),
      }));
    return { docs };
  }
}

class FakeTransaction {
  private pending = new Map<string, DocumentData>();

  constructor(private readonly store: Map<string, DocumentData>) {}

  async get(ref: FakeDocRef) {
    const data = this.pending.get(ref.path) ?? this.store.get(ref.path);
    return {
      exists: data !== undefined,
      data: () => data ? structuredClone(data) : undefined,
    };
  }

  set(ref: FakeDocRef, data: DocumentData) {
    this.pending.set(ref.path, structuredClone(data));
  }

  update(ref: FakeDocRef, patch: DocumentData) {
    const current = this.pending.get(ref.path) ?? this.store.get(ref.path) ?? {};
    this.pending.set(ref.path, { ...structuredClone(current), ...structuredClone(patch) });
  }

  commit() {
    for (const [path, data] of this.pending) this.store.set(path, data);
  }
}

class FakeFirestore {
  readonly store = new Map<string, DocumentData>();

  collection(name: string) {
    return new FakeCollection(this.store, name);
  }

  async runTransaction<T>(callback: (transaction: FakeTransaction) => Promise<T>): Promise<T> {
    const transaction = new FakeTransaction(this.store);
    const result = await callback(transaction);
    transaction.commit();
    return result;
  }
}

describe('Firestore recruiter adapter', () => {
  it('commits stale-slot discovery before surfacing a 409', async () => {
    const db = new FakeFirestore();
    const tool = new FirestoreRecruiterTool(
      db as unknown as ConstructorParameters<typeof FirestoreRecruiterTool>[0],
    );
    await tool.seedSlots('interview-1', [{
      slotId: 'thu-10',
      startIso: '2026-09-10T10:00:00-05:00',
      endIso: '2026-09-10T11:00:00-05:00',
      actuallyAvailable: false,
    }]);

    await expect(tool.getAvailableSlots('interview-1')).resolves.toHaveLength(1);
    const failure = await tool.bookSlot('interview-1', 'thu-10', 'wf/action').catch((error) => error);
    expect(failure).toBeInstanceOf(ToolError);
    expect(failure).toMatchObject({ code: 'SLOT_NO_LONGER_AVAILABLE', transient: false });
    await expect(tool.getAvailableSlots('interview-1')).resolves.toEqual([]);
  });
});
