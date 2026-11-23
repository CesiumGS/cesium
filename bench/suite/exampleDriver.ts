// Symbol.dispose and DisposableStack where the browser lacks them (Safari).
import "../../packages/core/src/core/disposeShim.ts";
import {
  Ellipsoid,
  Engine,
  fromDegrees,
  type Tileset3D,
  vec3,
} from "../../packages/core/src/index.ts";
import { Viewer } from "../../packages/ui/src/index.ts";
import { startSseProbe } from "../../packages/ui/src/sseProbe.ts";
import { EXAMPLES, type ExampleInfo } from "../../examples/index.ts";
import { ionToken, needsToken, NEEDS_TOKEN } from "./ionToken.ts";
import { limitsTier } from "./limitsTier.ts";
import type { EngineConfig, ExampleScene, RunMetrics } from "./schema.ts";
import { applyViewSettings, readViewSettings } from "./settings.mjs";
// The browser's description (WebGPU adapter, refresh), which the CLI asks
// the first page of a run for; the catalog page's module, whose own UI
// starts only on its page.
import { describeBrowser } from "./suite.ts";
import { normalizeRun } from "./views/exampleRun.ts";
import {
  createSettleRule,
  DEFAULT_CAP_SECONDS,
  DEFAULT_HOLD_MS,
  exampleParams,
  parseCamera,
  readProbe,
  type TilesetState,
} from "./exampleHost.ts";

/**
 * The example host page (example.html; docs/superpowers/plans/2026-11-13-dyno-dev-harness.md,
 * section 3): runs one gallery example as a group D scene, with the same
 * `ExampleContext` the Examples view gives it, at a fixed size and pixel
 * ratio 1, waits for the settle rule, and reads the development metrics
 * of section 4 from the engine and the viewer it made. The CLI
 * (commands/suite.mjs) loads it from the frozen build and calls
 * `runExample`; it counts requests and bytes by host class and page
 * errors itself, from the browser's side.
 *
 * The ion token is Dyno's, as the Examples view has it (`ionToken()`): the
 * one pasted in Dyno's settings, VITE_ION_TOKEN on the dev server only,
 * else CesiumJS's evaluation token. It goes to the viewer and nothing
 * else: never into a metric, a message or the console.
 */

/** What the CLI passes for one run. */
export interface ExampleRunSpec {
  scene: ExampleScene;
  config: EngineConfig;
  /** Screenshot the settled view (the CLI's first repetition). */
  /** Captures the settled view ("end"); a sweep reference's repeats say "end". */
  capture?: boolean | "end";
  /** A second page load for `probe=sse` only: no other metric is read. */
  probe?: boolean;
  /** Ticks of GPU time per pass, rendered continuously after settling. */
  gpuTicks?: number;
}

const POLL_MS = 250;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const animationFrame = () =>
  new Promise<number>((resolve) => requestAnimationFrame(resolve));

const sum = (values: Iterable<number>) => {
  let n = 0;
  for (const v of values) {
    n += v;
  }
  return n;
};

const quantile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
};

/** CLI hooks (Playwright), as the catalog page has them; none in a person's tab. */
const hooks = globalThis as {
  captureMoment?: (moment: string) => Promise<void>;
  measureMemory?: () => Promise<Partial<RunMetrics>>;
  endMeasurement?: () => Promise<void>;
};

