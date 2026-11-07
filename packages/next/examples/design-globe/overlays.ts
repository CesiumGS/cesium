// The design globe's drawn evidence (plan 4b Task 18; DESIGN.md "Visuals in
// the viewer"): the error whiskers and the anchor ring.
//
// - Whiskers: every 1,000 ft along the centreline, at the median barrier's
//   top, a leader from where the rigid placement draws the point to where it
//   truly is, coloured by its length. They carry both ends as the pair's
//   surfaces do (placementPair.ts), so the same morph uniform shrinks them to
//   nothing as the geometry settles into the reprojected placement, and the
//   same exaggeration stretches them.
// - The anchor ring: a white ring on the ground at the rigid placement's
//   anchor, where the placements agree.
// (The camera's moves are in shots.ts.)
import type { Alignment } from "../../src/engineering/alignment.ts";
import type { TilesetPlacement } from "../../src/engineering/placement.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import type { CustomShader } from "../../src/scene/CustomShader.ts";
import type { DrawHandle, MeshHandle, World } from "../../src/scene/World.ts";
import { visibleRise } from "./exactSnap.ts";
import {
  PARTNER_SEMANTIC,
  morphShader,
  type PairState,
  type Rgba,
} from "./placementPair.ts";

/** One sample along the centreline. */
export interface SagSample {
  readonly station: number;
  /** E, N and the barrier top's elevation, design units. */
  readonly design: Float64Array;
  /** Where rigid draws it, and where it truly is (Earth-fixed metres). */
  readonly rigid: Float64Array;
  readonly truth: Float64Array;
  /** |rigid − truth|, metres. */
  readonly error: number;
}

/**
 * Samples every `every` design units of station from the alignment's start
 * to its end (both included), on the centreline at the median barrier's top.
 */
export function sagSamples(
  alignment: Alignment,
  rigid: TilesetPlacement,
  reprojected: TilesetPlacement,
  every: number,
): SagSample[] {
  const start = alignment.startStation;
  const end = alignment.endStation;
  const out: SagSample[] = [];
  const rise = visibleRise(0);
  for (let s = start; ; s = Math.min(end, s + every)) {
    const [e, n] = alignment.pointAt(s, 0);
    const design = Float64Array.from([e!, n!, alignment.elevationAt(s) + rise]);
    const r = rigid.displayed(design);
    const t = reprojected.displayed(design);
    out.push({
      station: s,
      design,
      rigid: r,
      truth: t,
      error: Math.hypot(r[0]! - t[0]!, r[1]! - t[1]!, r[2]! - t[2]!),
    });
    if (s >= end) {
      break;
    }
  }
  return out;
}

/** The whiskers' colour ramp, short to long (sRGB hex; dark HUD tones). */
export const WHISKER_RAMP = ["#fff1b8", "#ffc46b", "#ff8a3d", "#f2552c"];

const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

/** Linear RGBA of an sRGB hex colour. */
export function hexLinear(hex: string, alpha = 1): Rgba {
  const v = Number.parseInt(hex.slice(1), 16);
  return [
    srgbToLinear(((v >> 16) & 255) / 255),
    srgbToLinear(((v >> 8) & 255) / 255),
    srgbToLinear((v & 255) / 255),
    alpha,
  ];
}

