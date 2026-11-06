// Task 4c item 4, parked from Task 4's review (P5), and item 3's other half:
// the edge tips' portal inside StrataKit's root (panel/designRoot.ts), a
// pinned globe label kept clear of the panels over the view
// (labelPanels.ts: at 1280×700 the callout covered "Orion, 23:00 UTC"), and
// "Open in Verification" on a result already selected leaving no quiet flag
// behind (globeSelection.ts).
import { describe, expect, it, vi } from "vitest";
import type { CameraView } from "../examples/frames-explorer/cameraViews.ts";
import { createGlobeSelection } from "../examples/frames-explorer/globeSelection.ts";
import {
  clearOfPanels,
  overlaps,
  type Box,
} from "../examples/frames-explorer/labelPanels.ts";
import type { PageCore } from "../examples/frames-explorer/page.ts";
import { designRoot } from "../examples/frames-explorer/panel/designRoot.ts";
import { ViewStore } from "../examples/frames-explorer/selection.ts";
import type { StressResult } from "../examples/frames-explorer/tests.ts";

describe("a portal's place (the tree's edge tips)", () => {
  const body = { id: "body" } as unknown as HTMLElement;
  it("goes inside StrataKit's root, where its tokens and colour scheme apply", () => {
    const root = { id: "root" } as unknown as HTMLElement;
    const from = {
      closest: (s: string) => (s === ".🥝Root" ? root : null),
    } as unknown as Element;
    expect(designRoot(from, body)).toBe(root);
  });
  it("falls back to the body outside a root, or with no element yet", () => {
    const from = { closest: () => null } as unknown as Element;
    expect(designRoot(from, body)).toBe(body);
    expect(designRoot(null, body)).toBe(body);
  });
});

describe("a pinned label clear of the panels over the view (1280×700)", () => {
  const view = { w: 396, h: 500 };
  // The callout at the view's top right; Orion's dot just under its foot.
  const callout: Box = { x: 190, y: 20, w: 200, h: 120 };
  const point = { x: 300, y: 135 };
  const box: Box = { x: 312, y: 127, w: 80, h: 16 };

  it("moves the text just past the panel it would sit under, the dot where it is", () => {
    expect(overlaps(box, callout)).toBe(true);
    const moved = clearOfPanels(box, point, [callout], view);
    expect(overlaps(moved, callout)).toBe(false);
    expect(moved.x).toBe(box.x);
    expect(moved.y).toBe(callout.y + callout.h + 2);
  });

  it("takes the other side of the point when that is the nearest clear place", () => {
    const tall: Box = { x: 305, y: 0, w: 91, h: 500 };
    const moved = clearOfPanels(box, point, [tall], view);
    expect(overlaps(moved, tall)).toBe(false);
    expect(moved.x + moved.w).toBeLessThanOrEqual(point.x);
    expect(moved.y).toBe(box.y);
  });

  it("leaves a box no panel touches, or one with nowhere clear to go, where it is", () => {
    expect(clearOfPanels(box, point, [], view)).toEqual(box);
    const all: Box = { x: 0, y: 0, w: 396, h: 500 };
    expect(clearOfPanels(box, point, [all], view)).toEqual(box);
  });
});

describe("Open in Verification on the result already selected (quiet flag)", () => {
  it("leaves no quiet flag: the next time the result is chosen, the camera goes to it", () => {
    const view = new ViewStore();
    const result = {
      id: "lunar-time.moon-vs-earth.synodic",
      group: "lunar-time",
      title: "",
      pass: true,
      value: 0,
      tolerance: 0.02,
    } as unknown as StressResult;
    const lunar = { framing: { center: [0, 0, 0] } } as unknown as CameraView;
    const show = vi.fn();
    const selection = createGlobeSelection({
      core: {
        globe: { emphasize: () => {}, dimGround: () => {} },
        view,
        invalidate: () => {},
        disposed: () => false,
      } as unknown as PageCore,
      setParams: () => {},
      scenarioParams: () => ({}) as never,
      tree: { tree: () => undefined, ids: () => new Set() },
      catalog: {
        results: () => [result],
        lastRun: () => undefined,
        run: () => Promise.resolve(undefined),
      },
      userResults: () => [],
      evaluation: () => undefined,
      overlays: {
        set: () => {},
        settings: () => ({ distortionCrs: "utm10n" }) as never,
      },
      views: { lunarSiteView: () => lunar } as never,
      show,
      stage: {
        scene: () => undefined,
        exposure: () => 0,
        flyToScene: () => {},
      },
      refreshTriads: () => {},
      startWalk: () => {},
      refreshCallouts: () => {},
    });
    const choose = (s: Parameters<ViewStore["select"]>[0]) => {
      view.select(s);
      selection.onView();
    };
    choose({ kind: "result", id: result.id });
    expect(show).toHaveBeenCalledTimes(1);
    // From the proof row, while it is already the selection: nothing moves.
    selection.selectQuietly(result.id);
    choose({ kind: "result", id: result.id });
    expect(show).toHaveBeenCalledTimes(1);
    // Chosen again later, in Verification: it flies, as a selection does.
    choose({ kind: "none" });
    choose({ kind: "result", id: result.id });
    expect(show).toHaveBeenCalledTimes(2);
    expect(show).toHaveBeenLastCalledWith(lunar);
  });
});
