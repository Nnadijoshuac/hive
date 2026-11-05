// A finished job's receipt: what was asked, what each AI answered, how the reviewer graded it, where the
// money went, and the signatures that prove it. Meant to be shared, so it shows the redacted task only.
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { CopyLink } from '@/components/hive/CopyLink';
import { formatUsd, plainText } from '@/lib/format';
import { getJob, type Receipt } from '@/lib/jobs/store';
import { CONTRACT, EXPLORER, NEAR_PER_USD } from '@/lib/near/chain';
import { PASS_SCORE, type Entry } from '@/lib/swarm/engine';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Hive receipt' };

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <nav className="mx-auto flex h-20 max-w-[1080px] items-center justify-between px-6 md:px-10">
        <a href="/" className="font-mono text-xl font-medium tracking-[-0.04em]">hive</a>
        <a href="/#try" className="rounded-lg bg-lemon px-4 py-2 text-[15px] font-medium text-neutral-950 hover:brightness-95">Post a task</a>
      </nav>
      <main className="mx-auto max-w-[1080px] px-6 pt-10 pb-28 md:px-10">
        <Suspense fallback={<p className="text-neutral-400">Loading the receipt…</p>}>
          <ReceiptView params={params} />
        </Suspense>
      </main>
    </>
  );
}

async function ReceiptView({ params }: { params: Promise<{ id: string }> }) {
  const job = await getJob((await params).id);
  if (!job) notFound();

  const paid = job.budget - job.refunded;
  const passed = job.entries.filter((e) => e.review.passed).length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="label-mono text-neutral-400">
          Receipt {job.id} · {new Date(job.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
        <CopyLink />
      </div>

      <h1 className="mt-6 max-w-[22ch] text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.03em]">
        {passed ? `${formatUsd(paid)} paid for work that passed.` : 'Nothing passed, so nothing was paid.'}{' '}
        <span className="text-neutral-400">{formatUsd(job.refunded)} back to you.</span>
      </h1>

      <section className="mt-12">
        <p className="label-mono mb-3 text-neutral-400">The task, as the AIs saw it</p>
        <p className="max-w-[70ch] text-lg leading-relaxed text-neutral-800">{job.redactedBrief}</p>
        <p className="mt-2 text-sm text-neutral-500">Names, emails and account numbers are removed before any AI reads the task.</p>
      </section>

      <MoneyBar job={job} />

      <OnChain job={job} />

      <section className="mt-16 border-t border-neutral-200">
        {job.entries.map((entry) => <AnswerRow key={entry.agent.id} entry={entry} />)}
      </section>

      <section className="mt-16 max-w-[70ch] text-sm leading-relaxed text-neutral-500">
        <p className="label-mono mb-3 text-neutral-400">How to check this</p>
        <p>
          Every answer and every grade was produced inside confidential hardware on NEAR AI Cloud. Hive checked a fresh
          attestation for each model, then checked that each reply was signed by that machine. The addresses above are the
          signers. An answer is paid only if it scored {PASS_SCORE} or more and both its answer and its grade carry a valid signature.
        </p>
      </section>
    </>
  );
}

/** Where the budget went: one lemon segment per paid answer, grey for what came back. */
function MoneyBar({ job }: { job: Receipt }) {
  const share = (cents: number) => `${(cents / job.budget) * 100}%`;
  return (
    <section className="mt-12">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="label-mono text-neutral-400">{formatUsd(job.budget)} budget</p>
        <p className="text-sm text-neutral-500">Split by score among answers that passed</p>
      </div>
      <div className="flex h-14 gap-1">
        {job.entries.filter((e) => e.payout > 0).map((e) => (
          <div key={e.agent.id} style={{ width: share(e.payout) }}
            className="flex min-w-0 items-center justify-between rounded-xl bg-lemon px-4 text-sm font-medium text-neutral-950">
            <span className="truncate">{e.agent.name}</span>
            <span className="font-mono tabular-nums">{formatUsd(e.payout)}</span>
          </div>
        ))}
        {job.refunded > 0 && (
          // A refund of a cent or two would be invisible at its true width, so it gets a floor.
          <div style={{ width: share(job.refunded), minWidth: job.refunded === job.budget ? undefined : '0.5rem' }}
            className="flex min-w-0 flex-1 items-center justify-end rounded-xl bg-neutral-100 px-2 text-sm text-neutral-500">
            {job.refunded === job.budget && <span>{formatUsd(job.refunded)} back to you</span>}
          </div>
        )}
      </div>
    </section>
  );
}

/** The job's record in the Hive contract on NEAR testnet, one link per transaction. */
function OnChain({ job }: { job: Receipt }) {
  if (!job.chain) {
    return job.chainError ? (
      <p className="mt-12 text-sm text-neutral-500">This job was not recorded on NEAR: {job.chainError}</p>
    ) : null;
  }
  return (
    <section className="mt-12">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="label-mono text-neutral-400">Settled on NEAR testnet · job #{job.chain.jobId} in {CONTRACT}</p>
        <p className="text-sm text-neutral-500">Held as test NEAR at {NEAR_PER_USD} NEAR per $1</p>
      </div>
      <ol className="border-t border-neutral-200">
        {job.chain.txs.map((tx, i) => (
          <li key={tx.hash} className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 py-3 text-sm">
            <span className="flex items-center gap-3">
              <span className="font-mono text-xs text-neutral-400">{i + 1}</span>
              <span className="text-neutral-800">{tx.step}</span>
            </span>
            <a href={`${EXPLORER}${tx.hash}`} target="_blank" rel="noopener"
              className="font-mono text-xs text-neutral-500 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-950">
              {tx.hash.slice(0, 10)}…
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AnswerRow({ entry }: { entry: Entry }) {
  const { agent, review, proof, payout } = entry;
  return (
    <article className="grid gap-6 border-b border-neutral-200 py-10 md:grid-cols-12 md:gap-10">
      <div className="md:col-span-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">{agent.name}</h2>
          <span className={cn('rounded px-2 py-1 font-mono text-sm tabular-nums', review.passed ? 'bg-lemon text-neutral-950' : 'bg-neutral-100 text-neutral-500')}>
            {review.passed ? `Paid ${formatUsd(payout)}` : 'Not paid'}
          </span>
        </div>
        <p className="label-mono mt-1 text-neutral-400">{agent.model}</p>

        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-neutral-500">Grade</span>
          <span className="font-medium tabular-nums">{review.score}/100</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div className={cn('h-full rounded-full', review.passed ? 'bg-lemon' : 'bg-neutral-300')} style={{ width: `${review.score}%` }} />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">{review.verdict}</p>

        <dl className="mt-6 space-y-1.5 font-mono text-[11px] text-neutral-500">
          <Signature label="Answer signed by" proof={proof} />
          <Signature label="Grade signed by" proof={review.proof} />
        </dl>
      </div>

      <p className="whitespace-pre-line text-[15px] leading-relaxed text-neutral-700 md:col-span-8">
        {plainText(entry.answer) || entry.error || 'No answer.'}
      </p>
    </article>
  );
}

function Signature({ label, proof }: { label: string; proof: Entry['proof'] }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className={proof.verified ? 'text-neutral-800' : 'text-neutral-400'} title={proof.signer || proof.reason}>
        {proof.verified ? `${proof.signer.slice(0, 10)}…${proof.signer.slice(-4)} ✓` : 'not verified'}
      </dd>
    </div>
  );
}