/** The ramp's colour at `u` (0 to 1), linear RGBA. */
function rampAt(u: number): Rgba {
  const stops = WHISKER_RAMP.map((h) => hexLinear(h));
  const x = Math.min(1, Math.max(0, u)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = stops[i]!;
  const b = stops[i + 1]!;
  return [0, 1, 2, 3].map(
    (k) => a[k]! + (b[k]! - a[k]!) * f,
  ) as unknown as Rgba;
}

/** Drawn things a module owns, removed together. */
class Drawn {
  private readonly draws: DrawHandle[] = [];
  private readonly meshes: MeshHandle[] = [];
  constructor(protected readonly world: World) {}
  protected keep(mesh: MeshHandle, draw: DrawHandle): void {
    this.meshes.push(mesh);
    this.draws.push(draw);
  }
  dispose(): void {
    if (this.world.destroyed) {
      return;
    }
    for (const d of this.draws) {
      this.world.removeDraw(d);
    }
    for (const m of this.meshes) {
      this.world.removeMesh(m);
    }
    this.draws.length = 0;
    this.meshes.length = 0;
  }
}

/** The error whiskers: one line per sample, rigid end to true end. */
export class Whiskers extends Drawn {
  readonly shader: CustomShader;
  private readonly draw: DrawHandle;

  constructor(
    world: World,
    samples: readonly SagSample[],
    maxDisplacement: number,
  ) {
    super(world);
    this.shader = morphShader("design globe whiskers", maxDisplacement, false);
    const origin = samples[0]!.truth;
    const max = Math.max(...samples.map((s) => s.error)) || 1;
    const n = samples.length;
    const positions = new Float32Array(n * 6);
    const partners = new Float32Array(n * 6);
    const colors = new Float32Array(n * 8);
    samples.forEach((s, i) => {
      for (let k = 0; k < 3; k++) {
        positions[i * 6 + k] = s.rigid[k]! - origin[k]!;
        positions[i * 6 + 3 + k] = s.truth[k]! - origin[k]!;
        partners[i * 6 + k] = s.truth[k]! - origin[k]!;
        partners[i * 6 + 3 + k] = s.truth[k]! - origin[k]!;
      }
      const c = rampAt(s.error / max);
      colors.set(c, i * 8);
      colors.set(c, i * 8 + 4);
    });
    const mesh = world.addMesh({
      positions,
      colors,
      indices: Uint32Array.from({ length: n * 2 }, (_, i) => i),
      topology: "line-list",
      attributes: { [PARTNER_SEMANTIC]: { data: partners, components: 3 } },
    });
    this.draw = world.addDraw({
      mesh,
      origin: Float64Array.from(origin),
      unlit: true,
      shader: this.shader,
      name: "design globe whiskers",
    });
    this.keep(mesh, this.draw);
  }

  /** The morph's `t` and the exaggeration, as the pair's (morphDriver.ts). */
  setState(state: PairState): void {
    this.shader.setUniform("t", state.t);
    this.shader.setUniform("exaggeration", state.exaggeration);
  }

  setVisible(visible: boolean): void {
    this.world.setVisible(this.draw, visible);
  }
}

/** East, north and up at a body-fixed point (WGS 84). */
export function enuAt(p: ArrayLike<number>): {
  east: Float64Array;
  north: Float64Array;
  up: Float64Array;
} {
  const up = new Float64Array(3);
  Ellipsoid.WGS84.geodeticSurfaceNormal(Float64Array.from(p), up);
  const east = Float64Array.from([-up[1]!, up[0]!, 0]);
  const l = Math.hypot(east[0]!, east[1]!) || 1;
  east[0] = east[0]! / l;
  east[1] = east[1]! / l;
  const north = Float64Array.from([
    up[1]! * east[2]! - up[2]! * east[1]!,
    up[2]! * east[0]! - up[0]! * east[2]!,
    up[0]! * east[1]! - up[1]! * east[0]!,
  ]);
  return { east, north, up };
}

/** The anchor ring: two white circles on the ground around the anchor. */
export class AnchorRing extends Drawn {
  constructor(world: World, center: ArrayLike<number>, radius: number) {
    super(world);
    const { east, north } = enuAt(center);
    const segments = 96;
    const rings = [radius, radius * 1.08];
    const positions = new Float32Array(rings.length * segments * 6);
    let o = 0;
    for (const r of rings) {
      for (let i = 0; i < segments; i++) {
        for (const j of [i, i + 1]) {
          const a = (j / segments) * 2 * Math.PI;
          const c = Math.cos(a) * r;
          const s = Math.sin(a) * r;
          for (let k = 0; k < 3; k++) {
            positions[o++] = east[k]! * c + north[k]! * s;
          }
        }
      }
    }
    const mesh = world.addMesh({
      positions,
      indices: Uint32Array.from({ length: positions.length / 3 }, (_, i) => i),
      topology: "line-list",
    });
    const draw = world.addDraw({
      mesh,
      origin: Float64Array.from(center),
      unlit: true,
      color: [1, 1, 1, 1],
      name: "design globe anchor ring",
    });
    this.keep(mesh, draw);
  }
}
