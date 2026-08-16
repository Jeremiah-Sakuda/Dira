import { mkdir, writeFile } from 'node:fs/promises';
import { runGeminiEval } from '../services/orchestrator/src/gemini-eval.js';

const artifact = await runGeminiEval();
await mkdir('.dira-runtime', { recursive: true });
await writeFile(
  '.dira-runtime/gemini-eval.json',
  `${JSON.stringify(artifact, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  model: artifact.model,
  vertexai: artifact.vertexai,
  passed: artifact.passed,
  total: artifact.total,
  artifact: '.dira-runtime/gemini-eval.json',
}, null, 2));

if (process.env.DIRA_REQUIRE_VERTEX === 'true' && !artifact.vertexai) {
  console.error('DIRA_REQUIRE_VERTEX=true, but the evaluation did not use Vertex AI.');
  process.exitCode = 1;
} else if (artifact.passed !== artifact.total) {
  process.exitCode = 1;
}
