// A tileset's attributions belong to the tileset, so a Viewer credits what is
// drawn in its world whoever added it: `world.add` as much as
// `viewer.addTileset`. They go away with the last item. A real Viewer over
// a fake DOM and the fake device of test/fakeGpu.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Attribution } from "../src/io/ion.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { Viewer } from "../widgets/Viewer.ts";
import { fakeDevice, fakeEngine } from "./fakeGpu.ts";

const URL_ = "https://tiles.test/credit/tileset.json";
const LOGO: Attribution = { html: "<b>Logo</b>", collapsible: false };
const NOTICE: Attribution = { html: "A notice", collapsible: true };

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

let engine: Engine;
let viewer: Viewer;

beforeEach(async () => {
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          asset: { version: "1.1" },
          geometricError: 1,
          root: {
            geometricError: 0,
            refine: "REPLACE",
            boundingVolume: { sphere: [6_378_137, 0, 0, 10] },
          },
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
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
  engine = await fakeEngine();
  const { Viewer } = await import("../widgets/Viewer.ts");
  viewer = await Viewer.create(element() as HTMLElement, {
    engine,
    globe: false,
    imagery: false,
    credits: false,
    timeControls: false,
    warningNotice: false,
    stars: false,
    moon: false,
    cityLights: false,
  });
});
afterEach(() => {
  viewer.destroy();
  engine.stop();
  vi.unstubAllGlobals();
});

describe("a Viewer credits the content in its world", () => {
  it("a world.add item's attributions appear, and go with its last item", async () => {
    const tileset = await engine.loadTileset(URL_, {
      attributions: [LOGO, NOTICE],
    });
    expect(tileset.attributions).toEqual([LOGO, NOTICE]);
    expect(viewer.credits().attributions).toEqual([]);
    const first = viewer.world.add(tileset);
    const second = viewer.world.add(tileset, { opacity: 0.5 });
    expect(viewer.credits().attributions).toEqual([LOGO, NOTICE]);
    first.remove();
    // Still drawn by one item: still credited, once.
    expect(viewer.credits().attributions).toEqual([LOGO, NOTICE]);
    second.remove();
    expect(viewer.credits().attributions).toEqual([]);
    engine.removeTileset(tileset);
  });

  it("an item shown in no view doesn't credit, and a tileset without attributions adds none", async () => {
    const tileset = await engine.loadTileset(URL_, { attributions: [LOGO] });
    const item = viewer.world.add(tileset, { viewMask: 0 });
    expect(viewer.credits().attributions).toEqual([]);
    item.viewMask = 0xffffffff;
    expect(viewer.credits().attributions).toEqual([LOGO]);
    item.remove();
    const plain = await engine.loadTileset(URL_);
    viewer.world.add(plain);
    expect(viewer.credits().attributions).toEqual([]);
    engine.removeTileset(tileset);
    engine.removeTileset(plain);
  });

  it("viewer.addTileset's tileset carries the attributions it was given, and viewer.remove ends them", async () => {
    const tileset = await viewer.addTileset(URL_, { attributions: [LOGO] });
    expect(viewer.credits().attributions).toEqual([LOGO]);
    viewer.remove(tileset);
    expect(viewer.credits().attributions).toEqual([]);
  });
});
