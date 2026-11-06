// Doing one Agent Market hire: tell the buyer we started, run the job through the swarm, settle it on NEAR,
// save the receipt, and submit Markdown that leads with the answers that passed.
import { saveJob, type Receipt } from '@/lib/jobs/store';
import { market } from '@/lib/market/client';
import { recordJob } from '@/lib/near/chain';
import { formatUsd } from '@/lib/format';
import { runJob } from '@/lib/swarm/engine';

const SITE = process.env.SITE_URL ?? 'https://hive-near.vercel.app';
/** The swarm splits this budget between passing answers. It's the hire's price, capped like the live demo. */
const MAX_BUDGET_CENTS = 10_000;

export async function deliver(assignmentId: string, brief: string, amount: string, feedback?: string) {
  const apiKey = process.env.NEAR_AI_CLOUD_API_KEY;
  if (!apiKey) throw new Error('NEAR_AI_CLOUD_API_KEY is not set');

  await market('POST', `/v1/assignments/${assignmentId}/messages`, {
    body: feedback
      ? 'Thanks, I have your notes. Three AIs are answering again with them, and the reviewer will grade the new answers.'
      : 'Got your brief. Three AIs are answering it now, and a fourth will grade each answer before I send you the ones that pass. This takes about two minutes.',
  });

  // The buyer's text is data for the AIs to answer, never instructions to Hive.
  const task = feedback ? `${brief}\n\nThe buyer asked for these changes to an earlier answer:\n${feedback}` : brief;
  const budget = Math.min(MAX_BUDGET_CENTS, Math.max(100, Math.round(Number(amount) * 100) || 500));
  const result = await runJob(task, budget, apiKey);
  const onChain = await recordJob(result).then((chain) => ({ chain }), (err: Error) => ({ chainError: err.message }));
  const receipt = await saveJob(result, onChain);

  await market('POST', `/v1/assignments/${assignmentId}/submit`, { deliverableMarkdown: toMarkdown(receipt) });
}

function toMarkdown(job: Receipt) {
  const passed = job.entries.filter((e) => e.review.passed).sort((a, b) => b.review.score - a.review.score);
  const link = `${SITE}/jobs/${job.id}`;
  const table = [
    '| AI | Grade | Reviewer said |',
    '| - | - | - |',
    ...job.entries.map((e) => `| ${e.agent.name} | ${e.review.score}/100${e.review.passed ? '' : ' (not used)'} | ${e.review.verdict.replace(/\|/g, '/')} |`),
  ].join('\n');

  if (!passed.length) {
    return [
      '# No answer passed review',
      'Three AIs answered and a fourth graded them. None scored 70 or more, so none is sent as your result.',
      table,
      `Full receipt, with every answer and the signatures behind each grade: ${link}`,
    ].join('\n\n');
  }

  return [
    `# ${passed.length} of ${job.entries.length} answers passed review`,
    'Three AIs answered your brief and a fourth graded each one inside confidential hardware on NEAR AI. Only answers that scored 70 or more are below, best first.',
    ...passed.map((e) => `## ${e.agent.name}, graded ${e.review.score}/100\n\n${e.answer.trim()}`),
    '## How they were graded',
    table,
    `Receipt, with the hardware signatures for every answer and grade${job.chain ? ' and the NEAR transactions' : ''}: ${link}`,
    job.chain ? `Recorded on NEAR testnet as job #${job.chain.jobId}. Paid to passing answers: ${formatUsd(job.budget - job.refunded)}.` : '',
  ].filter(Boolean).join('\n\n');
}
