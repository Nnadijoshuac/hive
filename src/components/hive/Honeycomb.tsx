// The honeycomb behind the live console. Built to look exact, so nothing in it reads as an accident:
// - the grid starts at the centre of the section, so left and right are mirror images;
// - every edge is drawn once, in one path, so no line is doubled and darker where two cells meet;
// - the lemon cells sit exactly on grid cells;
// - it fades out evenly towards every edge. It does not move.

const W = 34; // cell width in px; whole pixels keep the vertical edges sharp
const R = W / Math.sqrt(3); // radius of a regular, pointy-top hexagon that is W wide
const ROW = 1.5 * R; // distance between rows

const COLS = 34; // cells each side of centre, enough for wide screens
const ROWS = 20; // rows above and below centre

/** Centre of the cell at (col, row). Odd rows shift half a cell, which keeps the grid symmetric about x = 0. */
const centre = (col: number, row: number): [number, number] => [col * W + (Math.abs(row) % 2 ? W / 2 : 0), row * ROW];

const f = (n: number) => n.toFixed(2);

/**
 * Each hexagon draws its left edge and its two top edges. Its other three edges belong to the neighbours
 * on its right and below, so across the grid every edge is drawn exactly once.
 */
function gridPath() {
  let d = '';
  for (let row = -ROWS; row <= ROWS; row++) {
    for (let col = -COLS; col <= COLS; col++) {
      const [x, y] = centre(col, row);
      d += `M${f(x - W / 2)} ${f(y + R / 2)}V${f(y - R / 2)}L${f(x)} ${f(y - R)}L${f(x + W / 2)} ${f(y - R / 2)}`;
    }
  }
  return d;
}

function hexPoints([x, y]: [number, number]) {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k - Math.PI / 2;
    return `${f(x + R * Math.cos(a))},${f(y + R * Math.sin(a))}`;
  }).join(' ');
}

// Three lit cells as [col, row]: one on the left, two on the right, at unrelated rows so they read as
// scattered. All sit in the side margins, 630 to 730px from centre and near the console's middle, so they stay
// clear of the console (at most 1200px wide) even when it grows during a job. One soft strength for all.
const LIT_OPACITY = 0.55;
const LIT = ([[-21, -3], [20, 2], [21, -6]] as const).map(([col, row]) => centre(col, row));

const PATH = gridPath();

export function Honeycomb() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 hidden h-full w-full md:block">
      <defs>
        <radialGradient id="hive-fade">
          <stop offset="0" stopColor="white" />
          <stop offset="0.55" stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="hive-mask">
          <rect width="100%" height="100%" fill="url(#hive-fade)" />
        </mask>
      </defs>
      {/* Nested svgs at the centre make (0, 0) the middle of the section. The lit cells sit outside the
          fade so they keep their colour near the edges; the grid lines are drawn over them. */}
      <svg x="50%" y="50%" overflow="visible">
        {LIT.map((at, i) => (
          <polygon key={i} points={hexPoints(at)} className="fill-lemon" opacity={LIT_OPACITY} />
        ))}
      </svg>
      <g mask="url(#hive-mask)">
        <svg x="50%" y="50%" overflow="visible">
          <path d={PATH} fill="none" className="stroke-neutral-200" strokeWidth={1} strokeLinejoin="round" />
        </svg>
      </g>
    </svg>
  );
}
