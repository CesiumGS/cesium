// The observer's controls (sky and observer plan, Task 17): the sign of the
// exposure slider, EV100 in every readout, what is physics, a model or a look, and
// that the panel follows the view. A small DOM stand-in, since Node has none.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ObserverSettings, SkyPackManifest } from "../src/index.ts";
import { installGpuGlobals } from "./fakeGpu.ts";

// The engine reads WebGPU's constants as it loads.
installGpuGlobals();
const { cameraObserver, eyeObserver } = await import("../src/index.ts");
const { View } = await import("../src/scene/View.ts");
const {
  attachObserverPanel,
  ev100FromSlider,
  ev100Text,
  exposureMode,
  readoutText,
  signed,
  sliderFromEv100,
} = await import("../widgets/observerPanel.ts");

// ------------------------------------------------------------------ fake DOM

class FakeNode {
  parent?: FakeElement;
}

class FakeText extends FakeNode {
  constructor(public text: string) {
    super();
  }
}

type Listener = (event: Record<string, unknown>) => void;

class FakeElement extends FakeNode {
  children: Array<FakeElement | FakeText> = [];
  attributes = new Map<string, string>();
  listeners = new Map<string, Set<Listener>>();
  style: Record<string, string> = {};
  className = "";
  hidden = false;
  disabled = false;
  checked = false;
  value = "";
  tabIndex = 0;
  constructor(readonly tag: string) {
    super();
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
    if (name === "value") {
      this.value = value;
    }
    if (name === "hidden") {
      this.hidden = true;
    }
  }
  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
  append(...nodes: Array<FakeElement | FakeText | string>) {
    for (const n of nodes) {
      const node = typeof n === "string" ? new FakeText(n) : n;
      node.parent = this;
      this.children.push(node);
    }
  }
  replaceChildren(...nodes: Array<FakeElement | FakeText | string>) {
    this.children = [];
    this.append(...nodes);
  }
  remove() {
    const parent = this.parent;
    if (parent) {
      parent.children = parent.children.filter((c) => c !== this);
      this.parent = undefined;
    }
  }
  get textContent(): string {
    return this.children
      .map((c) => (c instanceof FakeText ? c.text : c.textContent))
      .join("");
  }
  set textContent(text: string) {
    this.children = [];
    if (text) {
      this.append(text);
    }
  }
  addEventListener(type: string, listener: Listener) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }
  dispatch(type: string, event: Record<string, unknown> = {}) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener({ preventDefault() {}, ...event });
    }
  }
  focus() {
    fakeDocument.activeElement = this;
  }
  get listenerCount() {
    let n = 0;
    for (const set of this.listeners.values()) {
      n += set.size;
    }
    return n;
  }
}

const fakeDocument = {
  activeElement: undefined as FakeElement | undefined,
  head: new FakeElement("head"),
  createElement: (tag: string) => new FakeElement(tag),
  getElementById: (id: string) =>
    fakeDocument.head.children.find(
      (c) => c instanceof FakeElement && c.getAttribute("id") === id,
    ) ?? null,
};

function walk(node: FakeElement, visit: (e: FakeElement) => void) {
  visit(node);
  for (const child of node.children) {
    if (child instanceof FakeElement) {
      walk(child, visit);
    }
  }
}

const find = (root: FakeElement, control: string) => {
  let found: FakeElement | undefined;
  walk(root, (e) => {
    if (e.getAttribute("data-control") === control) {
      found = e;
    }
  });
  if (!found) {
    throw new Error(`no control ${control}`);
  }
  return found;
};

const readout = (root: FakeElement, name: string) => {
  let found: FakeElement | undefined;
  walk(root, (e) => {
    if (e.getAttribute("data-readout") === name) {
      found = e;
    }
  });
  return found!;
};

/** Whether `node` or an ancestor is hidden. */
const shown = (node: FakeElement): boolean => {
  for (let n: FakeElement | undefined = node; n; n = n.parent) {
    if (n.hidden) {
      return false;
    }
  }
  return true;
};

// -------------------------------------------------------------------- setup

let container: FakeElement;

