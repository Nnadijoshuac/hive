// POST /api/jobs: run a job through the swarm. Body: { brief: string, budgetUsd: number }.
import { connection } from 'next/server';
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

  return Response.json(await runJob(brief.trim(), budget, apiKey));
}
