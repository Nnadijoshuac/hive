// POST /api/market/webhook: signed events from NEAR Agent Market for Hive's listing.
// We answer 2xx at once, which also counts as starting the hire, and do the work after the response.
import { after } from 'next/server';
import { verifySignature } from '@/lib/market/client';
import { deliver } from '@/lib/market/deliver';
import { findAssignment, pickUpMissed } from '@/lib/market/poll';

// A job takes about a minute and a half, plus settling on NEAR.
export const maxDuration = 300;

// Retries of one delivery share an id. This only catches retries that reach the same warm instance;
// a duplicate that slips through is a second submit, which the market treats as a newer version.
const seen = new Set<string>();

export async function POST(request: Request) {
  const raw = await request.text();
  const h = request.headers;
  if (!verifySignature(raw, h.get('x-market-timestamp'), h.get('x-market-signature'))) {
    return Response.json({ error: 'bad signature' }, { status: 401 });
  }

  const delivery = h.get('x-market-delivery') ?? '';
  if (seen.has(delivery)) return Response.json({ ok: true, duplicate: true });
  seen.add(delivery);

  const event = JSON.parse(raw) as { event: string; assignment_id?: string; description?: string; title?: string; amount?: string; feedback?: string };
  const run = (work: () => Promise<void>) => after(() => work().catch((err: Error) => console.error(event.event, event.assignment_id, err.message)));

  if (event.event === 'hire.created' && event.assignment_id) {
    const brief = [event.title, event.description].filter(Boolean).join('\n\n');
    run(() => deliver(event.assignment_id!, brief, event.amount ?? '5'));
  }
  if (event.event === 'hire.changes_requested' && event.assignment_id) {
    // The event carries only the feedback, so the brief is read back from the assignment.
    run(async () => {
      const found = await findAssignment(event.assignment_id!);
      if (found) await deliver(event.assignment_id!, found.brief, found.amount, event.feedback);
    });
  }
  // Any event is a chance to catch a hire whose own event never arrived. The hire this event is about is
  // left out: our 2xx starts it, and the market may not have recorded that yet.
  if (event.event !== 'webhook.ping') run(async () => { await pickUpMissed(event.assignment_id); });
  return Response.json({ ok: true });
}
