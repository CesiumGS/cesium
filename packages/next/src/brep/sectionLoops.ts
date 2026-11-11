// Pieces of a cap's boundary in the section plane's (u, v): joining them into
// loops, cutting loops by a half-plane (the sides of a clip box), and nesting
// loops into outer boundaries and holes (plan §13.26, caps; section.ts).
// A piece is a chain of rational Bézier segments of one degree, an edge of
// the cap; a loop is pieces end to end; interior on the left throughout.
import {
  controlPoint,
  endPoint,
  evalBez,
  lineCrossings,
  line2,
  reverseBez,
  segmentDirection,
  startPoint,
  subBez,
  type Bez2,
} from "./sectionFit.ts";
import type { P2 } from "./sectionCurves.ts";

/** A chain of segments of one degree: an edge of the cap. */
export interface Piece {
  readonly segs: readonly Bez2[];
  /** The face the piece came from; -1 for a piece made along a clip line. */
  readonly face: number;
}

export type Loop = readonly Piece[];

export const pieceStart = (p: Piece): P2 => startPoint(p.segs[0]!);
export const pieceEnd = (p: Piece): P2 => endPoint(p.segs[p.segs.length - 1]!);

export function reversePiece(p: Piece): Piece {
  return {
    segs: p.segs.map(reverseBez).reverse(),
    face: p.face,
  };
}

const distance = (a: P2, b: P2): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** The point halfway along the piece, in parameter. */
export function pieceMidpoint(p: Piece): P2 {
  const n = p.segs.length;
  const i = Math.floor(n / 2);
  return evalBez(p.segs[i]!, n % 2 === 1 ? 0.5 : 0);
}

// --- joining ----------------------------------------------------------------------

export interface Joined {
  readonly loops: Loop[];
  /** Chains that do not close. */
  readonly open: Piece[][];
  /** The pieces with their ends moved onto the shared node of each junction. */
  readonly snapped: number;
}

function withEnds(
  piece: Piece,
  start: P2 | undefined,
  end: P2 | undefined,
): Piece {
  const segs = piece.segs.map((s) => ({
    degree: s.degree,
    pts: Float64Array.from(s.pts),
  }));
  const move = (seg: Bez2, i: number, p: P2) => {
    const w = seg.pts[i * 3 + 2]!;
    seg.pts[i * 3] = p[0] * w;
    seg.pts[i * 3 + 1] = p[1] * w;
  };
  if (start) {
    move(segs[0]!, 0, start);
  }
  if (end) {
    move(segs[segs.length - 1]!, segs[segs.length - 1]!.degree, end);
  }
  return { segs, face: piece.face };
}

/**
 * Joins pieces into loops by their ends, within `tolerance`. Where several
 * pieces leave one junction, the walk takes the right-most turn, which keeps
 * the loops of a region that pinches at a point apart. Ends at a junction are
 * moved onto its centroid, so a loop closes exactly.
 */
export function joinPieces(
  pieces: readonly Piece[],
  tolerance: number,
): Joined {
  const nodes: { x: number; y: number; n: number }[] = [];
  const nodeOf = (p: P2): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (distance([nodes[i]!.x, nodes[i]!.y], p) <= tolerance) {
        const node = nodes[i]!;
        node.x = (node.x * node.n + p[0]) / (node.n + 1);
        node.y = (node.y * node.n + p[1]) / (node.n + 1);
        node.n++;
        return i;
      }
    }
    nodes.push({ x: p[0], y: p[1], n: 1 });
    return nodes.length - 1;
  };
  const from = pieces.map((p) => nodeOf(pieceStart(p)));
  const to = pieces.map((p) => nodeOf(pieceEnd(p)));
  const leaving: number[][] = nodes.map(() => []);
  pieces.forEach((_, i) => leaving[from[i]!]!.push(i));
  const used = new Uint8Array(pieces.length);
  const loops: number[][] = [];
  const open: number[][] = [];
  for (let i = 0; i < pieces.length; i++) {
    if (used[i]) {
      continue;
    }
    const chain = [i];
    used[i] = 1;
    let closed = false;
    for (;;) {
      const last = chain[chain.length - 1]!;
      const at = to[last]!;
      const incoming = segmentDirection(
        pieces[last]!.segs[pieces[last]!.segs.length - 1]!,
        true,
      );
      let best = -1;
      let bestAngle = Infinity;
      for (const j of leaving[at]!) {
        if (used[j] && j !== chain[0]) {
          continue;
        }
        if (j === chain[0] && at !== from[chain[0]!]) {
          continue;
        }
        const outgoing = segmentDirection(pieces[j]!.segs[0]!, false);
        const angle = Math.atan2(
          incoming[0] * outgoing[1] - incoming[1] * outgoing[0],
          incoming[0] * outgoing[0] + incoming[1] * outgoing[1],
        );
        if (angle < bestAngle) {
          bestAngle = angle;
          best = j;
        }
      }
      if (best < 0) {
        break;
      }
      if (best === chain[0]) {
        closed = true;
        break;
      }
      used[best] = 1;
      chain.push(best);
    }
    (closed ? loops : open).push(chain);
  }
  const placed = (k: number): Piece =>
    withEnds(
      pieces[k]!,
      [nodes[from[k]!]!.x, nodes[from[k]!]!.y],
      [nodes[to[k]!]!.x, nodes[to[k]!]!.y],
    );
  return {
    loops: loops.map((c) => c.map(placed)),
    open: open.map((c) => c.map(placed)),
    snapped: nodes.filter((n) => n.n > 1).length,
  };
}

