// The catalog of reference frames (spec section 7.7): the built-in tree,
// built on demand. Each reference frame runs at the highest precision anyone
// asked for. "analytic" is today's analytic sky (src/frames/analytic.ts) and
// loads nothing. "precise" loads its provider by dynamic `import()` and its
// data by role (`loadFrameRoles`); meanwhile the reference frame runs on its
// stand-in, stating the stand-in's accuracy, and its revision goes up when
// the data arrives. The providers own the edges of plan 5a's ruling 1: Earth
// orientation owns ITRF's; the ephemeris owns GCRF, EARTH_ICRF, HCRS,
// MOON_ICRF and MOON_ME. EME2000 and MOON_PA are constant and built in.
import { FrameUnavailableError } from "../camera/frameResolver.ts";
import { Emitter } from "../core/Emitter.ts";
import type {
  FrameData,
  FrameDataLoadOptions,
  FrameDataWarning,
} from "../ephemeris/loadFrameData.ts";
import type { LoadProgress } from "../io/readWithProgress.ts";
import { EARTH, MOON, type Body } from "../scene/Body.ts";
import { LeapSeconds } from "../time/leapSeconds.ts";
import {
  ANALYTIC_ACCURACY,
  EME2000_TO_PARENT,
  MOON_PA_TO_PARENT,
  analyticEdges,
  type StandInName,
} from "./analytic.ts";
import type { Instant } from "../time/Instant.ts";
import type { FrameEdge, PreciseEdge } from "./edges.ts";
import { Frame } from "./Frame.ts";
import { BUILT_IN_ACCURACY } from "./frameAccuracy.ts";
import type { Frames } from "./frames.ts";
import type { EarthOrientation } from "./providers/earthOrientation.ts";
import type { EphemerisFrames } from "./providers/ephemeris.ts";

/** The built-in reference frames the catalog knows by name. */
export type CatalogFrameName =
  | "ICRF"
  | "HCRS"
  | "GCRF"
  | "EARTH_ICRF"
  | "EME2000"
  | "MOON_ICRF"
  | "ITRF"
  | "MOON_ME"
  | "MOON_PA";

/**
 * How precise a reference frame's edge is: `"analytic"`, the analytic
 * stand-ins (no data); `"precise"`, DE440, the lunar PCK, IAU 2006/2000A and
 * the EOP (plan 5a's call 11).
 */
export type Precision = "analytic" | "precise";

/** Who uses a reference frame, for the tree in use. */
export type FrameUser = "application" | "sky" | "rig" | "measurement";

/** Where a catalog's precise data comes from, and how it loads. */
export interface FrameCatalogOptions {
  /**
   * A frames store's URL (`npm run setup` fills it; the default
   * `"/frames-data/"`), or frame data already loaded.
   */
  data?: string | FrameData;
  /** Aborting cancels every load; the reference frames keep their stand-ins. */
  signal?: AbortSignal;
  /** Called as each data file arrives (`loadFrameRoles`). */
  onProgress?: LoadProgress;
}

/** One reference frame of the tree in use. */
export interface FrameInUse {
  readonly frame: Frame;
  /**
   * Its parent: `frame.parent`, or with `treeInUse(at)` the one `at` gives
   * (`parentAt`: a piecewise reference frame's current piece's).
   */
  readonly parent: Frame | undefined;
  /** Who uses it directly; empty for an ancestor only. */
  readonly users: readonly FrameUser[];
  /**
   * What its edge runs at now. A constant or an application's reference
   * frame is `"precise"`.
   */
  readonly precision: Precision;
  /**
   * Whether it was asked for `"precise"` and runs on its analytic stand-in
   * meanwhile (its data is loading, or failed to load).
   */
  readonly standIn: boolean;
}

