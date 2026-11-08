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
import { MaterialFlags } from "../../src/render/layout.ts";
import type { DrawHandle, MeshHandle, World } from "../../src/scene/World.ts";
import { visibleRise } from "./exactSnap.ts";
import { rampAt } from "./colors.ts";
import {
  PARTNER_SEMANTIC,
  morphShader,
  type PairState,
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
    this.shader = morphShader("design globe whiskers", maxDisplacement, "line");
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

/** The error ribbon's columns across the centreline, design units: soft outer edges (the road is ±41). */
const RIBBON_COLUMNS = [-300, -200, 200, 300] as const;
/** Each column's opacity: the outer edges fade to nothing. */
const RIBBON_EDGE = [0, 1, 1, 0] as const;
/** Below the profile, design units: under the bridge deck's underside (1.5), so nothing on the road meets it. */
const RIBBON_DROP = 2.5;

/** The ribbon's opacity: a light tint, so the imagery and the true road read through it. */
const RIBBON_ALPHA = 0.22;

/** No tint where rigid's error is under about half a metre: the ribbon shows where the story is. */
const ribbonFade = (error: number) => {
  const x = Math.min(1, Math.max(0, (error - 0.3) / 0.7));
  return x * x * (3 - 2 * x);
};

/**
 * The error ribbon (DESIGN.md "Visuals in the viewer", a toggle, off by
 * default): the ground under the corridor, where it truly is, tinted by
 * rigid's error at each station on the whiskers' ramp (the largest at the
 * far end, none near the anchor). Unlit and translucent, a band either
 * side of the road a little under its surface with soft edges, so the road
 * draws over its middle (Task 20 fix 1: a tint, not a slab).
 */
export class ErrorRibbon extends Drawn {
  private readonly draw: DrawHandle;
  private readonly material: number;
  /** The largest error it is coloured against, metres. */
  readonly max: number;

  constructor(
    world: World,
    alignment: Alignment,
    rigid: TilesetPlacement,
    reprojected: TilesetPlacement,
    every: number,
  ) {
    super(world);
    const stations: number[] = [];
    for (let s = alignment.startStation; ; s += every) {
      stations.push(Math.min(s, alignment.endStation));
      if (s >= alignment.endStation) {
        break;
      }
    }
    const errors = stations.map((s) => {
      const [e, n] = alignment.pointAt(s, 0);
      const d = [e!, n!, alignment.elevationAt(s)];
      const r = rigid.displayed(d);
      const t = reprojected.displayed(d);
      return Math.hypot(r[0]! - t[0]!, r[1]! - t[1]!, r[2]! - t[2]!);
    });
    this.max = Math.max(...errors) || 1;
    const n = stations.length;
    const cols = RIBBON_COLUMNS.length;
    const positions = new Float32Array(n * cols * 3);
    const colors = new Float32Array(n * cols * 4);
    let origin: Float64Array | undefined;
    stations.forEach((s, i) => {
      const z = alignment.elevationAt(s) - RIBBON_DROP;
      const c = rampAt(errors[i]! / this.max);
      const fade = ribbonFade(errors[i]!);
      RIBBON_COLUMNS.forEach((offset, j) => {
        const [e, nn] = alignment.pointAt(s, offset);
        const p = reprojected.displayed([e!, nn!, z]);
        origin ??= Float64Array.from(p);
        const v = i * cols + j;
        for (let k = 0; k < 3; k++) {
          positions[v * 3 + k] = p[k]! - origin[k]!;
        }
        colors.set([c[0], c[1], c[2], RIBBON_EDGE[j]! * fade], v * 4);
      });
    });
    const indices = new Uint32Array((n - 1) * (cols - 1) * 6);
    let o = 0;
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const a = i * cols + j;
        const b = a + cols;
        indices.set([a, a + 1, b, a + 1, b + 1, b], o);
        o += 6;
      }
    }
    const mesh = world.addMesh({ positions, colors, indices });
    this.material = world.addMaterial({
      baseColor: [1, 1, 1, RIBBON_ALPHA],
      metallic: 0,
      roughness: 1,
      flags: MaterialFlags.alphaBlend,
    });
    this.draw = world.addDraw({
      mesh,
      material: this.material,
      origin: origin!,
      unlit: true,
      doubleSided: true,
      name: "design globe error ribbon",
    });
    this.keep(mesh, this.draw);
  }

  override dispose(): void {
    super.dispose();
    if (!this.world.destroyed) {
      this.world.removeMaterial(this.material);
    }
  }

  setVisible(visible: boolean): void {
    this.world.setVisible(this.draw, visible);
  }
}
