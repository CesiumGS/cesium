// The measure tool's lines on the globe (plan 4b Task 19; DESIGN.md "Visuals
// in the viewer"): each measurement's line, the other placement's line
// ghosted beside it (dashed), the ruler's ticks and the small crosses at the
// marker and the survey mark. Drawn as the explorer draws its overlays:
// unlit, depth-tested line lists in the engine's Earth-fixed metres, the
// labels HTML (measureTool.ts, panel/Measure.tsx).
//
// Every vertex carries both placements' positions, as the whiskers do
// (overlays.ts): the same morph shader blends them by the morph's `t` and
// scales rigid's error by the exaggeration, so a line follows the geometry
// it measures through the morph with no vertex buffer written. The ghosts
// are the same dashed mesh drawn twice, pinned at either end (rigid, `t` 0;
// reprojected, `t` 1), shown as the pair's ghosts are (placementPair.ts):
// the other placement's while settled, both while moving.
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import type { CustomShader } from "../../src/scene/CustomShader.ts";
import type { DrawHandle, MeshHandle, World } from "../../src/scene/World.ts";
import { hexLinear } from "./colors.ts";
import {
  fixedEnd,
  type DrawnEnd,
  type Opener,
  type RulerEnd,
} from "./measureOpeners.ts";
import type { MeasureState } from "./measureState.ts";
import { EXAGGERATION } from "./page.ts";
import {
  PARTNER_SEMANTIC,
  morphShader,
  type PairState,
} from "./placementPair.ts";

/** A set of segments drawn together. */
export interface OverlayLine {
  readonly key: string;
  readonly segments: readonly { readonly a: DrawnEnd; readonly b: DrawnEnd }[];
  /** sRGB hex, for every segment without its own in `colors`. */
  readonly color: string;
  readonly colors?: readonly string[];
  /** Draw the other placement's line, dashed. */
  readonly ghost: boolean;
  /**
   * Metres: draw each segment as a level strip this wide instead of a 1 px
   * line (the engine has no wide lines), so a mark close up has real width.
   */
  readonly width?: number;
}

/** The farthest a vertex moves (metres): the corridor's ~34 m, exaggerated, and some. */
const PAD = 40 * EXAGGERATION + 1;
/**
 * How far a line stands over the ends it joins, metres, along the vertical:
 * a 1 px line in the plane of the surface it marks (the median barrier's top,
 * a lane between two clicks) fights it for depth, dashing as the camera
 * moves. Five centimetres clears a surface at any range the line reads.
 */
export const LINE_LIFT = 0.05;
/** Dashes per ghost segment. */
const DASHES = 24;
/** A ghost's colour, of its line's (lines can't blend: darker instead). */
const GHOST_SHADE = 0.5;

interface Drawn {
  readonly meshes: MeshHandle[];
  readonly solid: DrawHandle;
  readonly rigidGhost?: DrawHandle;
  readonly reprojectedGhost?: DrawHandle;
}

export class MeasureOverlay {
  private readonly solidShader: CustomShader;
  private readonly rigidGhostShader: CustomShader;
  private readonly reprojectedGhostShader: CustomShader;
  private drawn: Drawn[] = [];
  private state: PairState = {
    t: 0,
    morphing: false,
    exaggeration: 1,
    ghost: true,
  };

  constructor(private readonly world: World) {
    this.solidShader = morphShader("design globe measure", PAD, "line");
    this.rigidGhostShader = morphShader(
      "design globe measure rigid ghost",
      PAD,
      "line",
    );
    this.reprojectedGhostShader = morphShader(
      "design globe measure reprojected ghost",
      PAD,
      "line",
    );
    this.reprojectedGhostShader.setUniform("t", 1);
  }

  /** Replaces what is drawn. */
  set(lines: readonly OverlayLine[]): void {
    this.clear();
    for (const line of lines) {
      if (line.segments.length > 0) {
        this.drawn.push(this.build(line));
      }
    }
    this.visibility();
  }

  /** The morph's state, as the pairs and the whiskers take it. */
  setState(next: PairState): void {
    this.state = next;
    this.solidShader.setUniform("t", next.t);
    this.solidShader.setUniform("exaggeration", next.exaggeration);
    this.rigidGhostShader.setUniform("exaggeration", next.exaggeration);
    this.visibility();
  }

