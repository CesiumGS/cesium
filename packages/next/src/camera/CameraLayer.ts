// The camera layer (spec sections 7.2 and 7.5): one rig per view; each tick
// it picks the view's render root (the rig's position reference frame),
// evaluates the rig there, and places every anchor of the view's world
// through the world's frame resolver. Plan 5a's calls 23 to 28.
import type { SceneClock } from "../core/sceneClock.ts";
import type { EngineErrors } from "../gpu/EngineErrors.ts";
import * as m4 from "../math/mat4.ts";
import { rigidMatrixError } from "../math/transforms.ts";
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

/** A view with a rig of its own. */
interface RigState {
  rig: Rig;
  /** `rig` is the default: placed once on arriving, then left alone. */
  isDefault: boolean;
  settled: boolean;
  /** The world `root` belongs to. */
  world: World;
  /** The render root: the reference frame the camera's numbers are in. */
  root: FrameKey;
  // The last evaluation's inputs (the per-tick skip).
  resolver: FrameResolver | undefined;
  anchors: readonly AnchorHandle[] | undefined;
  seconds: number;
  evaluatedRoot: FrameKey | undefined;
  evaluatedRig: Rig | undefined;
  revisions: number[];
  /** The camera's version after the last evaluation. */
  cameraVersion: number;
  /** Reference frames already reported for this view. */
  readonly reported: Set<FrameKey>;
}

/**
 * Each view's rig and render root (`Engine.cameras`, plan 5a's call 23).
 *
 * A view starts on the default rig (`defaultRig`): render space is the
 * transform table's root, and the layer leaves the view's anchor
 * placements to the application (`View.setAnchorPlacement`), at no cost
 * per tick. Any other rig hands them to the layer: each tick (and at the
 * start of a `renderFrame` outside the loop) it evaluates the rig at the
 * clock's seconds and places every anchor of the view's world with its
 * world's resolver (`resolve(anchor, root, seconds)`), skipping the work
 * while the time, the root and every route's revision stay as they were.
 *
 * A reference frame that can't be resolved (a `FrameUnavailableError`, any
 * other throw, a matrix that isn't finite and rigid) leaves the view's last
 * good placement of it and the camera's last good pose; it is reported
 * once per view and reference frame in the engine's errors (kind
 * `"camera"`), and the tick goes on (plan 5a's call 28).
 */