/** The catalog of reference frames; see `createFrameCatalog`. */
export interface FrameCatalog {
  /** Every built-in reference frame's name. Builds and loads nothing. */
  readonly names: readonly CatalogFrameName[];
  /**
   * The reference frame `name`, built (with its ancestors) on first ask.
   * It runs at the highest precision anyone has asked for (default
   * `"analytic"`). Asking `"precise"` starts its provider's load; while it
   * loads, the reference frame runs on its analytic stand-in, stating the
   * stand-in's accuracy, and its `revision` goes up when the data arrives.
   * At `"precise"`, an instant outside the data throws
   * `FrameUnavailableError` (`reason: "outsideData"`). `user` marks it as
   * used, for `treeInUse`.
   */
  get(
    name: CatalogFrameName,
    options?: { precision?: Precision; user?: FrameUser },
  ): Frame;
  /** What `name` runs at now. */
  precisionOf(name: CatalogFrameName): Precision;
  /**
   * Resolves once `name` runs at `precision`, asking for it. Rejects with a
   * `FrameUnavailableError` (`reason: "failed"`) when its data failed to
   * load, and with the signal's reason when `options.signal` (or the
   * catalog's) aborts.
   */
  ready(
    name: CatalogFrameName,
    precision: Precision,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
  /**
   * An application's reference frame (an engineering frame, a trajectory's),
   * used by `user` (default `"application"`). It must descend from this
   * catalog's ICRF and not take a built-in reference frame's name. It has
   * no stand-in: while its own data loads its edge throws
   * `FrameUnavailableError`.
   */
  add(frame: Frame, user?: FrameUser): void;
  /** Marks `frame` (a catalog or added reference frame) as used by `user`. */
  use(frame: Frame, user: FrameUser): void;
  /**
   * The reference frames in use and their ancestors, root first (each
   * reference frame before its children). The root stays ICRF.
   */
  treeInUse(at?: Instant): readonly FrameInUse[];
  /** The reference frame fixed to `body` (ITRF, MOON_ME); throws, naming it, for any other. */
  bodyFixed(body: Body): Frame;
  /** The body whose fixed reference frame `frame` is or descends from. */
  bodyOf(frame: Frame): Body | undefined;
  /**
   * Every built-in reference frame at `"precise"`, as `createFrames` returns
   * them: the catalog's own reference frames, so a trajectory made on it
   * hangs in this tree. Rejects when a load fails.
   */
  tree(): Promise<Frames>;
  /** The store's leap-second table once loaded (if newer), else the built-in one. */
  readonly leapSeconds: LeapSeconds;
  /** Staleness notices and failed loads, in order. */
  readonly warnings: readonly FrameDataWarning[];
  /**
   * `change`: a reference frame's data arrived; `warning`: a notice;
   * `progress`: bytes of a data file arrived (`FrameCatalogOptions.onProgress`
   * as an event, for a catalog someone else made, such as the Viewer's). A
   * listener must attach before the first load starts: without one (or an
   * `onProgress`), loads don't report progress at all.
   */
  readonly events: Emitter<{
    change: FrameCatalog;
    warning: FrameDataWarning;
    progress: FrameLoadProgress;
  }>;
}

/** Bytes of one data file received (`FrameCatalog.events`' `progress`). */
export interface FrameLoadProgress {
  /** The file's name. */
  readonly item: string;
  readonly received: number;
  /** The response's `Content-Length`, when it has one. */
  readonly total: number | undefined;
}

const NAMES: readonly CatalogFrameName[] = Object.freeze([
  "ICRF",
  "HCRS",
  "GCRF",
  "EARTH_ICRF",
  "EME2000",
  "MOON_ICRF",
  "ITRF",
  "MOON_ME",
  "MOON_PA",
]);

const PARENT: Readonly<
  Record<Exclude<CatalogFrameName, "ICRF">, CatalogFrameName>
> = {
  HCRS: "ICRF",
  GCRF: "ICRF",
  EARTH_ICRF: "ICRF",
  EME2000: "EARTH_ICRF",
  MOON_ICRF: "ICRF",
  ITRF: "GCRF",
  MOON_ME: "MOON_ICRF",
  MOON_PA: "MOON_ME",
};

type ProviderName = "earthOrientation" | "ephemeris";

/** Who provides each stand-in reference frame's precise edge (ruling 1). */
const PROVIDER: Readonly<Record<StandInName, ProviderName>> = {
  ITRF: "earthOrientation",
  GCRF: "ephemeris",
  EARTH_ICRF: "ephemeris",
  HCRS: "ephemeris",
  MOON_ICRF: "ephemeris",
  MOON_ME: "ephemeris",
};

const WHAT: Readonly<Record<ProviderName, string>> = {
  earthOrientation: "Earth orientation data (EOP and leap seconds)",
  ephemeris: "ephemeris (planets and Moon packs)",
};

const hasStandIn = (name: CatalogFrameName): name is StandInName =>
  name in PROVIDER;

interface Entry {
  readonly name: CatalogFrameName;
  readonly frame: Frame;
  asked: Precision;
  running: Precision;
  /** The precise edge, once it runs on it. */
  precise: PreciseEdge | undefined;
}

interface Load {
  readonly done: Promise<void>;
  edges?: Partial<Record<StandInName, PreciseEdge>>;
  failure?: unknown;
  failed: boolean;
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** `promise`, or the signal's reason as soon as it aborts. */
function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

class Catalog implements FrameCatalog {
  readonly names = NAMES;
  readonly events = new Emitter<{
    change: FrameCatalog;
    warning: FrameDataWarning;
    progress: FrameLoadProgress;
  }>();
  private leap: LeapSeconds;
  private readonly warningList: FrameDataWarning[];
  private readonly source: string | FrameData;
  private readonly signal: AbortSignal | undefined;
  private readonly onProgress: LoadProgress | undefined;
  private readonly standIns: Readonly<Record<StandInName, FrameEdge>>;
  private readonly entries = new Map<CatalogFrameName, Entry>();
  private readonly loads = new Map<ProviderName, Load>();
  /** Each used reference frame's users, in first-use order. */
  private readonly users = new Map<Frame, Set<FrameUser>>();
  private earthOrientation: EarthOrientation | undefined;
  private ephemeris: EphemerisFrames | undefined;
  private frames: Frames | undefined;

