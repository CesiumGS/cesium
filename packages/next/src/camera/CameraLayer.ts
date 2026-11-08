// The camera layer (spec sections 7.2 and 7.5): one rig per view; each tick
// it picks the view's render root (the rig's position reference frame),
// evaluates the rig there, and places every anchor of the view's world
// through the world's frame resolver. Plan 5a's calls 23 to 28.
import type { SceneClock } from "../core/sceneClock.ts";
import type { EngineErrors } from "../gpu/EngineErrors.ts";
import * as m4 from "../math/mat4.ts";
import { rigidMatrixError } from "../math/transforms.ts";
import * as v3 from "../math/vec3.ts";
import type { View } from "../scene/View.ts";
import type { AnchorHandle, TransformFrameKey, World } from "../scene/World.ts";
import {
  FrameUnavailableError,
  type FrameKey,
  type FrameResolver,
} from "./frameResolver.ts";
import { defaultRig, isDefaultRig, rigError, type Rig } from "./rig.ts";
import { tableResolver } from "./tableResolver.ts";

/** @internal What the camera layer needs of its engine. */
export interface CameraLayerHost {
  readonly views: readonly View[];
  wake(): void;
  readonly errors: EngineErrors;
}

/** What a failed placement keeps, said of the reference frame (no string built per tick). */
const PLACEMENT = (key: FrameKey) =>
  `a view keeps its last good placement of ${key.name}`;

/** Report keys for what isn't a reference frame failing to resolve. */
const POSE = "pose";
const RIG = "rig";

/** A view's rig, its root, and the inputs of its last evaluation. */
interface ViewState {
  rig: Rig;
  /** Set by `setRig` (otherwise the world's `defaultRig`). */
  explicit: boolean;
  /** `rig` is the default in substance (`isDefaultRig`). */
  isDefault: boolean;
  /** The world `root` belongs to. */
  world: World;
  /** The render root: the reference frame the camera's numbers are in. */
  root: FrameKey;
  // The last evaluation's inputs (the per-tick skip).
  resolver: FrameResolver | undefined;
  anchors: readonly AnchorHandle[] | undefined;
  anchorPlaces: number;
  seconds: number;
  evaluatedRoot: FrameKey | undefined;
  evaluatedRig: Rig | undefined;
  /** Every route's revision, `revisionCount` of them (grown, never per tick). */
  revisions: Float64Array;
  revisionCount: number;
  /** The camera's and the placements' versions after the last evaluation. */
  cameraVersion: number;
  anchorRevision: number;
  // A re-root that is waiting: retried when one of these changes.
  rerootTo: FrameKey | undefined;
  rerootResolver: FrameResolver | undefined;
  rerootRevision: number;
  rerootSeconds: number;
  /**
   * Failures reported and not yet recovered, by reference frame (or
   * `POSE`, `RIG`): the failure reported (its kind and message).
   */
  readonly reported: Map<FrameKey | string, string>;
}

/**
 * Each view's rig and render root (`Engine.cameras`, plan 5a's call 23).
 *
 * Each tick (and at the start of a `renderFrame` outside the loop) it
 * evaluates each view's rig at the clock's seconds and places every anchor
 * of the view's world, and the table's root, with the world's resolver
 * (`resolve(anchor, root, seconds)`), skipping the work while the time,
 * the root and every route's revision stay as they were. A view starts on
 * the default rig (`defaultRig`): on the transform table's resolver it is
 * gated on the world's anchor places alone (`World.anchorPlaceRevision`),
 * so a globe-only scene resolves nothing, and every placement stays at
 * the identity until `World.placeAnchor` is called.
 *
 * A reference frame that can't be resolved (a `FrameUnavailableError`, any
 * other throw, a matrix that isn't finite and rigid) leaves the view's last
 * good placement of it and the camera's last good pose. Each failure is
 * reported once in the engine's errors (kind `"camera"`) until that
 * reference frame resolves again, and the tick goes on (plan 5a's call 28).
 */
