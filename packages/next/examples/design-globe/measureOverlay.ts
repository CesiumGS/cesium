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
import type { CustomShader } from "../../src/scene/CustomShader.ts";
import type { DrawHandle, MeshHandle, World } from "../../src/scene/World.ts";
import { hexLinear } from "./colors.ts";
import type { DrawnEnd } from "./measureTool.ts";
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
}

/** The farthest a vertex moves (metres): the corridor's ~34 m, exaggerated, and some. */
const PAD = 40 * EXAGGERATION + 1;
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
      pairs.forEach((s, i) => {
        [s.a, s.b].forEach((e, j) => {
          const v = i * 2 + j;
          for (let k = 0; k < 3; k++) {
            positions[v * 3 + k] = e.rigid[k]! - origin[k]!;
            partners[v * 3 + k] = e.reprojected[k]! - origin[k]!;
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
