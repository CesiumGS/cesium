import { Camera, projectToPixel, type CameraPose } from "./Camera.ts";
import type { World } from "./World.ts";
import type { AnchorHandle } from "./world/types.ts";
import type { FrameKey } from "../camera/frameResolver.ts";
import type { FeatureValue } from "../io/gltfTypes.ts";
import { type ViewLighting } from "../render/layout.ts";
import { EARTH, bodyKey, type Body } from "./Body.ts";
import type { CorePick } from "./pick.ts";
import type { SceneItem } from "./SceneItem.ts";
import {
  type RenderTarget,
  type Viewport,
  type PixelRect,
  CanvasTarget,
} from "./renderTarget.ts";
import {
  syncAnchors,
  anchorPlacement,
  setAnchorPlacement,
  anchorCamera,
  setCameraFromAnchor,
  pickPlacements,
  placementOf,
  rotate,
} from "./viewAnchors.ts";
import { ViewAnchorState } from "./viewAnchorState.ts";
import {
  DAYLIGHT_EXPOSURE,
  type ObserverReadout,
  type ObserverSettings,
  cameraObserver,
  ev100ToScale,
  observerReadout,
} from "./observer.ts";
import { type PostStage, checkStageList } from "./postStage.ts";

/** A line list drawn on top of a view. */
export interface Overlay {
  /** Earth-fixed float64 endpoints, xyz per vertex, two per segment. */
  positions: Float64Array;
  /** Vertices in use (the array may have spare capacity). */
  count: number;
  color: readonly [number, number, number, number];
}

/** A view's scene-referred image (`View.readHdr`). */
export interface HdrImage {
  width: number;
  height: number;
  /**
   * Linear Rec. 709 RGBA per pixel, row by row from the top: the light in
   * the scene before exposure and tonemapping, in the scene's units
   * (cd/m² by default). Unlit content is display-referred and not in it.
   * Emission is display-relative (added after exposure), so it appears
   * divided by the exposure scale here. Alpha is not divided: it is the
   * share of the pixel's luminance that is scene light (1 without
   * emission). Where translucent layers draw it isn't: they blend coverage
   * into it, so it says nothing of their emission.
   */
  data: Float32Array;
}

export interface PickResult {
  /** Global feature ID (unique within the world). */
  featureId: number;
  name: string | undefined;
  /** Feature properties from the content's property or batch table. */
  properties?: Record<string, FeatureValue>;
  /** The item that drew it, if an item did (`World.add`). */
  item?: SceneItem;
}

export interface ViewOptions {
  target: RenderTarget;
  world: World;
  camera?: Camera;
  viewport?: Viewport;
  /**
   * Who is looking (`ObserverSettings`): over `cameraObserver({ ev100: 15 })`,
   * a camera set for daylight.
   */
  observer?: Partial<ObserverSettings>;
  /** The body whose sky and light the view sees. Default: the Earth. */
  body?: Body;
  /**
   * Behind the scene: the body's sky from its atmosphere (the default) or
   * `clearColor`.
   */
  background?: ViewBackground;
  /** The sun's disk in the sky. Default true. */
  sunDisk?: boolean;
  /**
   * The air between the camera and the scene (haze, the blue of distant
   * mountains, the orange of a low sun through it), from the atmosphere,
   * with background "atmosphere". Default true.
   */
  aerialPerspective?: boolean;
  /**
   * The sun's shadows (cascaded shadow maps, out to 20 times the camera's
   * height above the ground, 200 m to 150 km). Default false in the
   * engine (its tests compare with 1.x, which draws none); the `Viewer`
   * turns them on. A budgeted 3D tileset also loads tiles off screen that
   * may cast into view, coarser, and only with room in its cache
   * (`TilesetOptions.casterErrorScale`).
   */
  shadows?: boolean;
  /**
   * Ambient occlusion (GTAO from a depth and normal prepass): the sky's
   * light hidden by nearby surfaces, in corners, under eaves, between
   * buildings. Default false in the engine (as `shadows`); the `Viewer`
   * turns it on.
   */
  ambientOcclusion?: boolean;
  /** How far ambient occlusion looks for occluders, m. Default 3. */
  ambientOcclusionRadius?: number;
  /** How blended surfaces are put in order (`TranslucencyMethod`). */
  translucencyMethod?: TranslucencyMethod;
  /**
   * FXAA after tonemapping, on top of 4× MSAA: smooths the edges MSAA
   * leaves (within shading, and translucency's moments). Default false.
   */
  fxaa?: boolean;
  /**
   * The globe's night lights (`GlobeOptions.lights`), where it has them.
   * Default true.
   */
  cityLights?: boolean;
  /** Background color as displayed (already exposed), with "color". */
  clearColor?: readonly [number, number, number];
  /** Output transfer function. "gamma2.2" matches CesiumJS 1.x. */
  outputEncoding?: OutputEncoding;
  lighting?: Partial<ViewLighting>;
}

