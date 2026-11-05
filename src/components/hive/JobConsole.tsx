'use client';
// The product, live: write a task, set a budget, and watch the job happen step by step. Each answer appears
// in its column as soon as that AI finishes, its grade lands when the reviewer is done, and the footer
// follows the job through settlement on NEAR. Columns are separated by hairlines rather than boxed.
import { useState } from 'react';
import { motion } from 'motion/react';
import { AGENTS } from '@/lib/swarm/agents';
import type { Receipt } from '@/lib/jobs/store';
import type { JobEvent, Proof, Review } from '@/lib/swarm/engine';
import { formatUsd, plainText } from '@/lib/format';
import { cn } from '@/lib/utils';

const EXAMPLE = 'I run a small online shop selling handmade candles. List 5 ways to cut my monthly software costs, with a rough saving for each.';

/** Total transactions per job: escrow, one submission per AI, and the review. */
const TX_COUNT = AGENTS.length + 2;

type Phase = 'idle' | 'running' | 'done' | 'error';
type StreamEvent =
  | JobEvent
  | { type: 'settled'; entries: { agentId: string; passed: boolean; payout: number }[]; refunded: number }
  | { type: 'tx'; step: string; hash: string }
  | { type: 'done'; receipt: Receipt }
  | { type: 'error'; error: string };

interface Live { answer?: string; proof?: Proof; error?: string; review?: Review; payout?: number; passed?: boolean }

