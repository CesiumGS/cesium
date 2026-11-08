import { Ellipsoid } from "../../../src/index.ts";
import type {
  CreditSource,
  Inspectable,
  PickInfo,
} from "../../../widgets/index.ts";
import type { EngineConfig, Pose } from "../schema.ts";
import {
  type Adapter,
  type RunSpec,
  cameraScript,
  DEPTH_COLORS,
  type DrawnTile,
  LegacyAdapter,
  NextAdapter,
  sunDirection,
  type TileTint,
} from "../suite.ts";

/**
 * The Explorer's engines (plan §16.9, Explore), outside React: one or two
 * adapters drawing a catalog scene, a frame loop that drives their
 * cameras (along the benchmark camera path, or free flight with linked
 * cameras), and the inspection settings (paused streaming, tile tints,
 * bounding volumes). The view renders the panes and controls, reads the
 * selection a few times a second, and attaches an inspector to each pane.
 *
 * It is for looking, not measuring, so 2.0 panes render on demand in their
 * engines' own loops and sleep when nothing changes. This loop only asks for
 * animation frames while it has work in each one (`needsFrames`): a camera
 * path playing, a 1.x pane (which renders only when called), or a camera to
 * copy between linked panes. Otherwise it looks a few times a second.
 */

export type TileColors = "plain" | "depth" | "difference";

export interface Snapshot {
  /** Tiles each pane draws now. */
  drawn: DrawnTile[][];
  /** Each pane's tiles it can't draw, and why (undefined: none). */
  undrawn: Array<{ tiles: number; reasons: string[] } | undefined>;
  /** Shared frame interval, ms. */
  interval: number;
  /** Camera of the leading pane: longitude, latitude (degrees), height (m). */
  camera?: [number, number, number];
}

/** Categorical slots 1 and 2, as in the reports (sRGB hex). */
export const PANE_COLORS = ["#3987e5", "#d95926"];
const linear = (hex: string) =>
  [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255) ** 2.2) as [
    number,
    number,
    number,
  ];
/** Selection difference: tiles both draw stay neutral gray. */
const SHARED = [0.45, 0.45, 0.45] as const;
/** How often an idle loop looks for what changed, and snapshots, ms. */
const SNAPSHOT_MS = 250;

interface Pane {
  config: EngineConfig;
  adapter: Adapter;
  /** Renders in its engine's own loop (`Adapter.startOnDemand`). */
  onDemand: boolean;
  cpu: number;
  gpu: number | undefined;
  /** Frames drawn (the inspector's frames per second). */
  frames: number;
}

export class ExplorerSession {
  mode: "path" | "free" = "path";
  speed = 1;
  /** The camera path is playing. */
  get playing(): boolean {
    return this.playing_;
  }
  set playing(on: boolean) {
    this.playing_ = on;
    this.look();
  }
  private playing_ = false;
  /** Free flight: the panes' cameras follow the one you touch. */
  get link(): boolean {
    return this.link_;
  }
  set link(on: boolean) {
    this.link_ = on;
    this.look();
  }
  private link_ = true;
  /** Place on the camera path, 0 to 1. */
  progress = 0;
  /** Called every frame while the path plays (for the slider). */
  onProgress?: (progress: number) => void;
  /** Called a few times a second with the selection and camera. */
  onSnapshot?: (snapshot: Snapshot) => void;

  private panes: Pane[] = [];
  private pose?: (progress: number) => Pose;
  /** Flights: the sun stays over the camera, as in the benchmark. */
  private sun?: (pose: Pose) => Float64Array;
  private duration = 15;
  private leader = 0;
  private generation = 0;
  private stopped = false;
  private frameRequest = 0;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private last = performance.now();
  private interval = 16.7;
  private lastSnapshot = 0;
  private paused = false;
  private colors: TileColors = "plain";
  private volumes = { bounding: false, content: false };
  /** Keys each pane drew at the last snapshot (selection difference). */
  private drawnKeys: Array<Set<string>> = [];