  private visibility(): void {
    if (this.world.destroyed) {
      return;
    }
    const { ghost, morphing, t } = this.state;
    for (const d of this.drawn) {
      if (d.rigidGhost !== undefined) {
        this.world.setVisible(d.rigidGhost, ghost && (morphing || t >= 0.5));
      }
      if (d.reprojectedGhost !== undefined) {
        this.world.setVisible(
          d.reprojectedGhost,
          ghost && (morphing || t < 0.5),
        );
      }
    }
  }

  private build(line: OverlayLine): Drawn {
    const origin = Float64Array.from(line.segments[0]!.a.reprojected);
    const colors = line.segments.map((_, i) =>
      hexLinear(line.colors?.[i] ?? line.color),
    );
    const name = `design globe measure ${line.key}`;
    const meshes: MeshHandle[] = [];
    const mesh = (
      pairs: readonly { a: DrawnEnd; b: DrawnEnd; color: readonly number[] }[],
    ): MeshHandle => {
      const n = pairs.length * 2;
      const positions = new Float32Array(n * 3);
      const partners = new Float32Array(n * 3);
      const rgba = new Float32Array(n * 4);
      const { up } = enu(origin);
      pairs.forEach((s, i) => {
        [s.a, s.b].forEach((e, j) => {
          const v = i * 2 + j;
          for (let k = 0; k < 3; k++) {
            const lift = up[k]! * LINE_LIFT;
            positions[v * 3 + k] = e.rigid[k]! + lift - origin[k]!;
            partners[v * 3 + k] = e.reprojected[k]! + lift - origin[k]!;
          }
          rgba.set(s.color, v * 4);
        });
      });
      const handle = this.world.addMesh({
        positions,
        colors: rgba,
        indices: Uint32Array.from({ length: n }, (_, i) => i),
        topology: "line-list",
        attributes: { [PARTNER_SEMANTIC]: { data: partners, components: 3 } },
      });
      meshes.push(handle);
      return handle;
    };
    const draw = (m: MeshHandle, shader: CustomShader, suffix: string) =>
      this.world.addDraw({
        mesh: m,
        origin,
        unlit: true,
        shader,
        name: `${name}${suffix}`,
      });

    if (line.width !== undefined) {
      const strip = this.strips(line, colors, origin);
      meshes.push(strip);
      const solid = this.world.addDraw({
        mesh: strip,
        origin,
        unlit: true,
        doubleSided: true,
        shader: this.solidShader,
        name: `${name} strips`,
      });
      return { meshes, solid };
    }
    const solid = draw(
      mesh(line.segments.map((s, i) => ({ ...s, color: colors[i]! }))),
      this.solidShader,
      "",
    );
    // A line both placements draw in the same place has no ghost.
    const moves = line.segments.some(
      (s) =>
        apart(s.a.rigid, s.a.reprojected) > 1e-3 ||
        apart(s.b.rigid, s.b.reprojected) > 1e-3,
    );
    if (!line.ghost || !moves) {
      return { meshes, solid };
    }
    const dashes: { a: DrawnEnd; b: DrawnEnd; color: readonly number[] }[] = [];
    line.segments.forEach((s, i) => {
      const c = colors[i]!;
      const shade = [
        c[0]! * GHOST_SHADE,
        c[1]! * GHOST_SHADE,
        c[2]! * GHOST_SHADE,
        1,
      ];
      for (let d = 0; d < DASHES; d++) {
        dashes.push({
          a: lerpEnd(s.a, s.b, d / DASHES),
          b: lerpEnd(s.a, s.b, (d + 0.5) / DASHES),
          color: shade,
        });
      }
    });
    const ghostMesh = mesh(dashes);
    return {
      meshes,
      solid,
      rigidGhost: draw(ghostMesh, this.rigidGhostShader, " rigid ghost"),
      reprojectedGhost: draw(
        ghostMesh,
        this.reprojectedGhostShader,
        " reprojected ghost",
      ),
    };
  }