export class CameraLayer {
  private readonly states = new WeakMap<View, ViewState>();
  private readonly resolvers = new WeakMap<World, FrameResolver>();
  /** The remover of each world's resolver's `watch`. */
  private readonly unwatchResolvers = new WeakMap<World, () => void>();
  private readonly tables = new WeakMap<World, FrameResolver>();
  private readonly clocks = new WeakMap<
    World,
    { clock: SceneClock; unwatch: () => void }
  >();
  private readonly m = [0, 1, 2, 3].map(() => new Float64Array(16));
  private readonly current = new Float64Array(16);
  private readonly x = new Float64Array(16);

  /** @internal Made by the engine. */
  constructor(private readonly host: CameraLayerHost) {}

  /** The frame resolver of `world`'s views: by default, `tableResolver(world)`. */
  resolver(world: World): FrameResolver {
    return this.resolvers.get(world) ?? this.table(world);
  }

  /**
   * Sets the frame resolver of `world`'s views; they re-evaluate on the
   * next tick, and failures are reported afresh. A resolver that can
   * `watch` wakes the loop when its routes change.
   */
  setResolver(world: World, resolver: FrameResolver): void {
    this.unwatchResolvers.get(world)?.();
    this.unwatchResolvers.delete(world);
    this.resolvers.set(world, resolver);
    const unwatch = resolver.watch?.(() => this.host.wake());
    if (unwatch) {
      this.unwatchResolvers.set(world, unwatch);
    }
    for (const view of this.host.views) {
      if (view.world === world) {
        this.states.get(view)?.reported.clear();
      }
    }
    this.host.wake();
  }

  /**
   * @internal The engine removed `world`: stops watching its resolver and
   * its clock, and forgets both.
   */
  forget(world: World): void {
    this.unwatchResolvers.get(world)?.();
    this.unwatchResolvers.delete(world);
    this.resolvers.delete(world);
    this.clocks.get(world)?.unwatch();
    this.clocks.delete(world);
  }

  /** The scene clock of `world`'s views, if any. */
  clock(world: World): SceneClock | undefined {
    return this.clocks.get(world)?.clock;
  }

  /**
   * Sets the scene clock `world`'s rigs are evaluated at (without one,
   * at 0 seconds). A change in its time, rate or mode wakes the loop.
   */
  setClock(world: World, clock: SceneClock | undefined): void {
    this.clocks.get(world)?.unwatch();
    this.clocks.delete(world);
    if (clock) {
      const unwatch = clock.watch(() => {
        // A plain loop: a playing clock calls this every tick.
        const views = this.host.views;
        for (let i = 0; i < views.length; i++) {
          if (views[i]!.world === world) {
            this.host.wake();
            return;
          }
        }
      });
      this.clocks.set(world, { clock, unwatch });
    }
    this.host.wake();
  }

  /** The view's rig (`defaultRig` until one is set). */
  rig(view: View): Rig {
    const state = this.states.get(view);
    return state?.explicit ? state.rig : defaultRig(view.world);
  }

  /** The view's render root: the reference frame its camera's numbers are in. */
  root(view: View): FrameKey {
    const state = this.states.get(view);
    return state && state.world === view.world ? state.root : view.world.root;
  }

  /**
   * Sets the view's rig and evaluates it at once. When its position
   * reference frame differs from the view's root, the view re-roots: the
   * camera is re-expressed from the old root into the new one at the
   * clock's seconds, so nothing placed rigidly moves on screen. While that
   * can't be resolved yet, the view stays on its old root (reported once)
   * and re-roots on the first tick that can. Throws, naming it, for an
   * offset, forward or up that isn't finite.
   */
  setRig(view: View, rig: Rig): void {
    const error = rigError(rig);
    if (error) {
      throw new Error(`setRig: ${error}.`);
    }
    const state = this.state(view);
    state.rig = rig;
    state.explicit = true;
    state.isDefault = isDefaultRig(rig, state.world);
    state.rerootTo = undefined;
    state.reported.clear();
    this.evaluateSafely(view, state, true);
    this.host.wake();
  }

