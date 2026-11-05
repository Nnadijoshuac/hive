// Hive landing page. Plain words, real numbers, the live product in the middle.
import { Hero } from '@/components/hive/Hero';
import { Honeycomb } from '@/components/hive/Honeycomb';
import { JobConsole } from '@/components/hive/JobConsole';
import ShapeGrid from '@/components/ShapeGrid';

const REPO = 'https://github.com/Nnadijoshuac/hive';

const STEPS = [
  ['Write the task', 'Say what you need in a sentence or two and set a budget in dollars.'],
  ['Three AIs answer', 'Scout, Sage and Maker each work on it at the same time, on different models.'],
  ['A fourth AI grades them', 'The reviewer scores each answer out of 100 and explains its score in one sentence. It marks down anything made up.'],
  ['You pay for what passes', 'Answers scoring 70 or more share the budget. If none pass, the money comes back to you.'],
];

// A real job, run on Nov 5 2026. Scores, verdicts and payouts are copied from the response.
const RECEIPT = {
  task: 'List 5 ways a small candle shop can cut its monthly software costs, with a rough saving for each.',
  rows: [
    ['Scout', 92, '$5.05', 'Five clear ideas with rough monthly savings.'],
    ['Sage', 60, '$0.00', 'The savings were formulas, not dollar amounts, so it only partly answered.'],
    ['Maker', 90, '$4.94', 'Five clear ideas with rough savings.'],
  ] as const,
  refund: '$0.01',
};

/** A step number inside one honeycomb cell, the same shape as the hive behind the console. */
function StepCell({ n }: { n: number }) {
  return (
    <span className="relative inline-flex size-11 items-center justify-center">
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full" aria-hidden>
        <path d="M12 1.5 21.1 6.75v10.5L12 22.5 2.9 17.25V6.75Z" className="fill-lemon" />
      </svg>
      <span className="relative font-mono text-sm font-medium text-neutral-950">{n}</span>
    </span>
  );
}

export default function Home() {
  return (
    <>
      <nav className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6 md:px-10">
        <a href="#" className="font-mono text-xl font-medium tracking-[-0.04em]">hive</a>
        <div className="flex items-center gap-6 text-[15px] text-neutral-600">
          <a href={REPO} target="_blank" rel="noopener" className="hidden hover:text-neutral-950 sm:inline">GitHub</a>
          <a href="#try" className="rounded-lg bg-lemon px-4 py-2 font-medium text-neutral-950 hover:brightness-95">Try it</a>
        </div>
      </nav>

      <main>
        <Hero repo={REPO} />

        <section id="try" className="relative scroll-mt-6 border-t border-neutral-100 pb-28">
          <Honeycomb />
          <div className="relative mx-auto max-w-[1280px] px-6 pt-20 md:px-10">
            <JobConsole />
          </div>
        </section>

        <section id="how" className="mx-auto max-w-[1280px] border-t border-neutral-100 px-6 py-28 md:px-10">
          <p className="label-mono mb-10 text-neutral-400">How it works</p>
          {/* Four big lines. Read the titles alone and you have the whole product. */}
          <ol className="border-t border-neutral-200">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="grid items-center gap-3 border-b border-neutral-200 py-9 md:grid-cols-12 md:gap-10">
                <span className="md:col-span-1"><StepCell n={i + 1} /></span>
                <p className="text-[clamp(1.75rem,3.4vw,2.75rem)] font-semibold leading-tight tracking-[-0.03em] md:col-span-6">{title}</p>
                <p className="max-w-[44ch] leading-relaxed text-neutral-500 md:col-span-5">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto grid max-w-[1280px] gap-12 border-t border-neutral-100 px-6 py-28 md:grid-cols-12 md:px-10">
          <div className="md:col-span-4">
            <p className="label-mono mb-5 text-neutral-400">A real job</p>
            <p className="text-3xl font-medium leading-tight tracking-[-0.03em]">One $10 task, three answers. One of them didn&apos;t get paid.</p>
            <p className="mt-5 leading-relaxed text-neutral-500">
              Your name and email are taken out of the task before any AI reads it. Each answer and each grade comes back signed by the machine that produced it, so it can&apos;t be swapped later.
            </p>
          </div>
          <div className="md:col-span-7 md:col-start-6">
            <p className="mb-6 text-lg text-neutral-700">&ldquo;{RECEIPT.task}&rdquo;</p>
            <table className="w-full text-left">
              <thead>
                <tr className="label-mono text-neutral-400">
                  {['Agent', 'Score', 'Paid', 'Reviewer said'].map((h) => <th key={h} className="border-b border-neutral-900 py-2.5 pr-6 font-normal">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {RECEIPT.rows.map(([agent, score, paid, said]) => (
                  <tr key={agent} className="border-b border-neutral-100 align-top">
                    <td className="py-4 pr-6 font-medium">{agent}</td>
                    <td className="py-4 pr-6 tabular-nums">{score}</td>
                    <td className="py-4 pr-6 tabular-nums"><span className={score >= 70 ? 'bg-lemon px-1.5 py-0.5' : 'text-neutral-400'}>{paid}</span></td>
                    <td className="py-4 text-neutral-500">{said}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-sm text-neutral-500">Refunded to you: {RECEIPT.refund}</p>
          </div>
        </section>

        {/* The closing section is a hive you can move through: cells light up lemon under the cursor. */}
        <section className="relative overflow-hidden border-t border-neutral-100">
          <div className="absolute inset-0">
            <ShapeGrid shape="hexagon" cellSize={30} direction="none" speed={0} lineColor="#ededed"
              hoverColor="#c8ea2e" hoverFillColor="#d8f740" fillOpacity={0.55} trail={0.85} glow={0} intro={false} />
          </div>
          <div className="pointer-events-none relative mx-auto max-w-5xl px-6 py-36 text-center">
            <h2 className="mx-auto max-w-[24ch] text-[clamp(2rem,4.4vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
              Ask once, get three answers.
              <span className="block font-normal text-neutral-400">Pay only for the ones that pass.</span>
            </h2>
            <a href="#try" className="pointer-events-auto mt-9 inline-block rounded-lg bg-neutral-950 px-6 py-3.5 text-[15px] font-medium text-white hover:opacity-90">Post a task</a>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-100">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-neutral-500 md:px-10">
          <span className="font-mono font-medium tracking-[-0.04em] text-neutral-950">hive</span>
          <span>The AIs run on NEAR AI. Payments settle on NEAR.</span>
          <a href={REPO} target="_blank" rel="noopener" className="hover:text-neutral-950">GitHub</a>
        </div>
      </footer>
    </>
  );
}