// --- area, polygons, nesting --------------------------------------------------------

/** Eight-point Gauss–Legendre on [0, 1]. */
const GAUSS: readonly (readonly [number, number])[] = [
  [0.0198550717512319, 0.0506142681451881],
  [0.1016667612931866, 0.1111905172266872],
  [0.2372337950418355, 0.1568533229389436],
  [0.4082826787521751, 0.181341891689181],
  [0.5917173212478249, 0.181341891689181],
  [0.7627662049581645, 0.1568533229389436],
  [0.8983332387068134, 0.1111905172266872],
  [0.9801449282487681, 0.0506142681451881],
];

function derivative(seg: Bez2, t: number): { p: P2; d: P2 } {
  const n = seg.degree;
  const h = (u: number, comps: Float64Array): number[] => {
    const buffer = Float64Array.from(comps);
    const m = comps.length / 3;
    for (let level = 1; level < m; level++) {
      for (let i = 0; i < m - level; i++) {
        for (let c = 0; c < 3; c++) {
          buffer[i * 3 + c] =
            (1 - u) * buffer[i * 3 + c]! + u * buffer[(i + 1) * 3 + c]!;
        }
      }
    }
    return [buffer[0]!, buffer[1]!, buffer[2]!];
  };
  const value = h(t, seg.pts);
  const hodograph = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      hodograph[i * 3 + c] =
        n * (seg.pts[(i + 1) * 3 + c]! - seg.pts[i * 3 + c]!);
    }
  }
  const slope = h(t, hodograph);
  const w = value[2]!;
  const px = value[0]! / w;
  const py = value[1]! / w;
  return {
    p: [px, py],
    d: [(slope[0]! - px * slope[2]!) / w, (slope[1]! - py * slope[2]!) / w],
  };
}

/** The area a loop encloses, positive counter-clockwise (exact to quadrature: ½∮ x dy − y dx). */
export function loopArea(loop: Loop): number {
  let twice = 0;
  for (const piece of loop) {
    for (const seg of piece.segs) {
      for (const [t, w] of GAUSS) {
        const { p, d } = derivative(seg, t);
        twice += w * (p[0] * d[1] - p[1] * d[0]);
      }
    }
  }
  return twice / 2;
}

/** The loop as a polygon: `per` points a segment. */
export function loopPolygon(loop: Loop, per = 12): P2[] {
  const out: P2[] = [];
  for (const piece of loop) {
    for (const seg of piece.segs) {
      for (let k = 0; k < per; k++) {
        out.push(evalBez(seg, k / per));
      }
    }
  }
  return out;
}

export function insidePolygon(polygon: readonly P2[], p: P2): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export interface Region {
  readonly outer: Loop;
  readonly holes: Loop[];
  /** The region's area: the outer's less the holes'. */
  readonly area: number;
}

/**
 * Nests loops: counter-clockwise ones are outer boundaries, clockwise ones are
 * holes of the smallest outer boundary that holds them. A clockwise loop that
 * no outer boundary holds is `stray`.
 */
export function nestLoops(loops: readonly Loop[]): {
  regions: Region[];
  stray: Loop[];
} {
  const info = loops.map((loop) => ({
    loop,
    area: loopArea(loop),
    polygon: loopPolygon(loop),
  }));
  const outers = info.filter((l) => l.area > 0);
  const regions = outers.map((o) => ({
    o,
    holes: [] as Loop[],
    area: o.area,
  }));
  const stray: Loop[] = [];
  for (const hole of info.filter((l) => l.area < 0)) {
    const probe = pieceMidpoint(hole.loop[0]!);
    let best: (typeof regions)[number] | undefined;
    for (const r of regions) {
      if (r.o.area > -hole.area && insidePolygon(r.o.polygon, probe)) {
        if (!best || r.o.area < best.o.area) {
          best = r;
        }
      }
    }
    if (best) {
      best.holes.push(hole.loop);
      best.area += hole.area;
    } else {
      stray.push(hole.loop);
    }
  }
  return {
    regions: regions.map((r) => ({
      outer: r.o.loop,
      holes: r.holes,
      area: r.area,
    })),
    stray,
  };
}

