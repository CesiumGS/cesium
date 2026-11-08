// The Viewer on the frames module (plan 5a, Task 13; the plan's calls 32 and
// 33): its catalog (`viewer.frames`) and the frames resolver for its world,
// its view's rig on ITRF, and the sky through `attachSky`: analytic without
// `frameData`, precise with it (the stand-ins until the data loads). Failed
// loads and stale data show as `viewer.warnings`. A real Viewer over a fake
// DOM and the fake device of test/fakeGpu.ts; the frames store is served by
// a stubbed `fetch` (synthetic packs, TDB -200 s to 200 s around J2000, and
// an EOP table that ends in January 2000).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadFrameData,
  type FrameData,
} from "../src/ephemeris/loadFrameData.ts";
import { Frame } from "../src/frames/Frame.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import { createSkyState, skyState, type SkyState } from "../src/frames/sky.ts";
import { EARTH } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { Clock } from "../src/time/Clock.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import type { Viewer, ViewerOptions } from "../widgets/Viewer.ts";
import { fakeDevice, fakeEngine } from "./fakeGpu.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";
import { pack } from "./syntheticPacks.ts";

const BASE = "/frames-data/";
const MJD_UNIX_EPOCH = 40587;

/** Daily EOP rows from `startMjd`, `days` of them (as test/frameCatalog.test.ts). */
function eopText(startMjd: number, days: number): string {
  const rows = ["DATE,MJD,X,Y,UT1-UTC,LOD,DPSI,DEPS,DX,DY,DAT,DATA_TYPE"];
  for (let i = 0; i < days; i++) {
    const mjd = startMjd + i;
    const date = new Date((mjd - MJD_UNIX_EPOCH) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    rows.push(`${date},${mjd},0.1,0.3,0.6,0.5,0,0,0.0001,-0.0002,32,O`);
  }
  return `${rows.join("\n")}\n`;
}

/** A leap-second excerpt from 1999 on, expiring after the built-in table. */
const LEAP_TEXT = `#  File expires on 28 December 2030
#    MJD        Date        TAI-UTC (s)
 51179.0    1  1 1999       32
 53736.0    1  1 2006       33
 54832.0    1  1 2009       34
 56109.0    1  7 2012       35
 57204.0    1  7 2015       36
 57754.0    1  1 2017       37
`;

const bytesOf = (data: string | Uint8Array): ArrayBuffer => {
  const u8 =
    typeof data === "string" ? new TextEncoder().encode(data) : data.slice();
  return u8.buffer as ArrayBuffer;
};

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

const ROLES: Record<string, string> = {
  "planets.pack": "planets",
  "moon.pack": "moon",
  "EOP-All.csv": "eop",
  "Leap_Second.dat": "leapSeconds",
};
const FILES: Record<string, ArrayBuffer> = {
  "planets.pack": bytesOf(
    pack("SPK", ["sun", "emb", "moon"], "ICRF", "position"),
  ),
  "moon.pack": bytesOf(pack("PCK", ["moonPa"], "MOON_PA", "euler")),
  // 1999-12-22 to 2000-01-11, around the synthetic packs' span: it ends
  // before now, so the store is stale (one `eopEnded`).
  "EOP-All.csv": bytesOf(eopText(51534, 21)),
  "Leap_Second.dat": bytesOf(LEAP_TEXT),
};

/** Inside the synthetic packs and the EOP table. */
const INSIDE_MS = Instant.fromTt(0).toUtc(LeapSeconds.builtIn());

interface FakeElement {
  style: Record<string, string>;
  dataset: Record<string, string>;
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
  append(...children: unknown[]): void;
  remove(): void;
  addEventListener(): void;
  getContext(): unknown;
  getBoundingClientRect(): DOMRect;
}

function element(): FakeElement {
  const device = fakeDevice({});
  const el: FakeElement = {
    style: {},
    dataset: {},
    width: 300,
    height: 150,
    clientWidth: 300,
    clientHeight: 150,
    append: () => {},
    remove: () => {},
    addEventListener: () => {},
    getContext: () => ({
      configure: () => {},
      unconfigure: () => {},
      getCurrentTexture: () =>
        device.createTexture({
          size: [el.width, el.height],
          format: "bgra8unorm",
          usage: 0x10,
        }),
    }),
    getBoundingClientRect: () =>
      ({ left: 0, top: 0, width: 300, height: 150 }) as DOMRect,
  };
  return el;
}

const maxDiff = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    m = Math.max(m, Math.abs(a[i]! - b[i]!));
  }
  return m;
};