  /** Starts (or restarts) the frame loop; `destroy` stops it. */
  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.stopped = false;
    this.last = performance.now();
    this.look();
  }
  private running = false;

  /** The adapters of the panes now (tests, and only to read). */
  get adapters(): Adapter[] {
    return this.panes.map((p) => p.adapter);
  }

  /** While false, the loop looks a few times a second instead. */
  private needsFrames(): boolean {
    const panes = this.panes;
    return (
      (this.mode === "path" && this.playing_) ||
      panes.some((p) => !p.onDemand) ||
      (this.mode === "free" && this.link_ && panes.length > 1)
    );
  }

  /** Runs the loop's next pass now, not at the next idle look. */
  private look(): void {
    if (this.running) {
      this.cancelPass();
      this.frameRequest = requestAnimationFrame(this.tick);
    }
  }

  private cancelPass(): void {
    cancelAnimationFrame(this.frameRequest);
    clearTimeout(this.idleTimer);
    this.idleTimer = undefined;
  }

  private schedule(): void {
    if (this.needsFrames()) {
      this.frameRequest = requestAnimationFrame(this.tick);
    } else {
      this.idleTimer = setTimeout(
        () => this.tick(performance.now()),
        SNAPSHOT_MS,
      );
    }
  }

  /**
   * Builds the panes for `base` with these configurations, in these
   * elements. Resolves false when superseded by a later load or stopped.
   */
  async load(
    base: Omit<RunSpec, "config">,
    configs: EngineConfig[],
    elements: HTMLElement[],
    scenarioSeconds: number,
  ): Promise<boolean> {
    const mine = ++this.generation;
    this.destroyPanes();
    const spec = { ...base, config: configs[0]! } as RunSpec;
    const path = await cameraScript(spec);
    this.pose = path;
    this.duration = path.seconds ?? scenarioSeconds;
    this.sun =
      base.scene.camera.kind === "flight"
        ? (pose) => sunDirection(spec, pose)
        : undefined;
    const panes: Pane[] = [];
    try {
      for (const [i, config] of configs.entries()) {
        const adapter: Adapter =
          config.engine === "1.x" ? new LegacyAdapter() : new NextAdapter();
        const spec = { ...base, config } as RunSpec;
        await adapter.setup(elements[i]!, spec);
        if (mine !== this.generation || this.stopped) {
          adapter.destroy();
          for (const p of panes) {
            p.adapter.destroy();
          }
          return false;
        }
        adapter.setSun(sunDirection(spec, this.pose(0)));
        adapter.setCamera(this.pose(this.progress));
        adapter.startOnDemand?.();
        panes.push({
          config,
          adapter,
          onDemand: adapter.startOnDemand !== undefined,
          cpu: 0,
          gpu: undefined,
          frames: 0,
        });
      }
    } catch (e) {
      for (const p of panes) {
        p.adapter.destroy();
      }
      throw e;
    }
    this.panes = panes;
    this.leader = 0;
    this.drawnKeys = panes.map(() => new Set());
    this.setMode(this.mode);
    this.setPaused(this.paused);
    this.setTileColors(this.colors);
    this.setVolumes(this.volumes.bounding, this.volumes.content);
    this.look();
    return true;
  }

  /**
   * Pane `index` for the inspector: its engine's snapshot with the frame
   * timing measured here, the same way for both engines. It reads whichever
   * engine the pane holds now, so it outlives reloads.
   */
  inspectable(index: number, name: string, color: string): Inspectable {
    return {
      name,
      color,
      snapshot: () => {
        const pane = this.panes[index];
        if (!pane) {
          return { state: "loading" };
        }
        const s = pane.adapter.inspect();
        const camera = pane.adapter.getCamera();
        return {
          ...s,
          state: this.paused ? "paused" : s.state,
          frame: {
            cpuMs: pane.cpu,
            ...(pane.gpu !== undefined ? { gpuMs: pane.gpu } : {}),
            intervalMs: this.interval,
            rendering: pane.onDemand ? "on demand" : "continuous",
            framesRendered: pane.frames,
          },
          camera: [...camera.position, ...camera.direction],
        };
      },
    };
  }

  /**
   * What pane `index` must credit, for engines that leave credits to the
   * host (undefined: none loaded, or the engine draws its own).
   */
  credits(index: number): CreditSource | undefined {
    return this.panes[index]?.adapter.credits?.();
  }

  /** The feature under a point of pane `index` (CSS pixels). */
  pick(index: number, x: number, y: number): Promise<PickInfo | undefined> {
    return this.panes[index]?.adapter.pick(x, y) ?? Promise.resolve(undefined);
  }

  get paneCount(): number {
    return this.panes.length;
  }

  setMode(mode: "path" | "free"): void {
    this.mode = mode;
    if (mode === "free") {
      this.playing_ = false;
    }
    for (const p of this.panes) {
      p.adapter.setInteractive(mode === "free");
    }
    this.look();
  }

  /** The pane under the pointer leads linked cameras. */
  lead(index: number): void {
    this.leader = index;
  }

  setProgress(progress: number): void {
    this.progress = progress;
    this.look();
  }

  setPaused(on: boolean): void {
    this.paused = on;
    for (const p of this.panes) {
      p.adapter.setStreamingPaused(on);
    }
  }

  setTileColors(colors: TileColors): void {
    this.colors = colors;
    this.panes.forEach((p, i) => p.adapter.setTileTint(this.tintFor(i)));
  }

  setVolumes(bounding: boolean, content: boolean): void {
    this.volumes = { bounding, content };
    for (const p of this.panes) {
      p.adapter.setVolumes(bounding, content);
    }
  }

  private tintFor(index: number): TileTint | undefined {
    if (this.colors === "depth") {
      return (t) => DEPTH_COLORS[t.depth % DEPTH_COLORS.length];
    }
    if (this.colors === "difference" && this.panes.length > 1) {
      const own = linear(PANE_COLORS[index]!);
      // Read at tint time: the other pane's keys refresh each snapshot.
      return (t) =>
        this.drawnKeys.some((keys, i) => i !== index && keys.has(t.key))
          ? SHARED
          : own;
    }
    return undefined;
  }

  private readonly tick = (now: number): void => {
    if (this.stopped) {
      return;
    }
    const dt = now - this.last;
    this.last = now;
    // An idle look's gap isn't a frame interval.
    if (this.idleTimer === undefined) {
      this.interval += (dt - this.interval) * 0.1;
    }
    this.idleTimer = undefined;
    if (this.mode === "path" && this.playing_) {
      let t = this.progress + (dt / 1000 / this.duration) * this.speed;
      if (t >= 1) {
        t = 0;
      }
      this.progress = t;
      this.onProgress?.(t);
    }
    const panes = this.panes;
    if (this.pose && panes.length) {
      if (this.mode === "path") {
        const p = this.pose(this.progress);
        const sun = this.sun?.(p);
        for (const pane of panes) {
          if (sun) {
            pane.adapter.setSun(sun);
          }
          pane.adapter.setCamera(p);
        }
      } else if (this.link_ && panes[this.leader]) {
        const p = panes[this.leader]!.adapter.getCamera();
        panes.forEach((pane, i) => {
          if (i !== this.leader) {
            pane.adapter.setCamera(p);
          }
        });
      }
      for (const pane of panes) {
        const own = pane.onDemand ? pane.adapter.onDemandStats!() : undefined;
        if (own) {
          // Its engine's loop rendered, or didn't: already smoothed.
          pane.frames = own.frames;
          pane.cpu = own.cpuMs;
        } else {
          const cpu = pane.adapter.frame();
          pane.frames++;
          pane.cpu += (cpu - pane.cpu) * 0.1;
        }
        const gpu = pane.adapter.gpuMs();
        if (gpu !== undefined) {
          pane.gpu =
            pane.gpu === undefined ? gpu : pane.gpu + (gpu - pane.gpu) * 0.1;
        }
      }
      if (now - this.lastSnapshot >= SNAPSHOT_MS) {
        this.lastSnapshot = now;
        this.snapshot();
      }
    }
    this.schedule();
  };

  private snapshot(): void {
    const drawn = this.panes.map((p) => p.adapter.drawnTiles());
    const keys = drawn.map((list) => new Set(list.map((t) => t.key)));
    const moved = keys.some(
      (set, i) =>
        set.size !== this.drawnKeys[i]?.size ||
        [...set].some((key) => !this.drawnKeys[i]!.has(key)),
    );
    this.drawnKeys = keys;
    if (this.colors === "difference" && moved) {
      // Re-applied so still engines repaint as the other's selection moves;
      // not otherwise, or they would never sleep.
      this.setTileColors(this.colors);
    }
    const leader = this.panes[this.leader] ?? this.panes[0]!;
    const position = Float64Array.from(leader.adapter.getCamera().position);
    const c = Ellipsoid.WGS84.cartesianToCartographic(position, {
      longitude: 0,
      latitude: 0,
      height: 0,
    });
    this.onSnapshot?.({
      drawn,
      undrawn: this.panes.map((p) => p.adapter.undrawnTiles?.()),
      interval: this.interval,
      ...(c
        ? {
            camera: [
              (c.longitude * 180) / Math.PI,
              (c.latitude * 180) / Math.PI,
              c.height,
            ] as [number, number, number],
          }
        : {}),
    });
  }

  private destroyPanes(): void {
    for (const p of this.panes) {
      p.adapter.destroy();
    }
    this.panes = [];
  }

  /** Stops the loop and destroys the engines (`start` may follow). */
  destroy(): void {
    this.stopped = true;
    this.running = false;
    this.generation++;
    this.cancelPass();
    this.destroyPanes();
  }
}
