// The frames module's frame resolver (spec section 7.2; plan 5a, Task 12):
// the camera layer's questions answered over the catalog's tree. Anchors
// are bound to reference frames (a body's anchor to its body-fixed one);
// the table root and unbound anchors sit at the render root's origin (plan
// 5a's call 29). Rendering falls back where measuring throws: a reference
// frame asked for at "precise" at an instant outside its data draws on its
// analytic stand-in, with one warning stating the stand-in's accuracy.
import {
  FrameUnavailableError,
  type FrameKey,
  type FrameMotion,
  type FrameResolver,
} from "../camera/frameResolver.ts";
import {
  NonRigidRouteError,
  warpForward,
  warpInverse,
  type Route,
  type RouteStep,
} from "../camera/route.ts";
import { Emitter } from "../core/Emitter.ts";
import * as m4 from "../math/mat4.ts";
import { rigidMatrixError } from "../math/transforms.ts";
import type { AnchorHandle, TransformFrameKey } from "../scene/world/types.ts";
import { Instant } from "../time/Instant.ts";
import type { LeapSeconds } from "../time/leapSeconds.ts";
import {
  ANALYTIC_ACCURACY,
  analyticEdges,
  type StandInName,
} from "./analytic.ts";
import type { CatalogFrameName, FrameCatalog, Precision } from "./catalog.ts";
import type { FrameEdge } from "./edges.ts";
import { Frame, routeRevision } from "./Frame.ts";
import type { FrameAccuracy } from "./frameAccuracy.ts";
import { framePoint } from "./local.ts";
import { rotationPart } from "./matrix.ts";
import { pointAccuracy } from "./pointAccuracy.ts";
import { isWarpFrame, type WarpFrame } from "./warpFrame.ts";

/**
 * A reference frame drawn on its analytic stand-in because the instant is
 * outside its data (kind `"standIn"`): once per reference frame.
 */
export interface FrameStandInWarning {
  readonly kind: "standIn";
  /** The reference frame's name. */
  readonly frame: string;
  /** The stand-in's stated accuracy, which is what the drawing is good to. */
  readonly accuracy: Readonly<FrameAccuracy>;
  readonly message: string;
}

/** Options of `createFramesResolver`. */
export interface FramesResolverOptions {
  /**
   * `"precise"` asks the catalog for `"precise"` on every catalog edge of
   * each route the resolver uses (precision is per edge); `"analytic"`
   * (the default) asks nothing, so the routes run at whatever the
   * catalog's reference frames already run at.
   */
  precision?: Precision;
}

/** The camera layer's frame resolver over a catalog; see `createFramesResolver`. */
export interface FramesResolver extends FrameResolver {
  readonly catalog: FrameCatalog;
  readonly precision: Precision;
  /** The Instant at scene `seconds`, through the catalog's leap seconds, as `Clock.instant` does. */
  instant(seconds: number): Instant;
  /**
   * Binds `anchor` to `frame`: content under the anchor is in `frame`'s
   * coordinates. `frame` must be in the catalog's tree (it is marked as
   * used by the application). An anchor made by `World.bodyAnchor(body)`
   * binds itself to `catalog.bodyFixed(body)` on first use.
   */
  bindAnchor(anchor: AnchorHandle, frame: Frame): void;
  /** The reference frame `anchor` is bound to, if any (binding a body's anchor). */
  binding(anchor: AnchorHandle): Frame | undefined;
  motion(
    frame: FrameKey,
    base: FrameKey,
    seconds: number,
    out: FrameMotion,
  ): FrameMotion;
  route(frame: FrameKey, base: FrameKey, seconds: number): Route;
  accuracy(
    point: ArrayLike<number>,
    frame: FrameKey,
    base: FrameKey,
    seconds: number,
  ): { readonly meters: number | undefined; readonly note: string };
  watch(listener: () => void): () => void;
  /** The stand-in warnings so far, in order. */
  readonly warnings: readonly FrameStandInWarning[];
  readonly events: Emitter<{ warning: FrameStandInWarning }>;
}

