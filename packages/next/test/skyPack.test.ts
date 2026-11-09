// The sky data pack (atmosphere/skyPack.ts): its format and checks, the
// engine taking one, and the sliced upload. Every byte here is synthetic,
// made in the test.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BACKGROUND_MAGIC,
  MAX_PACK_STARS,
  POINTS_MAGIC,
  SkyPackError,
  backgroundBytes,
  isPackBinary,
  loadSkyPack,
  parseManifest,
  readBackground,
  readPoints,
  type SkyPackManifest,
} from "../src/atmosphere/skyPack.ts";
import { STAR_FLOATS, type StarField } from "../src/atmosphere/stars.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import { fakeEngine } from "./fakeGpu.ts";

function manifestJson(over: Record<string, unknown> = {}) {
  return {
    format: 1,
    name: "synthetic",
    distributable: false,
    sources: [{ name: "a", url: "https://x.test/a", credit: "A", terms: "t" }],
    credits: ["Made up"],
    modelled: ["everything"],
    points: { file: "points.bin", count: 10, floatsPerStar: 8 },
    background: {
      file: "background.bin",
      size: 4,
      levels: 3,
      meanLuminance: 1e-4,
      holdsFaintStars: false,
    },
    ...over,
  };
}

function ascii(view: Uint8Array, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view[i] = text.charCodeAt(i);
  }
}

function pointsFile(count: number, headerCount = count, magic = POINTS_MAGIC) {
  const bytes = new ArrayBuffer(32 + count * STAR_FLOATS * 4);
  ascii(new Uint8Array(bytes), magic);
  const header = new DataView(bytes);
  header.setUint32(8, headerCount, true);
  header.setUint32(12, STAR_FLOATS, true);
  for (let i = 0; i < count * STAR_FLOATS; i++) {
    header.setFloat32(32 + i * 4, i % STAR_FLOATS === 3 ? 1e-6 : 0.5, true);
  }
  return bytes;
}

function backgroundFile(size: number, levels: number) {
  const bytes = new ArrayBuffer(backgroundBytes(size, levels));
  ascii(new Uint8Array(bytes), BACKGROUND_MAGIC);
  const view = new DataView(bytes);
  view.setUint32(8, size, true);
  view.setUint32(12, 6, true);
  view.setUint32(16, levels, true);
  for (let at = 32; at < bytes.byteLength; at += 2) {
    view.setUint16(at, 0x3c00, true); // 1.0
  }
  return bytes;
}

const manifest = (over = {}): SkyPackManifest =>
  parseManifest(manifestJson(over));

describe("parseManifest", () => {
  it("round-trips a good manifest", () => {
    const m = manifest();
    expect(m.name).toBe("synthetic");
    expect(m.points.count).toBe(10);
    expect(m.background.levels).toBe(3);
    expect(m.distributable).toBe(false);
  });

  it("reads a missing or non-boolean distributable as false, with a note", () => {
    for (const value of [undefined, "yes", 1]) {
      const notes: string[] = [];
      const json = manifestJson({ distributable: value });
      expect(parseManifest(json, notes).distributable).toBe(false);
      expect(notes[0]).toContain("distributable");
    }
  });

  it.each<[string, Record<string, unknown>, string]>([
    ["a format of 2", { format: 2 }, "format"],
    [
      "a count of 5,000,000",
      { points: { file: "p.bin", count: 5_000_000, floatsPerStar: 8 } },
      "points.count",
    ],
    [
      "a size of 100",
      {
        background: {
          file: "b.bin",
          size: 100,
          levels: 1,
          meanLuminance: 0,
          holdsFaintStars: false,
        },
      },
      "background.size",
    ],
    [
      "too many levels",
      {
        background: {
          file: "b.bin",
          size: 4,
          levels: 4,
          meanLuminance: 0,
          holdsFaintStars: false,
        },
      },
      "background.levels",
    ],
    [
      "a path for a file",
      { points: { file: "../x.bin", count: 1, floatsPerStar: 8 } },
      "points.file",
    ],
    ["credits that aren't text", { credits: [1] }, "credits"],
  ])("refuses %s, naming the field", (_name, over, field) => {
    const call = () => parseManifest(manifestJson(over));
    expect(call).toThrow(SkyPackError);
    expect(call).toThrow(field);
  });

  it("caps the count at 4,000,000", () => {
    expect(MAX_PACK_STARS).toBe(4_000_000);
  });
});