  constructor(options: FrameCatalogOptions) {
    this.source = options.data ?? "/frames-data/";
    this.signal = options.signal;
    this.onProgress = options.onProgress;
    const given = typeof this.source === "object" ? this.source : undefined;
    this.leap = given?.leapSeconds ?? LeapSeconds.builtIn();
    // A given FrameData's notices were already logged by its loader.
    this.warningList = given ? [...given.warnings] : [];
    this.standIns = analyticEdges(() => this.leap);
  }

  get leapSeconds(): LeapSeconds {
    return this.leap;
  }

  get warnings(): readonly FrameDataWarning[] {
    return this.warningList;
  }

  get(
    name: CatalogFrameName,
    options: { precision?: Precision; user?: FrameUser } = {},
  ): Frame {
    const entry = this.entry(name);
    if (options.precision === "precise") {
      this.askPrecise(entry);
    }
    if (options.user !== undefined) {
      this.mark(entry.frame, options.user);
    }
    return entry.frame;
  }

  precisionOf(name: CatalogFrameName): Precision {
    return (
      this.entries.get(name)?.running ??
      (hasStandIn(name) ? "analytic" : "precise")
    );
  }

  async ready(
    name: CatalogFrameName,
    precision: Precision,
    options: { signal?: AbortSignal } = {},
  ): Promise<void> {
    options.signal?.throwIfAborted();
    const entry = this.entry(name);
    if (precision === "analytic" || entry.running === "precise") {
      return;
    }
    this.askPrecise(entry);
    if (this.precisionOf(name) === "precise") {
      return;
    }
    const load = this.loads.get(PROVIDER[name as StandInName])!;
    await abortable(load.done, options.signal);
    if (this.precisionOf(name) !== "precise") {
      if (this.signal?.aborted && load.failure === this.signal.reason) {
        throw this.signal.reason;
      }
      throw new FrameUnavailableError(
        name,
        "failed",
        `${name}: its precise data failed to load: ${messageOf(load.failure)}`,
        { cause: load.failure },
      );
    }
  }

