// A quiet honeycomb of dots behind the product: the hive, drawn the way Guild draws its halftone fields.
// A few cells in the side margins light up in lemon and pulse slowly, like workers moving through it.

const R = 14; // hexagon radius in px
const W = Math.sqrt(3) * R;
const H = 1.5 * R;

// Lit cells as [column, row]. Positive columns count from the left edge, negative ones from the right,
// so the cells stay in the margins beside the console at any screen width.
const LIT: [number, number][] = [[2, 3], [3, 4], [5, 9], [1, 15], [3, 22], [-3, 2], [-2, 7], [-5, 8], [-2, 16], [-4, 21]];

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

function Cell({ c, r, i }: { c: number; r: number; i: number }) {
  return (
    <polygon points={hexPoints(c * W + (r % 2 ? W / 2 : 0), r * H, R - 2)} className="fill-lemon">
      <animate attributeName="opacity" values="0.35;1;0.35" dur={`${3 + (i % 3)}s`} begin={`${i * 0.4}s`} repeatCount="indefinite" />
    </polygon>
  );
}

export function Honeycomb() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 hidden h-full w-full md:block">
      <defs>
        <pattern id="hive-dots" width={W} height={H * 2} patternUnits="userSpaceOnUse">
          <circle cx={W / 2} cy={H / 2} r={1.3} className="fill-neutral-300" />
          <circle cx={0} cy={H * 1.5} r={1.3} className="fill-neutral-300" />
          <circle cx={W} cy={H * 1.5} r={1.3} className="fill-neutral-300" />
        </pattern>
        <linearGradient id="hive-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.15" stopColor="white" stopOpacity="1" />
          <stop offset="0.8" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="hive-mask">
          <rect width="100%" height="100%" fill="url(#hive-fade)" />
        </mask>
      </defs>
      <g mask="url(#hive-mask)">
        <rect width="100%" height="100%" fill="url(#hive-dots)" />
        {LIT.filter(([c]) => c > 0).map(([c, r], i) => <Cell key={i} c={c} r={r} i={i} />)}
        <svg x="100%" overflow="visible">
          {LIT.filter(([c]) => c < 0).map(([c, r], i) => <Cell key={i} c={c} r={r} i={i + 5} />)}
        </svg>
      </g>
    </svg>
  );
}
