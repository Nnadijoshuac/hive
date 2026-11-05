// A quiet honeycomb of dots behind the product: the hive, drawn the way Guild draws its halftone fields.
// A few cells light up in lemon and breathe slowly, like workers moving through it.

const R = 14; // hexagon radius in px
const W = Math.sqrt(3) * R;
const H = 1.5 * R;

// Cells that light up, as [column, row] on the grid. Kept near the edges so text stays readable.
const LIT: [number, number][] = [[3, 2], [5, 3], [44, 4], [47, 9], [2, 14], [42, 16], [8, 19], [46, 21]];

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

export function Honeycomb() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <pattern id="hive-dots" width={W} height={H * 2} patternUnits="userSpaceOnUse">
          <circle cx={W / 2} cy={H / 2} r={1.1} className="fill-neutral-300" />
          <circle cx={0} cy={H * 1.5} r={1.1} className="fill-neutral-300" />
          <circle cx={W} cy={H * 1.5} r={1.1} className="fill-neutral-300" />
        </pattern>
        <radialGradient id="hive-fade">
          <stop offset="0.35" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="hive-mask">
          <rect width="100%" height="100%" fill="url(#hive-fade)" />
        </mask>
      </defs>
      <g mask="url(#hive-mask)">
        <rect width="100%" height="100%" fill="url(#hive-dots)" />
        {LIT.map(([c, r], i) => (
          <polygon key={i} points={hexPoints(c * W + (r % 2 ? W / 2 : 0), r * H, R - 2)} className="fill-lemon">
            <animate attributeName="opacity" values="0.25;0.9;0.25" dur={`${3 + (i % 3)}s`} begin={`${i * 0.4}s`} repeatCount="indefinite" />
          </polygon>
        ))}
      </g>
    </svg>
  );
}