function makeView(
  observer: Partial<ObserverSettings> = cameraObserver({ ev100: 5 }),
) {
  return new View({
    target: {} as never,
    world: {} as never,
    observer,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("document", fakeDocument);
  fakeDocument.head = new FakeElement("head");
  container = new FakeElement("div");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const attach = (view: InstanceType<typeof View>, options = {}) =>
  attachObserverPanel(container as unknown as HTMLElement, view, options);
const root = (handle: { element: HTMLElement }) =>
  handle.element as unknown as FakeElement;

describe("the exposure slider", () => {
  it("runs right for brighter: a step right raises the view's scale", () => {
    const view = makeView();
    const panel = attach(view);
    const slider = find(root(panel), "exposure.ev100");
    const before = view.readout().preExposure;
    slider.value = String(Number(slider.value) + 0.1);
    slider.dispatch("input");
    expect(view.readout().preExposure).toBeGreaterThan(before);
    expect((view.observer.exposure as { ev100: number }).ev100).toBeCloseTo(
      4.9,
      5,
    );
    panel.dispose();
  });

  it("moves with ArrowRight, the same way", () => {
    const view = makeView();
    const panel = attach(view);
    const slider = find(root(panel), "exposure.ev100");
    const before = view.readout().preExposure;
    slider.dispatch("keydown", { key: "ArrowRight" });
    expect(view.readout().preExposure).toBeGreaterThan(before);
    slider.dispatch("keydown", { key: "ArrowLeft" });
    slider.dispatch("keydown", { key: "ArrowLeft" });
    expect(view.readout().preExposure).toBeLessThan(before);
    slider.dispatch("keydown", { key: "PageUp" });
    expect((view.observer.exposure as { ev100: number }).ev100).toBeCloseTo(
      4.1,
      5,
    );
    panel.dispose();
  });

  it("has its ends at EV100 18 and -12, and reads in EV100", () => {
    const view = makeView();
    const panel = attach(view);
    const slider = find(root(panel), "exposure.ev100");
    expect(slider.getAttribute("min")).toBe("-18");
    expect(slider.getAttribute("max")).toBe("12");
    expect(slider.getAttribute("aria-valuetext")).toBe(`EV100 5.0`);
    slider.dispatch("keydown", { key: "End" });
    expect(slider.getAttribute("aria-valuetext")).toBe("EV100 −12.0");
    expect(ev100FromSlider(sliderFromEv100(7.5))).toBe(7.5);
    panel.dispose();
  });

  it("shows no scale or stop count in place of EV100 in the fixed mode", () => {
    const view = makeView();
    const panel = attach(view);
    const texts: string[] = [];
    walk(root(panel), (e) => {
      if (e.tag === "output" && shown(e)) {
        texts.push(e.textContent);
      }
    });
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text).not.toMatch(/stops|scale|\bx\d/);
    }
    expect(texts.some((t) => t.startsWith("EV100"))).toBe(true);
    panel.dispose();
  });
});

describe("the readout", () => {
  it("starts with ≈ for the eye, which has an equivalent only", () => {
    const view = makeView(eyeObserver());
    view.exposureScale = 3e-5;
    const panel = attach(view);
    const text = readout(root(panel), "exposure").textContent;
    expect(text).toMatch(/^≈ EV100 /);
    panel.dispose();
  });

  it("says 'no units' for a plain scale, and explains it", () => {
    const view = makeView({ exposure: { scale: 1 } });
    const panel = attach(view);
    expect(readout(root(panel), "exposure").textContent).toBe("no units");
    expect(exposureMode(view.observer.exposure)).toBe("scale");
    expect(readoutText(view.readout())).toBe("no units");
    panel.dispose();
  });

  it("formats with a true minus and one place", () => {
    expect(signed(-3)).toBe("−3.0");
    expect(signed(-0.04)).toBe("0.0");
    expect(signed(1.25, 1, true)).toBe("+1.3");
    expect(ev100Text(-3)).toBe("EV100 −3.0");
    expect(ev100Text(14.2, true)).toBe("≈ EV100 14.2");
  });

  it("keeps every readout's width fixed", () => {
    const view = makeView();
    const panel = attach(view);
    walk(root(panel), (e) => {
      if (e.tag === "output") {
        expect(e.style.minWidth, e.className).toMatch(/ch$/);
      }
    });
    panel.dispose();
  });
});

describe("what a control is", () => {
  it("puts every control under a physics, model or look section", () => {
    const view = makeView();
    const panel = attach(view);
    let count = 0;
    walk(root(panel), (e) => {
      if (e.tag === "input" || e.tag === "select" || e.tag === "button") {
        count++;
        let kind: string | null = null;
        for (let n: FakeElement | undefined = e; n && !kind; n = n.parent) {
          kind = n.getAttribute("data-kind");
        }
        expect(
          ["physics", "model", "look"],
          e.getAttribute("data-control") ?? "",
        ).toContain(kind);
      }
    });
    expect(count).toBeGreaterThan(12);
    panel.dispose();
  });

  it("tags each section by what it is", () => {
    const view = makeView();
    const panel = attach(view);
    const kinds = new Map<string, string>();
    walk(root(panel), (e) => {
      const key = e.getAttribute("data-section");
      if (key) {
        kinds.set(key, e.getAttribute("data-kind")!);
      }
    });
    expect(Object.fromEntries(kinds)).toEqual({
      exposure: "physics",
      optics: "model",
      look: "look",
      sky: "data",
    });
    panel.dispose();
  });

  it("calls the astrophoto control a look, and sets its stage", () => {
    const view = makeView();
    const panel = attach(view);
    const control = find(root(panel), "look.astrophoto");
    control.checked = true;
    control.dispatch("change");
    expect(view.observer.stages.map((s) => s.name)).toEqual([
      "astrophoto-curve",
    ]);
    let label = "";
    walk(root(panel), (e) => {
      if (
        e.tag === "label" &&
        e.getAttribute("for")?.endsWith("look.astrophoto")
      ) {
        label = e.textContent;
      }
    });
    expect(label.toLowerCase()).toContain("look");
    control.checked = false;
    control.dispatch("change");
    expect(view.observer.stages).toHaveLength(0);
    panel.dispose();
  });

  it("names glare and the eye's limit as models, not looks", () => {
    const view = makeView();
    const panel = attach(view);
    const section = (control: string) => {
      let n: FakeElement | undefined = find(root(panel), control);
      while (n && !n.getAttribute("data-kind")) {
        n = n.parent;
      }
      return n?.getAttribute("data-kind");
    };
    expect(section("optics.veil")).toBe("model");
    expect(section("optics.spikes")).toBe("model");
    expect(section("optics.eyeLimit")).toBe("model");
    expect(section("look.toneMapping")).toBe("look");
    panel.dispose();
  });
});

describe("following the view", () => {
  it("shows an edit made from outside within one tick", () => {
    const view = makeView();
    const panel = attach(view);
    const slider = find(root(panel), "exposure.ev100");
    expect(slider.getAttribute("aria-valuetext")).toBe("EV100 5.0");
    view.observer.exposure = { ev100: 12 };
    vi.advanceTimersByTime(200);
    expect(slider.getAttribute("aria-valuetext")).toBe("EV100 12.0");
    expect(readout(root(panel), "exposure").textContent).toBe("EV100 12.0");
    view.observer = eyeObserver();
    vi.advanceTimersByTime(200);
    expect(
      find(root(panel), "exposure.mode.eye").getAttribute("aria-checked"),
    ).toBe("true");
    panel.dispose();
  });

  it("switches modes through the radio group", () => {
    const view = makeView();
    const panel = attach(view);
    find(root(panel), "exposure.mode.metered").dispatch("click");
    expect("auto" in view.observer.exposure).toBe(true);
    find(root(panel), "exposure.mode.eye").dispatch("click");
    expect("eye" in view.observer.exposure).toBe(true);
    // The eye's faint-star limit is a switch only the eye can use.
    expect(find(root(panel), "optics.eyeLimit").disabled).toBe(false);
    find(root(panel), "exposure.mode.fixed").dispatch("click");
    expect("ev100" in view.observer.exposure).toBe(true);
    expect(find(root(panel), "optics.eyeLimit").disabled).toBe(true);
    panel.dispose();
  });

  it("removes itself and its listeners, and its timer, on dispose", () => {
    const view = makeView();
    const panel = attach(view);
    const slider = find(root(panel), "exposure.ev100");
    expect(slider.listenerCount).toBeGreaterThan(0);
    expect(container.children).toHaveLength(1);
    panel.dispose();
    expect(container.children).toHaveLength(0);
    expect(slider.listenerCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    panel.dispose();
  });

  it("shows only the sections asked for", () => {
    const view = makeView();
    const panel = attach(view, { sections: ["exposure", "look"] });
    const keys: string[] = [];
    walk(root(panel), (e) => {
      const key = e.getAttribute("data-section");
      if (key) {
        keys.push(key);
      }
    });
    expect(keys).toEqual(["exposure", "look"]);
    panel.dispose();
  });
});

describe("glare and its tier", () => {
  it("turns the veil on from nothing, with a camera's defaults", () => {
    const view = makeView();
    const panel = attach(view);
    const veil = find(root(panel), "optics.veil");
    veil.checked = true;
    veil.dispatch("change");
    expect(view.observer.glare?.veil).toEqual({ share: 0.2 });
    find(root(panel), "optics.veil.share").value = "30";
    find(root(panel), "optics.veil.share").dispatch("input");
    expect(view.observer.glare?.veil).toEqual({ share: 0.3 });
    panel.dispose();
  });

  it("says which tier is in use and why", () => {
    const view = makeView();
    view.glareResolved = {
      tier: "reduced",
      reason: "an Intel GPU, which starts reduced",
    };
    const panel = attach(view);
    expect(readout(root(panel), "tier").textContent).toMatch(
      /no veil or spikes/i,
    );
    const veil = find(root(panel), "optics.veil");
    veil.checked = true;
    veil.dispatch("change");
    expect(readout(root(panel), "tier").textContent).toBe(
      "In use: reduced, because an Intel GPU, which starts reduced.",
    );
    panel.dispose();
  });
});

describe("the sky section", () => {
  const manifest = (over: Partial<SkyPackManifest>): SkyPackManifest =>
    ({
      format: 1,
      name: "A local pack",
      distributable: false,
      sources: [],
      credits: ["Star data <b>by</b> someone"],
      modelled: [],
      points: { file: "p", count: 1, floatsPerStar: 8 },
      background: {
        file: "b",
        size: 1,
        levels: 1,
        meanLuminance: 0,
        holdsFaintStars: false,
      },
      ...over,
    }) as SkyPackManifest;

  it("says 1.x's star map with no pack", () => {
    const panel = attach(makeView(), { sky: () => undefined });
    expect(readout(root(panel), "pack").textContent).toBe("1.x's star map");
    panel.dispose();
  });

  it("says Not cleared for an uncleared pack, and shows credits as text", () => {
    const panel = attach(makeView(), { sky: () => manifest({}) });
    expect(readout(root(panel), "pack").textContent).toBe("A local pack");
    const badge = readout(root(panel), "cleared");
    expect(badge.hidden).toBe(false);
    expect(badge.textContent).toBe("Not cleared: local use only");
    const credits = readout(root(panel), "credits");
    expect(credits.children).toHaveLength(1);
    expect(credits.textContent).toBe("Star data <b>by</b> someone");
    panel.dispose();
  });

  it("shows no warning for a cleared pack", () => {
    const panel = attach(makeView(), {
      sky: () => manifest({ distributable: true }),
    });
    expect(readout(root(panel), "cleared").hidden).toBe(true);
    panel.dispose();
  });
});

describe("one direction everywhere", () => {
  const read = (path: string) =>
    readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

  it("runs the playground's and Dyno's EV100 sliders the panel's way", () => {
    const playground = read("examples/slang-playground/main.ts");
    expect(playground).toMatch(
      /"ev100",\s*-12,\s*18,\s*ev100Row,\s*\{\s*flip: true/,
    );
    const dyno = read("bench/suite/views/Viewer.tsx");
    expect(dyno).toMatch(/label="Exposure \(EV100\)"[\s\S]{0,200}?\bflip\b/);
    expect(dyno).toContain("sign * value");
  });
});
