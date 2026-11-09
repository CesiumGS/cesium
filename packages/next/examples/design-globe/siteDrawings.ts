// How a site's one tileset is drawn (plan 5a Task 20): the engine can draw a
// tileset's loaded tiles more than once, each as a scene item (`World.add`),
// and gives items no meaning. This page gives them theirs. The solid item is
// the model, at the morph's parameter. The ghost is a second, translucent item
// of the same tiles at the other placement.
//
// Both read the same vertices, each with its rigid position and its
// reprojected one (the generator's), so there is one tile selection and one
// tile cache, and neither can show a tile the other doesn't.
import { CustomShader } from "../../src/scene/CustomShader.ts";
import type { World } from "../../src/scene/World.ts";
import type { SceneItem } from "../../src/scene/SceneItem.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";
import type { Rgba } from "./colors.ts";
import { DUAL_POSITION_EXTENSION, STANDOFF_SEMANTIC } from "./dualPosition.ts";
import {
  morphParameter,
  rigidEndParameter,
  type PlacementState,
} from "./morphDriver.ts";

export type { Rgba } from "./colors.ts";

/** How the two placements look. */
export interface PlacementLook {
  /** Tints of the solid surface (multiplied with the content's colours). */
  readonly rigidTint: Rgba;
  readonly reprojectedTint: Rgba;
  /** The ghost's tints (multiplied with the content's colours). */
  readonly rigidGhost: Rgba;
  readonly reprojectedGhost: Rgba;
  /**
   * How the ghost is drawn: translucent (the default), or hatched for viewers
   * who ask for less transparency (`prefers-reduced-transparency`).
   */
  readonly ghostDeck?: GhostDeck;
}

/** The ghost's look: blended at `GHOST_OPACITY`, or hatched. */
export type GhostDeck = "translucent" | "hatch";

/**
 * The ghost's opacity: the reprojected one, where the design truly is, about
 * 0.3 (owner, Task 20); the rigid one, the "before", fainter, so it never
 * outshines the true road (Task 20 fix 1, I4).
 */
export const GHOST_OPACITY = { reprojected: 0.3, rigid: 0.15 } as const;

/** The hatch's period in framebuffer pixels, and the share of it drawn. */
const HATCH_PERIOD = 6;
const HATCH_COVER = 0.34;

/**
 * How far the ghost must stand off the solid surface, along that surface's
 * normal, to be drawn, metres (feedback F4): nearer than this it would share
 * the solid's depth, passing the depth test on some pixels and not others
 * (z-fighting). Faded in from 0.05 m to 0.5 m.
 */
const GHOST_APART = { from: 0.05, to: 0.5 } as const;

/** The solid surface: the tint moves from one placement's to the other's. */
const SOLID_WGSL = /* wgsl */ `
fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).baseColor *= mix(uniforms.rigidTint.rgb, uniforms.reprojectedTint.rgb, uniforms.t);
}
`;

const APART_WGSL = /* wgsl */ `
fn ghostApart(standOff: f32) -> f32 {
  return smoothstep(${GHOST_APART.from.toFixed(2)}, ${GHOST_APART.to.toFixed(2)}, standOff * uniforms.exaggeration) * uniforms.presence;
}
`;

/**
 * The ghost, translucent: drawn only where it stands clear of the solid
 * surface (`STANDOFF_SEMANTIC`, `GHOST_APART`), and only as far as the morph
 * has moved the surface off it (`presence`), so the translucent colour is
 * never laid on the moving surface itself.
 */
const GHOST_WGSL = /* wgsl */ `${APART_WGSL}
fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).unlit = true;
  (*material).alpha *= ghostApart(fsInput.attributes.standOff);
}
`;

/**
 * The ghost, hatched: diagonal stripes, nearly whole where drawn. (Not whole: a
 * translucent item's fragment at 0.999 or more belongs to the opaque passes,
 * which don't draw it.)
 */
const GHOST_HATCH_WGSL = /* wgsl */ `${APART_WGSL}
fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  let apart = ghostApart(fsInput.attributes.standOff);
  let stripe = fract((fsInput.screen.x + fsInput.screen.y) / ${HATCH_PERIOD.toFixed(1)});
  (*material).unlit = true;
  (*material).alpha = select(0.0, 0.99, stripe < ${HATCH_COVER} * apart);
}
`;