  add(frame: Frame, user: FrameUser = "application"): void {
    const name = frame.name as CatalogFrameName;
    if (NAMES.includes(name) && this.entries.get(name)?.frame !== frame) {
      throw new Error(
        `FrameCatalog.add: "${frame.name}" is a built-in reference frame's name; give the application's reference frame another`,
      );
    }
    this.mark(frame, user);
  }

  use(frame: Frame, user: FrameUser): void {
    this.mark(frame, user);
  }

  treeInUse(at?: Instant): readonly FrameInUse[] {
    // `at` asks for each reference frame's parent then (a piecewise one's
    // current piece's); without it, the tree's own parent.
    const up = (f: Frame): Frame | undefined =>
      at === undefined ? f.parent : f.parentAt(at);
    // The used reference frames and their ancestors, each ranked: built-in
    // ones in catalog order, the rest in the order they were first seen.
    const rank = new Map<Frame, number>();
    for (const [frame, users] of this.users) {
      if (users.size === 0) {
        continue;
      }
      const chain: Frame[] = [];
      for (let f: Frame | undefined = frame; f; f = up(f)) {
        chain.push(f);
      }
      for (const f of chain.reverse()) {
        if (!rank.has(f)) {
          const builtIn = NAMES.indexOf(f.name as CatalogFrameName);
          const isBuiltIn =
            builtIn >= 0 && this.entries.get(NAMES[builtIn]!)?.frame === f;
          rank.set(f, isBuiltIn ? builtIn : NAMES.length + rank.size);
        }
      }
    }
    const children = new Map<Frame, Frame[]>();
    let root: Frame | undefined;
    for (const f of rank.keys()) {
      const parent = up(f);
      if (!parent) {
        root = f;
        continue;
      }
      const list = children.get(parent) ?? [];
      list.push(f);
      children.set(parent, list);
    }
    const out: FrameInUse[] = [];
    const visit = (f: Frame) => {
      const entry = this.entries.get(f.name as CatalogFrameName);
      const own = entry?.frame === f ? entry : undefined;
      out.push({
        frame: f,
        parent: up(f),
        users: [...(this.users.get(f) ?? [])],
        precision: own?.running ?? "precise",
        standIn:
          own !== undefined &&
          own.asked === "precise" &&
          own.running === "analytic",
      });
      const list = children.get(f) ?? [];
      list.sort((a, b) => rank.get(a)! - rank.get(b)!);
      list.forEach(visit);
    };
    if (root) {
      visit(root);
    }
    return out;
  }

  bodyFixed(body: Body): Frame {
    if (body.naifId === 399) {
      return this.get("ITRF");
    }
    if (body.naifId === 301) {
      return this.get("MOON_ME");
    }
    throw new Error(
      `frames: "${body.name}" has no fixed frame in the built-in tree (NAIF id ${body.naifId ?? "unset"})`,
    );
  }

  bodyOf(frame: Frame): Body | undefined {
    const itrf = this.entries.get("ITRF")?.frame;
    const moonMe = this.entries.get("MOON_ME")?.frame;
    for (let f: Frame | undefined = frame; f; f = f.parent) {
      if (f === itrf) {
        return EARTH;
      }
      if (f === moonMe) {
        return MOON;
      }
    }
    return undefined;
  }

  async tree(): Promise<Frames> {
    await Promise.all(NAMES.map((name) => this.ready(name, "precise")));
    return (this.frames ??= this.buildFrames());
  }

  private buildFrames(): Frames {
    const given = typeof this.source === "object" ? this.source : undefined;
    const eo = this.earthOrientation!;
    const data: FrameData = given ?? {
      leapSeconds: eo.leapSeconds,
      eop: eo.eop,
      ephemeris: this.ephemeris!.ephemeris,
      warnings: [...eo.warnings],
    };
    const frame = <N extends CatalogFrameName>(name: N) =>
      this.get(name) as Frame<N>;
    return {
      icrf: frame("ICRF"),
      hcrs: frame("HCRS"),
      gcrf: frame("GCRF"),
      earthIcrf: frame("EARTH_ICRF"),
      eme2000: frame("EME2000"),
      moonIcrf: frame("MOON_ICRF"),
      itrf: frame("ITRF"),
      moonMe: frame("MOON_ME"),
      moonPa: frame("MOON_PA"),
      bodyFixed: (body) => this.bodyFixed(body),
      bodyOf: (f) => this.bodyOf(f),
      data,
    };
  }

