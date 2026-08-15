import { describe, expect, it } from 'vitest';
import { buildReplayRuntime } from '@dira/agent';
import { at, IDS, iso } from '@dira/fixtures/golden';
import { buildSecondaryFixture } from '@dira/fixtures/secondary';

describe('secondary trigger class — recruiter schedule mutation (PRD §37)', () => {
  it('extracts both alternatives and books the lower-disruption one', async () => {
    const fixture = buildSecondaryFixture();
    const runtime = await buildReplayRuntime(fixture);
    const run = await runtime.orchestrator.handleEvent(fixture.trigger);

    expect(run.status).toBe('RESOLVED');
    expect(run.mutation?.mutation_type).toBe('offer_of_alternatives');
    expect(run.mutation?.offered_alternatives).toHaveLength(2);

    // Friday 10 AM would eat Friday-morning prep capacity before the Friday
    // exam; Tuesday 4 PM touches nothing. The engine must choose Tuesday.
    const booking = await runtime.tools.recruiter.verifyBooking(IDS.interview);
    expect(booking?.startIso).toBe(iso(at(0, 16)));

    const calEvent = await runtime.tools.calendar.verifyEvent({ id: `cal-${IDS.interview}` });
    expect(calEvent?.startIso).toBe(iso(at(0, 16)));

    // Same engine, different mutation class: no delegation, no study rebuild
    // needed — the repair set is derived from state, not from a scenario id.
    expect(run.failuresRecovered).toBe(0);
    expect(run.userInterventions).toBe(0);
    expect(run.slackFinalMin).toBe(246);
  });

  it('evaluated the Friday alternative rather than ignoring it', async () => {
    const fixture = buildSecondaryFixture();
    const runtime = await buildReplayRuntime(fixture);
    const run = await runtime.orchestrator.handleEvent(fixture.trigger);
    const allCandidates = run.planningRounds.flat();
    expect(allCandidates.length).toBeGreaterThanOrEqual(2);
    const consideredFriday = allCandidates.some((c) => c.id.includes('alt'));
    expect(consideredFriday).toBe(true);
  });
});