  /**
   * Per tick (plan 5a's call 24): each view re-roots if its rig asks, then
   * is placed and posed when anything it depends on changed. Returns true,
   * keeping the loop awake, while a clock isn't paused and a placement or
   * pose moved.
   */
  update(): boolean {
    let busy = false;
    const views = this.host.views;
    for (let i = 0; i < views.length; i++) {
      const view = views[i]!;
      if (this.evaluateSafely(view, this.state(view), false)) {
        busy = true;
      }
    }
    return busy;
  }

  /** The world's own table resolver (the default). */
  private table(world: World): FrameResolver {
    let table = this.tables.get(world);
    if (!table) {
      table = tableResolver(world);
      this.tables.set(world, table);
    }
    return table;
  }

  private state(view: View): ViewState {
    let state = this.states.get(view);
    if (!state) {
      const world = view.world;
      state = {
        rig: defaultRig(world),
        explicit: false,
        isDefault: true,
        world,
        root: world.root,
        // As if evaluated on the table with no anchor placed: every
        // placement is the identity, as a view's start.
        resolver: this.table(world),
        anchors: undefined,
        anchorPlaces: 0,
        seconds: Number.NaN,
        evaluatedRoot: undefined,
        evaluatedRig: undefined,
        revisions: new Float64Array(8),
        revisionCount: 0,
        cameraVersion: -1,
        anchorRevision: -1,
        rerootTo: undefined,
        rerootResolver: undefined,
        rerootRevision: Number.NaN,
        rerootSeconds: Number.NaN,
        reported: new Map(),
      };
      this.states.set(view, state);
    }
    return state;
  }

  /** `evaluate`, never throwing: the tick goes on. */
  private evaluateSafely(
    view: View,
    state: ViewState,
    force: boolean,
  ): boolean {
    try {
      return this.evaluate(view, state, force);
    } catch (error) {
      this.report(state, RIG, "a view's rig", error);
      return false;
    }
  }

  private evaluate(view: View, state: ViewState, force: boolean): boolean {
    const world = view.world;
    if (state.world !== world) {
      // Another world: nothing of the old root carries over.
      state.world = world;
      if (!state.explicit) {
        state.rig = defaultRig(world);
      }
      state.isDefault = isDefaultRig(state.rig, world);
      state.root = state.rig.position.frame;
      state.rerootTo = undefined;
      state.reported.clear();
      force = true;
    }
    const resolver = this.resolver(world);
    const clock = this.clocks.get(world)?.clock;
    const seconds = clock?.seconds ?? 0;
    const rig = state.rig;
    let rerooted = false;
    if (state.root !== rig.position.frame) {
      rerooted = this.reroot(view, state, resolver, seconds);
    }
    const root = state.root;
    const anchors = world.anchors;
    const places = world.anchorPlaceRevision;
    if (
      state.isDefault &&
      root === world.root &&
      resolver === this.tables.get(world)
    ) {
      // The default rig on the table: the placements are the anchors'
      // places, which change only with `anchorPlaceRevision`. Never placed,
      // every one is the identity, and nothing is resolved.
      if (
        !force &&
        !rerooted &&
        state.resolver === resolver &&
        state.anchorPlaces === places &&
        (places === 0 ||
          (state.anchors === anchors &&
            view.anchorRevision === state.anchorRevision))
      ) {
        return false;
      }
    } else {
      const camera = view.camera;
      const ownsPose =
        rig.position.offset !== undefined || rig.orientation.kind !== "free";
      let changed =
        force ||
        rerooted ||
        state.resolver !== resolver ||
        state.anchors !== anchors ||
        state.seconds !== seconds ||
        state.evaluatedRoot !== root ||
        state.evaluatedRig !== rig ||
        (ownsPose && camera.version !== state.cameraVersion) ||
        view.anchorRevision !== state.anchorRevision;
      // Always: it leaves the current revisions in the state's buffer.
      if (this.revisions(state, world, resolver, root, anchors, rig)) {
        changed = true;
      }
      if (!changed) {
        return false;
      }
    }
    state.resolver = resolver;
    state.anchors = anchors;
    state.anchorPlaces = places;
    state.seconds = seconds;
    state.evaluatedRoot = root;
    state.evaluatedRig = rig;
    let moved = this.place(view, state, resolver, root, seconds, anchors);
    if (this.pose(view, state, resolver, root, seconds)) {
      moved = true;
    }
    state.cameraVersion = view.camera.version;
    state.anchorRevision = view.anchorRevision;
    this.recovered(state, RIG);
    return moved && clock !== undefined && !clock.paused;
  }

