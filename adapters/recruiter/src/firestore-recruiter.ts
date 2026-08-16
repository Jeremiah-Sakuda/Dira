import type { Firestore } from '@google-cloud/firestore';
import {
  ToolError,
  type RecruiterBooking,
  type RecruiterSlot,
  type RecruiterTool,
} from '@dira/tool-contracts';
import type { SlotState } from './index.js';

/**
 * CONTROLLED TEST INTEGRATION (PRD §46) — Firestore-backed recruiter
 * scheduling service. This is a stand-in for an external scheduling system,
 * not a claimed third-party integration; it is durable and externally
 * mutable (flip `actuallyAvailable` in the Firestore console right before
 * recording to create the live runtime variable), and bookings survive
 * process restarts, which is what makes crash-resume demonstrable in
 * production mode.
 */
export class FirestoreRecruiterTool implements RecruiterTool {
  constructor(private readonly db: Firestore) {}

  private slotsCol(interviewId: string) {
    return this.db.collection('recruiter_slots').doc(interviewId).collection('slots');
  }
  private bookingsCol() {
    return this.db.collection('recruiter_bookings');
  }

  async seedSlots(interviewId: string, slots: SlotState[]): Promise<void> {
    for (const slot of slots) {
      await this.slotsCol(interviewId).doc(slot.slotId).set({ ...slot });
    }
  }

  async clear(interviewId: string): Promise<void> {
    const snap = await this.slotsCol(interviewId).get();
    for (const doc of snap.docs) await doc.ref.delete();
    const bookings = await this.bookingsCol().where('interviewId', '==', interviewId).get();
    for (const doc of bookings.docs) await doc.ref.delete();
  }

  async getAvailableSlots(interviewId: string): Promise<RecruiterSlot[]> {
    const snap = await this.slotsCol(interviewId).get();
    return snap.docs
      .map((d) => d.data() as SlotState)
      .filter((s) => s.actuallyAvailable || !s.discoveredTaken)
      .map(({ slotId, startIso, endIso }) => ({ slotId, startIso, endIso }));
  }

  async bookSlot(
    interviewId: string,
    slotId: string,
    idempotencyKey: string,
  ): Promise<RecruiterBooking> {
    const keyDoc = this.bookingsCol().doc(idempotencyKey.replace(/\//g, '_'));
    const result = await this.db.runTransaction(async (tx) => {
      const existing = await tx.get(keyDoc);
      if (existing.exists) {
        return { kind: 'booked' as const, booking: existing.data() as RecruiterBooking };
      }

      const slotRef = this.slotsCol(interviewId).doc(slotId);
      const slotSnap = await tx.get(slotRef);
      if (!slotSnap.exists) {
        throw new ToolError(`unknown slot ${slotId}`, 'NOT_FOUND', false);
      }
      const slot = slotSnap.data() as SlotState;
      if (!slot.actuallyAvailable) {
        // Return rather than throw inside the transaction: throwing would
        // roll back discoveredTaken and make every replan retry the same
        // stale listing forever.
        tx.update(slotRef, { discoveredTaken: true });
        return { kind: 'taken' as const, startIso: slot.startIso };
      }
      const booking: RecruiterBooking & { interviewId: string } = {
        bookingId: `bk_${slotId}`,
        slotId,
        startIso: slot.startIso,
        interviewId,
      };
      tx.set(keyDoc, booking);
      tx.set(this.db.collection('recruiter_confirmed').doc(interviewId), booking);
      tx.update(slotRef, { actuallyAvailable: false });
      return { kind: 'booked' as const, booking };
    });
    if (result.kind === 'taken') {
      throw new ToolError(
        `409 SLOT_NO_LONGER_AVAILABLE: ${result.startIso}`,
        'SLOT_NO_LONGER_AVAILABLE',
        false,
      );
    }
    return result.booking;
  }

  async verifyBooking(interviewId: string): Promise<RecruiterBooking | null> {
    const snap = await this.db.collection('recruiter_confirmed').doc(interviewId).get();
    if (!snap.exists) return null;
    const { bookingId, slotId, startIso } = snap.data() as RecruiterBooking;
    return { bookingId, slotId, startIso };
  }
}
