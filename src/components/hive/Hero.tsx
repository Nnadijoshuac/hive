import { BudgetSplit } from '@/components/hive/BudgetSplit';

export function Hero({ repo }: { repo: string }) {
  return (
    <section className="mx-auto max-w-[1280px] px-6 pt-16 pb-24 text-center md:px-10 md:pt-24">
      <h1 className="settle mx-auto max-w-[24ch] text-[clamp(2.4rem,5vw,3.8rem)] font-semibold leading-[1.06] tracking-[-0.035em]">
        {/* Its own line, so the break always lands after "checked". */}
        <span className="block">Every AI answer, checked</span>
        before you{' '}
        <span className="relative whitespace-nowrap">
          pay for it.
          {/* A thin line drawn under the key words once the headline has landed. */}
          <span aria-hidden className="draw-line absolute right-[0.3em] -bottom-[0.06em] left-0 h-[0.07em] rounded-full bg-lemon" />
        </span>
      </h1>

      <p className="settle mx-auto mt-6 max-w-[44ch] text-[17px] leading-relaxed text-neutral-500" style={{ animationDelay: '200ms' }}>
        Three AIs answer your task. A fourth grades each one on sealed hardware. Answers under 70 cost you nothing, and the receipt shows why.
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
