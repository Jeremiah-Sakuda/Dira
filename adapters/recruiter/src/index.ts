import {
  ToolError,
  type RecruiterBooking,
  type RecruiterSlot,
  type RecruiterTool,
} from '@dira/tool-contracts';

export interface SlotState extends RecruiterSlot {
  /**
   * Ground truth on the recruiter's side. A slot can be *listed* while no
   * longer actually available — exactly the stale-listing race the golden
   * workflow exercises: booking it returns 409 SLOT_NO_LONGER_AVAILABLE and
   * the next availability read reflects reality.
   */
  actuallyAvailable: boolean;
  /** Set once a 409 has revealed the truth; listings then exclude the slot. */
  discoveredTaken?: boolean;
}

/**
 * Controlled recruiter scheduling service (PRD §46 — a test double for an
 * external scheduling system, not a claimed third-party integration).
 */
export class FixtureRecruiterTool implements RecruiterTool {
  private slots = new Map<string, SlotState[]>();
  private bookingsByKey = new Map<string, RecruiterBooking>();
  private interviewBookings = new Map<string, RecruiterBooking>();
  private bookingCounter = 0;
  readonly bookAttempts: { interviewId: string; slotId: string; outcome: string }[] = [];

  setSlots(interviewId: string, slots: SlotState[]): void {
    this.slots.set(interviewId, slots.map((s) => ({ ...s })));
  }

  /** Chaos hook: flip ground-truth availability at runtime. */
  markSlotTaken(interviewId: string, slotId: string): void {
    const slot = this.slots.get(interviewId)?.find((s) => s.slotId === slotId);
    if (slot) slot.actuallyAvailable = false;
  }

  async getAvailableSlots(interviewId: string): Promise<RecruiterSlot[]> {
    // Listings hide slots already discovered to be gone, but a slot that is
    // taken-but-not-yet-discovered still shows up — as in real schedulers.
    return (this.slots.get(interviewId) ?? [])
      .filter((s) => s.actuallyAvailable || !s.discoveredTaken)
      .map(({ slotId, startIso, endIso }) => ({ slotId, startIso, endIso }));
  }

  async bookSlot(
    interviewId: string,
    slotId: string,
    idempotencyKey: string,
  ): Promise<RecruiterBooking> {
    const existing = this.bookingsByKey.get(idempotencyKey);
    if (existing) return { ...existing }; // idempotent re-delivery

    const slot = this.slots.get(interviewId)?.find((s) => s.slotId === slotId);
    if (!slot) {
      this.bookAttempts.push({ interviewId, slotId, outcome: 'NOT_FOUND' });
      throw new ToolError(`unknown slot ${slotId}`, 'NOT_FOUND', false);
    }
    if (!slot.actuallyAvailable) {
      slot.discoveredTaken = true;
      this.bookAttempts.push({ interviewId, slotId, outcome: '409' });
      throw new ToolError(
        `409 SLOT_NO_LONGER_AVAILABLE: ${slot.startIso}`,
        'SLOT_NO_LONGER_AVAILABLE',
        false,
      );
    }
    const booking: RecruiterBooking = {
      bookingId: `bk_${++this.bookingCounter}`,
      slotId,
      startIso: slot.startIso,
    };
    this.bookingsByKey.set(idempotencyKey, booking);
    this.interviewBookings.set(interviewId, booking); // rebooking replaces
    slot.actuallyAvailable = false;
    this.bookAttempts.push({ interviewId, slotId, outcome: 'BOOKED' });
    return { ...booking };
  }

  async verifyBooking(interviewId: string): Promise<RecruiterBooking | null> {
    const b = this.interviewBookings.get(interviewId);
    return b ? { ...b } : null;
  }
}
