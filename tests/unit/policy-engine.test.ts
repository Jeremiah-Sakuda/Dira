import { describe, expect, it } from 'vitest';
import { evaluateAction, evaluatePlanActions } from '@dira/policy-engine';
import type { PlannedAction } from '@dira/event-schema';
import { at, buildGoldenFixture, IDS, SLOT_PROVENANCE } from '@dira/fixtures/golden';

const { state } = buildGoldenFixture();

const action = (overrides: Partial<PlannedAction>): PlannedAction => ({
  type: 'MOVE_CALENDAR_EVENT',
  target: IDS.workout,
  desired_state: { start_min: at(1, 16) },
  provenance: ['user_policy_config'],
  external_system: 'calendar',
  summary: 'test action',
  ...overrides,
});

describe('autonomy policy engine (PRD §21)', () => {
  it('allows moving optional/flexible blocks', () => {
    expect(evaluateAction(state, action({ target: IDS.workout })).verdict).toBe('ALLOW');
    expect(evaluateAction(state, action({ target: IDS.sideProject })).verdict).toBe('ALLOW');
  });

  it('denies moving FIXED commitments', () => {
    const d = evaluateAction(state, action({ target: IDS.exam }));
    expect(d.verdict).toBe('DENY');
    expect(d.rule).toBe('fixed-commitment-immovable');
  });

  it('allows booking only recruiter-approved slots with cited provenance', () => {
    const good = evaluateAction(
      state,
      action({
        type: 'BOOK_INTERVIEW_SLOT',
        target: IDS.interview,
        desired_state: { start_min: at(2, 13) },
        provenance: [SLOT_PROVENANCE],
      }),
    );
    expect(good.verdict).toBe('ALLOW');

    const wrongSlot = evaluateAction(
      state,
      action({
        type: 'BOOK_INTERVIEW_SLOT',
        target: IDS.interview,
        desired_state: { start_min: at(2, 15) },
        provenance: [SLOT_PROVENANCE],
      }),
    );
    expect(wrongSlot.verdict).toBe('DENY');

    const missingProvenance = evaluateAction(
      state,
      action({
        type: 'BOOK_INTERVIEW_SLOT',
        target: IDS.interview,
        desired_state: { start_min: at(2, 13) },
        provenance: ['made-up-source'],
      }),
    );
    expect(missingProvenance.verdict).toBe('DENY');
  });

  it('never autonomously declines an interview', () => {
    const d = evaluateAction(
      state,
      action({ type: 'DECLINE_INTERVIEW', target: IDS.interview }),
    );
    expect(d.verdict).toBe('REQUIRE_APPROVAL');
  });

  it('delegation requires a DELEGATABLE_TO edge to the proposed owner', () => {
    const good = evaluateAction(
      state,
      action({
        type: 'DELEGATE_TASK',
        target: IDS.qa,
        desired_state: { new_owner: 'maya-okafor' },
        provenance: ['user_policy_config'],
      }),
    );
    expect(good.verdict).toBe('ALLOW_AND_NOTIFY');

    const stranger = evaluateAction(
      state,
      action({
        type: 'DELEGATE_TASK',
        target: IDS.qa,
        desired_state: { new_owner: 'random-person' },
        provenance: ['user_policy_config'],
      }),
    );
    expect(stranger.verdict).toBe('DENY');
  });

  it('denies any action without provenance (PRD §22)', () => {
    const d = evaluateAction(state, action({ provenance: [] }));
    expect(d.verdict).toBe('DENY');
    expect(d.rule).toBe('provenance-required');
  });

  it('a plan containing a DENY action is never autonomous (invariant 6)', () => {
    const { autonomous } = evaluatePlanActions(state, [
      action({ target: IDS.workout }),
      action({ target: IDS.exam }), // DENY
    ]);
    expect(autonomous).toBe(false);
  });
});
