import { GeminiModelClient, interpretEmail } from '@dira/agent';
import { buildGoldenFixture } from '@dira/fixtures/golden';
import { EVAL_CORPUS } from '@dira/fixtures/model-eval';

/**
 * Live Gemini evaluation (PRD §40 model evals, run for real).
 *
 * Sends the full email corpus — explicit, vague, conversational, multi-date,
 * conflicting, unrelated, and two prompt-injection cases — through the actual
 * GeminiModelClient (Vertex AI on Cloud Run), then through the deterministic
 * validation pipeline (schema, entity resolution, sender authority,
 * confidence gate). The artifact this returns is published as evidence.
 */

export interface GeminiEvalCase {
  name: string;
  expectedPipeline: string;
  actualPipeline: 'MUTATION' | 'NO_ACTION' | 'BLOCKED';
  pass: boolean;
  failure?: string;
  entityId?: string;
  mutationType?: string;
  confidence?: number;
  latencyMs?: number;
  attempts: number;
  checks: {
    pipeline: boolean;
    entity: boolean;
    mutationType: boolean;
    newStart: boolean;
  };
}

export interface GeminiEvalArtifact {
  generatedAtIso: string;
  model: string;
  vertexai: boolean;
  sdk: string;
  passed: number;
  total: number;
  cases: GeminiEvalCase[];
}

export async function runGeminiEval(): Promise<GeminiEvalArtifact> {
  const { state } = buildGoldenFixture();
  const client = new GeminiModelClient();
  const cases: GeminiEvalCase[] = [];

  for (const evalCase of EVAL_CORPUS) {
    const outcome = await interpretEmail(client, evalCase.email, state);
    let actual: GeminiEvalCase['actualPipeline'];
    if (!outcome.ok) actual = 'BLOCKED';
    else if (!outcome.result?.relevant || !outcome.result.mutation) actual = 'NO_ACTION';
    else actual = 'MUTATION';

    const expectedMutation = evalCase.expected.mutation;
    const actualMutation = outcome.result?.mutation;
    // SAFE_HOLD: ambiguous input where either BLOCKED (low-confidence gate)
    // or NO_ACTION (classified tentative/irrelevant) is a correct safe hold;
    // the invariant under eval is "no actionable mutation emerges".
    const safeHold =
      evalCase.pipelineExpectation === 'SAFE_HOLD' &&
      (actual === 'BLOCKED' || actual === 'NO_ACTION');
    const checks = {
      pipeline: safeHold || actual === evalCase.pipelineExpectation,
      entity: safeHold
        ? true
        : expectedMutation
          ? actualMutation?.entity_id === expectedMutation.entity_id
          : actualMutation == null,
      mutationType: safeHold
        ? true
        : expectedMutation
          ? actualMutation?.mutation_type === expectedMutation.mutation_type
          : actualMutation == null,
      newStart: safeHold
        ? true
        : expectedMutation?.new_start
          ? actualMutation?.new_start === expectedMutation.new_start
          : true,
    };
    const failedChecks = Object.entries(checks)
      .filter(([, pass]) => !pass)
      .map(([name]) => name);

    cases.push({
      name: evalCase.name,
      expectedPipeline: evalCase.pipelineExpectation,
      actualPipeline: actual,
      pass: failedChecks.length === 0,
      failure: [outcome.failure, failedChecks.length ? `failed checks: ${failedChecks.join(', ')}` : '']
        .filter(Boolean)
        .join('; ') || undefined,
      entityId: outcome.result?.mutation?.entity_id,
      mutationType: outcome.result?.mutation?.mutation_type,
      confidence: outcome.result?.mutation?.confidence,
      latencyMs: client.lastCall?.latencyMs,
      attempts: outcome.attempts,
      checks,
    });
  }

  return {
    generatedAtIso: new Date().toISOString(),
    model: client.lastCall?.model ?? process.env.DIRA_GEMINI_MODEL ?? 'gemini-3.5-flash',
    vertexai: client.lastCall?.vertexai ?? false,
    sdk: '@google/genai',
    passed: cases.filter((c) => c.pass).length,
    total: cases.length,
    cases,
  };
}
