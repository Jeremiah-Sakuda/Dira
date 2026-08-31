import type { GoldenVariation } from '@dira/fixtures/golden';

export const DEMO_SCENARIOS = {
  default: {
    label: '48-Hour Shock',
    description: 'A midterm moves 48 hours earlier. Dira must protect study time, rebook the interview, and delegate team QA; the first listed slot is deliberately stale, so it must replan and verify a second.',
    variation: {},
  },
  early_exam: {
    label: 'Earlier exam',
    description: 'Move the exam to 1 PM and test a tighter preparation window.',
    variation: { examHour: 13 },
  },
  late_exam: {
    label: 'Later exam',
    description: 'Move the exam to 3 PM and observe the resulting slack.',
    variation: { examHour: 15 },
  },
  open_slot: {
    label: 'First slot open',
    description: 'The preferred interview slot succeeds; no conflict recovery is required.',
    variation: { firstSlotTaken: false },
  },
  no_slots: {
    label: 'No slots available',
    description: 'Both recruiter slots are gone; Dira must stop safely instead of fabricating success.',
    variation: { bothSlotsTaken: true },
  },
  tunde_backup: {
    label: 'Alternate task owner',
    description: 'Tunde is the backup owner for the delegated project task.',
    variation: { backupOwner: 'tunde-adebayo' },
  },
  prep_ahead: {
    label: 'Prep ahead',
    description: 'Four hours of preparation are already complete before the trigger.',
    variation: { prepCompletedMin: 240 },
  },
} as const satisfies Record<
  string,
  { label: string; description: string; variation: GoldenVariation }
>;

export type DemoScenarioId = keyof typeof DEMO_SCENARIOS;

export function getDemoScenario(value: string | null): {
  id: DemoScenarioId;
  label: string;
  description: string;
  variation: GoldenVariation;
} {
  const id = value && value in DEMO_SCENARIOS ? (value as DemoScenarioId) : 'default';
  return { id, ...DEMO_SCENARIOS[id] };
}
