'use client';
// The product, live: write a task, set a budget, watch three agents compete and the reviewer decide.
// Columns are separated by hairlines rather than boxed, so nothing is nested.
import { useState } from 'react';
import { motion } from 'motion/react';
import { AGENTS } from '@/lib/swarm/agents';
import type { Receipt } from '@/lib/jobs/store';
import type { Entry } from '@/lib/swarm/engine';
import { formatUsd, plainText } from '@/lib/format';
import { cn } from '@/lib/utils';

const EXAMPLE = 'I run a small online shop selling handmade candles. List 5 ways to cut my monthly software costs, with a rough saving for each.';

type Phase = 'idle' | 'running' | 'done' | 'error';

export function JobConsole() {
  const [brief, setBrief] = useState(EXAMPLE);
  const [budget, setBudget] = useState(10);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<Receipt>();
  const [error, setError] = useState('');

  async function run() {
    setPhase('running');
    setResult(undefined);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, budgetUsd: budget }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setResult(body);
      setPhase('done');
    } catch (err) {
      setError((err as Error).message);
      setPhase('error');
    }
  }

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
            entry={result?.entries.find((e) => e.agent.id === agent.id)} first={i === 0} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-6 py-4 text-sm text-neutral-500 md:px-8">
        {phase === 'error' && <span>{error}</span>}
        {phase === 'idle' && <span>Takes about a minute. The example task is ready to go.</span>}
        {phase === 'running' && <span>Personal details removed. Three AIs are working on it now…</span>}
        {phase === 'done' && result && (
          <>
            <span>Paid <b className="text-neutral-950">{formatUsd(result.budget - result.refunded)}</b> for work that passed{result.refunded > 0 && <> · refunded {formatUsd(result.refunded)}</>}</span>
            <a href={`/jobs/${result.id}`} className="font-medium text-neutral-950 underline decoration-lemon decoration-2 underline-offset-4">
              Open the receipt
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function AgentColumn({ name, style, model, phase, entry, first }: {
  name: string; style: string; model: string; phase: Phase; entry?: Entry; first: boolean;
}) {
  const passed = entry?.review.passed;
  return (
    <div className={cn('flex flex-col p-6 md:p-8', phase !== 'idle' && 'min-h-[340px]', !first && 'border-t border-neutral-100 md:border-t-0 md:border-l')}>
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-lg font-semibold tracking-tight">{name}</p>
          <p className="text-sm text-neutral-400">{style}</p>
        </div>
        {entry && (
          <span className={cn('label-mono rounded px-2 py-1', passed ? 'bg-lemon text-neutral-950' : 'bg-neutral-100 text-neutral-500')}>
            {passed ? `Paid ${formatUsd(entry.payout)}` : 'Not paid'}
          </span>
        )}
      </div>

      {phase === 'running' && <Working />}
      {phase === 'idle' && (
        <div>
          <p className="label-mono text-neutral-400">{model}</p>
          <div className="mt-6 h-1.5 rounded-full bg-neutral-100" />
          <p className="mt-3 text-sm text-neutral-400">Its answer and grade show up here.</p>
        </div>
      )}

      {entry && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col">
          <p className="mb-5 line-clamp-6 whitespace-pre-line text-[15px] leading-relaxed text-neutral-700">{plainText(entry.answer) || entry.error}</p>
          <div className="mt-auto">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-neutral-500">Grade</span>
              <span className="font-medium tabular-nums">{entry.review.score}/100</span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
              <motion.div className={cn('h-full rounded-full', passed ? 'bg-lemon' : 'bg-neutral-300')}
                initial={{ width: 0 }} animate={{ width: `${entry.review.score}%` }} transition={{ duration: 0.8 }} />
            </div>
            <p className="text-sm leading-relaxed text-neutral-500">{entry.review.verdict}</p>
            <p className="label-mono mt-4 text-[10px] text-neutral-400" title={model}>
              {entry.proof.verified ? `Signed · ${entry.proof.signer.slice(0, 8)}…` : 'Not verified'}
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
