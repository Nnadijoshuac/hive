// POST /api/jobs: run a job through the swarm and save its receipt. Body: { brief: string, budgetUsd: number }.
import { connection } from 'next/server';
import { saveJob } from '@/lib/jobs/store';
import { recordJob } from '@/lib/near/chain';
import { takeJob, visitorOf } from '@/lib/rate-limit';
import { runJob } from '@/lib/swarm/engine';

const MAX_BRIEF = 2000;

export async function POST(request: Request) {
  await connection();
  const apiKey = process.env.NEAR_AI_CLOUD_API_KEY;
  if (!apiKey) return Response.json({ error: 'NEAR_AI_CLOUD_API_KEY is not set' }, { status: 503 });

  const { brief, budgetUsd } = (await request.json()) as { brief?: string; budgetUsd?: number };
  if (!brief?.trim() || brief.length > MAX_BRIEF) return Response.json({ error: `brief must be 1-${MAX_BRIEF} characters` }, { status: 400 });
  const budget = Math.round((budgetUsd ?? 10) * 100);
  if (!(budget > 0)) return Response.json({ error: 'budgetUsd must be positive' }, { status: 400 });

  // Checked last, so a malformed request doesn't use up one of the visitor's jobs.
  const slot = takeJob(visitorOf(request));
  if (!slot.ok) {
    const error = `The live demo allows 3 jobs an hour. Try again in ${slot.waitMinutes} min, or run it yourself from GitHub.`;
    return Response.json({ error }, { status: 429 });
  }

  const result = await runJob(brief.trim(), budget, apiKey);

  // The job is settled on NEAR testnet. If that fails the answers are still worth returning, so the
  // receipt says the on-chain record is missing instead of the whole job failing.
  const onChain = await recordJob(result).then(
    (chain) => ({ chain }),
    (err: Error) => ({ chainError: err.message }),
  );

  // The response is the saved receipt: the result plus an id for its page at /jobs/{id}.
  return Response.json(await saveJob(result, onChain));
}