/** The engine's stars' turn and sun against a SkyState: the largest difference. */
function skyDifference(engine: Engine, sky: SkyState): number {
  return Math.max(
    maxDiff(engine.icrfToFixed, sky.icrfToFixed),
    maxDiff(engine.sunDirection, sky.sunDirection),
  );
}

const analyticAt = (ms: number) => skyState(ms, undefined, createSkyState());

let engine: Engine;
let requested: string[] = [];
let failing = false;
const viewers: Viewer[] = [];
const storeRequests = () => requested.filter((url) => url.startsWith(BASE));

beforeEach(async () => {
  requested = [];
  failing = false;
  const manifest = {
    files: await Promise.all(
      Object.entries(FILES).map(async ([file, bytes]) => ({
        file,
        role: ROLES[file]!,
        sha256: await sha256(bytes),
      })),
    ),
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      requested.push(url);
      if (!failing && url === `${BASE}manifest.json`) {
        return new Response(JSON.stringify(manifest));
      }
      const bytes = url.startsWith(BASE)
        ? FILES[url.slice(BASE.length)]
        : undefined;
      return bytes && !failing
        ? new Response(bytes.slice(0))
        : new Response("not found", { status: 404 });
    }),
  );
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
  vi.stubGlobal("document", { createElement: () => element() });
  vi.stubGlobal("getComputedStyle", () => ({ position: "relative" }));
  vi.stubGlobal("devicePixelRatio", 1);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  engine = await fakeEngine();
});
afterEach(() => {
  for (const viewer of viewers.splice(0)) {
    viewer.destroy();
  }
  engine.stop();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function viewer(options: ViewerOptions = {}): Promise<Viewer> {
  const { Viewer } = await import("../widgets/Viewer.ts");
  const v = await Viewer.create(element() as unknown as HTMLElement, {
    engine,
    globe: false,
    imagery: false,
    credits: false,
    timeControls: false,
    warningNotice: false,
    stars: false,
    moon: false,
    cityLights: false,
    clock: new Clock({ time: INSIDE_MS, mode: "paused" }),
    ...options,
  });
  viewers.push(v);
  return v;
}

describe("the Viewer on the frames module", () => {
  it("without frameData: the analytic sky, the frames resolver and clock for its world, its view's rig on ITRF, and no frames data fetched", async () => {
    const v = await viewer();
    expect(skyDifference(engine, analyticAt(v.clock.time))).toBe(0);
    const resolver = engine.cameras.resolver(v.world) as ReturnType<
      typeof createFramesResolver
    >;
    expect(resolver.catalog).toBe(v.frames);
    expect(engine.cameras.clock(v.world)).toBe(v.clock);
    expect(engine.cameras.rig(v.view).position.frame).toBe(
      v.frames.get("ITRF"),
    );
    expect(engine.cameras.root(v.view)).toBe(v.frames.get("ITRF"));
    // The Earth's anchor at the identity in ITRF: Earth content as before.
    expect([...v.view.anchorPlacement(v.world.bodyAnchor(EARTH))]).toEqual([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);
    v.clock.time += 3_600_000;
    expect(skyDifference(engine, analyticAt(v.clock.time))).toBe(0);
    expect(await v.frameData).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(storeRequests()).toEqual([]);
    expect(v.frames.precisionOf("ITRF")).toBe("analytic");
    expect(v.warnings).toEqual([]);
  });

  it("frameData as a URL: the analytic sky until the data loads, the precise one after", async () => {
    const v = await viewer({ frameData: BASE });
    expect(skyDifference(engine, analyticAt(v.clock.time))).toBe(0);
    expect(v.frames.precisionOf("ITRF")).toBe("analytic");
    const data = await v.frameData;
    expect(data).toBeDefined();
    expect(v.frames.precisionOf("ITRF")).toBe("precise");
    const expected = skyState(v.clock.time, data, createSkyState());
    expect(expected.source).toBe("ephemeris");
    expect(skyDifference(engine, expected)).toBeLessThan(1e-11);
    // The same as `loadFrameData` reads from the store.
    const loaded = await loadFrameData(BASE);
    expect(
      skyDifference(engine, skyState(v.clock.time, loaded, createSkyState())),
    ).toBeLessThan(1e-11);
  });

  it("frameData as an object: the precise sky at once", async () => {
    const data = syntheticFrameData();
    const v = await viewer({ frameData: data });
    const expected = skyState(v.clock.time, data, createSkyState());
    expect(expected.source).toBe("ephemeris");
    expect(skyDifference(engine, expected)).toBeLessThan(1e-11);
    expect(await v.frameData).toBe(data);
    expect(storeRequests()).toEqual([]);
  });

  it("setFrameData: data set late gives the precise sky, and undefined the analytic one again", async () => {
    const v = await viewer();
    const first = v.frames;
    const data = syntheticFrameData();
    v.setFrameData(data);
    expect(v.frames).not.toBe(first);
    await v.frames.tree();
    expect(
      skyDifference(engine, skyState(v.clock.time, data, createSkyState())),
    ).toBeLessThan(1e-11);
    // The world's resolver and the view's rig follow the new catalog.
    const resolver = engine.cameras.resolver(v.world) as ReturnType<
      typeof createFramesResolver
    >;
    expect(resolver.catalog).toBe(v.frames);
    expect(engine.cameras.rig(v.view).position.frame).toBe(
      v.frames.get("ITRF"),
    );
    v.setFrameData(undefined);
    expect(skyDifference(engine, analyticAt(v.clock.time))).toBe(0);
    // The creation option is what the promise reports.
    expect(await v.frameData).toBeUndefined();
    expect(storeRequests()).toEqual([]);
  });

  it("a failed load gives exactly one frameDataFailed warning and the analytic sky", async () => {
    failing = true;
    const v = await viewer({ frameData: BASE });
    const heard: string[] = [];
    v.events.on("warning", (w) => heard.push(w.kind));
    expect(await v.frameData).toBeUndefined();
    expect(v.warnings.map((w) => w.kind)).toEqual(["frameDataFailed"]);
    expect(v.warnings[0]!.message).toMatch(/analytic/);
    expect(heard).toEqual(["frameDataFailed"]);
    expect(skyDifference(engine, analyticAt(v.clock.time))).toBe(0);
    v.clock.time += 60_000;
    expect(skyDifference(engine, analyticAt(v.clock.time))).toBe(0);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(v.warnings).toHaveLength(1);
  });

  it("a store whose EOP ends before now gives one eopEnded warning", async () => {
    const v = await viewer({ frameData: BASE });
    await v.frameData;
    expect(v.warnings.map((w) => w.kind)).toEqual(["eopEnded"]);
    expect(v.warnings[0]!.message).toMatch(/Earth orientation table ends/);
  });

  it("frameData's own warnings are the Viewer's", async () => {
    const data = {
      ...syntheticFrameData(),
      warnings: [{ kind: "leapSecondsExpired" as const, message: "expired" }],
    };
    const v = await viewer({ frameData: data });
    expect(v.warnings).toEqual([
      { kind: "leapSecondsExpired", message: "expired" },
    ]);
  });

  it("moon: false leaves the Moon out of the sky", async () => {
    engine.moonPosition = undefined;
    engine.moonAxes = undefined;
    const v = await viewer({ moon: false, frameData: syntheticFrameData() });
    v.clock.time += 3_600_000;
    expect(engine.moonPosition).toBeUndefined();
    expect(engine.moonAxes).toBeUndefined();
  });

  it("with the Moon, its place and axes follow the clock", async () => {
    engine.moonPosition = undefined;
    const v = await viewer({ moon: true });
    v.clock.time += 3_600_000;
    const sky = analyticAt(v.clock.time);
    expect([...engine.moonPosition!]).toEqual([...sky.moonPosition]);
    expect([...engine.moonAxes!]).toEqual([...sky.moonAxes]);
  });

  it("setSun holds the sun while the clock moves; sunFromClock brings the clock's back", async () => {
    const v = await viewer();
    v.setSun(120, 30);
    const held = Float64Array.from(engine.sunDirection);
    expect(
      maxDiff(held, analyticAt(v.clock.time).sunDirection),
    ).toBeGreaterThan(1e-3);
    v.clock.time += 3_600_000;
    expect([...engine.sunDirection]).toEqual([...held]);
    // The stars still turn with the clock.
    expect(
      maxDiff(engine.icrfToFixed, analyticAt(v.clock.time).icrfToFixed),
    ).toBe(0);
    v.sunFromClock = true;
    expect(skyDifference(engine, analyticAt(v.clock.time))).toBe(0);
  });
});

describe("setFrameData keeps what the application set", () => {
  const resolverOf = (v: Viewer) =>
    engine.cameras.resolver(v.world) as ReturnType<typeof createFramesResolver>;

  it("an application's rig stays; the viewer's own moves to the new ITRF", async () => {
    const { Viewer } = await import("../widgets/Viewer.ts");
    void Viewer;
    const v = await viewer();
    v.split = true;
    const [main, second] = v.views as [typeof v.view, typeof v.view];
    const earth = v.world.bodyAnchor(EARTH);
    const appRig = {
      position: { frame: earth },
      orientation: { kind: "free" as const },
    };
    engine.cameras.setRig(second, appRig);
    v.setFrameData(syntheticFrameData());
    expect(engine.cameras.rig(second)).toBe(appRig);
    expect(engine.cameras.rig(main).position.frame).toBe(v.frames.get("ITRF"));
    expect(engine.cameras.root(main)).toBe(v.frames.get("ITRF"));
    v.split = false;
  });

  it("anchor bindings to built-in reference frames move to the new catalog", async () => {
    const v = await viewer();
    const site = v.world.addAnchor("site");
    resolverOf(v).bindAnchor(site, v.frames.get("MOON_ME"));
    v.setFrameData(syntheticFrameData());
    expect(resolverOf(v).catalog).toBe(v.frames);
    expect(resolverOf(v).binding(site)).toBe(v.frames.get("MOON_ME"));
  });

  it("refuses, naming them, anchors bound to reference frames added to the catalog, and changes nothing", async () => {
    const v = await viewer();
    const old = v.frames;
    const pad = Frame.constant(
      "PAD",
      old.get("ITRF"),
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1000, 0, 0, 1],
    );
    old.add(pad);
    const site = v.world.addAnchor("launch site");
    resolverOf(v).bindAnchor(site, pad);
    const before = resolverOf(v);
    expect(() => v.setFrameData(syntheticFrameData())).toThrow(
      /launch site \(bound to PAD\)/,
    );
    expect(v.frames).toBe(old);
    expect(resolverOf(v)).toBe(before);
    expect(resolverOf(v).binding(site)).toBe(pad);
  });

  it("a world with another body's anchor (no fixed reference frame in the catalog) still takes new data", async () => {
    const v = await viewer();
    const mars = v.world.bodyAnchor({ ...EARTH, name: "Mars", naifId: 499 });
    const site = v.world.addAnchor("site");
    resolverOf(v).bindAnchor(site, v.frames.get("MOON_ME"));
    expect(() => v.setFrameData(syntheticFrameData())).not.toThrow();
    expect(resolverOf(v).catalog).toBe(v.frames);
    expect(resolverOf(v).binding(site)).toBe(v.frames.get("MOON_ME"));
    // Never asked of the new resolver: still unbound.
    expect(v.world.anchors).toContain(mars);
  });

  it("malformed data changes nothing: the catalog, the resolver, the warnings", async () => {
    const v = await viewer({
      frameData: {
        ...syntheticFrameData(),
        warnings: [{ kind: "eopEnded", message: "old" }],
      },
    });
    const old = v.frames;
    const before = resolverOf(v);
    const cleared = vi.fn();
    v.events.on("warningsCleared", cleared);
    const malformed = { leapSeconds: undefined } as unknown as FrameData;
    expect(() => v.setFrameData(malformed)).toThrow();
    expect(v.frames).toBe(old);
    expect(resolverOf(v)).toBe(before);
    expect(v.warnings.map((w) => w.kind)).toEqual(["eopEnded"]);
    expect(cleared).not.toHaveBeenCalled();
  });

  it("an application's frame resolver stays", async () => {
    const v = await viewer();
    const own = createFramesResolver(v.frames);
    engine.cameras.setResolver(v.world, own);
    v.setFrameData(syntheticFrameData());
    expect(engine.cameras.resolver(v.world)).toBe(own);
  });

  it("emits warningsCleared when the list is emptied", async () => {
    const v = await viewer({
      frameData: {
        ...syntheticFrameData(),
        warnings: [{ kind: "eopEnded", message: "old" }],
      },
    });
    expect(v.warnings).toHaveLength(1);
    const cleared = vi.fn();
    v.events.on("warningsCleared", cleared);
    v.setFrameData(syntheticFrameData());
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(v.warnings).toEqual([]);
  });
});

describe("the Viewer's warnings and loads, guarded", () => {
  it("a warning listener that throws doesn't reject frameData", async () => {
    failing = true;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const v = await viewer({ frameData: BASE });
    v.events.on("warning", () => {
      throw new Error("listener");
    });
    await expect(v.frameData).resolves.toBeUndefined();
    expect(v.warnings.map((w) => w.kind)).toEqual(["frameDataFailed"]);
    expect(error).toHaveBeenCalled();
  });

  it("Engine.create failing aborts the frames data's loads", async () => {
    const signals: Array<AbortSignal | undefined> = [];
    const urls: string[] = [];
    const served = fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL, init?: RequestInit) => {
        urls.push(String(input));
        signals.push(init?.signal ?? undefined);
        return served(input, init);
      }),
    );
    const { Viewer } = await import("../widgets/Viewer.ts");
    const { Engine } = await import("../src/scene/Engine.ts");
    vi.spyOn(Engine, "create").mockRejectedValue(new Error("no device"));
    await expect(
      Viewer.create(element() as unknown as HTMLElement, {
        frameData: BASE,
      }),
    ).rejects.toThrow(/no device/);
    await new Promise((resolve) => setTimeout(resolve, 20));
    // The store's requests that went out were aborted (the providers'
    // modules may load before or after the abort).
    expect(urls.every((url) => url.startsWith(BASE))).toBe(true);
    expect(signals.every((signal) => signal?.aborted)).toBe(true);
  });
});

