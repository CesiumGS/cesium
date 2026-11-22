// Strict-mode safety (CS-708): what React's StrictMode (and a fast refresh)
// does to a library user's effect, create, dispose and create again at once,
// is correct and cheap. Frame catalogs over one store share their loads; a
// Viewer made again on the same container adopts the engine the disposed one
// leaves; a canvas passes from a disposed engine to a new one. On the fake
// device of test/fakeGpu.ts and the stubbed store of test/frameStore.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFrameCatalog } from "../packages/frames/src/catalog.ts";
import { Clock } from "../packages/time/src/Clock.ts";
import type { ViewerOptions } from "../packages/next/widgets/Viewer.ts";
import { fakeDevice, installGpuGlobals } from "./fakeGpu.ts";
import { sharedLoadCount } from "../packages/frames/src/sharedLoads.ts";
import {
  DATA_FILES,
  STORE,
  fetchCounts,
  nextTask,
  serveFrameStore,
  type StoreRequest,
} from "./frameStore.ts";

/** The sky's reference frames, as the Viewer asks for them with frameData. */
const SKY = ["GCRF", "ITRF", "HCRS", "MOON_ICRF", "MOON_ME"] as const;

let requests: StoreRequest[];

beforeEach(async () => {
  requests = await serveFrameStore();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(async () => {
  // Shared loads left by a test are released a task after their aborts.
  await nextTask();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A catalog over the store, its sky asked for at "precise" (as the Viewer's). */
function skyCatalog(abort = new AbortController()) {
  const catalog = createFrameCatalog({ data: STORE, signal: abort.signal });
  for (const name of SKY) {
    catalog.get(name, { precision: "precise" });
  }
  return { catalog, abort };
}

async function precise(catalog: ReturnType<typeof skyCatalog>["catalog"]) {
  await Promise.all(SKY.map((name) => catalog.ready(name, "precise")));
}

/** Store requests of one catalog made alone, for comparison. */
async function aloneCounts(): Promise<Record<string, number>> {
  const one = skyCatalog();
  await precise(one.catalog);
  const counts = fetchCounts(requests);
  one.abort.abort();
  await nextTask();
  requests.length = 0;
  return counts;
}

describe("frame catalogs over one store", () => {
  it("made, disposed and made again in one tick fetch each file once", async () => {
    const alone = await aloneCounts();
    for (const file of DATA_FILES) {
      expect(alone[file]).toBe(1);
    }
    const first = skyCatalog();
    first.abort.abort();
    const second = skyCatalog();
    await precise(second.catalog);
    expect(fetchCounts(requests)).toEqual(alone);
    for (const name of SKY) {
      expect(second.catalog.precisionOf(name)).toBe("precise");
    }
    // The disposed catalog's load was canceled quietly, not failed.
    expect(first.catalog.warnings).toEqual([]);
    expect(second.catalog.warnings.map((w) => w.kind)).not.toContain(
      "loadFailed",
    );
    second.abort.abort();
  });

  it("a second catalog joins a load in flight, and the first's abort leaves it running", async () => {
    const alone = await aloneCounts();
    const first = skyCatalog();
    const second = skyCatalog();
    first.abort.abort();
    await precise(second.catalog);
    expect(fetchCounts(requests)).toEqual(alone);
    second.abort.abort();
  });

  it("a load nobody holds stops a task later, and the next catalog fetches again", async () => {
    const alone = await aloneCounts();
    // Hold the files back, so the loads are in flight when it aborts.
    const stub = globalThis.fetch;
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const inFlight: StoreRequest[] = [];
    vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
      if (/\.(pack|csv)$/.test(input)) {
        inFlight.push({ url: input, signal: init?.signal ?? undefined });
        await held;
        init?.signal?.throwIfAborted();
      }
      return stub(input, init);
    });
    const only = skyCatalog();
    await vi.waitFor(() => expect(inFlight).toHaveLength(3));
    only.abort.abort();
    expect(sharedLoadCount()).toBe(2);
    await nextTask();
    expect(sharedLoadCount()).toBe(0);
    // The fetches it started were aborted with it.
    expect(inFlight.every((r) => r.signal?.aborted)).toBe(true);
    release();
    vi.stubGlobal("fetch", stub);
    requests.length = 0;
    requests.length = 0;
    const again = skyCatalog();
    await precise(again.catalog);
    expect(fetchCounts(requests)).toEqual(alone);
    again.abort.abort();
  });

  it("a finished load is reused while a catalog holds it, and released after", async () => {
    const alone = await aloneCounts();
    const held = skyCatalog();
    await precise(held.catalog);
    const later = skyCatalog();
    await precise(later.catalog);
    expect(fetchCounts(requests)).toEqual(alone);
    held.abort.abort();
    later.abort.abort();
    await nextTask();
    expect(sharedLoadCount()).toBe(0);
  });

  it("a catalog without a signal loads on its own, as before", async () => {
    const alone = await aloneCounts();
    const plain = createFrameCatalog({ data: STORE });
    for (const name of SKY) {
      plain.get(name, { precision: "precise" });
    }
    const shared = skyCatalog();
    await Promise.all([precise(plain), precise(shared.catalog)]);
    for (const file of DATA_FILES) {
      expect(fetchCounts(requests)[file]).toBe(2 * alone[file]!);
    }
    shared.abort.abort();
  });

  it("a failed load is not kept: the next catalog tries again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    const failing = skyCatalog();
    await expect(failing.catalog.ready("ITRF", "precise")).rejects.toThrow();
    expect(sharedLoadCount()).toBe(0);
    failing.abort.abort();
  });
});

// ---------------------------------------------------------------- the Viewer

/** What the fake platform saw: devices, live GPU resources, observers, listeners. */
interface Platform {
  devicesMade: number;
  devicesDestroyed: number;
  /** Buffers and textures made and not destroyed, on devices not destroyed. */
  live(): number;
  observing: number;
  listening: number;
}

function installPlatform(): Platform {
  installGpuGlobals();
  const alive = new Map<GPUDevice, Set<object>>();
  const platform: Platform = {
    devicesMade: 0,
    devicesDestroyed: 0,
    live: () => [...alive.values()].reduce((n, set) => n + set.size, 0),
    observing: 0,
    listening: 0,
  };
  const adapter = {
    features: new Set<string>(),
    limits: fakeDevice({}).limits,
    info: { vendor: "fake", architecture: "fake" },
    requestDevice: () => {
      const device = fakeDevice({});
      const mine = new Set<object>();
      alive.set(device, mine);
      platform.devicesMade++;
      const tracked = <T extends { destroy(): void }>(made: T): T => {
        mine.add(made);
        const destroy = made.destroy.bind(made);
        made.destroy = () => {
          mine.delete(made);
          destroy();
        };
        return made;
      };
      const createBuffer = device.createBuffer.bind(device);
      const createTexture = device.createTexture.bind(device);
      Object.assign(device, {
        createBuffer: (d: GPUBufferDescriptor) => tracked(createBuffer(d)),
        createTexture: (d: GPUTextureDescriptor) => tracked(createTexture(d)),
        destroy: () => {
          platform.devicesDestroyed++;
          alive.delete(device);
        },
      });
      return Promise.resolve(device);
    },
  };
  vi.stubGlobal("navigator", {
    gpu: {
      requestAdapter: () => Promise.resolve(adapter),
      getPreferredCanvasFormat: () => "bgra8unorm",
      wgslLanguageFeatures: new Set<string>(),
    },
    userAgent: "node",
    hardwareConcurrency: 4,
  });
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(): void {
        platform.observing++;
      }
      disconnect(): void {
        platform.observing--;
      }
    },
  );
  vi.stubGlobal("document", { createElement: () => element(platform) });
  vi.stubGlobal("getComputedStyle", () => ({ position: "relative" }));
  vi.stubGlobal("devicePixelRatio", 1);
  return platform;
}