/**
 * How far from rigid a route through GCRF's precise edge may be and still
 * be made rigid: eq. 11.19 scales by about 2.5e-8 and shears by about 5e-9.
 */
const NEARLY_RIGID = 1e-6;

/** What a route's revision was last computed from (`routeRevision`). */
interface RouteRecord {
  a: Frame | undefined;
  b: Frame | undefined;
  /** `routeRevision(a, b)` of the bound reference frames. */
  frames: number;
  /** The nodes' worlds' `transformRevision`, summed. */
  nodes: number;
  revision: number;
}

class Resolver implements FramesResolver {
  readonly events = new Emitter<{ warning: FrameStandInWarning }>();
  private readonly warningList: FrameStandInWarning[] = [];
  private readonly bindings = new WeakMap<AnchorHandle, Frame>();
  /** Each route's record, by its two keys. */
  private readonly routes = new WeakMap<FrameKey, Map<FrameKey, RouteRecord>>();
  private readonly watchers = new Set<() => void>();
  /** Frames asked for at "precise" (or found not to be the catalog's). */
  private readonly asked = new WeakSet<Frame>();
  /** Warp frames whose changes wake the watchers. */
  private readonly hooked = new WeakSet<WarpFrame>();
  /** Frames marked as a rig's. */
  private readonly rigFrames = new WeakSet<Frame>();
  /** The catalog's own stand-in reference frames, by frame. */
  private readonly standInNames = new WeakMap<Frame, StandInName | null>();
  /** Stand-in episodes warned about and not yet over. */
  private readonly warned = new Set<string>();
  /** A reference frame found outside its data, at that instant and revision. */
  private readonly outside = new WeakMap<
    Frame,
    { tt: number; revision: number; name: StandInName }
  >();
  /** The route being composed crossed GCRF's precise (scaling) edge. */
  private scaled = false;
  private standIns: Readonly<Record<StandInName, FrameEdge>> | undefined;
  // The last instant, by seconds and leap-second table.
  private lastSeconds = Number.NaN;
  private lastLeap: LeapSeconds | undefined;
  private lastInstant: Instant | undefined;
  /** Whether the last `reference` wrote an anchor-relative matrix. */
  private hasLocal = false;
  private readonly localA = new Float64Array(16);
  private readonly localB = new Float64Array(16);
  private readonly up = new Float64Array(16);
  private readonly down = new Float64Array(16);
  private readonly step = new Float64Array(16);
  private readonly inverse = new Float64Array(16);
  private readonly plus = new Float64Array(16);
  private readonly minus = new Float64Array(16);
  private readonly rotation = new Float64Array(9);

  constructor(
    readonly catalog: FrameCatalog,
    readonly precision: Precision,
  ) {}

  get warnings(): readonly FrameStandInWarning[] {
    return this.warningList;
  }

  instant(seconds: number): Instant {
    const leap = this.catalog.leapSeconds;
    if (seconds !== this.lastSeconds || leap !== this.lastLeap) {
      this.lastInstant = Instant.fromUtc(seconds * 1000, leap);
      this.lastSeconds = seconds;
      this.lastLeap = leap;
    }
    return this.lastInstant!;
  }

  bindAnchor(anchor: AnchorHandle, frame: Frame): void {
    if (!("slot" in anchor)) {
      throw new Error(`bindAnchor: ${String(anchor)} is not an anchor.`);
    }
    // Throws, naming it, for a reference frame outside the catalog's tree.
    this.catalog.use(frame, "application");
    if (this.bindings.get(anchor) === frame) {
      return;
    }
    this.bindings.set(anchor, frame);
    for (const listener of this.watchers) {
      listener();
    }
  }

  binding(anchor: AnchorHandle): Frame | undefined {
    return this.bound(anchor);
  }