  /** A line's segments as level strips `line.width` metres wide (two triangles each). */
  private strips(
    line: OverlayLine,
    colors: readonly (readonly number[])[],
    origin: Float64Array,
  ): MeshHandle {
    const half = line.width! / 2;
    const n = line.segments.length;
    const positions = new Float32Array(n * 12);
    const partners = new Float32Array(n * 12);
    const rgba = new Float32Array(n * 16);
    const indices = new Uint32Array(n * 6);
    line.segments.forEach((s, i) => {
      const { up } = enu(s.a.reprojected);
      const d = [0, 1, 2].map((k) => s.b.reprojected[k]! - s.a.reprojected[k]!);
      // Across the segment, level: up × d.
      const across = [
        up[1]! * d[2]! - up[2]! * d[1]!,
        up[2]! * d[0]! - up[0]! * d[2]!,
        up[0]! * d[1]! - up[1]! * d[0]!,
      ];
      const l = Math.hypot(across[0]!, across[1]!, across[2]!) || 1;
      const corners = [
        [s.a, -1],
        [s.a, 1],
        [s.b, -1],
        [s.b, 1],
      ] as const;
      corners.forEach(([e, side], j) => {
        const v = i * 4 + j;
        for (let k = 0; k < 3; k++) {
          const off = (across[k]! / l) * half * side;
          positions[v * 3 + k] = e.rigid[k]! + off - origin[k]!;
          partners[v * 3 + k] = e.reprojected[k]! + off - origin[k]!;
        }
        rgba.set(colors[i]!, v * 4);
      });
      const b = i * 4;
      indices.set([b, b + 1, b + 2, b + 1, b + 3, b + 2], i * 6);
    });
    return this.world.addMesh({
      positions,
      colors: rgba,
      indices,
      attributes: { [PARTNER_SEMANTIC]: { data: partners, components: 3 } },
    });
  }

  private clear(): void {
    if (this.world.destroyed) {
      this.drawn = [];
      return;
    }
    for (const d of this.drawn) {
      for (const h of [d.solid, d.rigidGhost, d.reprojectedGhost]) {
        if (h !== undefined) {
          this.world.removeDraw(h);
        }
      }
      for (const m of d.meshes) {
        this.world.removeMesh(m);
      }
    }
    this.drawn = [];
  }

  dispose(): void {
    this.clear();
  }
}

const apart = (p: ArrayLike<number>, q: ArrayLike<number>) =>
  Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);

function lerpEnd(a: DrawnEnd, b: DrawnEnd, f: number): DrawnEnd {
  const at = (p: Float64Array, q: Float64Array) =>
    Float64Array.from([0, 1, 2].map((k) => p[k]! + (q[k]! - p[k]!) * f));
  return {
    rigid: at(a.rigid, b.rigid),
    reprojected: at(a.reprojected, b.reprojected),
  };
}

/** The measure line's yellow (DESIGN.md "On the globe"). */
const YELLOW = "#fde047";

/**
 * The lines for the openers (each with its ghost; the ruler along the pair,
 * once the page has measured it;
 * a small cross at the marker and at the survey disk) and the user's line.
 */
export function measureLines(
  openers: readonly Opener[],
  ruler: RulerEnd | undefined,
  state: MeasureState,
): OverlayLine[] {
  const lines: OverlayLine[] = [];
  for (const o of openers) {
    lines.push({
      key: o.id,
      segments: [o.shown],
      color: o.quiet ? "#fef08a" : YELLOW,
      ghost: true,
    });
    if (o.id === "pair" && ruler !== undefined) {
      const r = rulerLine(o, ruler);
      // 1 px from afar; close up, strips with real width (Task 20 fix 1, I7).
      lines.push(r, { ...r, key: "ruler-strips", width: RULER_WIDTH });
    }
    if (o.id === "marker" || o.id === "mark") {
      // A small cross on the ground at the fixed end: the marker or the disk.
      lines.push({
        key: `${o.id}-cross`,
        segments: groundCross(o.a.reprojected, o.id === "mark" ? 4 : 3),
        color: o.id === "mark" ? "#d6a84a" : "#a8eef4",
        ghost: false,
      });
    }
  }
  if (state.phase === "done") {
    lines.push({
      key: "user",
      segments: [{ a: state.a, b: state.b }],
      color: YELLOW,
      ghost: true,
    });
  }
  return lines;
}

/** The ruler's ticks and bracket as strips, metres wide: about 4 px at "Close in on the ruler". */
const RULER_WIDTH = 0.05;

/** How far a ruler tick reaches from the line, metres: every 1,000 ft, every 5,000, and the end's. */
const TICK = { minor: 1.5, major: 2.5, end: 4 } as const;

