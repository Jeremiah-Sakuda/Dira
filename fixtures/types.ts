import type { RecruiterSlot } from '@dira/tool-contracts';

/** Shared fixture-side slot shape (mirrors the recruiter adapter's SlotState). */
export interface SlotState extends RecruiterSlot {
  actuallyAvailable: boolean;
  discoveredTaken?: boolean;
}
