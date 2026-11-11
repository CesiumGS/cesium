// What a view keeps between ticks: its graph, its readbacks and its bind groups.
import type { SkyView } from "../../atmosphere/Sky.ts";
import type { FrameGraph, TextureHandle } from "../FrameGraph.ts";
import type { View } from "../../scene/View.ts";
import type { ToneMapping } from "../../scene/observer.ts";
import type { PixelRect } from "../../scene/renderTarget.ts";
import type { ViewChain } from "../post/chain.ts";
import type { GlareViewState } from "../post/glare.ts";

/** Tone mappings by their index in present.slang's `PresentParams`. */
export const TONE_MAPPINGS: readonly ToneMapping[] = [
  "pbrNeutral",
  "agx",
  "aces",
];

/**
 * Owns the GPU device and everything shared between views: pipelines,
 * transient-texture pool and worlds. One `renderFrame` renders every enabled
 * view into one command encoder:
 *
 *   for each view:
 *     copy view block → current-view buffer   (ordered within the encoder)
 *     cull kernels: camera-relative transforms, culling, indirect args
 *     opaque pass: replay the world's render bundle
 *     [pick]: read the feature ID under requested pixels
 *     present: tonemap into the view's rectangle of its target, overlays
 *
 * Each view's frame graph, pass descriptors and bind groups are built once
 * and rebuilt only when the view's size changes, so a steady-state frame
 * allocates only the WebGPU objects the API itself returns (encoder, passes,
 * command buffer, canvas texture view).
 */
/** A view's last presented image, when it shares its canvas (on demand). */
export interface PersistentImage {
  texture: GPUTexture;
  view: GPUTextureView;
  /** Its size, at the origin: the view renders into it as a whole target. */
  rect: PixelRect;
  /** Holds the view's current image (false until first rendered). */
  valid: boolean;
}

/** Words before the translucent lists' heads (translucent.wgsl `LIST_HEADER`). */
export const LIST_HEADER = 4;

/** What `FrameGraph.addPass` runs for a pass. */
export type PassBody = Parameters<FrameGraph["addPass"]>[2];

/** Per-view frame state: the frame graph plus inputs its passes read each frame. */
export interface ViewFrame {
  /**
   * The nearest and farthest surface it showed along its axis, m (the
   * depth range read back, `depth-range`), and whether a reading is in
   * flight; the range its shadow cascades cover, kept steady
   * (`shadowRange`).
   */
  depthRange: { near: number; far: number } | undefined;
  rangePending: boolean;
  cascadeRange: { near: number; far: number } | undefined;
  /** The point and spot lights it shades this frame (`writeLights`). */
  lightCount: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly graph: FrameGraph;
  readonly output: TextureHandle;
  /** Index of this view's block in the view staging buffer this frame. */
  slot: number;
  /**
   * Bytes of its view blocks uploaded and copied this frame: up to its
   * anchor table's used slots (`viewBlockBytes`).
   */
  viewBytes: number;
  /**
   * The view block as last written (`writeView`), for a pick of the view to
   * make its own from, also while the view is idle (render/view/pickDomain.ts).
   */
  block: Float32Array | undefined;
  /** First view drawn into its target this frame. */
  clearTarget: boolean;
  bundle: GPURenderBundle | undefined;
  /** One-element list handed to executeBundles. */
  readonly bundles: GPURenderBundle[];
  /** @internal */
  pick: View["pendingPicks"][number] | undefined;
  /** The scene clock's seconds when it last rendered (its picks'). */
  seconds: number;
  /** The view's own feature IDs and depth (picks read the last frame's). */
  readonly ids: GPUTexture;
  readonly depth: GPUTexture;
  readonly idsView: GPUTextureView;
  readonly depthView: GPUTextureView;
  /** Rendered since built: `ids` and `depth` show what is on screen. */
  rendered: boolean;
  readonly presentParams: GPUBuffer;
  presentGroup: GPUBindGroup | undefined;
  presentSource: GPUTextureView | undefined;
  presentAdaptation: GPUTextureView | undefined;
  /** The eye's adaptation map's parameters (its pre-exposure). */
  adaptParams: GPUBuffer;
  /** FXAA's parameters and group (`View.fxaa`), with the image it read. */
  readonly fxaaParams: GPUBuffer;
  fxaaGroup: GPUBindGroup | undefined;
  fxaaImage: GPUTextureView | undefined;
  presentDisplay: GPUTextureView | undefined;
  /** Its post stages' slots and buffers (`View.observer`'s `stages`). */
  readonly chain: ViewChain;
  /** Its glare's list, with glare on. */
  readonly glare: GlareViewState | undefined;
  /** `View.stagesRevision` it was built for. */
  readonly stagesRevision: number;
  /** The tangent of half its vertical field of view, this tick (`writeLights`). */
  tanY: number;
  /** The sky's uniform for this view (`View.background` "atmosphere"). */
  readonly sky: SkyView;
  /** The sun's shadow maps were fitted for this view this frame. */
  shadowed: boolean;
  /** Ambient occlusion is computed for this view this frame. */
  ambient: boolean;
  /** Its kernels' parameters (ao.slang `AoParams`). */
  readonly aoParams: GPUBuffer;
  /** It draws blended surfaces this frame (`writeTranslucency`). */
  translucent: boolean;
  /** Their passes' parameters (translucent.wgsl `TranslucentParams`). */
  readonly translucentParams: GPUBuffer;
  /**
   * Bind groups of its translucent passes and composites, by role, with
   * what they were made for.
   */
  readonly translucentGroups: Array<
    | { group: GPUBindGroup; inputs: readonly (GPUBuffer | GPUTextureView)[] }
    | undefined
  >;
}

export interface TargetFrame {
  stamp: number;
  view: GPUTextureView | undefined;
  /** The view that clears the target this frame (the first drawn into it). */
  clearedBy: View | undefined;
}

export interface WorldFrame {
  stamp: number;
  bundle: GPURenderBundle | undefined;
}

export interface OverlayResources {
  buffer: GPUBuffer;
  capacity: number;
  params: GPUBuffer;
  group: GPUBindGroup;
  /** Camera-relative float32 positions, `capacity` × 3. */
  staging: Float32Array;
}

/**
 * The view shows its body's sky. Without an atmosphere the sky is black
 * (the stars and the sun's disk there come with the night sky).
 */
export function drawsSky(view: View): boolean {
  return view.background === "atmosphere" && view.body.atmosphere !== undefined;
}

/** The view shows its atmosphere's air between the camera and the scene. */
export function drawsAerialPerspective(view: View): boolean {
  return drawsSky(view) && view.aerialPerspective;
}

export function destroyViewFrame(frame: ViewFrame): void {
  frame.chain.destroy();
  frame.glare?.destroy();
  frame.presentParams.destroy();
  frame.adaptParams.destroy();
  frame.fxaaParams.destroy();
  frame.aoParams.destroy();
  frame.translucentParams.destroy();
  frame.sky.buffer.destroy();
  frame.sky.starUniform.destroy();
  frame.sky.starArgs.destroy();
  frame.sky.table.destroy();
  frame.sky.faceUniforms.destroy();
  frame.ids.destroy();
  frame.depth.destroy();
}
