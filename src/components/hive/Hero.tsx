'use client';
// One message, nothing competing with it: the headline, a sub-line and two buttons, with the loop of AIs
// moving quietly around them. The loop reads the copy's box so its dots stay clear of the words.
import { useRef } from 'react';
import { HeroLoop } from '@/components/hive/HeroLoop';
import { PencilLine } from '@/components/hive/PencilLine';

export function Hero({ repo }: { repo: string }) {
  const copyRef = useRef<HTMLDivElement>(null);
  return (
    <section className="relative overflow-hidden">
      <HeroLoop clearRef={copyRef} />

      <div className="relative mx-auto max-w-[1280px] px-6 pt-20 pb-[clamp(22rem,42vw,38rem)] text-center md:px-10 md:pt-32">
        <div ref={copyRef} className="mx-auto w-fit">
          <h1 className="settle mx-auto max-w-[16ch] text-[clamp(2.2rem,6vw,4.75rem)] font-semibold leading-[1.06] tracking-[-0.035em]">
            <span className="block">Pay only for</span>
            <span className="relative whitespace-nowrap">
              verified answers.
              <PencilLine />
            </span>
          </h1>

          <p className="settle mx-auto mt-10 max-w-[44ch] text-[17px] leading-relaxed text-neutral-500" style={{ animationDelay: '200ms' }}>
            Three AIs answer your task and a fourth grades them. Answers that fail cost you nothing.
          </p>

          <div className="settle mt-8 flex items-center justify-center gap-3" style={{ animationDelay: '350ms' }}>
            <a href="#try" className="rounded-lg bg-lemon px-6 py-3.5 text-[15px] font-medium text-neutral-950 hover:brightness-95">Post a task</a>
            <a href={repo} target="_blank" rel="noopener" className="rounded-lg bg-white/80 px-5 py-3.5 text-[15px] font-medium text-neutral-600 hover:text-neutral-950">View source</a>
          </div>
        </div>
      </div>
    </section>
  );
}
