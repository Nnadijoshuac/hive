// The cards around the hero. Together they are one real job, the Nov 5 run, in the order it happened:
// your task, three answers, the reviewer, two payouts and the refund. One line threads them in that order,
// so the picture explains the product before anyone reads the copy. Sage's card is grey because it failed.
//
// Lemon marks money moving to someone. Everything else is ink on white.
// Static: no state and no client bundle. Same approach as Draw's HoldingsField, by the same author.

type Kind = 'task' | 'answer' | 'review' | 'paid' | 'refund';

interface Card {
  /** Percent of the field, so it composes at any width. */
  x: number;
  y: number;
  rotate: number;
  opacity: number;
  kind: Kind;
  title: string;
  detail: string;
  meta?: string;
  /** Reviewer score out of 100, drawn as the card's bar. */
  grade?: number;
  failed?: boolean;
}

// Down the left, across the bottom, up the right, so the line stays clear of the copy in the middle.
const CARDS: Card[] = [
  { x: 4, y: 9, rotate: -3, opacity: 0.85, kind: 'task', title: 'Your task', detail: 'Cut my software costs', meta: '$10 budget' },
  { x: 1, y: 42, rotate: 2, opacity: 1, kind: 'answer', title: 'Scout', detail: '5 ideas, a saving for each', grade: 92 },
  { x: 6, y: 74, rotate: -1.5, opacity: 0.8, kind: 'answer', title: 'Sage', detail: 'Formulas, no dollar amounts', grade: 60, failed: true },
  { x: 38, y: 86, rotate: 1.5, opacity: 0.75, kind: 'answer', title: 'Maker', detail: '5 ideas, rough savings', grade: 90 },
  { x: 70, y: 72, rotate: 3, opacity: 0.9, kind: 'review', title: 'Reviewer', detail: 'Graded 3 answers', meta: 'Pass mark 70' },
  { x: 74, y: 39, rotate: -2, opacity: 1, kind: 'paid', title: 'Paid Scout', detail: 'Scored 92', meta: '$5.05' },
  { x: 71, y: 6, rotate: 2.5, opacity: 0.85, kind: 'paid', title: 'Paid Maker', detail: 'Scored 90', meta: '$4.94' },
  { x: 37, y: 2, rotate: -1, opacity: 0.6, kind: 'refund', title: 'Back to you', detail: 'Sage was not paid', meta: '$0.01' },
];

/** Roughly the middle of a card, where the line meets it. */
const NODE_DX = 5.5;
const NODE_DY = 5.5;

/** Cue times in ms, matched to the headline in Hero. Nothing lands at the same time as anything else. */
const FIELD_LEAD = 340;
const STAGGER = 95;
const LINE_DELAY = FIELD_LEAD + (CARDS.length - 1) * STAGGER + 620;
const DRAW_MS = 1500; // matches .thread in globals.css

/** Where each node sits along the path, 0 to 1, so it can light up as the line reaches it. */
function progressAlong(points: { x: number; y: number }[]) {
  let run = 0;
  const cumulative = points.map((p, i) => (run += i ? Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) : 0));
  return cumulative.map((c) => c / (run || 1));
}

export function JobField() {
  const nodes = CARDS.map((c) => ({ key: c.title, opacity: c.opacity, x: c.x + NODE_DX, y: c.y + NODE_DY }));
  const path = nodes.map((n, i) => `${i ? 'L' : 'M'} ${n.x} ${n.y}`).join(' ');
  const reached = progressAlong(nodes);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path className="thread" style={{ animationDelay: `${LINE_DELAY}ms` }} d={path} fill="none"
          stroke="var(--border)" strokeWidth="1" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
          pathLength="1" strokeDasharray="1" />
      </svg>

      {nodes.map((n, i) => (
        <span key={n.key} className="veil absolute size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-1 ring-neutral-300"
          style={{ left: `${n.x}%`, top: `${n.y}%`, opacity: n.opacity, animationDelay: `${Math.round(LINE_DELAY + reached[i] * DRAW_MS)}ms` }} />
      ))}

      {CARDS.map((card, i) => (
        // The wrapper owns the fall and the card owns its tilt. On one element they would blend into one
        // transform and every card would twist as it landed.
        <div key={card.title} className="fall absolute w-[184px]"
          style={{ left: `${card.x}%`, top: `${card.y}%`, opacity: card.opacity, animationDelay: `${FIELD_LEAD + i * STAGGER}ms` }}>
          <FieldCard card={card} />
        </div>
      ))}
    </div>
  );
}

function FieldCard({ card }: { card: Card }) {
  const money = card.kind === 'paid';
  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.18)]"
      style={{ transform: `rotate(${card.rotate}deg)` }}>
      <span className={money ? 'block h-[3px] bg-lemon' : 'block h-[3px] bg-gradient-to-r from-neutral-200 to-transparent'} />
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Glyph kind={card.kind} failed={card.failed} />
          <span className="truncate text-[12px] font-medium">{card.title}</span>
          {card.grade !== undefined && (
            <span className={`ml-auto font-mono text-[11px] tabular-nums ${card.failed ? 'text-neutral-400' : 'text-neutral-900'}`}>{card.grade}</span>
          )}
        </div>
        <p className="mt-1.5 truncate text-[11px] text-neutral-500">{card.detail}</p>
        {card.meta && (
          <p className={`mt-1.5 text-[13px] font-medium tabular-nums tracking-[-0.01em] ${money ? '' : 'text-neutral-700'}`}>
            {money ? <span className="bg-lemon px-1">{card.meta}</span> : card.meta}
          </p>
        )}
        {card.grade !== undefined && (
          <span className="mt-2.5 block h-[3px] overflow-hidden rounded-full bg-neutral-100">
            <span className={`block h-full rounded-full ${card.failed ? 'bg-neutral-300' : 'bg-lemon'}`} style={{ width: `${card.grade}%` }} />
          </span>
        )}
      </div>
    </article>
  );
}

function Glyph({ kind, failed }: { kind: Kind; failed?: boolean }) {
  if (kind === 'paid') {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-lemon">
        <svg width="10" height="10" viewBox="0 0 18 18" fill="none">
          <path d="M4 9.5 7.2 12.6 14 5.8" stroke="#0a0a0a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (kind === 'answer') {
    return <span className={`size-4 shrink-0 rounded-full border-2 ${failed ? 'border-neutral-300' : 'border-neutral-900'}`} />;
  }
  if (kind === 'review') {
    return (
      <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden>
        <path d="M12 2 20.66 7v10L12 22 3.34 17V7Z" className="fill-neutral-900" />
      </svg>
    );
  }
  return <span className="size-4 shrink-0 rounded-[5px] border border-neutral-300 bg-neutral-50" />;
}
