// GET /api/market/poll: picks up any Agent Market hire the webhook missed. Vercel Cron calls it once a day,
// and the webhook route runs the same check after every event it receives.
// It only ever acts on Hive's own unstarted hires, so calling it more often does no harm.
import { connection } from 'next/server';
import { pickUpMissed } from '@/lib/market/poll';

export const maxDuration = 300;

export async function GET() {
  // Run on each request, never at build time: the market can only be reached with a live token.
  await connection();
  // A local clone without Agent Market credentials still builds and runs; this route just reports why it is idle.
  if (!process.env.MARKET_AGENT_TOKEN) {
    return Response.json({ picked: [], skipped: 'MARKET_AGENT_TOKEN is not set' }, { status: 503 });
  }
  return Response.json({ picked: await pickUpMissed() });
}