// --- cutting by a half-plane ---------------------------------------------------------

/**
 * Cuts the loops by the half-plane n·p + c ≤ 0 (n a unit vector), keeping what is
 * inside it: the pieces inside, and the new boundary along the line, from where
 * a piece leaves the half-plane to the next where one enters.
 */
export function clipLoops(
  loops: readonly Loop[],
  n: P2,
  c: number,
): { loops: Loop[]; broken: number } {
  const e: P2 = [-n[1], n[0]];
  const lambda = (p: P2) => e[0] * p[0] + e[1] * p[1];
  const inside = (p: P2) => n[0] * p[0] + n[1] * p[1] + c <= 1e-12;
  const kept: Loop[] = [];
  const chains: Piece[][] = [];
  for (const loop of loops) {
    const subs: { piece: Piece; inside: boolean }[] = [];
    for (const piece of loop) {
      // Cut each segment at its crossings, then group runs of one side.
      const cut: { seg: Bez2; inside: boolean }[] = [];
      for (const seg of piece.segs) {
        const ts = lineCrossings(seg, n, c);
        const edges = [0, ...ts, 1];
        for (let k = 0; k + 1 < edges.length; k++) {
          const part =
            ts.length === 0 ? seg : subBez(seg, edges[k]!, edges[k + 1]!);
          cut.push({ seg: part, inside: inside(evalBez(part, 0.5)) });
        }
      }
      let run: Bez2[] = [];
      let side = cut[0]!.inside;
      for (const part of cut) {
        if (part.inside !== side) {
          subs.push({ piece: { segs: run, face: piece.face }, inside: side });
          run = [];
          side = part.inside;
        }
        run.push(part.seg);
      }
      subs.push({ piece: { segs: run, face: piece.face }, inside: side });
    }
    if (subs.every((s) => s.inside)) {
      kept.push(subs.map((s) => s.piece));
      continue;
    }
    if (subs.every((s) => !s.inside)) {
      continue;
    }
    const first = subs.findIndex(
      (s, k) => s.inside && !subs[(k + subs.length - 1) % subs.length]!.inside,
    );
    let chain: Piece[] = [];
    for (let step = 0; step < subs.length; step++) {
      const s = subs[(first + step) % subs.length]!;
      if (s.inside) {
        chain.push(s.piece);
      } else if (chain.length > 0) {
        chains.push(chain);
        chain = [];
      }
    }
    if (chain.length > 0) {
      chains.push(chain);
    }
  }
  if (chains.length === 0) {
    return { loops: kept, broken: 0 };
  }
  // Along the line (direction e, the kept side on the left): from where a chain
  // leaves to where the next one, further along, enters.
  const events = chains.flatMap((chain, i) => [
    { l: lambda(pieceStart(chain[0]!)), entry: true, chain: i },
    { l: lambda(pieceEnd(chain[chain.length - 1]!)), entry: false, chain: i },
  ]);
  events.sort((a, b) => a.l - b.l || Number(a.entry) - Number(b.entry));
  const next = new Map<number, number>();
  let broken = 0;
  for (let k = 0; k < events.length; k++) {
    const ev = events[k]!;
    if (ev.entry) {
      continue;
    }
    const after = events[k + 1];
    if (after?.entry) {
      next.set(ev.chain, after.chain);
    } else {
      broken++;
    }
  }
  const visited = new Set<number>();
  const made: Loop[] = [...kept];
  for (let i = 0; i < chains.length; i++) {
    if (visited.has(i) || !next.has(i)) {
      continue;
    }
    const ring: Piece[] = [];
    let at = i;
    let closed = false;
    while (!visited.has(at)) {
      visited.add(at);
      ring.push(...chains[at]!);
      const to = next.get(at);
      if (to === undefined) {
        break;
      }
      const a = pieceEnd(chains[at]!.at(-1)!);
      const b = pieceStart(chains[to]![0]!);
      if (distance(a, b) > 1e-12) {
        ring.push({ segs: [line2(a, b)], face: -1 });
      }
      at = to;
      closed = to === i;
      if (closed) {
        break;
      }
    }
    if (closed) {
      made.push(ring);
    } else {
      broken++;
    }
  }
  return { loops: made, broken };
}

export { controlPoint };