  /** The entry for `name`, built with its ancestors on first ask. */
  private entry(name: CatalogFrameName): Entry {
    const existing = this.entries.get(name);
    if (existing) {
      return existing;
    }
    let frame: Frame;
    if (name === "ICRF") {
      frame = Frame.root("ICRF");
    } else {
      const parent = this.entry(PARENT[name]).frame;
      if (name === "EME2000" || name === "MOON_PA") {
        frame = Frame.constant(
          name,
          parent,
          name === "EME2000" ? EME2000_TO_PARENT : MOON_PA_TO_PARENT,
          { accuracy: BUILT_IN_ACCURACY[name] },
        );
      } else {
        frame = this.standInFrame(name, parent);
      }
    }
    const entry: Entry = {
      name,
      frame,
      asked: "analytic",
      running: hasStandIn(name) ? "analytic" : "precise",
      precise: undefined,
    };
    this.entries.set(name, entry);
    return entry;
  }

  /**
   * A reference frame that runs on its stand-in until its precise edge is
   * set, then on that. At an instant its data doesn't cover (`covers`), it
   * throws `FrameUnavailableError`, `"outsideData"`, with the edge's own
   * message; any other error passes through unchanged.
   */
  private standInFrame(name: StandInName, parent: Frame): Frame {
    const standIn = this.standIns[name];
    const standInAccuracy = ANALYTIC_ACCURACY[name];
    const entry = () => this.entries.get(name)!;
    return new Frame(
      name,
      parent,
      (instant, out) => {
        const precise = entry().precise;
        if (!precise) {
          standIn(instant, out);
          return;
        }
        if (!precise.covers(instant)) {
          // The edge's own error says which data ends where.
          let cause: unknown;
          try {
            precise.toParent(instant, out);
          } catch (error) {
            cause = error;
          }
          throw new FrameUnavailableError(
            name,
            "outsideData",
            cause === undefined
              ? `${name}: the instant is outside its data`
              : messageOf(cause),
            { cause },
          );
        }
        // Anything else it throws (a FrameUnavailableError too) goes as is.
        precise.toParent(instant, out);
      },
      {
        accuracy: (instant) => {
          const a = entry().precise?.accuracy ?? standInAccuracy;
          return typeof a === "function" ? a(instant) : a;
        },
      },
    );
  }

  /** Raises `entry` to `"precise"`: at once if its provider has loaded, else starts the load. */
  private askPrecise(entry: Entry): void {
    if (entry.asked === "precise" || !hasStandIn(entry.name)) {
      return;
    }
    entry.asked = "precise";
    const load = this.load(PROVIDER[entry.name]);
    if (load.edges) {
      this.switchToPrecise(entry, load.edges);
      this.events.emit("change", this);
    }
  }

  private switchToPrecise(
    entry: Entry,
    edges: Partial<Record<StandInName, PreciseEdge>>,
  ): void {
    const edge = edges[entry.name as StandInName];
    if (!edge || entry.running === "precise") {
      return;
    }
    entry.precise = edge;
    entry.running = "precise";
    entry.frame.invalidate();
  }

  /** The provider's load, started on first call. */
  private load(provider: ProviderName): Load {
    let load = this.loads.get(provider);
    if (!load) {
      const state: Load = {
        failed: false,
        done: this.fetchProvider(provider).then(
          (edges) => this.loaded(provider, edges),
          (error: unknown) => this.failed(provider, error),
        ),
      };
      load = state;
      this.loads.set(provider, load);
    }
    return load;
  }