describe("readPoints and readBackground", () => {
  it("read good files", () => {
    const points = readPoints(pointsFile(10), manifest());
    expect(points.length).toBe(10 * STAR_FLOATS);
    expect(points[3]).toBeCloseTo(1e-6, 12);
    const faces = readBackground(backgroundFile(4, 3), manifest());
    expect(faces).toHaveLength(6);
    expect(faces[0]!.map((l) => l.length)).toEqual([64, 16, 4]);
    expect(faces[5]![2]![0]).toBe(1);
  });

  it("refuse a truncated point file, naming it", () => {
    const bytes = pointsFile(10).slice(0, 32 + 9 * 32 + 5);
    expect(() => readPoints(bytes, manifest())).toThrow("points.bin, length");
  });

  it("refuse a count one off", () => {
    expect(() => readPoints(pointsFile(10, 11), manifest())).toThrow(
      "points.bin, count",
    );
    expect(() => readPoints(pointsFile(11), manifest())).toThrow(
      "points.bin, count",
    );
  });

  it("refuse a NaN at star 7", () => {
    const bytes = pointsFile(10);
    new DataView(bytes).setFloat32(32 + 7 * 32 + 8, Number.NaN, true);
    expect(() => readPoints(bytes, manifest())).toThrow(/star 7/);
  });

  it("refuse a bad magic", () => {
    expect(() =>
      readPoints(pointsFile(10, 10, "NOTAPACK"), manifest()),
    ).toThrow("points.bin, magic");
    const bg = backgroundFile(4, 3);
    new Uint8Array(bg)[0] = 0;
    expect(() => readBackground(bg, manifest())).toThrow(
      "background.bin, magic",
    );
  });

  it("refuse a background of the wrong length or with an infinity", () => {
    const bg = backgroundFile(4, 3);
    expect(() =>
      readBackground(bg.slice(0, bg.byteLength - 2), manifest()),
    ).toThrow("background.bin, length");
    new DataView(bg).setUint16(40, 0x7c00, true);
    expect(() => readBackground(bg, manifest())).toThrow("not finite");
  });

  it("recognize a pack binary under any name", () => {
    expect(isPackBinary(new Uint8Array(pointsFile(1)))).toBe(true);
    expect(isPackBinary(new Uint8Array(backgroundFile(1, 1)))).toBe(true);
    expect(isPackBinary(new Uint8Array(32))).toBe(false);
    expect(isPackBinary(new Uint8Array(3))).toBe(false);
  });
});

describe("loadSkyPack", () => {
  const bytes = (b: ArrayBuffer) => new Response(b);
  const fetcher = (
    files: Record<string, Response | (() => Response) | number>,
  ) =>
    (async (input: RequestInfo | URL) => {
      const name = String(input).split("/").pop()!;
      const hit = files[name];
      if (typeof hit === "number" || hit === undefined) {
        return new Response("", { status: hit ?? 404 });
      }
      return typeof hit === "function" ? hit() : hit.clone();
    }) as typeof fetch;

  it("reads a pack beside its manifest", async () => {
    const files = {
      "manifest.json": new Response(JSON.stringify(manifestJson())),
      "points.bin": bytes(pointsFile(10)),
      "background.bin": bytes(backgroundFile(4, 3)),
    };
    const loaded = await loadSkyPack("https://p.test/pack/", fetcher(files));
    expect(loaded.field.count).toBe(10);
    expect(loaded.field.backgroundLevels[0]).toHaveLength(3);
    expect(loaded.field.holdsFaintStars).toBe(false);
    expect(loaded.field.meanBackground).toBeCloseTo(1e-4, 12);
  });

  it("refuses an oversized response early or while streaming", async () => {
    const manifestResponse = () => new Response(JSON.stringify(manifestJson()));
    const ok = backgroundFile(4, 3);
    // A declared length that doesn't match: refused before reading.
    const declared = new Response(pointsFile(10), {
      headers: { "content-length": "999999999" },
    });
    await expect(
      loadSkyPack(
        "https://p.test/pack/",
        fetcher({
          "manifest.json": manifestResponse(),
          "points.bin": declared,
          "background.bin": bytes(ok),
        }),
      ),
    ).rejects.toThrow("points.bin, length: Content-Length");
    // No declared length: the stream is cancelled past the expected size.
    let cancelled = false;
    const chunk = new Uint8Array(1000);
    const stream = new ReadableStream<Uint8Array>({
      pull: (c) => c.enqueue(chunk),
      cancel: () => {
        cancelled = true;
      },
    });
    await expect(
      loadSkyPack(
        "https://p.test/pack/",
        fetcher({
          "manifest.json": manifestResponse(),
          "points.bin": () => new Response(stream),
          "background.bin": bytes(ok),
        }),
      ),
    ).rejects.toThrow("longer than the expected");
    expect(cancelled).toBe(true);
  });

  it("refuses a maximum-size manifest before fetching its files", async () => {
    const requested: string[] = [];
    const big = manifestJson({
      points: { file: "points.bin", count: 4_000_000, floatsPerStar: 8 },
      background: {
        file: "background.bin",
        size: 4096,
        levels: 13,
        meanLuminance: 0,
        holdsFaintStars: false,
      },
    });
    const f = (async (input: RequestInfo | URL) => {
      requested.push(String(input).split("/").pop()!);
      return new Response(JSON.stringify(big));
    }) as typeof fetch;
    await expect(loadSkyPack("https://p.test/pack/", f)).rejects.toThrow(
      "over the",
    );
    expect(requested).toEqual(["manifest.json"]);
  });

  it("names the file of a 404", async () => {
    await expect(
      loadSkyPack("https://p.test/pack/manifest.json", fetcher({})),
    ).rejects.toThrow("manifest.json, fetch: status 404");
    const files = {
      "manifest.json": new Response(JSON.stringify(manifestJson())),
      "background.bin": bytes(backgroundFile(4, 3)),
    };
    await expect(
      loadSkyPack("https://p.test/pack/", fetcher(files)),
    ).rejects.toThrow("points.bin, fetch");
  });
});