export type OutputEncoding = "srgb" | "gamma2.2";

/**
 * How blended surfaces (glTF alpha mode "BLEND": glass, water, ghosted
 * design) are put in order, whatever order they're drawn in:
 *
 * - "moments" (default): moment-based order-independent transparency. Two
 *   passes over them and a fixed 36 bytes a pixel; where many layers
 *   overlap, the light reaching each is estimated, so their order blurs.
 * - "exact": every layer kept per pixel and sorted, the nearest 32 blended
 *   in order. Memory grows with the layers on screen (16 bytes each); the
 *   reference "moments" is tested against.
 */
export type TranslucencyMethod = "moments" | "exact";

export type ViewBackground = "atmosphere" | "color";

/**
 * A copy of `value` whose writes call `changed`: a view's viewport and
 * lighting edited in place wake the engine's loop, as assigning them does.
 */
function watched<T extends object>(value: T, changed: () => void): T {
  return new Proxy(
    { ...value },
    {
      set(target, key, v) {
        (target as Record<PropertyKey, unknown>)[key] = v;
        changed();
        return true;
      },
      deleteProperty(target, key) {
        delete (target as Record<PropertyKey, unknown>)[key];
        changed();
        return true;
      },
    },
  );
}

/**
 * `watched`, for a value holding plain objects: those are copied and watched
 * too, however deep, on the way in and when written later. Arrays are copied
 * and frozen. Anything else, such as a class's instance, is kept as it is.
 * `check` may refuse a write to one of `value`'s own fields, by throwing.
 */
function watchedTree<T extends object>(
  value: T,
  changed: () => void,
  check?: (key: PropertyKey, value: unknown) => void,
): T {
  const copy = (v: unknown): unknown => {
    if (Array.isArray(v)) {
      return Object.freeze([...(v as unknown[])]);
    }
    if (v === null || typeof v !== "object") {
      return v;
    }
    return Object.getPrototypeOf(v) === Object.prototype
      ? watchedTree(v, changed)
      : v;
  };
  const target: Record<PropertyKey, unknown> = {};
  for (const key of Object.keys(value)) {
    target[key] = copy((value as Record<string, unknown>)[key]);
  }
  return new Proxy(target, {
    set(t, key, v) {
      check?.(key, v);
      t[key] = copy(v);
      changed();
      return true;
    },
    deleteProperty(t, key) {
      delete t[key];
      changed();
      return true;
    },
  }) as T;
}

/**
 * A camera looking at a world through a rectangle of a target. Views are
 * cheap: they own no geometry, only per-view state.
 */
export class View {
  /** @internal Its anchors' placements (`viewAnchors.ts`). */
  readonly anchorState: ViewAnchorState = new ViewAnchorState();

