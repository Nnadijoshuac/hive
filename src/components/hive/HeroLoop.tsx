'use client';
// The hero's backdrop: an infinity loop under the copy with the reviewer at its centre. The loop is a thin
// trail of honeycomb dots that swells as bulges travel round it. Cards rise up the outside of each lobe,
// the three AIs on the left and the payouts on the right: each appears small at the bottom, is largest
// halfway up, where it gets its grade or its money, and shrinks away at the top.
// Every mark fades out near the copy so the headline reads first.
import { useEffect, useRef, useState, type RefObject } from 'react';
import { cn } from '@/lib/utils';

// The real job on Nov 5 2026: scores and payouts as the receipt recorded them. 70 is the pass mark.
const CARDS = [
  { side: -1, name: 'Scout', value: '92', good: true },
  { side: -1, name: 'Sage', value: '60', good: false },
  { side: -1, name: 'Maker', value: '90', good: true },
  { side: 1, name: 'Scout', value: '$5.05', good: true },
  { side: 1, name: 'Maker', value: '$4.94', good: true },
  { side: 1, name: 'Refund', value: '$0.01', good: false },
] as const;

const LATTICE = 3.6; // spacing of the honeycomb lattice every dot snaps to, in px
const SAMPLES = 1800;
const BASE_HALF = 2.2; // half-width of the loop at rest, in px
const MAX_HALF = 14; // half-width where it swells widest
const LAP_SECONDS = 12; // one trip of the bulges round the loop; with three bulges, one passes each time a card sets off
const TRIP_SECONDS = 12; // one card's rise from the bottom of a lobe to the top
const PER_SIDE = 3;

interface Dot { x: number; y: number; s: number; o: number; a: number }
interface Orbit { cx: number; cy: number; rx: number; ry: number }
interface Geometry {
  dots: Dot[]; orbits: [Orbit, Orbit];
  fade: (x: number, y: number) => number; centre: [number, number]; labelDx: number;
}

const smooth = (k: number) => { const c = Math.min(1, Math.max(0, k)); return c * c * (3 - 2 * c); };
const frac = (x: number) => ((x % 1) + 1) % 1;