/** A star field of `count` stars and a background of `size`² with `levels`. */
function field(count: number, size = 2, levels = 2): StarField {
  return {
    points: new Float32Array(count * STAR_FLOATS).fill(0.5),
    count,
    backgroundLevels: Array.from({ length: 6 }, () =>
      Array.from(
        { length: levels },
        (_, l) => new Float32Array(Math.max(1, size >> l) ** 2 * 4),
      ),
    ),
    backgroundSize: size,
    holdsFaintStars: false,
    meanBackground: 0,
  };
}

interface Spied {
  engine: Engine;
  buffers: Array<{ size: number; destroy: ReturnType<typeof vi.fn> }>;
  writes: number[];
  textureWrites: number[];
}

type SkyInternals = {
  starSplatGroup: unknown;
  starPoints: unknown;
  uploading: boolean;
  advanceUpload(): boolean;
  setStarField(f: StarField | null): void;
};

async function spied(): Promise<Spied> {
  const engine = await fakeEngine();
  const device = engine.raster.sky[
    "device" as keyof object
  ] as unknown as Record<string, unknown>;
  const buffers: Spied["buffers"] = [];
  const writes: number[] = [];
  const textureWrites: number[] = [];
  const create = device.createBuffer as (d: GPUBufferDescriptor) => object;
  device.createBuffer = (d: GPUBufferDescriptor) => {
    const buffer = create(d) as Record<string, unknown>;
    const destroy = vi.fn();
    buffer.destroy = destroy;
    buffers.push({ size: d.size, destroy });
    return buffer;
  };
  device.queue = {
    writeBuffer: (
      _b: unknown,
      _o: number,
      _d: unknown,
      _s: number,
      floats: number,
    ) => writes.push(floats * 4),
    writeTexture: () => textureWrites.push(1),
    submit: () => {},
  };
  return { engine, buffers, writes, textureWrites };
}

const skyOf = (engine: Engine) => engine.raster.sky as unknown as SkyInternals;

describe("the sliced upload", () => {
  it("takes at least 5 ticks for 20 MB, none over 4 MB, and swaps on the last", async () => {
    const { engine, writes } = await spied();
    const sky = skyOf(engine);
    const before = sky.starSplatGroup;
    const stars = (20 * 1024 * 1024) / (STAR_FLOATS * 4);
    sky.setStarField(field(stars));
    expect(sky.uploading).toBe(true);
    let ticks = 0;
    let changedEarly = false;
    while (sky.advanceUpload()) {
      ticks++;
      changedEarly ||= sky.starSplatGroup !== before;
    }
    ticks++;
    expect(writes.length).toBe(5);
    expect(Math.max(...writes)).toBeLessThanOrEqual(4 * 1024 * 1024);
    expect(ticks).toBeGreaterThanOrEqual(5);
    expect(changedEarly).toBe(false);
    expect(sky.starSplatGroup).not.toBe(before);
    expect(sky.uploading).toBe(false);
  });

  it("destroys a partial upload when another field is set", async () => {
    const { engine, buffers } = await spied();
    const sky = skyOf(engine);
    const first = field(300_000);
    sky.setStarField(first);
    sky.advanceUpload();
    const partial = buffers[buffers.length - 1]!;
    expect(partial.size).toBe(300_000 * STAR_FLOATS * 4);
    sky.setStarField(field(10));
    expect(partial.destroy).toHaveBeenCalledOnce();
    while (sky.advanceUpload()) {
      /* until complete */
    }
    expect(sky.uploading).toBe(false);
    expect((sky as unknown as { starCount: number }).starCount).toBe(10);
  });

  it("goes on when a view is removed during an upload", async () => {
    const { engine } = await spied();
    const view = engine.addView({
      target: new OffscreenTarget(64, 36),
      world: engine.createWorld(),
    });
    const sky = skyOf(engine);
    sky.setStarField(field(300_000));
    sky.advanceUpload();
    engine.removeView(view);
    expect(() => {
      while (sky.advanceUpload()) {
        /* until complete */
      }
    }).not.toThrow();
  });

  it("is finished by renderFrame outside the loop", async () => {
    const { engine } = await spied();
    const sky = skyOf(engine);
    sky.setStarField(field(300_000));
    engine.renderFrame();
    expect(sky.uploading).toBe(false);
  });
});