/** Runs one example scene and measures it. */
export async function runExample(spec: ExampleRunSpec): Promise<RunMetrics> {
  const { scene, config } = spec;
  const metrics: RunMetrics = { status: "ok" };
  const info: ExampleInfo | undefined = EXAMPLES.find(
    (x) => x.id === scene.example,
  );
  if (!info) {
    return {
      status: "error",
      message: `no example "${scene.example}" (examples/index.ts)`,
    };
  }
  const container = document.querySelector<HTMLElement>("#view")!;
  const panel = document.querySelector<HTMLElement>("#panel")!;
  container.replaceChildren();
  panel.replaceChildren();
  container.style.width = `${scene.width ?? 1280}px`;
  container.style.height = `${scene.height ?? 720}px`;
  const start = performance.now();
  const elapsed = () => performance.now() - start;
  const scope = new DisposableStack();
  const controller = new AbortController();
  const labels = new Map<Tileset3D, string>();
  const dev: Record<string, number> = {};
  let engine: Engine | undefined;
  let viewer: Viewer | undefined;
  let dispose: (() => void) | undefined;
  let failure: unknown;
  // The probe reports through the console (widgets/sseProbe.ts).
  const warn = console.warn;
  let probeText: string | undefined;
  if (spec.probe) {
    console.warn = (...args: unknown[]) => {
      const text = String(args[0]);
      if (text.startsWith("[probe]")) {
        probeText = text;
      }
      warn.apply(console, args);
    };
  }
  try {
    const params = exampleParams(scene, config);
    const camera = info.pose === false ? undefined : parseCamera(params.camera);
    let current: Record<string, string> = { ...params };
    const token = ionToken();
    engine = await Engine.create({ limits: limitsTier() });
    viewer = await Viewer.create(container, {
      engine,
      globe: info.globe,
      ...(info.noWarningNotice ? { warningNotice: false } : {}),
      maxInstances: 1 << 20,
      ...(token ? { accessToken: token } : {}),
    });
    const v = viewer;
    v.ready.catch((e: unknown) => {
      failure ??= e;
    });
    const viewSettings = { ...scene.view, ...config.view };
    applyViewSettings({ engine, view: v.view }, viewSettings);
    const module = await info.load();
    const run = normalizeRun(
      await module.run({
        viewer: v,
        panel,
        accessToken: token,
        signal: controller.signal,
        scope,
        params,
        setParams: (next) => {
          const merged: Record<string, string> = { ...current };
          for (const [key, value] of Object.entries(next)) {
            if (value === undefined) {
              delete merged[key];
            } else {
              merged[key] = value;
            }
          }
          current = merged;
        },
        watchParams: () => () => undefined,
        link: () => location.href,
        label: (tileset, name) => void labels.set(tileset, name),
      }),
    );
    dispose = run.dispose;
    // The example's own setup is done: the scene's view settings again
    // (the example may set its own), then the host's pose.
    applyViewSettings({ engine, view: v.view }, viewSettings);
    if (camera) {
      v.view.camera.lookAt(
        Ellipsoid.WGS84.cartographicToCartesian(
          fromDegrees(camera.longitude, camera.latitude, camera.height),
          vec3.vec3(),
        ),
        (camera.heading * Math.PI) / 180,
        (camera.pitch * Math.PI) / 180,
        camera.range,
      );
    }
    engine.requestRender();
    if (spec.probe) {
      startSseProbe(engine, () => tilesetsOf(v));
    }

    // ------------------------------------------------------------ settle
    const rule = createSettleRule({
      holdMs: scene.settle?.holdMs ?? DEFAULT_HOLD_MS,
      capMs: (scene.settle?.capSeconds ?? DEFAULT_CAP_SECONDS) * 1000,
    });
    let decided: ReturnType<typeof rule>;
    while (!decided) {
      await sleep(POLL_MS);
      if (failure) {
        throw failure;
      }
      const triangles = engine.stats.triangles;
      if (metrics.firstContentMs === undefined && triangles > 0) {
        metrics.firstContentMs = Math.round(elapsed());
      }
      decided = rule(elapsed(), statesOf(v, labels), triangles);
    }
    metrics.settled = decided.settled;
    if (decided.settled) {
      metrics.settleMs = Math.round(decided.settleMs);
    } else {
      metrics.settleReason = decided.reason;
    }
    // When the rule decided, on the wall clock: the CLI counts the content
    // requests of the 30 s before it (requestRateEnd) from the browser's
    // side, which sees the workers' requests too.
    metrics.decidedAt = Date.now();

    if (spec.probe) {
      // The probe reads once the terrain idles (or at its own timeout).
      const capMs = (scene.settle?.capSeconds ?? DEFAULT_CAP_SECONDS) * 1000;
      while (probeText === undefined && elapsed() < capMs + 45_000) {
        await sleep(POLL_MS);
      }
      Object.assign(dev, probeText ? readProbe(probeText) : {});
      return { ...metrics, dev };
    }

    // ------------------------------------------------- what's drawn now
    engine.requestRender();
    await animationFrame();
    await animationFrame();
    if (metrics.settled) {
      await hooks.captureMoment?.("end");
    }
    for (const [i, t] of tilesetsOf(v).entries()) {
      const label = labelOf(v, labels, t, i);
      dev[`tiles.${label}`] = sum(t.stats.selected.values());
      dev[`tilesKnown.${label}`] = t.stats.tiles;
      dev[`requests.${label}`] = t.stats.requestsTotal;
    }
    dev.triangles = engine.stats.triangles;
    dev.draws = engine.stats.draws;
    metrics.view = readViewSettings({ engine, view: v.view });

    // GPU time per pass: continuous ticks, each new timed sample.
    const ticks = spec.gpuTicks ?? 120;
    if (ticks > 0) {
      Object.assign(dev, await gpuPasses(engine, ticks));
    }

    // Terrain alone: the other tilesets hidden for a moment.
    if (scene.terrainOnly) {
      const others = tilesetsOf(v).filter((t) => !t.isGlobe && t.show);
      for (const t of others) {
        t.show = false;
      }
      engine.requestRender();
      await sleep(500);
      await animationFrame();
      dev.trianglesTerrainOnly = engine.stats.triangles;
      for (const t of others) {
        t.show = true;
      }
      engine.requestRender();
    }
    Object.assign(metrics, await hooks.measureMemory?.());
    await hooks.endMeasurement?.();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    metrics.status = "error";
    metrics.message = needsToken(error)
      ? `${info.title} ${NEEDS_TOKEN} (${redacted(text)})`
      : redacted(text);
  } finally {
    console.warn = warn;
    controller.abort();
    for (const step of [
      () => dispose?.(),
      () => scope.dispose(),
      () => viewer?.destroy(),
      () => engine?.destroy(),
    ]) {
      try {
        step();
      } catch {
        // Partly set up: nothing more to free.
      }
    }
  }
  if (Object.keys(dev).length) {
    metrics.dev = dev;
  }
  return metrics;
}