  /**
   * Writes every route's revision the evaluation reads into the state's
   * buffer (NaN for one that threw); true if any differs from the last.
   */
  private revisions(
    state: ViewState,
    world: World,
    resolver: FrameResolver,
    root: FrameKey,
    anchors: readonly AnchorHandle[],
    rig: Rig,
  ): boolean {
    const o = rig.orientation;
    const count =
      1 +
      anchors.length +
      (rig.position.offset !== undefined ? 2 : 0) +
      (o.kind === "axes" ? 1 : o.kind === "aim" ? 2 : 0);
    if (state.revisions.length < count) {
      state.revisions = new Float64Array(
        Math.max(count, 2 * state.revisions.length),
      );
    }
    let changed = state.revisionCount !== count;
    state.revisionCount = count;
    let i = 0;
    changed = this.revision(state, i++, resolver, world.root, root) || changed;
    for (let k = 0; k < anchors.length; k++) {
      changed =
        this.revision(state, i++, resolver, anchors[k]!, root) || changed;
    }
    if (rig.position.offset !== undefined) {
      const p = rig.position;
      changed =
        this.revision(state, i++, resolver, p.anchor ?? p.frame, root) ||
        changed;
      changed = this.revision(state, i++, resolver, p.frame, root) || changed;
    }
    if (o.kind === "axes") {
      changed = this.revision(state, i, resolver, o.frame, root) || changed;
    } else if (o.kind === "aim") {
      changed = this.revision(state, i++, resolver, o.target, root) || changed;
      changed = this.revision(state, i, resolver, o.upFrame, root) || changed;
    }
    return changed;
  }

  /** Writes one route's revision at `i` (NaN if it threw); true if it changed. */
  private revision(
    state: ViewState,
    i: number,
    resolver: FrameResolver,
    key: FrameKey,
    root: FrameKey,
  ): boolean {
    let revision: number;
    try {
      revision = resolver.routeRevision(key, root);
    } catch {
      revision = Number.NaN; // never the same: evaluated, and reported there
    }
    // NaN differs from everything, itself included.
    const changed = !(state.revisions[i] === revision);
    state.revisions[i] = revision;
    return changed;
  }

  /**
   * Moves the view's root to its rig's position reference frame,
   * re-expressing the camera; false while that can't be resolved (the
   * view stays on its old root, and retries when the resolver, the route's
   * revision or the time changes).
   */
  private reroot(
    view: View,
    state: ViewState,
    resolver: FrameResolver,
    seconds: number,
  ): boolean {
    const from = state.root;
    const to = state.rig.position.frame;
    if (gone(state.world, from)) {
      // The old root was removed: there is nothing to re-express from.
      state.root = to;
      state.rerootTo = undefined;
      return true;
    }
    let revision: number;
    try {
      revision = resolver.routeRevision(from, to);
    } catch {
      revision = Number.NaN;
    }
    if (
      state.rerootTo === to &&
      state.rerootResolver === resolver &&
      state.rerootRevision === revision &&
      state.rerootSeconds === seconds
    ) {
      return false; // nothing it depends on changed since it failed
    }
    let x: Float64Array;
    try {
      x = this.checked(resolver, from, to, seconds, this.x);
    } catch (error) {
      state.rerootTo = to;
      state.rerootResolver = resolver;
      state.rerootRevision = revision;
      state.rerootSeconds = seconds;
      this.report(
        state,
        to,
        `a view stays on ${from.name} until it can re-root on ${to.name}`,
        error,
      );
      return false;
    }
    const camera = view.camera;
    m4.transformPoint(camera.position, x, camera.position);
    m4.transformDirection(camera.direction, x, camera.direction);
    m4.transformDirection(camera.up, x, camera.up);
    m4.transformDirection(camera.right, x, camera.right);
    camera.version++;
    state.root = to;
    state.rerootTo = undefined;
    this.recovered(state, to);
    return true;
  }

