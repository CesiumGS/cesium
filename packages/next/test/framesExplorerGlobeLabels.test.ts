// The globe's labels and the frame they are drawn in (globe.ts, Task 4c: the
// owner's "the MOON_ME label is jittering" and Orion's dot's wobble). The
// engine renders a frame before the page's frame loop runs, so the labels
// are placed at the loop's start, against that rendered frame. A label set
// mid-frame (Orion's minute turns every frame at 1 h/s) must not be placed
// then, against the new instant and a camera not yet carried: it waits for
// the next frame's placement. Before the loop runs, it is placed at once.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Globe, type LabelSpec } from "../examples/frames-explorer/globe.ts";
import type { Frame } from "../src/frames/Frame.ts";
import type { Instant } from "../src/time/Instant.ts";
import type { Viewer } from "../widgets/index.ts";

/** Just enough of an element for the globe's labels. */
class El {
  className = "";
  hidden = false;
  textContent = "";
  dataset: Record<string, string> = {};
  style = {
    transform: "",
    setProperty(this: Record<string, string>, k: string, v: string) {
      this[k] = v;
    },
  };
  classList = { toggle: () => {}, contains: () => false };
  offsetWidth = 60;
  offsetHeight = 14;
  clientWidth = 800;
  clientHeight = 600;
  setAttribute() {}
  append() {}
  remove() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 800, height: 600 };
  }
  querySelectorAll() {
    return [];
  }
}

beforeEach(() => {
  vi.stubGlobal("document", { createElement: () => new El() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function globe() {
  // A camera 1e9 m out on +x, looking back at the Earth.
  const camera = {
    position: Float64Array.of(1e9, 0, 0),
    direction: Float64Array.of(-1, 0, 0),
    right: Float64Array.of(0, 1, 0),
    up: Float64Array.of(0, 0, 1),
    fovy: () => 1,
  };
  const viewer = {
    view: { camera },
    canvas: { clientWidth: 800, clientHeight: 600 },
    container: new El(),
    world: {},
  } as unknown as Viewer;
  const g = new Globe(
    viewer,
    { defer: () => {} } as unknown as DisposableStack,
    new El() as unknown as HTMLElement,
  );
  return { g, camera };
}

/** A label far out, 5e8 m from the Earth (a Moon frame's distance). */
const far = (id: string): LabelSpec => ({
  id,
  text: id,
  at: Float64Array.of(5e8, 1e7, 0),
  priority: 1,
});

/** The elements the globe makes from here on, in order. */
function track() {
  const made: El[] = [];
  vi.stubGlobal("document", {
    createElement: () => {
      const el = new El();
      made.push(el);
      return el;
    },
  });
  return made;
}

describe("the globe's labels are placed against the frame the engine renders (Task 4c)", () => {
  it("places a label at once before the frame loop runs", () => {
    const { g } = globe();
    const made = track();
    g.setLabels([far("MOON_ME")]);
    expect(made[0]!.hidden).toBe(false);
    expect(made[0]!.style.transform).toMatch(/^translate\(/);
  });

  it("while the loop runs, a label set mid-frame isn't moved until the next frame's placement", () => {
    const { g, camera } = globe();
    const made = track();
    g.setLabels([far("MOON_ME")]);
    g.update({} as Frame, {} as Instant);
    g.placeLabels();
    const placed = made[0]!.style.transform;
    // Mid-frame: the camera is carried, and the labels are set again.
    camera.position[1] = 2e7;
    g.setLabels([far("MOON_ME"), far("Orion, 23:01 UTC")]);
    expect(made[0]!.style.transform, "not moved mid-frame").toBe(placed);
    expect(made[1]!.hidden, "a new label waits, hidden").toBe(true);
    // The next frame's start: both placed against what it renders.
    g.placeLabels();
    expect(made[0]!.style.transform).not.toBe(placed);
    expect(made[1]!.hidden).toBe(false);
  });

  it("doesn't place the labels in its per-frame update: the loop places them first", () => {
    const { g, camera } = globe();
    const made = track();
    g.setLabels([far("MOON_ME")]);
    g.update({} as Frame, {} as Instant);
    g.placeLabels();
    const placed = made[0]!.style.transform;
    camera.position[1] = 2e7;
    g.update({} as Frame, {} as Instant);
    expect(made[0]!.style.transform).toBe(placed);
  });
});
