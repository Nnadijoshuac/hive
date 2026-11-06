// GET /api/market/poll: picks up any Agent Market hire the webhook missed. Vercel Cron calls it once a day,
// and the webhook route runs the same check after every event it receives.
// It only ever acts on Hive's own unstarted hires, so calling it more often does no harm.
import { pickUpMissed } from '@/lib/market/poll';

export const maxDuration = 300;

export async function GET() {
  return Response.json({ picked: await pickUpMissed() });
}