describe("Engine.setSkyPack", () => {
  let engine: Engine;
  let request: ReturnType<typeof vi.fn>;
  let warn: ReturnType<typeof vi.spyOn>;
  const workers = (e: Engine) =>
    (e as unknown as { scene: { workers: { request: unknown } } }).scene
      .workers;

  beforeEach(async () => {
    vi.stubGlobal("location", { href: "https://app.test/" });
    engine = await fakeEngine();
    request = vi.fn();
    workers(engine).request = request;
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps what is drawn, with one warning, when the pack is refused", async () => {
    request.mockRejectedValue(
      new SkyPackError("points.bin", "count", "the file holds 3 stars"),
    );
    const points = skyOf(engine).starPoints;
    expect(await engine.setSkyPack("https://p.test/pack/")).toBeUndefined();
    expect(await engine.setSkyPack("https://p.test/pack/")).toBeUndefined();
    expect(skyOf(engine).starPoints).toBe(points);
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]![0])).toContain("points.bin, count");
  });

  it("uploads a pack that arrives, and warns once that it isn't distributable", async () => {
    const m = manifest();
    request.mockResolvedValue({ manifest: m, notes: [], field: field(10) });
    expect(await engine.setSkyPack("https://p.test/pack/")).toBe(m);
    await engine.setSkyPack("https://p.test/pack/");
    expect(skyOf(engine).uploading).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]![0])).toContain("synthetic");
  });

  it("null goes back to the star map set last", async () => {
    request.mockReturnValue(new Promise(() => {}));
    const stars = vi.spyOn(engine, "setStarMap");
    engine.setStarMap(["a.png", "b.png", "c.png", "d.png", "e.png", "f.png"]);
    stars.mockClear();
    await engine.setSkyPack(null);
    expect(stars).toHaveBeenCalledWith([
      "a.png",
      "b.png",
      "c.png",
      "d.png",
      "e.png",
      "f.png",
    ]);
  });

  it("a pack replaced while it loads is dropped", async () => {
    let finish!: (v: unknown) => void;
    request.mockReturnValueOnce(new Promise((r) => (finish = r)));
    const first = engine.setSkyPack("https://p.test/one/");
    await engine.setSkyPack(null);
    finish({ manifest: manifest(), notes: [], field: field(10) });
    expect(await first).toBeUndefined();
    expect(skyOf(engine).uploading).toBe(false);
  });
});

describe("a pack and the on-demand loop", () => {
  let now = 1000;
  let queue = new Map<number, FrameRequestCallback>();
  let handle = 1;
  let engine: Engine;

  beforeEach(async () => {
    now = 1000;
    queue = new Map();
    handle = 1;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      queue.set(handle, cb);
      return handle++;
    });
    vi.stubGlobal("cancelAnimationFrame", (h: number) => queue.delete(h));
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("location", { href: "https://app.test/" });
    engine = await fakeEngine();
  });
  afterEach(() => {
    engine.stop();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function frames(n: number): Promise<number> {
    let run = 0;
    for (let i = 0; i < n; i++) {
      now += 1000 / 60;
      const due = [...queue.values()];
      queue.clear();
      for (const cb of due) {
        run++;
        cb(now);
      }
      await new Promise((resolve) => setImmediate(resolve));
    }
    return run;
  }

  it("asks for ticks while it uploads, then sleeps", async () => {
    engine.addView({
      target: new OffscreenTarget(64, 36),
      world: engine.createWorld(),
      observer: { exposure: { ev100: 15 } },
    });
    engine.start();
    await frames(30);
    expect(queue.size).toBe(0);
    (
      engine as unknown as { scene: { workers: { request: unknown } } }
    ).scene.workers.request = async () => ({
      manifest: manifest(),
      notes: [],
      field: field(300_000),
    });
    await engine.setSkyPack("https://p.test/pack/");
    expect(skyOf(engine).uploading).toBe(true);
    expect(await frames(30)).toBeGreaterThan(1);
    expect(skyOf(engine).uploading).toBe(false);
    expect(queue.size).toBe(0);
    expect(await frames(120)).toBe(0);
    expect(engine.stats.idle).toBe(true);
  });
});