export function JobConsole() {
  const [brief, setBrief] = useState(EXAMPLE);
  const [budget, setBudget] = useState(10);
  const [phase, setPhase] = useState<Phase>('idle');
  const [live, setLive] = useState<Record<string, Live>>({});
  const [redacted, setRedacted] = useState(false);
  const [txs, setTxs] = useState(0);
  const [receipt, setReceipt] = useState<Receipt>();
  const [error, setError] = useState('');

  const update = (agentId: string, patch: Live) => setLive((all) => ({ ...all, [agentId]: { ...all[agentId], ...patch } }));

  function apply(event: StreamEvent) {
    switch (event.type) {
      case 'redacted': return setRedacted(true);
      case 'answer': return update(event.agentId, { answer: event.answer, proof: event.proof, error: event.error });
      case 'review': return update(event.agentId, { review: event.review });
      case 'settled': return event.entries.forEach((e) => update(e.agentId, { passed: e.passed, payout: e.payout }));
      case 'tx': return setTxs((n) => n + 1);
      case 'done': setReceipt(event.receipt); return setPhase('done');
      case 'error': setError(event.error); return setPhase('error');
    }
  }

  async function run() {
    setPhase('running');
    setLive({});
    setRedacted(false);
    setTxs(0);
    setReceipt(undefined);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, budgetUsd: budget }),
      });
      // Bad input and the rate limit answer with plain JSON before any streaming starts.
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        lines.filter(Boolean).forEach((line) => apply(JSON.parse(line) as StreamEvent));
      }
    } catch (err) {
      setError((err as Error).message);
      setPhase('error');
    }
  }

  const graded = AGENTS.filter((a) => live[a.id]?.review).length;
  const answered = AGENTS.filter((a) => live[a.id]?.answer !== undefined).length;
  const status = !redacted ? 'Removing personal details…'
    : answered < AGENTS.length ? `Personal details removed. ${answered} of ${AGENTS.length} answers in…`
    : graded < AGENTS.length ? `All answers in. ${graded} of ${AGENTS.length} graded…`
    : `Graded. Settling on NEAR: ${txs} of ${TX_COUNT} transactions…`;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-float">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-3.5">
        {[0, 1, 2].map((i) => <span key={i} className="size-3 rounded-full bg-neutral-200" />)}
        <span className="label-mono ml-3 text-neutral-400">New task</span>
      </div>

      <div className="grid gap-6 border-b border-neutral-100 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8">
        <label className="block">
          <span className="label-mono mb-3 block text-neutral-400">What do you need done?</span>
          <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={2}
            className="w-full resize-none bg-transparent text-xl leading-snug outline-none placeholder:text-neutral-300" />
        </label>
        <div className="flex items-end gap-3">
          <label>
            <span className="label-mono mb-3 block text-neutral-400">Budget</span>
            <span className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2.5 text-lg tabular-nums">
              $<input type="number" min={1} max={100} value={budget} onChange={(e) => setBudget(Number(e.target.value))}
                className="w-14 bg-transparent outline-none" />
            </span>
          </label>
          <button onClick={run} disabled={phase === 'running' || !brief.trim()}
            className="h-[50px] rounded-lg bg-lemon px-6 font-medium text-neutral-950 transition hover:brightness-95 disabled:opacity-50">
            {phase === 'running' ? 'Working…' : 'Post task'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3">
        {AGENTS.map((agent, i) => (
          <AgentColumn key={agent.id} name={agent.name} style={agent.style} model={agent.model} phase={phase}
            live={live[agent.id] ?? {}} first={i === 0} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-6 py-4 text-sm text-neutral-500 md:px-8">
        {phase === 'error' && <span>{error}</span>}
        {phase === 'idle' && <span>Takes about a minute. The example task is ready to go.</span>}
        {phase === 'running' && <motion.span key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{status}</motion.span>}
        {phase === 'done' && receipt && (
          <>
            <span>
              Paid <b className="text-neutral-950">{formatUsd(receipt.budget - receipt.refunded)}</b> for work that passed
              {receipt.refunded > 0 && <> · {formatUsd(receipt.refunded)} back to you</>}
              {receipt.chain && <> · settled on NEAR</>}
            </span>
            <a href={`/jobs/${receipt.id}`} className="font-medium text-neutral-950 underline decoration-lemon decoration-2 underline-offset-4">
              Open the receipt
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function AgentColumn({ name, style, model, phase, live, first }: {
  name: string; style: string; model: string; phase: Phase; live: Live; first: boolean;
}) {
  const { answer, proof, error, review, passed, payout } = live;
  const hasAnswer = answer !== undefined;
  return (
    <div className={cn('flex flex-col p-6 md:p-8', phase !== 'idle' && 'min-h-[340px]', !first && 'border-t border-neutral-100 md:border-t-0 md:border-l')}>
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-lg font-semibold tracking-tight">{name}</p>
          <p className="text-sm text-neutral-400">{style}</p>
        </div>
        {passed !== undefined && (
          <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className={cn('label-mono rounded px-2 py-1', passed ? 'bg-lemon text-neutral-950' : 'bg-neutral-100 text-neutral-500')}>
            {passed ? `Paid ${formatUsd(payout ?? 0)}` : 'Not paid'}
          </motion.span>
        )}
      </div>

      {phase === 'idle' && (
        <div>
          <p className="label-mono text-neutral-400">{model}</p>
          <div className="mt-6 h-1.5 rounded-full bg-neutral-100" />
          <p className="mt-3 text-sm text-neutral-400">Its answer and grade show up here.</p>
        </div>
      )}

      {phase !== 'idle' && !hasAnswer && <Working />}

      {hasAnswer && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col">
          <p className="mb-5 line-clamp-6 whitespace-pre-line text-[15px] leading-relaxed text-neutral-700">{plainText(answer) || error}</p>
          <div className="mt-auto">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-neutral-500">Grade</span>
              <span className="font-medium tabular-nums">{review ? `${review.score}/100` : 'Grading…'}</span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
              {/* Separate keys, so the real bar mounts fresh instead of inheriting the shimmer's offset. */}
              {review ? (
                <motion.div key="grade" className={cn('h-full rounded-full', review.passed ? 'bg-lemon' : 'bg-neutral-300')}
                  initial={{ width: 0 }} animate={{ width: `${review.score}%` }} transition={{ duration: 0.8 }} />
              ) : (
                <motion.div key="grading" className="h-full w-1/3 rounded-full bg-neutral-200"
                  animate={{ x: ['-100%', '300%'] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
              )}
            </div>
            {review && <p className="text-sm leading-relaxed text-neutral-500">{review.verdict}</p>}
            <p className="label-mono mt-4 text-[10px] text-neutral-400" title={model}>
              {proof?.verified ? `Signed · ${proof.signer.slice(0, 8)}…` : 'Not verified'}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Working() {
  return (
    <div className="grid gap-2.5">
      {[90, 75, 82, 60].map((w, i) => (
        <motion.div key={i} className="h-3 rounded bg-neutral-100" style={{ width: `${w}%` }}
          animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </div>
  );
}