/** A canvas or a container: listeners counted, a WebGPU context that records its device. */
function element(platform: Platform) {
  const device = fakeDevice({});
  const configured: GPUDevice[] = [];
  const context = {
    configured,
    configure: (c: GPUCanvasConfiguration) => configured.push(c.device),
    unconfigure: () => {},
    getCurrentTexture: () =>
      device.createTexture({
        size: [el.width, el.height],
        format: "bgra8unorm",
        usage: 0x10,
      }),
  };
  const el = {
    style: {} as Record<string, string>,
    dataset: {} as Record<string, string>,
    width: 300,
    height: 150,
    clientWidth: 300,
    clientHeight: 150,
    children: [] as unknown[],
    append(...children: unknown[]) {
      el.children.push(...children);
    },
    remove: () => {},
    // A listener goes with removeEventListener or its signal's abort.
    addEventListener: (
      _type: string,
      _listener: unknown,
      options?: AddEventListenerOptions,
    ) => {
      platform.listening++;
      options?.signal?.addEventListener("abort", () => platform.listening--, {
        once: true,
      });
    },
    removeEventListener: () => platform.listening--,
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    getContext: () => context,
    getBoundingClientRect: () =>
      ({ left: 0, top: 0, width: 300, height: 150 }) as DOMRect,
  };
  return el;
}