describe("a globe-only Viewer's tick with the clock playing", () => {
  it("makes no Instant and walks no route", async () => {
    let now = 1000;
    const queue = new Map<number, FrameRequestCallback>();
    let handle = 1;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      queue.set(handle, cb);
      return handle++;
    });
    vi.stubGlobal("cancelAnimationFrame", (h: number) => queue.delete(h));
    const v = await viewer({ clock: new Clock({ time: INSIDE_MS }) });
    const resolver = engine.cameras.resolver(v.world);
    const resolve = vi.spyOn(resolver, "resolve");
    const instants = vi.spyOn(Instant, "fromUtc");
    const toParent = vi.spyOn(Frame.prototype, "toParent");
    v.clock.mode = "playing";
    const start = v.clock.time;
    for (let i = 0; i < 30; i++) {
      now += 1000 / 60;
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) {
        cb(now);
      }
      await new Promise((r) => setImmediate(r));
    }
    // The ticks ran: the clock moved and the anchors were placed each time.
    expect(v.clock.time).toBeGreaterThan(start);
    expect(resolve.mock.calls.length).toBeGreaterThanOrEqual(30);
    expect(instants).not.toHaveBeenCalled();
    expect(toParent).not.toHaveBeenCalled();
    v.clock.mode = "paused";
  });
});