  private async fetchProvider(
    provider: ProviderName,
  ): Promise<Partial<Record<StandInName, PreciseEdge>>> {
    const options: FrameDataLoadOptions = {};
    if (this.signal) {
      options.signal = this.signal;
    }
    // Progress makes a load stream its body: only when someone listens
    // (a listener attaches before the first load starts).
    if (this.onProgress || this.events.has("progress")) {
      options.onProgress = (item, received, total) => {
        this.onProgress?.(item, received, total);
        if (this.events.has("progress")) {
          this.events.emit("progress", { item, received, total });
        }
      };
    }
    const source = this.source;
    if (provider === "earthOrientation") {
      const module = await import("./providers/earthOrientation.ts");
      const eo =
        typeof source === "string"
          ? await module.loadEarthOrientation(source, options)
          : module.earthOrientationFrom(source);
      this.earthOrientation = eo;
      if (eo.leapSeconds !== this.leap) {
        // UTC at an instant may move, and the stand-ins read UTC.
        this.leap = eo.leapSeconds;
        for (const entry of this.entries.values()) {
          if (entry.running === "analytic") {
            entry.frame.invalidate();
          }
        }
      }
      for (const warning of eo.warnings) {
        this.warn(warning);
      }
      return eo.edges;
    }
    const module = await import("./providers/ephemeris.ts");
    const ephemeris =
      typeof source === "string"
        ? await module.loadEphemeris(source, options)
        : module.ephemerisFrom(source.ephemeris);
    this.ephemeris = ephemeris;
    return ephemeris.edges;
  }

  private loaded(
    provider: ProviderName,
    edges: Partial<Record<StandInName, PreciseEdge>>,
  ): void {
    this.loads.get(provider)!.edges = edges;
    for (const entry of this.entries.values()) {
      if (entry.asked === "precise") {
        this.switchToPrecise(entry, edges);
      }
    }
    this.events.emit("change", this);
  }

  private failed(provider: ProviderName, error: unknown): void {
    const load = this.loads.get(provider)!;
    load.failed = true;
    load.failure = error;
    if (this.signal?.aborted && error === this.signal.reason) {
      return; // cancelled, not failed: nothing to warn about
    }
    const asked = [...this.entries.values()]
      .filter(
        (e) =>
          e.asked === "precise" &&
          hasStandIn(e.name) &&
          PROVIDER[e.name] === provider,
      )
      .map((e) => e.name);
    this.warn({
      kind: "loadFailed",
      frames: asked,
      message: `frames: ${asked.join(", ")} stay${asked.length === 1 ? "s" : ""} on the analytic stand-in${asked.length === 1 ? "" : "s"}: the ${WHAT[provider]} failed to load (${messageOf(error)})`,
    });
    this.events.emit("change", this);
  }

  private warn(warning: FrameDataWarning): void {
    this.warningList.push(warning);
    if (this.events.has("warning")) {
      this.events.emit("warning", warning);
    } else {
      console.warn(warning.message);
    }
  }

  private mark(frame: Frame, user: FrameUser): void {
    let root: Frame = frame;
    while (root.parent) {
      root = root.parent;
    }
    if (root !== this.entries.get("ICRF")?.frame) {
      throw new Error(
        `FrameCatalog: "${frame.name}" does not descend from this catalog's ICRF (its root is "${root.name}")`,
      );
    }
    let users = this.users.get(frame);
    if (!users) {
      users = new Set();
      this.users.set(frame, users);
    }
    if (!users.has(user)) {
      users.add(user);
      this.events.emit("change", this);
    }
  }
}

/**
 * A catalog of the built-in reference frames over `options.data` (a frames
 * store's URL, default `"/frames-data/"`, or loaded frame data). Nothing is
 * built or loaded until asked: the providers' modules load by dynamic
 * `import()`, each fetching only its roles.
 *
 * A failed load keeps the stand-ins and emits one `warning` (kind
 * `"loadFailed"`) naming the reference frames that asked and the cause; with
 * nothing listening, the warning goes to `console.warn`.
 */
export function createFrameCatalog(
  options: FrameCatalogOptions = {},
): FrameCatalog {
  return new Catalog(options);
}
