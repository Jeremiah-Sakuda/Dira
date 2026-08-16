import { describe, expect, it } from 'vitest';
import { DEMO_SCENARIOS, getDemoScenario } from '../../apps/web/lib/demo-scenarios.js';

describe('judge-controlled demo scenarios', () => {
  it('maps each visible control to a distinct state variation', () => {
    expect(Object.keys(DEMO_SCENARIOS)).toHaveLength(7);
    expect(DEMO_SCENARIOS.early_exam.variation).toEqual({ examHour: 13 });
    expect(DEMO_SCENARIOS.open_slot.variation).toEqual({ firstSlotTaken: false });
    expect(DEMO_SCENARIOS.no_slots.variation).toEqual({ bothSlotsTaken: true });
    expect(DEMO_SCENARIOS.tunde_backup.variation).toEqual({ backupOwner: 'tunde-adebayo' });
    expect(DEMO_SCENARIOS.prep_ahead.variation).toEqual({ prepCompletedMin: 240 });
  });

  it('falls back to the canonical shock for an unknown query value', () => {
    expect(getDemoScenario('tampered').id).toBe('default');
    expect(getDemoScenario(null).variation).toEqual({});
  });
});