/** A message with the token in use cut out, should an error quote it. */
function redacted(text: string): string {
  const token = ionToken();
  return token && token.length >= 8 ? text.split(token).join("[token]") : text;
}

/** The globe first, then every tileset in the viewer's world, once each. */
function tilesetsOf(viewer: Viewer): Tileset3D[] {
  const out = new Set<Tileset3D>();
  if (viewer.globe) {
    out.add(viewer.globe);
  }
  for (const item of viewer.world.items) {
    if (item.tileset) {
      out.add(item.tileset);
    }
  }
  return [...out];
}

/** A tileset's name: the example's label, `terrain` for the globe, else its index. */
function labelOf(
  viewer: Viewer,
  labels: ReadonlyMap<Tileset3D, string>,
  tileset: Tileset3D,
  index: number,
): string {
  return (
    labels.get(tileset) ??
    (tileset === viewer.globe ? "terrain" : `tileset${index}`)
  );
}

function statesOf(
  viewer: Viewer,
  labels: ReadonlyMap<Tileset3D, string>,
): TilesetState[] {
  return tilesetsOf(viewer).map((t, i) => ({
    label: labelOf(viewer, labels, t, i),
    show: t.show,
    idle: t.idle,
    inFlight: t.stats.inFlight,
    queued: t.stats.uploadQueue,
    loading: t.stats.loading,
    imageryBusy: t.imagery?.busy ?? false,
    drawn: sum(t.stats.selected.values()),
  }));
}

/** Median and 90th percentile GPU time per pass over `ticks` new samples, ms. */
async function gpuPasses(
  engine: Engine,
  ticks: number,
): Promise<Record<string, number>> {
  const samples: Array<Readonly<Record<string, number>>> = [];
  let seen = engine.gpuSample.samples;
  const mode = engine.renderMode;
  engine.renderMode = "continuous";
  const until = performance.now() + 60_000;
  try {
    while (samples.length < ticks && performance.now() < until) {
      await animationFrame();
      const g = engine.gpuSample;
      if (g.samples !== seen) {
        seen = g.samples;
        samples.push({ ...g.passes });
      }
    }
  } finally {
    engine.renderMode = mode;
  }
  const out: Record<string, number> = {};
  const names = new Set(samples.flatMap((s) => Object.keys(s)));
  for (const name of names) {
    const values = samples.map((s) => s[name] ?? 0);
    out[`gpuPass.${name}`] = Math.round(quantile(values, 0.5)! * 1000) / 1000;
    out[`gpuPassP90.${name}`] =
      Math.round(quantile(values, 0.9)! * 1000) / 1000;
  }
  return out;
}

Object.assign(globalThis, { runExample, describeBrowser });