  readonly camera: Camera;
  readonly target: RenderTarget;
  /**
   * @internal The multiplier from the light in the scene to what is
   * tonemapped, as of the last tick (automatic exposure moves it). Shading
   * applies it before writing the HDR target (pre-exposure: fp16 stops at
   * 65,504, and a sunny day spans about 20 stops from night). `readout`
   * gives it to an application.
   */
  exposureScale: number;
  /**
   * @internal Automatic exposure's EV100, or the eye's adaptation (log10
   * cd/m², the cones' photopic and the rods' scotopic), and when it last
   * moved.
   */
  autoExposure?: {
    ev100: number;
    cones: number;
    rods: number;
    time: number;
    /** A reading is in flight. */
    pending: boolean;
    /**
     * A rendered tick skipped its meter pass because a reading was in
     * flight: the reading that lands asks for a tick to meter it.
     */
    skipped: boolean;
    /** At least one reading arrived (the first is taken as is). */
    metered: boolean;
  };
  /** The body whose sky and light the view sees. */
  readonly body: Body;
  shadows: boolean;
  ambientOcclusion: boolean;
  ambientOcclusionRadius: number;
  translucencyMethod: TranslucencyMethod;
  fxaa: boolean;
  cityLights: boolean;
  /**
   * @internal Wakes the engine's frame loop (it sleeps on demand when
   * nothing changes): set by `Engine.addView`, called when what the view's
   * on-demand fingerprint reads is set (`viewport`, `observer` and
   * `lighting` also when written in place), and for a pick.
   */
  wake?: () => void;
  /**
   * @internal The view's render root (the camera layer's,
   * `CameraLayer.root`): set by `Engine.addView`, read by the frames
   * module's placement query (`placementOf`), which is given the view.
   */
  renderRoot?: () => FrameKey;
  private readonly state = {} as {
    world: World;
    viewport: Viewport;
    observer: ObserverSettings;
    background: ViewBackground;
    sunDisk: boolean;
    aerialPerspective: boolean;
    clearColor: readonly [number, number, number];
    outputEncoding: OutputEncoding;
    enabled: boolean;
    lighting: ViewLighting;
  };
  private readonly changed = () => this.wake?.();
  private readonly observerChanged = () => {
    this.observerRevision_++;
    this.syncStages();
    this.wake?.();
  };
  private observerRevision_ = 0;
  /** The stages it listens to: their changes wake the loop too. */
  private stages_: readonly PostStage[] = [];
  /** What glare's passes were when `stagesRevision` last moved. */
  private glareShape_ = "";
  /**
   * @internal Counts changes to what's in the view's chain, each of which
   * rebuilds its graph: the list of stages, and glare's shape: on or off, its tier,
   * whether it has a veil and spikes, and whether it's on the eye. A value within them,
   * a share, doesn't.
   */
  stagesRevision = 0;

