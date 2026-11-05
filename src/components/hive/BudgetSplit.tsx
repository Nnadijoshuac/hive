'use client';

// The hero's picture: one $10 budget, split the way the contract splits it. Played on a loop from the real
// Nov 5 job. First the money is held, then the three grades arrive and the bar divides by score, then the
// answer under 70 drops out and the two that passed share the whole budget. The rounding cent comes back.
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const PASS = 70;
const AGENTS = [
  { name: 'Scout', score: 92, paid: '$5.05' },
  { name: 'Sage', score: 60, paid: '$0.00' },
  { name: 'Maker', score: 90, paid: '$4.94' },
];

const STEPS = ['held', 'graded', 'paid'] as const;
type Step = (typeof STEPS)[number];

/** How long each step stays on screen, in ms. */
const HOLD: Record<Step, number> = { held: 1800, graded: 2600, paid: 4200 };

const STATUS: Record<Step, string> = {
  held: 'Your $10 is held while three AIs work',
  graded: 'The reviewer grades each answer out of 100',
  paid: 'Answers under 70 get nothing. The rest share the budget',
};

const total = (step: Step) =>
  AGENTS.reduce((sum, a) => sum + (step === 'paid' && a.score < PASS ? 0 : a.score), 0);

export function BudgetSplit() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState<Step>('held');

  useEffect(() => {
    if (reduced) return setStep('paid');
    const timer = setTimeout(() => setStep(STEPS[(STEPS.indexOf(step) + 1) % STEPS.length]), HOLD[step]);
    return () => clearTimeout(timer);
  }, [step, reduced]);

  const sum = total(step);

  return (
    <div className="text-left">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="label-mono text-neutral-400">A real job · $10 budget</p>
        <motion.p key={step} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-neutral-600">
          {STATUS[step]}
        </motion.p>
      </div>

      <div className="flex h-16 gap-1">
        {step === 'held' ? (
          <motion.div layoutId="bar" className="flex flex-1 items-center justify-between rounded-xl bg-neutral-950 px-5 text-white">
            <span className="text-sm font-medium">$10.00 held</span>
            <span className="label-mono text-neutral-400">Scout · Sage · Maker working</span>
          </motion.div>
        ) : (
          AGENTS.map((a) => {
            const out = step === 'paid' && a.score < PASS;
            const won = step === 'paid' && !out;
            return (
              <motion.div
                key={a.name}
                animate={{ flexGrow: out ? 0.0001 : a.score / sum, opacity: out ? 0 : 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                style={{ flexBasis: 0 }}
                className={cn('flex min-w-0 items-center justify-between overflow-hidden rounded-xl transition-[background-color,padding] duration-700',
                  out ? '-mx-0.5 px-0' : 'px-4', won ? 'bg-lemon text-neutral-950' : 'bg-neutral-100 text-neutral-700')}
              >
                <span className="truncate text-sm font-medium">{a.name}</span>
                <span className="font-mono text-sm tabular-nums">{won ? a.paid : a.score}</span>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="mt-3 flex min-h-5 flex-wrap justify-between gap-2 text-sm text-neutral-500">
        {step === 'paid' ? (
          <>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              Sage scored 60, under the pass mark. Not paid.
            </motion.span>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
              $0.01 back to you
            </motion.span>
          </>
        ) : (
          <span>If no answer passes, all $10 comes back to you.</span>
        )}
      </div>
    </div>
  );
}
