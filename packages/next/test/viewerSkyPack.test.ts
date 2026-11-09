// A Viewer takes a sky data pack and shows its credits as text, on screen,
// while the pack draws. Synthetic packs only; the worker is replaced by a
// function, and the DOM by a small fake.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SkyPackError,
  type SkyPackManifest,
} from "../src/atmosphere/skyPack.ts";
import { STAR_FLOATS, type StarField } from "../src/atmosphere/stars.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { attachCredits } from "../widgets/credits.ts";
import type { Viewer } from "../widgets/Viewer.ts";
import { fakeDevice, fakeEngine } from "./fakeGpu.ts";

function element(): unknown {
  const device = fakeDevice({});
  const el = {
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

const CREDITS = ["Made up by A", '<img src=x onerror="boom()">'];

function manifest(distributable = false): SkyPackManifest {
  return {
    format: 1,
    name: "synthetic",
    distributable,
    sources: [],
    credits: CREDITS,
    modelled: [],
    points: { file: "points.bin", count: 1, floatsPerStar: 8 },
    background: {
      file: "background.bin",
      size: 1,
      levels: 1,
      meanLuminance: 0,
      holdsFaintStars: false,
    },
  };
}

const field = (): StarField => ({
  points: new Float32Array(STAR_FLOATS).fill(0.5),
  count: 1,
  backgroundLevels: Array.from({ length: 6 }, () => [new Float32Array(4)]),
  backgroundSize: 1,
  holdsFaintStars: false,
  meanBackground: 0,
});

let engine: Engine;
let request: ReturnType<typeof vi.fn>;
let warn: ReturnType<typeof vi.spyOn>;

async function makeViewer(options: Record<string, unknown> = {}) {
  const { Viewer } = await import("../widgets/Viewer.ts");
  return Viewer.create(element() as HTMLElement, {
    engine,
    globe: false,
    imagery: false,
    credits: false,
    timeControls: false,
    warningNotice: false,
    moon: false,
    cityLights: false,
    ...options,
  });
}

beforeEach(async () => {
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
  vi.stubGlobal("location", { href: "https://app.test/" });
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  engine = await fakeEngine();
  request = vi.fn((type: string) =>
    type === "skyPack"
      ? Promise.resolve({ manifest: manifest(), notes: [], field: field() })
      : new Promise(() => {}),
  );
  (
    engine as unknown as { scene: { workers: { request: unknown } } }
  ).scene.workers.request = request;
});
afterEach(() => {
  engine.stop();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("a Viewer with a sky pack", () => {
  let viewer: Viewer;
  afterEach(() => viewer.destroy());

  it("lists the pack's credits while it draws, and not after setSkyPack(null)", async () => {
    viewer = await makeViewer({ skyPack: "https://p.test/pack/" });
    await vi.waitFor(() => expect(viewer.credits().credits).toEqual(CREDITS));
    expect(viewer.credits().pinned).toEqual(CREDITS);
    await viewer.setSkyPack(null);
    expect(viewer.credits().credits).toEqual([]);
    expect(viewer.credits().pinned).toEqual([]);
  });

  it("adds no credit with stars: false", async () => {
    viewer = await makeViewer({
      stars: false,
      skyPack: "https://p.test/pack/",
    });
    expect(await viewer.setSkyPack("https://p.test/pack/")).toBeUndefined();
    expect(viewer.credits().credits).toEqual([]);
    expect(request).not.toHaveBeenCalledWith(
      "skyPack",
      expect.anything(),
      expect.anything(),
    );
  });

  it("keeps today's map, with no credit and one warning, when the pack fails", async () => {
    request.mockImplementation((type: string) =>
      type === "skyPack"
        ? Promise.reject(new SkyPackError("points.bin", "count", "3 stars"))
        : new Promise(() => {}),
    );
    viewer = await makeViewer({ skyPack: "https://p.test/pack/" });
    await vi.waitFor(() => expect(warn).toHaveBeenCalledOnce());
    await viewer.setSkyPack("https://p.test/pack/");
    expect(viewer.credits().credits).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]![0])).toContain("points.bin, count");
  });

  it("warns once, naming the pack, that it isn't distributable, across two loads", async () => {
    viewer = await makeViewer({ skyPack: "https://p.test/pack/" });
    await vi.waitFor(() => expect(warn).toHaveBeenCalledOnce());
    await viewer.setSkyPack("https://p.test/pack/");
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]![0])).toContain("synthetic");
  });

  it("makes no pack request without a skyPack", async () => {
    viewer = await makeViewer();
    expect(request.mock.calls.map((c) => c[0])).not.toContain("skyPack");
    expect(viewer.credits()).toEqual({
      attributions: [],
      credits: [],
      pinned: [],
    });
  });
});

/** A DOM small enough for the credits bar: children are nodes or strings. */
class FakeNode {
  className = "";
  title = "";
  hidden = false;
  type = "";
  children: Array<FakeNode | string> = [];
  attrs: Record<string, string> = {};
  tag: string;
  constructor(tag: string) {
    this.tag = tag;
  }
  append(...items: Array<FakeNode | string>) {
    this.children.push(...items);
  }
  replaceChildren(...items: Array<FakeNode | string>) {
    this.children = items;
  }
  addEventListener() {}
  setAttribute(k: string, v: string) {
    this.attrs[k] = v;
  }
  remove() {}
  contains() {
    return false;
  }
  get childElementCount() {
    return this.children.filter((c) => typeof c !== "string").length;
  }
  get text(): string {
    return this.children
      .map((c) => (typeof c === "string" ? c : c.text))
      .join("|");
  }
  elements(): FakeNode[] {
    return this.children.flatMap((c) =>
      typeof c === "string" ? [] : [c, ...c.elements()],
    );
  }
}

describe("the credits bar", () => {
  it("shows pinned credits as text: markup in one makes no element", () => {
    vi.stubGlobal("document", {
      createElement: (tag: string) => new FakeNode(tag),
      getElementById: () => ({}),
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    const handle = attachCredits(
      new FakeNode("div") as unknown as HTMLElement,
      () => ({ attributions: [], credits: CREDITS, pinned: CREDITS }),
      { interval: 1e9 },
    );
    const root = handle.element as unknown as FakeNode;
    const bar = root.children[0] as FakeNode;
    const logos = bar.children[0] as FakeNode;
    expect(logos.text).toBe(CREDITS.join("|"));
    expect(logos.children.every((c) => typeof c !== "string")).toBe(true);
    // No element was made from the markup: only the spans we asked for.
    const tags = root.elements().map((e) => e.tag);
    expect(tags).not.toContain("img");
    handle.dispose();
  });
});