  get world(): World {
    return this.state.world;
  }
  set world(value: World) {
    this.state.world = value;
    this.wake?.();
  }
  get viewport(): Viewport {
    return this.state.viewport;
  }
  set viewport(value: Viewport) {
    this.state.viewport = watched(value, this.changed);
    this.wake?.();
  }
  /**
   * Who is looking: everything between the scene's light and a pixel. A
   * copy of what is set, over what it has, which belongs to this view alone:
   * written in place too, at any depth (`view.observer.exposure.ev100 = 12`),
   * it wakes the engine's loop. A stage in the list can be in another view's
   * list too (`PostStage`).
   */
  get observer(): ObserverSettings {
    return this.state.observer;
  }
  set observer(value: Partial<ObserverSettings>) {
    const settings = { ...this.state.observer, ...value };
    checkStageList(settings.stages);
    this.state.observer = watchedTree(
      settings,
      this.observerChanged,
      (key, stages) => {
        if (key === "stages") {
          checkStageList(stages as readonly PostStage[]);
        }
      },
    );
    this.observerChanged();
  }
  /** Follows the observer's list of stages, if it's a different list. */
  private syncStages(): void {
    const stages = this.state.observer.stages;
    const old = this.stages_;
    const { glare, exposure } = this.state.observer;
    const shape = glare
      ? `${glare.tier}|${glare.veil ? 1 : 0}|${glare.spikes ? 1 : 0}|${"eye" in exposure ? 1 : 0}`
      : "";
    if (shape !== this.glareShape_) {
      this.glareShape_ = shape;
      this.stagesRevision++;
    }
    if (
      stages.length === old.length &&
      stages.every((stage, i) => stage === old[i])
    ) {
      return;
    }
    for (const stage of old) {
      stage.unwatch(this.observerChanged);
    }
    for (const stage of stages) {
      stage.watch(this.observerChanged);
    }
    this.stages_ = stages;
    this.stagesRevision++;
  }
  /** @internal The view is gone: its stages may outlive it. */
  releaseStages(): void {
    for (const stage of this.stages_) {
      stage.unwatch(this.observerChanged);
    }
  }
  /** Counts changes to `observer`, assigned or written in place, and its stages'. */
  get observerRevision(): number {
    return this.observerRevision_;
  }
  /**
   * What the observer is doing now: its exposure in EV100, and the eye's
   * adaptation. An adapting exposure reads as of the last tick.
   */
  readout(): ObserverReadout {
    return observerReadout(
      this.state.observer.exposure,
      this.exposureScale,
      this.autoExposure?.metered ? this.autoExposure : undefined,
    );
  }
  /**
   * The sun's illuminance and image-based lighting factors. Like
   * `viewport` and `observer`, a copy of what is set: written in place
   * too, it wakes the engine's loop.
   */
  get lighting(): ViewLighting {
    return this.state.lighting;
  }
  set lighting(value: ViewLighting) {
    this.state.lighting = watched(value, this.changed);
    this.wake?.();
  }
  get background(): ViewBackground {
    return this.state.background;
  }
  set background(value: ViewBackground) {
    this.state.background = value;
    this.wake?.();
  }
  get sunDisk(): boolean {
    return this.state.sunDisk;
  }
  set sunDisk(value: boolean) {
    this.state.sunDisk = value;
    this.wake?.();
  }
  get aerialPerspective(): boolean {
    return this.state.aerialPerspective;
  }
  set aerialPerspective(value: boolean) {
    this.state.aerialPerspective = value;
    this.wake?.();
  }
  get clearColor(): readonly [number, number, number] {
    return this.state.clearColor;
  }
  set clearColor(value: readonly [number, number, number]) {
    this.state.clearColor = value;
    this.wake?.();
  }
  get outputEncoding(): OutputEncoding {
    return this.state.outputEncoding;
  }
  set outputEncoding(value: OutputEncoding) {
    this.state.outputEncoding = value;
    this.wake?.();
  }
  /** Disabled views are skipped (e.g. an offscreen view between captures). */
  get enabled(): boolean {
    return this.state.enabled;
  }
  set enabled(value: boolean) {
    this.state.enabled = value;
    this.wake?.();
  }
  readonly overlays: Overlay[] = [];
  /** @internal */
  pendingPicks: Array<{
    x: number;
    y: number;
    resolve?: (r: PickResult | undefined) => void;
    resolvePosition?: (p: Float64Array | undefined) => void;
    resolvePoint?: (p: CorePick | undefined) => void;
  }> = [];
  /** @internal Waiting for the view's next render (`readHdr`). */
  pendingHdrReads: Array<(image: HdrImage) => void> = [];
  /** @internal The same, after glare. */
  pendingGlareReads: Array<(image: HdrImage) => void> = [];

  constructor(options: ViewOptions) {
    this.target = options.target;
    this.world = options.world;
    this.camera = options.camera ?? new Camera();
    this.viewport = options.viewport ?? { x: 0, y: 0, width: 1, height: 1 };
    this.observer = {
      ...cameraObserver(DAYLIGHT_EXPOSURE),
      ...options.observer,
    };
    const exposure = this.observer.exposure;
    this.exposureScale =
      "scale" in exposure
        ? exposure.scale
        : ev100ToScale("ev100" in exposure ? exposure.ev100 : 15);
    this.body = options.body ?? EARTH;
    this.background = options.background ?? "atmosphere";
    this.sunDisk = options.sunDisk ?? true;
    this.aerialPerspective = options.aerialPerspective ?? true;
    this.shadows = options.shadows ?? false;
    this.ambientOcclusion = options.ambientOcclusion ?? false;
    this.ambientOcclusionRadius = options.ambientOcclusionRadius ?? 3;
    this.translucencyMethod = options.translucencyMethod ?? "moments";
    this.fxaa = options.fxaa ?? false;
    this.cityLights = options.cityLights ?? true;
    this.clearColor = options.clearColor ?? [0.004, 0.008, 0.02];
    this.outputEncoding = options.outputEncoding ?? "srgb";
    this.enabled = true;
    this.lighting = {
      sunIlluminance: "atmosphere",
      environment: "atmosphere",
      diffuseIbl: 1,
      specularIbl: 1,
      ...options.lighting,
    };
  }

  private readonly rect: PixelRect = { x: 0, y: 0, width: 1, height: 1 };
  /** `bodyKey(body)`, for `bodyAnchor`. */
  private bodyKey_: string | undefined;

