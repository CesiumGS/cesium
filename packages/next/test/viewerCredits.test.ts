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

  it("credits follow what is visible: not a hidden or transparent item, nor a mask naming no view of the viewer", async () => {
    const tileset = await engine.loadTileset(URL_, { attributions: [LOGO] });
    const item = viewer.world.add(tileset);
    expect(viewer.credits().attributions).toEqual([LOGO]);
    item.show = false;
    expect(viewer.credits().attributions).toEqual([]);
    item.show = true;
    item.opacity = 0;
    expect(viewer.credits().attributions).toEqual([]);
    item.opacity = 0.5;
    expect(viewer.credits().attributions).toEqual([LOGO]);
    // A view of the engine's, which the viewer doesn't draw.
    const mine = engine.viewBit(viewer.view);
    const other = (mine << 1) >>> 0;
    item.viewMask = other;
    expect(viewer.credits().attributions).toEqual([]);
    item.viewMask = mine;
    expect(viewer.credits().attributions).toEqual([LOGO]);
    tileset.show = false;
    expect(viewer.credits().attributions).toEqual([]);
    engine.removeTileset(tileset);
  });

  it("the inspector lists a tileset added by world.add, once", async () => {
    // Tiles known, summed over the tilesets inspected: one tileset's is `one`.
    const known = () =>
      (viewer.inspectable("viewer").snapshot() as { tiles?: { known: number } })
        .tiles?.known;
    const loaded = await engine.loadTileset(URL_);
    viewer.world.add(loaded);
    viewer.world.add(loaded, { opacity: 0.5 });
    const one = known()!;
    expect(one).toBeGreaterThan(0);
    const added = await viewer.addTileset(URL_);
    expect(known()).toBe(2 * one);
    viewer.remove(added);
    expect(known()).toBe(one);
    engine.removeTileset(loaded);
    expect(known()).toBeUndefined();
  });
});