  /** Places every anchor (and the table's root); true if one moved. */
  private place(
    view: View,
    state: ViewState,
    resolver: FrameResolver,
    root: FrameKey,
    seconds: number,
    anchors: readonly AnchorHandle[],
  ): boolean {
    let moved = false;
    const world = state.world;
    for (let i = -1; i < anchors.length; i++) {
      const anchor = i < 0 ? undefined : anchors[i]!;
      const key = anchor ?? world.root;
      const m = this.resolveOrReport(
        state,
        resolver,
        key,
        root,
        seconds,
        this.m[0]!,
        PLACEMENT,
      );
      if (m === undefined) {
        continue;
      }
      this.recovered(state, key);
      const current = view.anchorPlacement(anchor, this.current);
      if (!sameNumbers(current, m)) {
        view.setAnchorPlacement(anchor, m);
        moved = true;
      }
    }
    return moved;
  }

  /** Evaluates the rig's pose in `root`; true if the camera moved. */
  private pose(
    view: View,
    state: ViewState,
    resolver: FrameResolver,
    root: FrameKey,
    seconds: number,
  ): boolean {
    const { position: p, orientation: o } = state.rig;
    if (p.offset === undefined && o.kind === "free") {
      return false;
    }
    const camera = view.camera;
    const what = "a view keeps its last good pose";
    const used: FrameKey[] = [];
    const resolve = (key: FrameKey, out: Float64Array) => {
      used.push(key);
      return this.resolveOrReport(
        state,
        resolver,
        key,
        root,
        seconds,
        out,
        what,
      );
    };
    const pos = v3.copy(scratchPosition, camera.position);
    if (p.offset !== undefined) {
      const at = resolve(p.anchor ?? p.frame, this.m[0]!);
      const axes = at && resolve(p.frame, this.m[1]!);
      if (!at || !axes) {
        return false;
      }
      m4.transformDirection(pos, axes, p.offset);
      for (let r = 0; r < 3; r++) {
        pos[r] = pos[r]! + at[12 + r]!;
      }
    }
    const dir = scratchDirection;
    const up = scratchUp;
    const right = scratchRight;
    if (o.kind === "free") {
      v3.copy(dir, camera.direction);
      v3.copy(up, camera.up);
      v3.copy(right, camera.right);
    } else {
      let upAxes: Float64Array | undefined;
      if (o.kind === "axes") {
        upAxes = resolve(o.frame, this.m[2]!);
        if (!upAxes) {
          return false;
        }
        m4.transformDirection(dir, upAxes, o.forward);
      } else {
        const target = resolve(o.target, this.m[2]!);
        upAxes = target && resolve(o.upFrame, this.m[3]!);
        if (!target || !upAxes) {
          return false;
        }
        for (let r = 0; r < 3; r++) {
          dir[r] = target[12 + r]! - pos[r]!;
        }
      }
      m4.transformDirection(up, upAxes, o.up);
      const length = v3.length(dir);
      if (!(length > 0) || !Number.isFinite(length)) {
        const key = o.kind === "aim" ? o.target : o.frame;
        this.report(
          state,
          POSE,
          what,
          new Error(
            o.kind === "aim"
              ? `its rig's aim target ${key.name} is at the camera`
              : `its rig's forward in ${key.name} is not a direction`,
          ),
        );
        return false;
      }
      v3.scale(dir, dir, 1 / length);
      v3.cross(right, dir, up);
      const r = v3.length(right);
      if (!(r > 1e-12)) {
        const key = o.kind === "aim" ? o.upFrame : o.frame;
        this.report(
          state,
          POSE,
          what,
          new Error(`its rig's up in ${key.name} is along the view direction`),
        );
        return false;
      }
      v3.scale(right, right, 1 / r);
      v3.cross(up, right, dir);
    }
    for (const key of used) {
      this.recovered(state, key);
    }
    this.recovered(state, POSE);
    if (
      sameNumbers(camera.position, pos) &&
      sameNumbers(camera.direction, dir) &&
      sameNumbers(camera.up, up) &&
      sameNumbers(camera.right, right)
    ) {
      return false;
    }
    v3.copy(camera.position, pos);
    v3.copy(camera.direction, dir);
    v3.copy(camera.up, up);
    v3.copy(camera.right, right);
    camera.version++;
    return true;
  }

