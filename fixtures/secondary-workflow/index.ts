import type { InterpretationResult, RawEmailEvent } from '@dira/event-schema';
import {
  at,
  buildGoldenFixture,
  IDS,
  iso,
  PEOPLE,
  type GoldenFixture,
} from '../golden-workflow/index.js';

/**
 * Secondary trigger class (PRD §37): a *recruiter* schedule mutation, proving
 * the same engine repairs a different kind of commitment change.
 *
 * Jordan withdraws the confirmed Wednesday 5 PM interview and offers
 * Tuesday 4 PM or Friday 10 AM. Dira must extract both alternatives,
 * propagate through the same graph, evaluate academic/organization
 * conflicts, and book the feasible lower-disruption option.
 *
 * Friday 10:00–11:00 sits inside a Friday study window (it would eat 60
 * minutes of prep capacity days before the Friday exam), so the engine
 * should prefer Tuesday 4 PM — a derivation, not a script.
 */

export const SECONDARY_THREAD = 'thread-jordan-reschedule';

export function buildSecondaryFixture(): GoldenFixture {
  const fixture = buildGoldenFixture();

  const trigger: RawEmailEvent = {
    eventId: 'evt-gmail-recruiter-move-1',
    source: 'gmail',
    threadId: SECONDARY_THREAD,
    messageId: 'msg-jordan-reschedule-1',
    from: PEOPLE.recruiter.email,
    to: 'sam.adeyemi@student.demo',
    subject: 'Need to move your Wednesday interview',
    body:
      `Hi Sam,\n\nApologies — a panelist conflict came up, so Wednesday 5 PM no longer ` +
      `works on our side. We need to move your interview to either Tuesday at 4:00 PM ` +
      `or Friday at 10:00 AM. Both are held for you; whichever you confirm first is ` +
      `yours.\n\nBest,\nJordan Lee`,
    receivedAtIso: iso(at(0, 8, 45)),
  };

  const interpretation: InterpretationResult = {
    relevant: true,
    reason: 'Recruiter withdrew the confirmed slot and offered two alternatives',
    mutation: {
      entity_type: 'commitment',
      entity_id: IDS.interview,
      mutation_type: 'offer_of_alternatives',
      old_start: iso(at(1, 17)),
      offered_alternatives: [iso(at(0, 16)), iso(at(3, 10))],
      unchanged_constraints: [],
      confidence: 0.97,
      evidence_quote:
        'We need to move your interview to either Tuesday at 4:00 PM or Friday at 10:00 AM',
    },
  };

  return {
    ...fixture,
    trigger,
    interpretation,
    inboxSeed: [
      ...fixture.inboxSeed,
      {
        threadId: trigger.threadId,
        messageId: trigger.messageId,
        from: trigger.from,
        to: trigger.to,
        subject: trigger.subject,
        body: trigger.body,
      },
    ],
    recruiterSlots: {
      interviewId: IDS.interview,
      slots: [
        {
          slotId: 'slot-tue-1600',
          startIso: iso(at(0, 16)),
          endIso: iso(at(0, 17)),
          actuallyAvailable: true,
        },
        {
          slotId: 'slot-fri-1000',
          startIso: iso(at(3, 10)),
          endIso: iso(at(3, 11)),
          actuallyAvailable: true,
        },
      ],
    },
  };
}