  watch(listener: () => void): () => void {
    const off = this.catalog.events.on("change", listener);
    this.watchers.add(listener);
    return () => {
      off();
      this.watchers.delete(listener);
    };
  }

  resolve(
    frame: FrameKey,
    base: FrameKey,
    seconds: number,
    out: Float64Array,
  ): Float64Array {
    if (frame === base) {
      return m4.identity(out);
    }
    const a = this.reference(frame, this.localA);
    const aLocal = this.hasLocal;
    const b = this.reference(base, this.localB);
    const bLocal = this.hasLocal;
    this.scaled = false;
    if (a === b && !aLocal && !bLocal) {
      // Both ends in one reference frame (an Earth anchor under an ITRF
      // rig, or two unbound ends): the identity, with no instant and no
      // route walked, so a globe-only tick allocates nothing.
      return m4.identity(out);
    }
    if (a && b) {
      if (this.crossesWarp(a, b)) {
        throw new NonRigidRouteError(frame.name, base.name);
      }
      this.askPrecise(a, b);
      this.compose(a, b, this.instant(seconds), out);
    } else {
      // An unbound end sits at the other's origin, in its axes (call 29).
      m4.identity(out);
    }
    if (aLocal) {
      m4.multiply(out, out, this.localA);
    }
    if (bLocal) {
      m4.invertAffine(this.localB, this.localB);
      m4.multiply(out, this.localB, out);
    }
    return this.scaled ? this.rigid(out) : out;
  }

  /**
   * The route from `frame` to `base`: one rigid step (`resolve`'s matrix)
   * when it crosses no warp; else its rigid runs, each composed as
   * `resolve` composes them (an anchor's node-relative matrix folded into
   * the first and last), and a warp step for each warp edge, `inverse` where
   * the route goes from the warp's `to` back to its `from`.
   */
  route(frame: FrameKey, base: FrameKey, seconds: number): Route {
    const a = this.reference(frame, this.localA);
    const aLocal = this.hasLocal ? this.localA.slice() : undefined;
    const b = this.reference(base, this.localB);
    const bLocal = this.hasLocal ? this.localB.slice() : undefined;
    if (!a || !b || !this.crossesWarp(a, b)) {
      return {
        frame,
        base,
        seconds,
        steps: [
          {
            kind: "rigid",
            matrix: this.resolve(frame, base, seconds, new Float64Array(16)),
          },
        ],
        presentation: false,
        revision: this.routeRevision(frame, base),
      };
    }
    this.askPrecise(a, b);
    const instant = this.instant(seconds);
    const steps: RouteStep[] = [];
    let presentation = false;
    if (aLocal) {
      steps.push({ kind: "rigid", matrix: aLocal });
    }
    for (const leg of this.legs(a, b)) {
      if (leg.kind === "warp") {
        steps.push({
          kind: "warp",
          warp: leg.frame.warp,
          inverse: leg.inverse,
        });
        presentation ||= leg.frame.warp.presentation;
      } else {
        const m = new Float64Array(16);
        this.scaled = false;
        this.compose(leg.from, leg.to, instant, m);
        pushRigid(steps, this.scaled ? this.rigid(m) : m);
      }
    }
    if (bLocal) {
      pushRigid(steps, m4.invertAffine(bLocal, bLocal));
    }
    return {
      frame,
      base,
      seconds,
      steps,
      presentation,
      revision: this.routeRevision(frame, base),
    };
  }