  /**
   * Counts changes to this view's anchor placements: a placement set to a
   * new value (`setAnchorPlacement`; one set to the value it has doesn't
   * count), an anchor removed from the world (`World.removeAnchor`), and
   * the view moved to another world.
   */
  get anchorRevision(): number {
    syncAnchors(this);
    return this.anchorState.anchorRevision_;
  }

  /**
   * The view's body's anchor (`World.bodyAnchor(view.body)`) if the world
   * has made it; undefined until then (content is then in render space).
   */
  get bodyAnchor(): AnchorHandle | undefined {
    return this.world.findBodyAnchor((this.bodyKey_ ??= bodyKey(this.body)));
  }

  /**
   * Render space ← `anchor` for this view (column-major float64, rigid):
   * the identity until set. `undefined` is no anchor: the transform
   * table's root.
   */
  anchorPlacement(
    anchor: AnchorHandle | undefined,
    out = new Float64Array(16),
  ): Float64Array {
    return anchorPlacement(this, anchor, out);
  }

  /**
   * Places `anchor` (or, with `undefined`, the table's root) in this view's
   * render space: `matrix` is render space ← anchor, column-major float64,
   * a rotation (columns orthonormal within 10⁻⁹) and a translation. Refuses
   * any other matrix, naming the anchor. Stored, and drawn from the
   * following render; `anchorRevision` counts it only when a value changes.
   */
  setAnchorPlacement(
    anchor: AnchorHandle | undefined,
    matrix: ArrayLike<number>,
  ): void {
    setAnchorPlacement(this, anchor, matrix);
  }

  /**
   * This view's camera re-expressed in `anchor`'s coordinates (`undefined`:
   * the table's root), through its placement: written into `out` (a new
   * camera by default), field of view and near plane copied. With
   * `setCameraFromAnchor` the round trip is exact, to the float64 step of
   * the camera's coordinates, near the anchor; far from it, about one
   * float64 step of the placement's translation (about 60 nm at 400,000 km).
   */
  anchorCamera(anchor: AnchorHandle | undefined, out = new Camera()): Camera {
    return anchorCamera(this, anchor, out);
  }

  /**
   * Sets this view's camera from a pose in `anchor`'s coordinates
   * (`undefined`: the table's root): `anchorCamera`'s inverse, with the same
   * round trip (exact near the anchor; about 60 nm far from it at 400,000
   * km).
   */
  setCameraFromAnchor(
    anchor: AnchorHandle | undefined,
    pose: CameraPose,
  ): void {
    setCameraFromAnchor(this, anchor, pose);
  }

  /**
   * @internal This view's placements now, for a pick to keep (render space
   * ← anchor, copied): the table root's (key `undefined`) and each anchor
   * of its world's, `undefined` at the identity.
   */
  pickPlacements(): Map<AnchorHandle | undefined, Float64Array | undefined> {
    return pickPlacements(this);
  }

  /**
   * Viewport in target pixels. The returned object is reused: it is current
   * until the next call.
   */
  pixelRect(): Readonly<PixelRect> {
    const { width: targetWidth, height: targetHeight } = this.target;
    // At least a pixel, inside the target: a canvas squeezed to 0 width is 1
    // across, where a viewport off its middle rounded to no size at all (a
    // texture without size, and every frame rejected).
    const x = Math.max(
      Math.min(Math.round(this.viewport.x * targetWidth), targetWidth - 1),
      0,
    );
    const y = Math.max(
      Math.min(Math.round(this.viewport.y * targetHeight), targetHeight - 1),
      0,
    );
    const rect = this.rect;
    rect.x = x;
    rect.y = y;
    rect.width = Math.max(
      Math.min(Math.round(this.viewport.width * targetWidth), targetWidth - x),
      1,
    );
    rect.height = Math.max(
      Math.min(
        Math.round(this.viewport.height * targetHeight),
        targetHeight - y,
      ),
      1,
    );
    return rect;
  }

  get aspect(): number {
    const rect = this.pixelRect();
    return rect.width / rect.height;
  }

