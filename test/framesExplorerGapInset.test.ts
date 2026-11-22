// The gap inset's engine view (examples/frames-explorer/gapInset.ts): a
// throw while it is being set up must not leave the view in the engine,
// and the inset steps clear of the tour caption. Node, with a stand-in DOM.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface FakeElement {
  className: string;
  textContent: string;
  hidden: boolean;
  style: Record<string, string> & {
    setProperty(k: string, v: string): void;
    getPropertyValue(k: string): string;
  };
  children: FakeElement[];
  parent?: FakeElement;
  rect: { left: number; top: number; width: number; height: number };
  append(child: FakeElement): void;
  remove(): void;
  setAttribute(k: string, v: string): void;
  querySelector(selector: string): FakeElement | null;
  getBoundingClientRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

function element(): FakeElement {
  const props: Record<string, string> = {};
  const e: FakeElement = {
    className: "",
    textContent: "",
    hidden: false,
    style: Object.assign(props, {
      setProperty: (k: string, v: string) => {
        props[k] = v;
      },
      getPropertyValue: (k: string) => props[k] ?? "",
    }) as FakeElement["style"],
    children: [],
    rect: { left: 0, top: 0, width: 0, height: 0 },
    append(child) {
      child.parent = e;
      e.children.push(child);
    },
    remove() {
      if (e.parent) {
        e.parent.children = e.parent.children.filter((c) => c !== e);
        e.parent = undefined;
      }
    },
    setAttribute() {},
    querySelector(selector) {
      const name = selector.replace(/^\./, "");
      const walk = (n: FakeElement): FakeElement | null => {
        for (const c of n.children) {
          if (c.className.split(" ").includes(name)) {
            return c;
          }
          const d = walk(c);
          if (d) {
            return d;
          }
        }
        return null;
      };
      return walk(e);
    },
    getBoundingClientRect() {
      return { ...e.rect, x: e.rect.left, y: e.rect.top };
    },
  };
  return e;
}

/** Every observer's observed elements, to check what each still watches. */
const observers: FakeObserver[] = [];
class FakeObserver {
  readonly watched = new Set<unknown>();
  constructor(readonly callback: () => void = () => {}) {
    observers.push(this);
  }
  observe(target: unknown) {
    this.watched.add(target);
  }
  unobserve(target: unknown) {
    this.watched.delete(target);
  }
  disconnect() {
    this.watched.clear();
  }
}

beforeEach(() => {
  vi.stubGlobal("document", { createElement: () => element() });
  vi.stubGlobal("ResizeObserver", FakeObserver);
  vi.stubGlobal("MutationObserver", FakeObserver);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const { GapInset } = await import("../examples/frames-explorer/gapInset.ts");
const { INSET } = await import("../examples/frames-explorer/inset.ts");

function fakeViewer(options: { lightingThrows?: boolean } = {}) {
  const container = element();
  container.rect = { left: 100, top: 50, width: 600, height: 520 };
  Object.defineProperty(container, "clientWidth", { value: 600 });
  Object.defineProperty(container, "clientHeight", { value: 520 });
  const views: object[] = [];
  const camera = () => ({
    fov: Math.PI / 3,
    near: 1,
    position: new Float64Array(3),
    direction: new Float64Array(3),
    up: new Float64Array(3),
    orient() {},
  });
  const engine = {
    views,
    addView: vi.fn(() => {
      const view = {
        get lighting() {
          if (options.lightingThrows) {
            throw new Error("no lighting");
          }
          return {};
        },
        camera: camera(),
        viewport: {},
        observer: { exposure: {} },
      };
      views.push(view);
      return view;
    }),
    removeView: vi.fn((view: object) => {
      views.splice(views.indexOf(view), 1);
    }),
    viewBit: () => 2,
    requestRender() {},
  };
  return {
    container,
    engine,
    viewer: {
      container,
      engine,
      target: {},
      world: {},
      view: { lighting: {}, camera: camera(), observer: { exposure: {} } },
    },
  };
}

const spec = {
  exact: [-2.7e6, -4.3e6, 3.88e6],
  rigid: [-2.7e6, -4.3e6, 3.88e6 + 31.4],
  along: [1, 0, 0],
  caption: "At 20 km: 31.4 m apart (true scale)",
  leader: "31.4 m",
};

describe("the gap inset's view", () => {
  it("is removed from the engine when its set-up throws, and can be shown again", () => {
    const { viewer, engine } = fakeViewer({ lightingThrows: true });
    const hud = element();
    const excluded: number[] = [];
    const inset = new GapInset(viewer as never, hud as never, (bits) =>
      excluded.push(bits),
    );
    expect(() => inset.show(spec)).toThrow(/no lighting/);
    expect(engine.views).toHaveLength(0);
    expect(engine.removeView).toHaveBeenCalledTimes(1);
    expect(inset.shown).toBe(false);
    expect(hud.children).toHaveLength(0);
    // Nothing excluded from a view that isn't there.
    expect(excluded.at(-1) ?? 0).toBe(0);
    inset.dispose();
    expect(engine.removeView).toHaveBeenCalledTimes(1);
  });

  it("shows, and leaves the engine as it was when hidden", () => {
    const { viewer, engine } = fakeViewer();
    const hud = element();
    const inset = new GapInset(viewer as never, hud as never);
    inset.show(spec);
    expect(engine.views).toHaveLength(1);
    expect(inset.shown).toBe(true);
    inset.hide();
    expect(engine.views).toHaveLength(0);
  });

  it("narrows to stay clear of the tour caption", () => {
    const { viewer } = fakeViewer();
    const hud = element();
    // The tour caption at the top right of a 600 × 520 view, 300 px tall.
    const caption = element();
    caption.className = "fx-hud fx-tour";
    caption.rect = {
      left: 100 + 600 - 12 - 340,
      top: 62,
      width: 340,
      height: 300,
    };
    hud.append(caption);
    const inset = new GapInset(viewer as never, hud as never);
    inset.show(spec);
    const frame = hud.children.find((c) => c.className === "fx-inset")!;
    const left = parseFloat(frame.style.left!);
    const width = parseFloat(frame.style.width!);
    expect(left).toBe(INSET.gutter);
    expect(left + width).toBeLessThanOrEqual(600 - 12 - 340 - INSET.gutter);
  });

  it("watches only the caption that shows: a new one replaces the old, none when it goes", () => {
    observers.length = 0;
    const { viewer } = fakeViewer();
    const hud = element();
    const first = element();
    first.className = "fx-hud fx-tour";
    first.rect = { left: 400, top: 62, width: 340, height: 100 };
    hud.append(first);
    const inset = new GapInset(viewer as never, hud as never);
    inset.show(spec);
    const watching = (e: unknown) => observers.some((o) => o.watched.has(e));
    expect(watching(first)).toBe(true);
    // The tour steps: React mounts a new caption element.
    first.remove();
    const second = element();
    second.className = "fx-hud fx-tour";
    second.rect = { left: 400, top: 62, width: 340, height: 120 };
    hud.append(second);
    for (const o of observers) {
      o.callback();
    }
    expect(watching(first)).toBe(false);
    expect(watching(second)).toBe(true);
    // The tour ends.
    second.remove();
    for (const o of observers) {
      o.callback();
    }
    expect(watching(second)).toBe(false);
    expect(watching(viewer.container)).toBe(true);
  });
});