  /**
   * A counter per route that goes up whenever anything the route is made
   * of changes: which reference frames its ends are bound to, any revision
   * along it, or a node's matrix. Not a sum, so a change of binding can't
   * cancel a change of revisions.
   */
  routeRevision(frame: FrameKey, base: FrameKey): number {
    if (frame === base) {
      return 0;
    }
    const a = this.reference(frame, undefined);
    const b = this.reference(base, undefined);
    let frames = 0;
    if (a && b) {
      this.askPrecise(a, b);
      this.hookWarps(a, b);
      frames = routeRevision(a, b);
    }
    let nodes = 0;
    if (isNode(frame)) {
      nodes += (frame as TransformFrameKey).world.transformRevision;
    }
    if (isNode(base)) {
      nodes += (base as TransformFrameKey).world.transformRevision;
    }
    let byBase = this.routes.get(frame);
    if (!byBase) {
      byBase = new Map();
      this.routes.set(frame, byBase);
    }
    const record = byBase.get(base);
    if (!record) {
      byBase.set(base, { a, b, frames, nodes, revision: 0 });
      return 0;
    }
    if (
      record.a !== a ||
      record.b !== b ||
      record.frames !== frames ||
      record.nodes !== nodes
    ) {
      record.a = a;
      record.b = b;
      record.frames = frames;
      record.nodes = nodes;
      record.revision++;
    }
    return record.revision;
  }

  accuracy(
    point: ArrayLike<number>,
    frame: FrameKey,
    base: FrameKey,
    seconds: number,
  ): { readonly meters: number | undefined; readonly note: string } {
    const a = this.reference(frame, this.localA);
    const aLocal = this.hasLocal;
    const b = this.reference(base, this.localB);
    if (!a || !b) {
      return {
        meters: 0,
        note: "an end bound to no reference frame sits at the other's origin: exact by definition",
      };
    }
    // A node under an anchor: its place in the anchor's frame first.
    const x = point[0]!;
    const y = point[1]!;
    const z = point[2]!;
    const l = this.localA;
    const p = aLocal
      ? [
          l[0]! * x + l[4]! * y + l[8]! * z + l[12]!,
          l[1]! * x + l[5]! * y + l[9]! * z + l[13]!,
          l[2]! * x + l[6]! * y + l[10]! * z + l[14]!,
        ]
      : [x, y, z];
    const instant = this.instant(seconds);
    if (this.crossesWarp(a, b)) {
      return this.warpAccuracy(p, a, b, instant);
    }
    const result = pointAccuracy(framePoint(a, p, instant), b, instant);
    return {
      meters: result.meters,
      note:
        result.meters === undefined
          ? `not bounded: ${result.unboundedBy ?? result.refusedBy ?? result.simulatedBy ?? "a route term"} states no accuracy the route can use`
          : `route ${a.name} to ${b.name}: ${result.terms
              .filter((t) => t.meters !== undefined && t.meters > 0)
              .map(
                (t) =>
                  `${t.frame}${"estimated" in t && t.estimated ? " (estimated)" : ""} ±${t.meters!.toPrecision(3)} m`,
              )
              .join(", ")}; ${result.combination}`,
    };
  }