  /**
   * Where a position in `anchor`'s coordinates shows in this view with its
   * current camera: CSS pixels from the view's top-left (as `pickDesign`
   * takes them), or undefined when the position is behind the camera or
   * nearer than its near plane (not drawn). Off-screen positions in front
   * of it give pixels outside the view.
   *
   * Without `anchor`, the view's body anchor (`bodyAnchor`: Earth-fixed
   * for the Earth), or the world's `root` while the world has none.
   * `world.root` is the transform table's root: render space while its
   * placement (`setAnchorPlacement(undefined, …)`) is the identity. An
   * explicit `undefined` is refused, so it can't be read as either.
   */
  toPixel(
    position: ArrayLike<number>,
    ...anchor: [] | [anchor: AnchorHandle | World["root"]]
  ): Float64Array | undefined {
    if (anchor.length > 0 && anchor[0] === undefined) {
      throw new Error(
        "toPixel: the anchor is undefined; pass world.root for the transform table's root, or omit it for the body anchor.",
      );
    }
    const m = placementOf(
      this,
      anchor.length > 0 ? anchor[0] : (this.bodyAnchor ?? this.world.root),
      "toPixel",
    );
    if (m) {
      const p = new Float64Array(3);
      rotate(m, position, p, true);
      position = p;
    }
    const rect = this.pixelRect();
    const ratio =
      this.target instanceof CanvasTarget ? this.target.pixelRatio : 1;
    const out = new Float64Array(2);
    const depth = projectToPixel(
      this.camera,
      this.camera.fovy(rect.width / rect.height),
      rect.width / ratio,
      rect.height / ratio,
      position,
      out,
    );
    return depth >= this.camera.near && depth > 0 ? out : undefined;
  }

  /** True when a point in target pixels falls inside this view. */
  contains(targetX: number, targetY: number): boolean {
    const r = this.pixelRect();
    return (
      targetX >= r.x &&
      targetX < r.x + r.width &&
      targetY >= r.y &&
      targetY < r.y + r.height
    );
  }

  /**
   * Feature under a pixel of this view (pixels relative to the view's
   * top-left). Resolves a few frames later; no extra render is needed.
   *
   * What a pick sees through, here and in `pickPosition` and `pickPoint`:
   * blended surfaces (glass, ghosts) are not picked; what lies behind them
   * is. Terrain drawn below full opacity by a region is the exception
   * (`Globe.terrain.addRegion`): where it is ground, picks stop at it as
   * at opaque terrain, unless the region has `pickThrough`, when they go
   * on to what shows through it (a tunnel under the ground).
   */
  pick(x: number, y: number): Promise<PickResult | undefined> {
    return new Promise((resolve) => {
      this.pendingPicks.push({ x, y, resolve });
      this.wake?.();
    });
  }

  /**
   * This view's scene-referred image (before exposure and tonemapping),
   * from its next render: for measurements and references, not display.
   * `Engine.renderFrame` renders now. `after: "glare"` reads after the view's glare,
   * for checks; it's the same image in a view with none.
   */
  readHdr(options?: { after?: "glare" }): Promise<HdrImage> {
    const pending =
      options?.after === "glare"
        ? this.pendingGlareReads
        : this.pendingHdrReads;
    return new Promise((resolve) => pending.push(resolve));
  }

  /**
   * Earth-fixed position of what is drawn under a pixel of this view
   * (float64, from the depth buffer): the body anchor's coordinates
   * (`bodyAnchor`), whatever the render root. Undefined over the sky.
   * Resolves a few frames later, with the camera of the frame it was read
   * in. Translucent terrain stops it unless made with `pickThrough`
   * (`pick`).
   */
  pickPosition(x: number, y: number): Promise<Float64Array | undefined> {
    return new Promise((resolvePosition) => {
      this.pendingPicks.push({ x, y, resolvePosition });
      this.wake?.();
    });
  }

  /**
   * What is drawn under a pixel of this view (pixels relative to its
   * top-left, as `pick`): the position in render space (the rig's position
   * reference frame) and in the hit draw's anchor, the draw and the
   * feature, with the camera, the render root and the scene time. All of it
   * is from the tick whose image was read, however many ticks later it
   * resolves; only the draw and the feature are looked up when the
   * readback maps. Undefined over the sky. A pick interpreter turns it into
   * a point tagged with its reference frame (`createFramesPickInterpreter`).
   * Translucent terrain stops it unless made with `pickThrough` (`pick`).
   */
  pickPoint(x: number, y: number): Promise<CorePick | undefined> {
    return new Promise((resolvePoint) => {
      this.pendingPicks.push({ x, y, resolvePoint });
      this.wake?.();
    });
  }
}
