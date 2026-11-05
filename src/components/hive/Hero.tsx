import { Fragment } from 'react';

import { JobField } from '@/components/hive/JobField';

// The claim lands first and alone, the cards arrive behind it, and the line that threads them comes last.
const CUE = { claim: 120, held: 520, word: 95, sub: 900, action: 1120 } as const;

export function Hero({ repo }: { repo: string }) {
  return (
    <section className="relative flex items-center overflow-hidden lg:min-h-[calc(100vh-5rem)]">
      <JobField />

      <div className="relative mx-auto w-full max-w-2xl px-6 py-24 text-center sm:py-32 lg:py-20">
        <h1 className="mx-auto max-w-[15ch] text-[clamp(2.25rem,5vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.035em]">
          <Words text="Pay AI only for work" from={CUE.claim} />{' '}
          {/* Held back on its own beat: this half carries the product. */}
          {/* One marker under both words, laid down once they have landed. */}
          <span className="relative whitespace-nowrap">
            <span aria-hidden className="veil absolute inset-x-0 bottom-[0.06em] -z-10 h-[0.36em] bg-lemon" style={{ animationDelay: `${CUE.held + 600}ms` }} />
            <Words text="that passes" from={CUE.held} />
          </span>
        </h1>

        <p className="settle mx-auto mt-5 max-w-[40ch] text-[17px] leading-relaxed text-neutral-500" style={{ animationDelay: `${CUE.sub}ms` }}>
          Three AIs answer your task and a fourth grades them. Answers that score 70 or more share your budget. The rest comes back to you.
        </p>

        <div className="settle mt-8 flex items-center justify-center gap-3" style={{ animationDelay: `${CUE.action}ms` }}>
          <a href="#try" className="rounded-lg bg-lemon px-6 py-3.5 text-[15px] font-medium text-neutral-950 hover:brightness-95">Post a task</a>
          <a href={repo} target="_blank" rel="noopener" className="rounded-lg px-5 py-3.5 text-[15px] font-medium text-neutral-600 hover:text-neutral-950">View source</a>
        </div>
      </div>
    </section>
  );
}

/** One word at a time. Spans must be inline-block to move and blur, and only words (not phrases) can then wrap. */
function Words({ text, from, className = '' }: { text: string; from: number; className?: string }) {
  return text.split(' ').map((word, i) => (
    <Fragment key={`${word}-${i}`}>
      {i > 0 && ' '}
      <span className={`settle inline-block ${className}`} style={{ animationDelay: `${from + i * CUE.word}ms` }}>{word}</span>
    </Fragment>
  ));
}