function build(w: number, h: number, clear: DOMRect | null, origin: DOMRect): Geometry {
  const A = Math.min(w * 0.34, 540); // half-width of the loop
  const H = A * 0.5; // half-height of each lobe
  const top = clear ? clear.bottom - origin.top : h * 0.5;
  const cx = w / 2;
  const cy = Math.min(h - H - 50, top + H + 10); // the lobes' tops sit just under the buttons
  // Lemniscate of Gerono: each lobe is an egg, round on the outside and narrowing to straight, angled strands
  // where it meets the centre. t runs 0..2π and crosses the centre at π/2 and 3π/2.
  const at = (t: number): [number, number] => [cx + A * Math.cos(t), cy + 2 * H * Math.sin(t) * Math.cos(t)];

  const ex = clear ? clear.left - origin.left + clear.width / 2 : cx;
  const ey = clear ? clear.top - origin.top + clear.height / 2 : h * 0.3;
  const rx = clear ? clear.width * 0.58 : w * 0.3;
  const ry = clear ? clear.height * 0.6 : h * 0.25;
  const fade = (x: number, y: number) =>
    smooth((Math.hypot((x - ex) / rx, (y - ey) / ry) - 0.85) / 0.4) * smooth((h - y) / 60) * smooth(Math.min(x, w - x) / 60);

  // The paths the cards rise along, just outside each lobe. Only their outer halves are used. Not drawn.
  const orbits: [Orbit, Orbit] = [
    { cx: cx - A * 0.58, cy, rx: A * 0.66, ry: H * 1.22 },
    { cx: cx + A * 0.58, cy, rx: A * 0.66, ry: H * 1.22 },
  ];

  // The loop is one material: every lattice cell within reach of the line, kept with its distance from it (o).
  // Each frame decides how wide the loop is at each point. At rest it's a thin trail of dots; where a ribbon
  // passes, the same dots swell outward around it, like a pipe bulging as something travels through.
  const rowH = LATTICE * 0.866;
  const seen = new Set<string>();
  const dots: Dot[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t = (i / SAMPLES) * Math.PI * 2;
    const [x, y] = at(t);
    const [x2, y2] = at(t + 0.002);
    const len = Math.hypot(x2 - x, y2 - y) || 1;
    for (let o = -MAX_HALF; o <= MAX_HALF; o += LATTICE * 0.45) {
      const px = x - ((y2 - y) / len) * o;
      const py = y + ((x2 - x) / len) * o;
      const row = Math.round(py / rowH);
      const shift = row % 2 ? LATTICE / 2 : 0;
      const col = Math.round((px - shift) / LATTICE);
      const key = `${row},${col}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const sx = col * LATTICE + shift;
      const sy = row * rowH;
      const a = fade(sx, sy);
      if (a > 0.02) dots.push({ x: sx, y: sy, s: i / SAMPLES, o: Math.abs(o), a });
    }
  }

  return { dots, orbits, fade, centre: [cx, cy], labelDx: A * 0.55 };
}

/** How far the loop swells at point s (0 to 1): three evenly spaced bulges per lap, each rising and easing
 *  off smoothly. They travel toward lower s, which runs up the outside of both lobes, the way the cards go. */
const ribbon = (s: number, flow: number) => {
  let w = 0;
  for (const [offset, len] of [[0, 0.15], [1 / 3, 0.12], [2 / 3, 0.14]]) {
    const f = frac(s + flow - offset);
    if (f < len) w = Math.max(w, Math.sin((f / len) * Math.PI) ** 2);
  }
  return w;
};

export function HeroLoop({ clearRef }: { clearRef: RefObject<HTMLElement | null> }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [anchor, setAnchor] = useState<{ centre: [number, number]; labelDx: number } | null>(null);

  useEffect(() => {
    const box = boxRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let g: Geometry | null = null;
    let frame = 0;
    let visible = true;
    const start = performance.now();

    const layout = () => {
      const rect = box.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      g = build(rect.width, rect.height, clearRef.current?.getBoundingClientRect() ?? null, rect);
      setAnchor({ centre: g.centre, labelDx: g.labelDx });
    };

    const draw = (time: number) => {
      if (!g) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#5c5c5c';
      const flow = time / LAP_SECONDS;
      for (const d of g.dots) {
        const swell = ribbon(d.s, flow);
        const half = BASE_HALF + (MAX_HALF - BASE_HALF) * swell;
        if (d.o > half) continue;
        // Dots thin out toward the edge of the bulge, so it swells softly instead of ending in a hard rim.
        const edge = d.o / half;
        const r = 0.6 + 0.35 * swell * (1 - edge);
        ctx.globalAlpha = d.a * (0.75 - 0.4 * edge * swell);
        ctx.fillRect(d.x - r, d.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;

      // Each card rises from the bottom of its lobe's path to the top, round the outside. Its size and
      // opacity follow a half sine: nothing at either end, fullest halfway, where its value shows.
      cardRefs.current.forEach((el, i) => {
        if (!el || !g) return;
        const { side } = CARDS[i];
        const o = g.orbits[side < 0 ? 0 : 1];
        const p = frac(time / TRIP_SECONDS + (i % PER_SIDE) / PER_SIDE + (side > 0 ? 0.5 / PER_SIDE : 0));
        const angle = Math.PI / 2 - side * Math.PI * p;
        const x = o.cx + o.rx * Math.cos(angle);
        const y = o.cy + o.ry * Math.sin(angle);
        // Sharpened, so a card shows up a little way into its rise and is gone a little before the top.
        const size = Math.sin(Math.PI * p) ** 1.6;
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${0.25 + 0.75 * size})`;
        el.style.opacity = String(Math.sin(Math.PI * p) ** 3 * Math.max(0.2, g.fade(x, y)));
        const done = String(p > 0.42);
        if (el.dataset.done !== done) el.dataset.done = done;
      });
    };

    const tick = (now: number) => {
      draw((now - start) / 1000);
      frame = visible ? requestAnimationFrame(tick) : 0;
    };

    layout();
    if (still) draw(TRIP_SECONDS * 0.5);
    else frame = requestAnimationFrame(tick);

    const resized = new ResizeObserver(() => { layout(); if (still) draw(TRIP_SECONDS * 0.5); });
    resized.observe(box);
    // Stop drawing while the hero is scrolled out of view.
    const onScreen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !still && !frame) frame = requestAnimationFrame(tick);
    });
    onScreen.observe(box);
    return () => { cancelAnimationFrame(frame); resized.disconnect(); onScreen.disconnect(); };
  }, [clearRef]);

  const place = ([x, y]: [number, number]) => ({ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` });

  return (
    <div ref={boxRef} aria-hidden className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />

      {anchor && (
        <>
          {/* The reviewer, at the centre of the loop. */}
          <div style={{ ...place(anchor.centre), zIndex: 20 }} className="absolute top-0 left-0">
            <div className="relative grid size-[clamp(4.5rem,8vw,7rem)] place-items-center drop-shadow-[0_14px_24px_rgb(0_0_0/0.18)]">
              <Hex className="absolute inset-0 size-full fill-neutral-950" />
              <svg viewBox="0 0 24 24" className="relative size-[38%]">
                <path d="m5.5 12.5 4 4 9-9.5" className="fill-none stroke-lemon"
                  strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div className="hidden md:block">
            {(['Answers in', 'Paid out'] as const).map((label, i) => (
              <span key={label} style={place([anchor.centre[0] + (i ? 1 : -1) * anchor.labelDx, anchor.centre[1]])}
                className="label-mono absolute top-0 left-0 text-[11px] text-neutral-400">{label}</span>
            ))}
          </div>
        </>
      )}

      {/* Every card is the same size; the effect above moves, scales and fills them each frame. */}
      <div className="hidden md:block">
        {CARDS.map((c, i) => (
          <div key={`${c.side}${c.name}`} ref={(el) => { cardRefs.current[i] = el; }} data-done="false"
            className="group absolute top-0 left-0 opacity-0">
            <div className="flex w-40 items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-[0_8px_24px_-10px_rgb(0_0_0/0.2)]">
              <Hex className="size-4 shrink-0 fill-neutral-900" />
              <span className="truncate text-[13px] font-medium text-neutral-800">{c.name}</span>
              <span className="ml-auto font-mono text-[11px] text-neutral-300 group-data-[done=true]:hidden">···</span>
              <span className={cn('ml-auto hidden rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums group-data-[done=true]:inline',
                c.good ? 'bg-lemon text-neutral-950' : 'bg-neutral-100 text-neutral-400')}>
                {c.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hex({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M12 1.5 21.1 6.75v10.5L12 22.5 2.9 17.25V6.75Z" />
    </svg>
  );
}
