// The backup to the webhook: the market can lose a hire.created delivery, so we also ask it for Hive's
// assignments and pick up any hire nobody started. Starting is the lock: if start fails, another run has it.
import { market } from '@/lib/market/client';
import { deliver } from '@/lib/market/deliver';

interface Row {
  assignment: { assignmentId: string; startedAt: string | null; amount?: string };
  job: { title?: string; description: string };
}

const briefOf = (row: Row) => [row.job.title, row.job.description].filter(Boolean).join('\n\n');

export async function assignments() {
  return (await market<{ assignments: Row[] }>('GET', '/v1/agents/me/assignments')).assignments;
}

/** Starts and delivers every hire that hasn't been started, apart from `skip`. Returns how many it picked up. */
export async function pickUpMissed(skip?: string) {
  const fresh = (await assignments()).filter((row) => !row.assignment.startedAt && row.assignment.assignmentId !== skip);
  let picked = 0;
  for (const row of fresh) {
    const id = row.assignment.assignmentId;
    const started = await market('POST', `/v1/assignments/${id}/start`).then(() => true, () => false);
    if (!started) continue;
    picked++;
    await deliver(id, briefOf(row), row.assignment.amount ?? '5').catch((err: Error) => console.error('poll', id, err.message));
  }
  return picked;
}

/** The brief and price of one assignment, for events that only carry its id. */
export async function findAssignment(id: string) {
  const row = (await assignments()).find((r) => r.assignment.assignmentId === id);
  return row && { brief: briefOf(row), amount: row.assignment.amount ?? '5' };
}
