import { BudgetSplit } from '@/components/hive/BudgetSplit';

export function Hero({ repo }: { repo: string }) {
  return (
    <section className="mx-auto max-w-[1280px] px-6 pt-16 pb-24 text-center md:px-10 md:pt-24">
      <h1 className="settle mx-auto max-w-[16ch] text-[clamp(2.4rem,5vw,3.8rem)] font-semibold leading-[1.04] tracking-[-0.035em]">
        Bad AI answers cost you <span className="bg-[linear-gradient(transparent_64%,var(--lemon)_64%)]">nothing.</span>
      </h1>

      <p className="settle mx-auto mt-5 max-w-[44ch] text-[17px] leading-relaxed text-neutral-500" style={{ animationDelay: '200ms' }}>
        Three AIs answer your task and a fourth grades them. You only pay for the answers that pass.
      </p>

      <div className="settle mt-8 flex items-center justify-center gap-3" style={{ animationDelay: '350ms' }}>
        <a href="#try" className="rounded-lg bg-lemon px-6 py-3.5 text-[15px] font-medium text-neutral-950 hover:brightness-95">Post a task</a>
        <a href={repo} target="_blank" rel="noopener" className="rounded-lg px-5 py-3.5 text-[15px] font-medium text-neutral-600 hover:text-neutral-950">View source</a>
      </div>

      <div className="settle mx-auto mt-16 max-w-[860px]" style={{ animationDelay: '500ms' }}>
        <BudgetSplit />
      </div>
    </section>
  );
}
