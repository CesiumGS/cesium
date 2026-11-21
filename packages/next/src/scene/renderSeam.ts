// The renderer seam (docs/superpowers/plans/2026-11-13-webgl2-renderer.md,
// "The interfaces"): what the scene side reaches a renderer through. A
// device per engine, a renderer per view inside it, and a mirror per world:
// the device's copy of the world's neutral draw data (`WorldDraws`).
//
// WebGPU is the first and only implementation (src/render/webgpuDevice.ts).
// These are internal types: nothing here is exported from an entry point.
// They name no GPU type, so a second device (src/webgl2/, CS-35) can
// implement them.
import type { DeviceFacts } from "../gpu/GpuDevice.ts";
import type { ContentTextures, ImageryDevice } from "./contentResources.ts";
import type { SupportReport } from "../profile/types.ts";
import type { RenderTarget } from "./renderTarget.ts";
import type { View } from "./View.ts";
import type { World } from "./World.ts";

/** Which device an engine draws with (`DeviceFacts.renderer`). */
export type RenderDeviceKind = DeviceFacts["renderer"];

/**
 * One per engine: where GPU resources live (a WebGPU device today). Views
 * on one device share its resources; only their targets differ.
 */
export interface RenderDevice {
  readonly kind: RenderDeviceKind;
  /** What was observed about the device (the profiles plan's facts). */
  readonly facts: DeviceFacts;
  /** The device's copy of a world, made once with it. */
  createWorld(world: World): WorldMirror;
  /** What draws one view, made when the view is added. */
  createRenderer(view: View): ViewRenderer;
  /**
   * Draws one tick: the enabled views whose targets are in `targets` (every
   * enabled view's when not given), in one submission. `views` are the views
   * drawn because something of theirs changed.
   */
  render(tick: RenderTick): void;
  /**
   * Answers picks waiting on views that don't draw this tick (`rendering`
   * are the ones that do): their last image is current.
   */
  servePicks(rendering: ReadonlySet<View>): void;
  destroy(): void;
}

/** One tick's draws (`RenderDevice.render`). */
export interface RenderTick {
  /** Tilesets were updated this tick (the loop's tick, not a capture). */
  readonly tilesetsUpdated: boolean;
  readonly targets?: ReadonlySet<RenderTarget>;
  readonly views?: ReadonlySet<View>;
}

/**
 * A device's copy of a world. It reads the world's neutral draw data
 * (`World.draws`: records, batches, transforms, instances, materials) and
 * drains its change log once a tick, before the views that draw the world.
 */
export interface WorldMirror {
  /** Copies geometry written since the last tick to the device now. */
  sync(): void;
  /**
   * Queues `data` for the world's geometry slab `slab` (`Slabs`), at byte
   * `offset` in its vertex or index arena, copied to the device at `sync`.
   * The device keeps the bytes from now: the caller may reuse `data`.
   */
  queueUpload(
    slab: number,
    arena: "vertex" | "index",
    offset: number,
    data: Float32Array | Uint32Array,
  ): void;
  /** Content's textures on the device (glTF's, `gltfModel.ts`). */
  readonly textures: ContentTextures;
  /** The world's globe imagery on the device: its slices and compositors. */
  readonly imagery: ImageryDevice;
  destroy(): void;
}

/** What draws one view on its engine's device. */
export interface ViewRenderer {
  readonly view: View;
  /**
   * What the view supports on this device, in scene terms (`View.support`):
   * from the device's facts (src/profile/support.ts), made again after
   * device loss. Undefined for a device with no support rules yet.
   */
  readonly support: SupportReport | undefined;
  /** The view's exposure scale for this tick (its observer's exposure). */
  exposure(): number;
  /** Releases what the device holds for the view. */
  destroy(): void;
}