/** Whether the viewer asked for less transparency (the hatched ghost then). */
export const reducedTransparency = (): boolean =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-transparency: reduce)").matches;

/**
 * Whether the tileset's content has a second position (the generator's): false
 * for a tileset with one placement. The engine reads the declaration itself;
 * this only asks whether there is one.
 */
export function hasSecondPosition(tileset: Tileset3D): boolean {
  return DUAL_POSITION_EXTENSION in tileset.extensions;
}

/**
 * How much of the ghost is drawn while the morph is at `t`: all of it settled,
 * none halfway, where it moves from one end to the other.
 */
export function ghostPresence(t: number): number {
  return Math.abs(1 - 2 * t);
}

/** A site's solid drawing and its ghost. */
export class SiteDrawings {
  /** What the morph moves; what pointing at the model hits. */
  readonly solid: SceneItem;
  /** The other placement, translucent; picks see through it. */
  readonly ghost: SceneItem;
  private readonly solidShader: CustomShader;
  private readonly ghostShader: CustomShader;
  private state: PlacementState = {
    t: 0,
    morphing: false,
    exaggeration: 1,
    ghost: true,
  };
  /** Which end the ghost stands at. */
  private ghostAt: "rigid" | "reprojected" | undefined;

  constructor(
    private readonly world: World,
    readonly tileset: Tileset3D,
    private readonly look: PlacementLook,
  ) {
    this.solidShader = new CustomShader({
      label: "design globe solid",
      wgsl: SOLID_WGSL,
      uniforms: {
        t: { type: "f32", value: 0 },
        rigidTint: { type: "vec4f", value: look.rigidTint },
        reprojectedTint: { type: "vec4f", value: look.reprojectedTint },
      },
    });
    const hatch = look.ghostDeck === "hatch";
    this.ghostShader = new CustomShader({
      label: "design globe ghost",
      wgsl: hatch ? GHOST_HATCH_WGSL : GHOST_WGSL,
      attributes: {
        standOff: { semantic: STANDOFF_SEMANTIC, type: "f32" },
      },
      uniforms: {
        exaggeration: { type: "f32", value: 1 },
        presence: { type: "f32", value: 1 },
      },
    });
    // `Viewer.addTileset`'s default item.
    this.solid = tileset.items[0]!;
    this.solid.shader = this.solidShader;
    this.ghost = world.add(tileset, {
      placement: 1,
      opacity: GHOST_OPACITY.reprojected,
      tint: tintOf(look.reprojectedGhost),
      shader: this.ghostShader,
    });
    this.apply();
  }

  setState(next: PlacementState): void {
    this.state = next;
    this.apply();
  }

  private apply(): void {
    const { t, exaggeration, ghost } = this.state;
    this.solid.placement = morphParameter(t, exaggeration);
    this.solidShader.setUniform("t", t);
    this.ghost.show = ghost;
    if (!ghost) {
      return;
    }
    const end = t < 0.5 ? "reprojected" : "rigid";
    this.ghost.placement =
      end === "reprojected" ? 1 : rigidEndParameter(exaggeration);
    this.ghostShader.setUniform("exaggeration", exaggeration);
    this.ghostShader.setUniform("presence", ghostPresence(t));
    if (end !== this.ghostAt) {
      this.ghostAt = end;
      this.ghost.tint = tintOf(
        end === "reprojected"
          ? this.look.reprojectedGhost
          : this.look.rigidGhost,
      );
      if (this.look.ghostDeck !== "hatch") {
        this.ghost.opacity = GHOST_OPACITY[end];
      }
    }
  }

  dispose(): void {
    if (this.world.destroyed || this.tileset.isDestroyed()) {
      return;
    }
    this.ghost.remove();
    this.solid.placement = 0;
    this.solid.shader = undefined;
  }
}

const tintOf = (c: Rgba): readonly [number, number, number] => [
  c[0],
  c[1],
  c[2],
];