  motion(
    frame: FrameKey,
    base: FrameKey,
    seconds: number,
    out: FrameMotion,
  ): FrameMotion {
    const p = this.resolve(frame, base, seconds + 0.5, this.plus);
    const m = this.resolve(frame, base, seconds - 0.5, this.minus);
    for (let i = 0; i < 3; i++) {
      out.velocity[i] = p[12 + i]! - m[12 + i]!;
    }
    // The turn over the second, in the base's axes: Rp · Rmᵀ.
    const d = this.rotation;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let sum = 0;
        for (let k = 0; k < 3; k++) {
          sum += p[k * 4 + i]! * m[k * 4 + j]!;
        }
        d[i * 3 + j] = sum;
      }
    }
    const x = (d[7]! - d[5]!) / 2;
    const y = (d[2]! - d[6]!) / 2;
    const z = (d[3]! - d[1]!) / 2;
    const sine = Math.hypot(x, y, z);
    const angle = Math.atan2(sine, (d[0]! + d[4]! + d[8]! - 1) / 2);
    const scale = sine > 0 ? angle / sine : 1;
    out.angularVelocity[0] = x * scale;
    out.angularVelocity[1] = y * scale;
    out.angularVelocity[2] = z * scale;
    return out;
  }

  /**
   * The reference frame `key` is in, or undefined for the table root, an
   * unbound anchor and a node under either. A node's anchor-relative
   * matrix goes to `local` (when given), and `hasLocal` says so.
   */
  private reference(
    key: FrameKey,
    local: Float64Array<ArrayBuffer> | undefined,
  ): Frame | undefined {
    this.hasLocal = false;
    if (key instanceof Frame) {
      if (!this.rigFrames.has(key)) {
        // Throws, naming it, for a reference frame outside the catalog's tree.
        this.catalog.use(key, "rig");
        this.rigFrames.add(key);
      }
      return key;
    }
    if ("slot" in key) {
      return this.bound(key as AnchorHandle);
    }
    if (isNode(key)) {
      const node = key as TransformFrameKey;
      if (!node.world.transformAlive(node.transform)) {
        throw new Error(
          `frames resolver: the transform for ${key.name} was removed.`,
        );
      }
      if (local) {
        node.world.worldMatrix(node.transform, local);
        this.hasLocal = true;
      }
      const anchor = node.world.anchorOf(node.transform);
      return anchor ? this.bound(anchor) : undefined;
    }
    return undefined;
  }

  private bound(anchor: AnchorHandle): Frame | undefined {
    let frame = this.bindings.get(anchor);
    if (!frame && anchor.body) {
      frame = this.catalog.bodyFixed(anchor.body);
      this.catalog.use(frame, "application");
      this.bindings.set(anchor, frame);
    }
    return frame;
  }

  /** At "precise", asks it of every catalog edge on the route from `a` to `b`. */
  private askPrecise(a: Frame, b: Frame): void {
    if (this.precision !== "precise") {
      return;
    }
    const top = commonAncestor(a, b);
    for (const start of [a, b]) {
      for (let f: Frame = start; f !== top; f = f.parent!) {
        if (!this.asked.has(f)) {
          this.asked.add(f);
          if (this.catalogName(f) !== undefined) {
            this.catalog.get(f.name as CatalogFrameName, {
              precision: "precise",
            });
          }
        }
      }
    }
  }

  /** `f`'s name if it is one of the catalog's own reference frames. */
  private catalogName(f: Frame): CatalogFrameName | undefined {
    const name = f.name as CatalogFrameName;
    return this.catalog.names.includes(name) && this.catalog.get(name) === f
      ? name
      : undefined;
  }

  /** `f`'s name if it is one of the catalog's reference frames with a stand-in. */
  private standInName(f: Frame): StandInName | undefined {
    let name = this.standInNames.get(f);
    if (name === undefined) {
      const n = this.catalogName(f);
      name =
        n !== undefined && n in ANALYTIC_ACCURACY ? (n as StandInName) : null;
      this.standInNames.set(f, name);
    }
    return name ?? undefined;
  }

  /** Whether the route from `a` to `b` crosses a warp edge. */
  private crossesWarp(a: Frame, b: Frame): boolean {
    const top = commonAncestor(a, b);
    for (const start of [a, b]) {
      for (let f = start; f !== top; f = f.parent!) {
        if (isWarpFrame(f)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * The route from `a` to `b` as legs in order: runs of tree edges (from
   * one frame to another, composable by `compose`) and warp edges.
   */
  private legs(a: Frame, b: Frame): Leg[] {
    const top = commonAncestor(a, b);
    const legs: Leg[] = [];
    let start = a;
    for (let f = a; f !== top; f = f.parent!) {
      if (isWarpFrame(f)) {
        if (start !== f) {
          legs.push({ kind: "tree", from: start, to: f });
        }
        legs.push({ kind: "warp", frame: f, inverse: true });
        start = f.parent!;
      }
    }
    const down: Frame[] = [];
    for (let f = b; f !== top; f = f.parent!) {
      down.push(f);
    }
    for (let i = down.length - 1; i >= 0; i--) {
      const f = down[i]!;
      if (isWarpFrame(f)) {
        if (start !== f.parent) {
          legs.push({ kind: "tree", from: start, to: f.parent! });
        }
        legs.push({ kind: "warp", frame: f, inverse: false });
        start = f;
      }
    }
    if (start !== b) {
      legs.push({ kind: "tree", from: start, to: b });
    }
    return legs;
  }

  /** Makes the warp frames on the route from `a` to `b` wake the watchers when they change. */
  private hookWarps(a: Frame, b: Frame): void {
    const top = commonAncestor(a, b);
    for (const start of [a, b]) {
      for (let f = start; f !== top; f = f.parent!) {
        if (isWarpFrame(f) && !this.hooked.has(f)) {
          this.hooked.add(f);
          f.onChange(() => {
            for (const listener of this.watchers) {
              listener();
            }
          });
        }
      }
    }
  }

  /**
   * `accuracy` over a route that crosses warps: each rigid run through the
   * frames' composition, each warp by its `accuracy.sigma`, the point
   * carried through the route to place each term; the 1σ terms add in
   * quadrature. A warp stating only a `bound` is not stated (a bound is
   * not a σ).
   */
  private warpAccuracy(
    p: number[],
    a: Frame,
    b: Frame,
    instant: Instant,
  ): { readonly meters: number | undefined; readonly note: string } {
    const at = Float64Array.from(p);
    const terms: string[] = [];
    let squares = 0;
    let unstated: string | undefined;
    const m = new Float64Array(16);
    for (const leg of this.legs(a, b)) {
      if (leg.kind === "warp") {
        const w = leg.frame.warp;
        const label = w.description ?? `${w.from.name} to ${w.to.name}`;
        const { sigma, bound } = w.accuracy ?? {};
        if (sigma !== undefined) {
          squares += sigma * sigma;
          terms.push(
            `${label} ±${sigma.toPrecision(3)} m${bound !== undefined ? ` (worst case ${bound} m)` : ""}`,
          );
        } else if (bound !== undefined) {
          unstated ??= `${label} states only a worst-case bound of ${bound} m, not a 1σ`;
        }
        if (leg.inverse) {
          warpInverse(w, at, at);
        } else {
          warpForward(w, at.slice(), at);
        }
        continue;
      }
      const result = pointAccuracy(
        framePoint(leg.from, at, instant),
        leg.to,
        instant,
      );
      if (result.meters === undefined) {
        unstated ??= `${result.unboundedBy ?? result.refusedBy ?? result.simulatedBy ?? "a route term"} states no accuracy the route can use`;
      } else {
        squares += result.meters * result.meters;
        terms.push(
          `${leg.from.name} to ${leg.to.name} ±${result.meters.toPrecision(3)} m`,
        );
      }
      this.scaled = false;
      this.compose(leg.from, leg.to, instant, m);
      if (this.scaled) {
        this.rigid(m);
      }
      const x = at[0]!;
      const y = at[1]!;
      const z = at[2]!;
      at[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
      at[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
      at[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
    }
    if (unstated !== undefined) {
      return { meters: undefined, note: `not bounded: ${unstated}` };
    }
    return {
      meters: Math.sqrt(squares),
      note: `route ${a.name} to ${b.name} through a warp: ${terms.length > 0 ? terms.join(", ") : "every term exact"}; root-sum-square of independent 1σ terms`,
    };
  }

  /** `out`, p_to = out · p_from, composed as `frameTransform` does, edge by edge. */
  private compose(
    from: Frame,
    to: Frame,
    instant: Instant,
    out: Float64Array,
  ): void {
    const top = commonAncestor(from, to);
    this.toAncestor(from, top, instant, this.up);
    this.toAncestor(to, top, instant, this.down);
    m4.invertAffine(this.inverse, this.down);
    m4.multiply(out, this.inverse, this.up);
  }

  private toAncestor(
    frame: Frame,
    ancestor: Frame,
    instant: Instant,
    acc: Float64Array,
  ): void {
    m4.identity(acc);
    for (let f = frame; f !== ancestor; f = f.parent!) {
      this.edge(f, instant, this.step);
      m4.multiply(acc, this.step, acc);
    }
  }

  /**
   * `f`'s edge at `instant`; for a catalog reference frame outside its
   * data, its analytic stand-in, warned about once per episode. Found
   * outside at an instant, it isn't asked again at that instant.
   */
  private edge(f: Frame, instant: Instant, out: Float64Array): void {
    const memo = this.outside.get(f);
    if (memo && memo.tt === instant.tt && memo.revision === f.revision) {
      this.standInEdge(memo.name, instant, out);
      return;
    }
    try {
      f.toParent(instant, out);
    } catch (error) {
      const name =
        error instanceof FrameUnavailableError && error.reason === "outsideData"
          ? this.standInName(f)
          : undefined;
      if (name === undefined) {
        throw error;
      }
      this.standInEdge(name, instant, out);
      this.outside.set(f, { tt: instant.tt, revision: f.revision, name });
      this.warnStandIn(name, instant, error as FrameUnavailableError);
      return;
    }
    const name = this.standInName(f);
    if (name !== undefined) {
      // Inside its data: any stand-in episode of it is over.
      this.warned.delete(name);
      if (name === "GCRF" && this.catalog.precisionOf("GCRF") === "precise") {
        this.scaled = true;
      }
    }
  }

  private standInEdge(
    name: StandInName,
    instant: Instant,
    out: Float64Array,
  ): void {
    this.standIns ??= analyticEdges(() => this.catalog.leapSeconds);
    this.standIns[name](instant, out);
  }

  private warnStandIn(
    name: StandInName,
    instant: Instant,
    cause: FrameUnavailableError,
  ): void {
    if (this.warned.has(name)) {
      return;
    }
    this.warned.add(name);
    const accuracy = ANALYTIC_ACCURACY[name];
    const at = new Date(instant.toUtc(this.catalog.leapSeconds)).toISOString();
    const warning: FrameStandInWarning = {
      kind: "standIn",
      frame: name,
      accuracy,
      message: `frames: ${name} is drawn on its analytic stand-in from ${at} on, outside its data (${cause.message}); measurements there still throw. The stand-in's accuracy: ${accuracy.note}`,
    };
    this.warningList.push(warning);
    try {
      if (this.events.has("warning")) {
        this.events.emit("warning", warning);
      } else {
        console.warn(warning.message);
      }
    } catch (error) {
      // A listener that throws must not stop the tick.
      console.warn(
        `frames resolver: a warning listener threw: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * A placement must be rigid. GCRF's precise edge scales (IERS eq. 11.19),
   * so a route through it is made rigid by its polar rotation, keeping its
   * translation. Only such routes: any other edge's error, and anything
   * further from rigid, is left for the camera layer to refuse.
   */
  private rigid(out: Float64Array): Float64Array {
    if (
      rigidMatrixError(out) === undefined ||
      rigidMatrixError(out, NEARLY_RIGID) !== undefined
    ) {
      return out;
    }
    const r = rotationPart(out, this.rotation);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        out[col * 4 + row] = r[row * 3 + col]!;
      }
    }
    return out;
  }
}

/** Whether `key` names a transform node (`World.frameOf`). */
function isNode(key: FrameKey): boolean {
  return "transform" in key && "world" in key;
}

/** A run of a route: tree edges from one frame to another, or one warp edge. */
type Leg =
  | { kind: "tree"; from: Frame; to: Frame }
  | { kind: "warp"; frame: WarpFrame; inverse: boolean };

/** Adds a rigid step, composed into the last when that is rigid too. */
function pushRigid(steps: RouteStep[], m: Float64Array): void {
  const last = steps[steps.length - 1];
  if (last?.kind === "rigid") {
    steps[steps.length - 1] = {
      kind: "rigid",
      matrix: m4.multiply(new Float64Array(16), m, last.matrix),
    };
  } else {
    steps.push({ kind: "rigid", matrix: m });
  }
}

/** How many ancestors `f` has. */
function depth(f: Frame): number {
  let d = 0;
  for (let p = f.parent; p; p = p.parent) {
    d++;
  }
  return d;
}

/** The lowest common ancestor of two reference frames; throws across trees. */
function commonAncestor(from: Frame, to: Frame): Frame {
  let a = from;
  let b = to;
  let da = depth(a);
  let db = depth(b);
  for (; da > db; da--) {
    a = a.parent!;
  }
  for (; db > da; db--) {
    b = b.parent!;
  }
  while (a !== b) {
    if (!a.parent || !b.parent) {
      throw new Error(
        `frames resolver: no common ancestor of "${from.name}" and "${to.name}"`,
      );
    }
    a = a.parent;
    b = b.parent;
  }
  return a;
}

/**
 * The camera layer's frame resolver over `catalog` (spec section 7.2):
 * `Engine.cameras.setResolver(world, createFramesResolver(catalog))`.
 *
 * - Keys: the catalog's reference frames (and those added to it); anchors,
 *   at the reference frame they are bound to (`bindAnchor`; a body's
 *   anchor binds itself to its body-fixed reference frame); a transform
 *   node (`World.frameOf`), at its anchor's reference frame times its
 *   anchor-relative matrix. The table root, an unbound anchor and nodes
 *   under them sit at the render root's origin, in its axes (plan 5a's
 *   call 29): a route with an unbound end is the identity between the
 *   ends' reference frames.
 * - Times: scene seconds, through the catalog's leap seconds (`instant`).
 * - Revisions: a counter per route, raised when its ends' bindings, the
 *   bound reference frames' `routeRevision` or (through a node) its world's
 *   `transformRevision` change. `watch` hears the
 *   catalog's changes (data arriving), so the camera layer wakes for them.
 *   An application's own reference frame whose data arrives says so with
 *   `invalidate()`, and wakes the engine itself.
 * - Rendering falls back where measuring throws: a catalog reference frame
 *   running at "precise" at an instant outside its data is drawn on its
 *   analytic stand-in, warned about once per episode (`warnings`, the
 *   `warning` event, else `console.warn`), stating the stand-in's
 *   accuracy; `frameTransform` there still throws `FrameUnavailableError`.
 *   A reference frame with no stand-in throws, and the camera layer keeps
 *   the view's last good placement.
 * - Placements are rigid. A route through GCRF's precise edge, which
 *   scales by about 2.5 × 10⁻⁸ and shears by about 5 × 10⁻⁹ (IERS eq.
 *   11.19), is made rigid by its polar rotation, keeping its translation:
 *   the scale and shear are dropped, so content moves by about 2 × 10⁻⁸ of
 *   its distance from its anchor's origin (about 13 cm at the Earth's
 *   surface under a Moon-rooted rig). No other route is changed: an edge
 *   that isn't rigid reaches the camera layer, which refuses it.
 * - The reference frames named directly (a rig's) are marked as used by
 *   `"rig"`; anchors' bindings as used by the application.
 * - A warp frame (`warpFrame`) is a non-rigid edge. `route` carries it as
 *   a warp step; `resolve` and `motion` across it throw
 *   `NonRigidRouteError`; a route not crossing it is as it was. Its
 *   `revision` counts in `routeRevision`; `watch` hears `catalog.add` of
 *   it and its `invalidate()`. `accuracy` adds its `accuracy.sigma` in
 *   quadrature; one stating only a `bound` leaves `meters` undefined.
 */
export function createFramesResolver(
  catalog: FrameCatalog,
  options: FramesResolverOptions = {},
): FramesResolver {
  return new Resolver(catalog, options.precision ?? "analytic");
}
