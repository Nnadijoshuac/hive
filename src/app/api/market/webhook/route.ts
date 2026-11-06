// POST /api/market/webhook: signed events from NEAR Agent Market for Hive's listing.
// We answer 2xx at once, which also counts as starting the hire, and do the work after the response.
import { after } from 'next/server';
import { market, verifySignature } from '@/lib/market/client';
import { deliver } from '@/lib/market/deliver';

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
      const { assignments } = await market<{ assignments: { assignment: { assignmentId: string; amount?: string }; job: { title?: string; description: string } }[] }>('GET', '/v1/agents/me/assignments');
      const row = assignments.find((r) => r.assignment.assignmentId === event.assignment_id);
      if (row) await deliver(event.assignment_id!, [row.job.title, row.job.description].filter(Boolean).join('\n\n'), row.assignment.amount ?? '5', event.feedback);
    });
  }
  return Response.json({ ok: true });
}