export class CameraLayer {
  private readonly states = new WeakMap<View, RigState>();
  private readonly resolvers = new WeakMap<World, FrameResolver>();
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
    let resolver = this.resolvers.get(world);
    if (!resolver) {
      resolver = tableResolver(world);
      this.resolvers.set(world, resolver);
    }
    return resolver;
  }

  /** Sets the frame resolver of `world`'s views; their rigs re-evaluate next tick. */
  setResolver(world: World, resolver: FrameResolver): void {
    this.resolvers.set(world, resolver);
    this.host.wake();
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
        if (this.hasRig(world)) {
          this.host.wake();
        }
      });
      this.clocks.set(world, { clock, unwatch });
    }
    this.host.wake();
  }

  /** The view's rig (`defaultRig` until one is set). */
  rig(view: View): Rig {
    return this.states.get(view)?.rig ?? defaultRig(view.world);
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
    const isDefault = isDefaultRig(rig, view.world);
    let state = this.states.get(view);
    if (!state) {
      if (isDefault) {
        return;
      }
      state = {
        rig,
        isDefault,
        settled: false,
        world: view.world,
        root: view.world.root,
        resolver: undefined,
        anchors: undefined,
        seconds: Number.NaN,
        evaluatedRoot: undefined,
        evaluatedRig: undefined,
        revisions: [],
        cameraVersion: -1,
        reported: new Set(),
      };
      this.states.set(view, state);
    }
    state.rig = rig;
    state.isDefault = isDefault;
    state.settled = false;
    this.evaluateSafely(view, state, true);
    this.host.wake();
  }

  /**
   * Per tick (plan 5a's call 24): each view with a rig re-roots if its rig
   * asks, then is placed and posed when anything it depends on changed.
   * Returns true, keeping the loop awake, while a clock isn't paused and a
   * placement or pose moved.
   */
  update(): boolean {
    let busy = false;
    const views = this.host.views;
    for (let i = 0; i < views.length; i++) {
      const view = views[i]!;
      const state = this.states.get(view);
      if (state !== undefined && this.evaluateSafely(view, state, false)) {
        busy = true;
      }
    }
    return busy;
  }

  private hasRig(world: World): boolean {
    for (const view of this.host.views) {
      const state = this.states.get(view);
      if (
        view.world === world &&
        state &&
        !(state.isDefault && state.settled)
      ) {
        return true;
      }
    }
    return false;
  }

  /** `evaluate`, never throwing: the tick goes on. */
  private evaluateSafely(view: View, state: RigState, force: boolean): boolean {
    try {
      return this.evaluate(view, state, force);
    } catch (error) {
      this.report(state, state.rig.position.frame, "a view's rig", error);
      return false;
    }
  }

  private evaluate(view: View, state: RigState, force: boolean): boolean {
    const world = view.world;
    if (state.world !== world) {
      // Another world: nothing of the old root carries over.
      state.world = world;
      state.root = state.rig.position.frame;
      force = true;
    }
    const resolver = this.resolver(world);
    const clock = this.clocks.get(world)?.clock;
    const seconds = clock?.seconds ?? 0;
    let rerooted = false;
    if (state.root !== state.rig.position.frame) {
      rerooted = this.reroot(view, state, resolver, seconds);
    }
    if (state.isDefault && state.settled && !rerooted) {
      return false;
    }
    const root = state.root;
    const rig = state.rig;
    const anchors = world.anchors;
    const revisions = this.revisions(world, resolver, root, anchors, rig);
    const followsCamera =
      rig.orientation.kind === "aim" && rig.position.offset === undefined;
    if (
      !force &&
      !rerooted &&
      state.resolver === resolver &&
      state.anchors === anchors &&
      state.seconds === seconds &&
      state.evaluatedRoot === root &&
      state.evaluatedRig === rig &&
      sameNumbers(state.revisions, revisions) &&
      (!followsCamera || view.camera.version === state.cameraVersion)
    ) {
      return false;
    }
    state.resolver = resolver;
    state.anchors = anchors;
    state.seconds = seconds;
    state.evaluatedRoot = root;
    state.evaluatedRig = rig;
    state.revisions = revisions;
    let moved = this.place(view, state, resolver, root, seconds, anchors);
    if (this.pose(view, state, resolver, root, seconds)) {
      moved = true;
    }
    state.cameraVersion = view.camera.version;
    if (state.isDefault && state.root === rig.position.frame) {
      state.settled = true;
    }
    return moved && clock !== undefined && !clock.paused;
  }

  /** Every route the view's evaluation reads: its revision, NaN if it threw. */
  private revisions(
    world: World,
    resolver: FrameResolver,
    root: FrameKey,
    anchors: readonly AnchorHandle[],
    rig: Rig,
  ): number[] {
    const out: number[] = [];
    const add = (key: FrameKey | undefined) => {
      if (key === undefined) {
        return;
      }
      try {
        out.push(resolver.routeRevision(key, root));
      } catch {
        out.push(Number.NaN); // never the same: evaluated, and reported there
      }
    };
    add(world.root);
    for (let i = 0; i < anchors.length; i++) {
      add(anchors[i]);
    }
    if (rig.position.offset !== undefined) {
      add(rig.position.anchor ?? rig.position.frame);
      add(rig.position.frame);
    }
    const o = rig.orientation;
    if (o.kind === "axes") {
      add(o.frame);
    } else if (o.kind === "aim") {
      add(o.target);
      add(o.upFrame);
    }
    return out;
  }

  /**
   * Moves the view's root to its rig's position reference frame,
   * re-expressing the camera; false while that can't be resolved (the
   * view stays on its old root).
   */
  private reroot(
    view: View,
    state: RigState,
    resolver: FrameResolver,
    seconds: number,
  ): boolean {
    const from = state.root;
    const to = state.rig.position.frame;
    if (gone(state.world, from)) {
      // The old root was removed: there is nothing to re-express from.
      state.root = to;
      return true;
    }
    let x: Float64Array;
    try {
      x = this.checked(resolver, from, to, seconds, this.x);
    } catch (error) {
      this.report(
        state,
        to,
        `a view stays on ${from.name} until it can re-root on ${to.name}`,
        error,
      );
      return false;
    }
    const camera = view.camera;
    transformPoint(x, camera.position);
    transformVector(x, camera.direction);
    transformVector(x, camera.up);
    transformVector(x, camera.right);
    camera.version++;
    state.root = to;
    return true;
  }

  /** Places every anchor (and the table's root); true if one moved. */
  private place(
    view: View,
    state: RigState,
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
        `a view keeps its last good placement of ${key.name}`,
      );
      if (m === undefined) {
        continue;
      }
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
    state: RigState,
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
    const resolve = (key: FrameKey, out: Float64Array) =>
      this.resolveOrReport(state, resolver, key, root, seconds, out, what);
    const pos = scratchPosition;
    copy3(camera.position, pos);
    if (p.offset !== undefined) {
      const at = resolve(p.anchor ?? p.frame, this.m[0]!);
      const axes = at && resolve(p.frame, this.m[1]!);
      if (!at || !axes) {
        return false;
      }
      const o3 = p.offset;
      for (let r = 0; r < 3; r++) {
        pos[r] =
          at[12 + r]! +
          axes[r]! * o3[0]! +
          axes[4 + r]! * o3[1]! +
          axes[8 + r]! * o3[2]!;
      }
    }
    const dir = scratchDirection;
    const up = scratchUp;
    const right = scratchRight;
    if (o.kind === "free") {
      copy3(camera.direction, dir);
      copy3(camera.up, up);
      copy3(camera.right, right);
    } else {
      let upAxes: Float64Array | undefined;
      if (o.kind === "axes") {
        upAxes = resolve(o.frame, this.m[2]!);
        if (!upAxes) {
          return false;
        }
        rotate(upAxes, o.forward, dir);
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
      rotate(upAxes, o.up, up);
      const length = Math.hypot(dir[0]!, dir[1]!, dir[2]!);
      if (!(length > 0) || !Number.isFinite(length)) {
        const key = o.kind === "aim" ? o.target : o.frame;
        this.report(
          state,
          key,
          what,
          new Error(
            o.kind === "aim"
              ? `its rig's aim target ${key.name} is at the camera`
              : `its rig's forward in ${key.name} is not a direction`,
          ),
        );
        return false;
      }
      scale3(dir, 1 / length);
      cross(dir, up, right);
      const r = Math.hypot(right[0]!, right[1]!, right[2]!);
      if (!(r > 1e-12)) {
        const key = o.kind === "aim" ? o.upFrame : o.frame;
        this.report(
          state,
          key,
          what,
          new Error(`its rig's up in ${key.name} is along the view direction`),
        );
        return false;
      }
      scale3(right, 1 / r);
      cross(right, dir, up);
    }
    if (
      sameNumbers(camera.position, pos) &&
      sameNumbers(camera.direction, dir) &&
      sameNumbers(camera.up, up) &&
      sameNumbers(camera.right, right)
    ) {
      return false;
    }
    copy3(pos, camera.position);
    copy3(dir, camera.direction);
    copy3(up, camera.up);
    copy3(right, camera.right);
    camera.version++;
    return true;
  }

  /** `frame` in `root`, or undefined after reporting why not. */
  private resolveOrReport(
    state: RigState,
    resolver: FrameResolver,
    frame: FrameKey,
    root: FrameKey,
    seconds: number,
    out: Float64Array,
    what: string,
  ): Float64Array | undefined {
    try {
      return this.checked(resolver, frame, root, seconds, out);
    } catch (error) {
      this.report(state, frame, what, error);
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
      throw new Error(
        `${frame.name}'s place in ${base.name} is not rigid: ${error}`,
      );
    }
    return out;
  }

  /** Reports once per view and reference frame (plan 5a's call 28). */
  private report(
    state: RigState,
    frame: FrameKey,
    what: string,
    error: unknown,
  ): void {
    if (state.reported.has(frame)) {
      return;
    }
    state.reported.add(frame);
    const reason = error instanceof Error ? error.message : String(error);
    const kind =
      error instanceof FrameUnavailableError ? ` (${error.reason})` : "";
    this.host.errors.report("camera", `${what}${kind}: ${reason}`);
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

function copy3(from: ArrayLike<number>, to: Float64Array): void {
  to[0] = from[0]!;
  to[1] = from[1]!;
  to[2] = from[2]!;
}

function scale3(v: Float64Array, s: number): void {
  v[0] = v[0]! * s;
  v[1] = v[1]! * s;
  v[2] = v[2]! * s;
}

function cross(a: Float64Array, b: Float64Array, out: Float64Array): void {
  const x = a[1]! * b[2]! - a[2]! * b[1]!;
  const y = a[2]! * b[0]! - a[0]! * b[2]!;
  const z = a[0]! * b[1]! - a[1]! * b[0]!;
  out[0] = x;
  out[1] = y;
  out[2] = z;
}

/** `m`'s rotation applied to `v`, into `out`. */
function rotate(
  m: Float64Array,
  v: ArrayLike<number>,
  out: Float64Array,
): void {
  const x = v[0]!,
    y = v[1]!,
    z = v[2]!;
  for (let r = 0; r < 3; r++) {
    out[r] = m[r]! * x + m[4 + r]! * y + m[8 + r]! * z;
  }
}

/** `p` ← `m` · `p` (a point). */
function transformPoint(m: Float64Array, p: Float64Array): void {
  const x = p[0]!,
    y = p[1]!,
    z = p[2]!;
  for (let r = 0; r < 3; r++) {
    p[r] = m[r]! * x + m[4 + r]! * y + m[8 + r]! * z + m[12 + r]!;
  }
}

/** `v` ← `m`'s rotation · `v` (a direction). */
function transformVector(m: Float64Array, v: Float64Array): void {
  rotate(m, Float64Array.of(v[0]!, v[1]!, v[2]!), v);
}

const scratchPosition = new Float64Array(3);
const scratchDirection = new Float64Array(3);
const scratchUp = new Float64Array(3);
const scratchRight = new Float64Array(3);