  /** `frame` in `root`, or undefined after reporting why not. */
  private resolveOrReport(
    state: ViewState,
    resolver: FrameResolver,
    frame: FrameKey,
    root: FrameKey,
    seconds: number,
    out: Float64Array,
    what: string | ((frame: FrameKey) => string),
  ): Float64Array | undefined {
    try {
      return this.checked(resolver, frame, root, seconds, out);
    } catch (error) {
      this.report(
        state,
        frame,
        typeof what === "string" ? what : what(frame),
        error,
      );
      return undefined;
    }
  }

  /** `frame` in `base`, a reference frame in itself being the identity; throws unless rigid. */
  private checked(
    resolver: FrameResolver,
    frame: FrameKey,
    base: FrameKey,
    seconds: number,
    out: Float64Array,
  ): Float64Array {
    if (frame === base) {
      return m4.identity(out);
    }
    const m = resolver.resolve(frame, base, seconds, out);
    if (m !== out) {
      m4.copy(out, m);
    }
    const error = rigidMatrixError(out);
    if (error) {
      throw new NotRigidError(frame, base, error);
    }
    return out;
  }

  /**
   * Reports a failure once per episode: again only after `key` recovered,
   * or when it fails differently (loading, then failed to load; plan 5a's
   * call 28).
   */
  private report(
    state: ViewState,
    key: FrameKey | string,
    what: string,
    error: unknown,
  ): void {
    const reason = error instanceof Error ? error.message : String(error);
    const kind =
      error instanceof FrameUnavailableError ? ` (${error.reason})` : "";
    // The failure itself, whatever asked and in whichever direction: one
    // reference frame failing for a re-root, a placement and the pose is
    // one episode.
    const failure =
      error instanceof NotRigidError
        ? `not rigid: ${error.reason}`
        : `${kind}: ${reason}`;
    if (state.reported.get(key) === failure) {
      return;
    }
    state.reported.set(key, failure);
    this.host.errors.report("camera", `${what}${kind}: ${reason}`);
  }

  /** Ends `key`'s failure episode; free while nothing is failing. */
  private recovered(state: ViewState, key: FrameKey | string): void {
    if (state.reported.size > 0) {
      state.reported.delete(key);
    }
  }
}

/** A resolver's answer that isn't a finite rigid matrix. */
class NotRigidError extends Error {
  constructor(
    frame: FrameKey,
    base: FrameKey,
    /** `rigidMatrixError`'s reason, the same in either direction. */
    readonly reason: string,
  ) {
    super(`${frame.name}'s place in ${base.name} is not rigid: ${reason}`);
    this.name = "NotRigidError";
  }
}

/** Whether `key` named a part of `world`'s table that is gone. */
function gone(world: World, key: FrameKey): boolean {
  if (key === world.root) {
    return false;
  }
  if ("slot" in key) {
    return world.anchorOf(key as AnchorHandle) !== key;
  }
  const node = key as Partial<TransformFrameKey>;
  if (node.world !== undefined && node.transform !== undefined) {
    return node.world !== world || !world.transformAlive(node.transform);
  }
  return false;
}

function sameNumbers(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

const scratchPosition = v3.vec3();
const scratchDirection = v3.vec3();
const scratchUp = v3.vec3();
const scratchRight = v3.vec3();