/** Viewer options with the frames store and little else (no DOM-heavy controls). */
const viewerOptions = (clock: Clock): ViewerOptions => ({
  engine: { limits: "adapter" },
  frameData: STORE,
  globe: false,
  imagery: false,
  credits: false,
  timeControls: false,
  warningNotice: false,
  stars: false,
  moon: false,
  cityLights: false,
  clock,
});

describe("a Viewer under StrictMode (create, dispose, create again at once)", () => {
  let platform: Platform;
  beforeEach(() => {
    platform = installPlatform();
  });

  /** One viewer made and disposed alone: what it fetches and makes. */
  async function alone(): Promise<{
    counts: Record<string, number>;
    live: number;
  }> {
    const { Viewer } = await import("../packages/next/widgets/Viewer.ts");
    const v = await Viewer.create(
      element(platform) as unknown as HTMLElement,
      viewerOptions(new Clock({ mode: "paused" })),
    );
    await v.frameData;
    const result = { counts: fetchCounts(requests), live: platform.live() };
    v.destroy();
    await nextTask();
    requests.length = 0;
    platform.devicesMade = 0;
    platform.devicesDestroyed = 0;
    return result;
  }

  it("makes one device, fetches each file once, and leaks nothing", async () => {
    const single = await alone();
    for (const file of DATA_FILES) {
      expect(single.counts[file]).toBe(1);
    }
    const { Viewer } = await import("../packages/next/widgets/Viewer.ts");
    const container = element(platform) as unknown as HTMLElement;
    const clock = new Clock({ mode: "paused" });
    const listening = platform.listening;

    // The effect, as React's StrictMode runs it: create; the cleanup
    // (the viewer isn't there yet: it's disposed as it arrives); create.
    let canceled = false;
    const first = Viewer.create(container, viewerOptions(clock));
    canceled = true;
    void first.then((v) => canceled && v.destroy());
    const second = await Viewer.create(container, viewerOptions(clock));
    const data = await second.frameData;

    expect(data).toBeDefined();
    expect(second.frames.precisionOf("ITRF")).toBe("precise");
    expect(platform.devicesMade).toBe(1);
    expect(fetchCounts(requests)).toEqual(single.counts);
    // The second viewer took over the first one's engine, and the first's
    // world went with it.
    const disposed = await first;
    expect(second.engine).toBe(disposed.engine);
    expect(disposed.world.destroyed).toBe(true);
    await nextTask();
    expect(platform.devicesDestroyed).toBe(0);
    expect(platform.live()).toBe(single.live);
    expect(() => second.engine.renderFrame()).not.toThrow();
    // Nothing failed or was canceled loudly: only the synthetic store's own
    // staleness notice, once.
    expect(second.warnings.map((w) => w.kind)).toEqual(["eopEnded"]);
    expect(disposed.warnings.filter((w) => w.kind !== "eopEnded")).toEqual([]);

    second.destroy();
    await nextTask();
    expect(platform.devicesDestroyed).toBe(1);
    expect(platform.live()).toBe(0);
    expect(platform.observing).toBe(0);
    expect(platform.listening).toBe(listening);
    expect(clock.events.has("change")).toBe(false);
    expect(sharedLoadCount()).toBe(0);
  });

  it("disposed as it arrives, with no create after it: one device, destroyed, its loads canceled quietly", async () => {
    const { Viewer } = await import("../packages/next/widgets/Viewer.ts");
    const pending = Viewer.create(
      element(platform) as unknown as HTMLElement,
      viewerOptions(new Clock({ mode: "paused" })),
    );
    const v = await pending;
    v.destroy();
    v.destroy(); // again: nothing
    await nextTask();
    expect(platform.devicesMade).toBe(1);
    expect(platform.devicesDestroyed).toBe(1);
    expect(platform.live()).toBe(0);
    // Its loads were canceled, quietly: no warning, no data.
    expect(v.warnings).toEqual([]);
    expect(await v.frameData).toBeUndefined();
    expect(sharedLoadCount()).toBe(0);
  });

  it("a viewer kept beside another on the same container gets its own engine", async () => {
    const { Viewer } = await import("../packages/next/widgets/Viewer.ts");
    const container = element(platform) as unknown as HTMLElement;
    const a = Viewer.create(container, viewerOptions(new Clock()));
    const b = await Viewer.create(container, viewerOptions(new Clock()));
    const kept = await a;
    expect(b.engine).not.toBe(kept.engine);
    expect(platform.devicesMade).toBe(2);
    kept.destroy();
    b.destroy();
    await nextTask();
    expect(platform.devicesDestroyed).toBe(2);
  });

  it("a canvas passes from a disposed engine to a new one, its context configured for the new device", async () => {
    const { Engine } = await import("../packages/core/src/scene/Engine.ts");
    const { CanvasTarget } =
      await import("../packages/core/src/scene/renderTarget.ts");
    const canvas = element(platform);
    const context = canvas.getContext();
    const draw = (engine: Awaited<ReturnType<typeof Engine.create>>) => {
      const world = engine.createWorld({
        maxDraws: 1,
        maxMaterials: 1,
        vertexBytes: 4096,
        indexBytes: 4096,
      });
      const target = new CanvasTarget(canvas as unknown as HTMLCanvasElement);
      engine.addView({ target, world });
      engine.renderFrame();
      return target;
    };
    const first = await Engine.create({ limits: "adapter" });
    draw(first);
    first.destroy();
    const second = await Engine.create({ limits: "adapter" });
    draw(second);
    expect(context.configured).toEqual([first.gpu.device, second.gpu.device]);
    expect(context.configured[1]).not.toBe(context.configured[0]);
    second.destroy();
    expect(platform.devicesDestroyed).toBe(2);
  });

  it("an OffscreenTarget passes from a disposed engine to a new one", async () => {
    const { Engine } = await import("../packages/core/src/scene/Engine.ts");
    const { OffscreenTarget } =
      await import("../packages/core/src/scene/renderTarget.ts");
    const target = new OffscreenTarget(4, 4);
    for (let i = 0; i < 2; i++) {
      const engine = await Engine.create({ limits: "adapter" });
      const world = engine.createWorld({
        maxDraws: 1,
        maxMaterials: 1,
        vertexBytes: 4096,
        indexBytes: 4096,
      });
      engine.addView({ target, world });
      expect(() => engine.renderFrame()).not.toThrow();
      engine.destroy();
    }
    target.destroy();
  });
});