/**
 * The ruler along the pair: ticks every 1,000 design feet (yellow, one side)
 * against every 1,000 ground feet (white, the other), from the page's
 * measurement of the line (`end`, measureOpeners.ts `rulerEnd`). At the far
 * end, design's and ground's last ticks stand on the same side, longer,
 * joined by a bracket across the gap the scale factor makes.
 */
export function rulerLine(o: Opener, end: RulerEnd): OverlayLine {
  const segments: { a: DrawnEnd; b: DrawnEnd }[] = [];
  const colors: string[] = [];
  /** A point `f` of the way along the line, `side × reach` metres square to it. */
  const along = (f: number, side: number, reach: number): DrawnEnd => {
    const at = (p: "rigid" | "reprojected") => {
      const x = o.shown.a[p];
      const y = o.shown.b[p];
      return Float64Array.from(
        [0, 1, 2].map((k) => x[k]! + (y[k]! - x[k]!) * f),
      );
    };
    const base = { rigid: at("rigid"), reprojected: at("reprojected") };
    const { east, north, up } = enu(base.reprojected);
    const d = [0, 1, 2].map(
      (k) => o.shown.b.reprojected[k]! - o.shown.a.reprojected[k]!,
    );
    const de = d[0]! * east[0]! + d[1]! * east[1]! + d[2]! * east[2]!;
    const dn = d[0]! * north[0]! + d[1]! * north[1]! + d[2]! * north[2]!;
    const l = Math.hypot(de, dn) || 1;
    // Square to the line, level; lifted a little off the deck.
    const off = [0, 1, 2].map(
      (k) =>
        ((-dn / l) * east[k]! + (de / l) * north[k]!) * side * reach +
        up[k]! * 0.05,
    );
    const shift = (p: Float64Array) =>
      Float64Array.from([0, 1, 2].map((k) => p[k]! + off[k]!));
    return { rigid: shift(base.rigid), reprojected: shift(base.reprojected) };
  };
  const tick = (f: number, side: number, reach: number, color: string) => {
    segments.push({ a: along(f, side, 0), b: along(f, side, reach) });
    colors.push(color);
  };
  const design = end.design / end.feet;
  const ground = end.ground / end.feet;
  for (let ft = 0; ft < end.feet - 1e-9; ft += 1000) {
    const major = ft % 5000 === 0 ? TICK.major : TICK.minor;
    tick(ft * design, 1, major, YELLOW);
    tick(ft * ground, -1, major, "#ffffff");
  }
  // The far end: both last ticks on one side, and the bracket between them.
  tick(end.design, 1, TICK.end, YELLOW);
  tick(end.ground, 1, TICK.end, "#ffffff");
  segments.push({
    a: along(end.design, 1, TICK.end),
    b: along(end.ground, 1, TICK.end),
  });
  colors.push("#ffffff");
  return { key: "ruler", segments, colors, color: YELLOW, ghost: false };
}

/** Where the ruler's far end is marked: its two last ticks' tips, for the note and the camera. */
export function rulerTips(o: Opener, end: RulerEnd): [DrawnEnd, DrawnEnd] {
  const line = rulerLine(o, end);
  const n = line.segments.length;
  return [line.segments[n - 1]!.a, line.segments[n - 1]!.b];
}

/** East, north and up at a body-fixed point (WGS 84). */
function enu(p: ArrayLike<number>): {
  east: Float64Array;
  north: Float64Array;
  up: Float64Array;
} {
  const up = new Float64Array(3);
  Ellipsoid.WGS84.geodeticSurfaceNormal(Float64Array.from(p), up);
  const l = Math.hypot(up[0]!, up[1]!) || 1;
  const east = Float64Array.from([-up[1]! / l, up[0]! / l, 0]);
  const north = Float64Array.from([
    up[1]! * east[2]! - up[2]! * east[1]!,
    up[2]! * east[0]! - up[0]! * east[2]!,
    up[0]! * east[1]! - up[1]! * east[0]!,
  ]);
  return { east, north, up };
}

/** A small level cross on the ground at `p`, `r` metres each way. */
function groundCross(
  p: ArrayLike<number>,
  r: number,
): { a: DrawnEnd; b: DrawnEnd }[] {
  const { east, north } = enu(p);
  return [east, north].map((axis) => {
    const at = (s: number) =>
      fixedEnd([0, 1, 2].map((k) => p[k]! + axis[k]! * s));
    return { a: at(-r), b: at(r) };
  });
}
