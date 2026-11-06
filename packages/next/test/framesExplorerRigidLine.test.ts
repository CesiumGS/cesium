// Tour stop 4 and the "Rigid and exact" overlay at true scale (owner's
// rework, 2026-11-06): the long line's copy, the legend's two entries, and
// the picture-in-picture inset's placement and camera
// (examples/frames-explorer/rigidLine.ts, inset.ts, panel/legendRows.ts).
import { describe, expect, it } from "vitest";
import { NARROW_VIEW } from "../examples/frames-explorer/content.ts";
import {
  INSET,
  gapParts,
  insetBox,
  insetCamera,
  insetViewport,
  projectInto,
} from "../examples/frames-explorer/inset.ts";
import { legendRows } from "../examples/frames-explorer/panel/legendRows.ts";
import type { OverlayView } from "../examples/frames-explorer/panel/model.ts";
import {
  RIGID_LINE,
  rigidCopy,
} from "../examples/frames-explorer/rigidLine.ts";
import { Ellipsoid, fromDegrees } from "../src/math/ellipsoid.ts";

// The figures the worker gives for the page's line (test/data checks them):
// the gap at the mark is mostly the drop, and 1.48 m of it along the line,
// where rigid placement ignores the grid's scale factor.
const figures = {
  sagEnd: 12_526.95,
  gapAtMark: 31.3528,
  markDrop: 31.3177,
  markAlong: -1.4819,
};

describe("the long line", () => {
  it("is 400 km from the catalog's California site origin, east along grid east", () => {
    const ft = 3937 / 1200;
    expect(RIGID_LINE.from).toEqual([6_000_000, 2_100_000]);
    expect(RIGID_LINE.lengthM).toBe(400_000);
    expect(RIGID_LINE.to[0] - RIGID_LINE.from[0]).toBeCloseTo(400_000 * ft, 6);
    expect(RIGID_LINE.to[1]).toBe(RIGID_LINE.from[1]);
    expect(RIGID_LINE.markDesign).toBeCloseTo(20_000 * ft, 6);
  });

  it("samples the exact line every kilometre and ticks the gap every 50 km", () => {
    expect(RIGID_LINE.lengthM / RIGID_LINE.samples).toBe(1000);
    expect(RIGID_LINE.lengthM / RIGID_LINE.ticks).toBe(50_000);
  });

  it("dashes the rigid line so the 20 km mark falls in a drawn dash, and both ends are drawn", () => {
    expect(RIGID_LINE.dashes % 2).toBe(1);
    const piece = RIGID_LINE.lengthM / RIGID_LINE.dashes;
    const index = Math.floor(20_000 / piece);
    expect(index % 2).toBe(0);
    // And not at a dash's end: the inset sees ±60 m of it.
    const into = 20_000 - index * piece;
    expect(into).toBeGreaterThan(200);
    expect(piece - into).toBeGreaterThan(200);
  });
});

describe("what the copy says, at true scale", () => {
  const copy = rigidCopy(figures);

  it("states both figures, with no exaggeration", () => {
    expect(copy.accuracy).toBe(
      "parts as distance squared: 31.4 m at 20 km, 12.5 km at 400 km (true scale)",
    );
    expect(copy.detail).toMatch(/dashed/);
    expect(copy.detail).toMatch(/straight/);
    expect(copy.detail).toMatch(/follows the ellipsoid/);
    for (const s of [
      copy.accuracy,
      copy.detail,
      ...copy.parts.map((p) => p.accuracy),
    ]) {
      expect(s).not.toMatch(/×|times larger|exaggerat/);
    }
  });

  it("labels both lines on the globe, and the far end with the true sag", () => {
    expect(copy.labels.rigid).toBe("Rigid: straight, tangent at the start");
    expect(copy.labels.exact).toBe("Exact: follows the ellipsoid");
    expect(copy.labels.end).toBe("12.5 km apart at 400 km");
  });

  it("captions the inset with the 20 km figure, at true scale", () => {
    expect(copy.inset.caption).toBe("At 20 km: 31.4 m apart (true scale)");
    expect(copy.inset.leader).toBe("31.4 m");
  });

  it("names the gap's two parts in the inset: down and along the line, at right angles", () => {
    expect(copy.inset.parts).toEqual({
      drop: "31.32 m down",
      along: "1.48 m along (grid scale)",
    });
    expect(copy.inset.description).toBe(
      "31.4 m apart: 31.32 m down and 1.48 m along the line, at right angles (grid scale)",
    );
  });

  it("shows the parts finely enough that, combined in quadrature, they give the whole as shown", () => {
    const num = (t: string) => Number(/^([\d.]+) m/.exec(t)![1]);
    const down = num(copy.inset.parts!.drop);
    const along = num(copy.inset.parts!.along);
    const whole = num(copy.inset.leader);
    expect(Math.hypot(down, along).toFixed(1)).toBe(whole.toFixed(1));
    // Not by addition.
    expect((down + along).toFixed(1)).not.toBe(whole.toFixed(1));
  });

  it("leaves the parts out until the worker has given them", () => {
    const bare = rigidCopy({ sagEnd: figures.sagEnd, gapAtMark: 31.3528 });
    expect(bare.inset.parts).toBeUndefined();
    expect(bare.inset.description).toBe("31.4 m apart");
  });
});

describe("the legend", () => {
  const base = {
    on: true,
    state: "drawn",
  } as const;
  const triads: OverlayView = {
    ...base,
    id: "triads",
    label: "Triads",
    short: "Triads",
    accuracy: "±2.6 × 10⁻⁹ rad (1σ)",
  };
  const rigid: OverlayView = {
    ...base,
    id: "rigidVsExact",
    label: "Rigid and exact 400 km line",
    short: "Rigid vs exact",
    accuracy: rigidCopy(figures).accuracy,
    parts: rigidCopy(figures).parts,
  };

  it("has two entries for the rigid and exact lines: dashed white and solid engineering", () => {
    const rows = legendRows([rigid]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      key: "rigidVsExact:rigid",
      name: "Rigid",
      label: "Rigid: straight, tangent at the start",
      line: "dashed",
      tone: "white",
    });
    expect(rows[0]!.accuracy).toMatch(/12\.5 km above the exact at 400 km/);
    expect(rows[1]).toMatchObject({
      key: "rigidVsExact:exact",
      name: "Exact",
      label: "Exact: follows the ellipsoid",
      line: "solid",
      family: "engineering",
      tone: "family",
    });
    expect(rows[1]!.accuracy).toMatch(/31\.4 m below the rigid at 20 km/);
  });

  it("keeps one entry for every other overlay", () => {
    const rows = legendRows([triads, rigid]);
    expect(rows.map((r) => r.key)).toEqual([
      "triads",
      "rigidVsExact:rigid",
      "rigidVsExact:exact",
    ]);
    expect(rows[0]).toMatchObject({ line: "axes", name: "Triads" });
  });
});

describe("the inset's placement", () => {
  const desktop = { width: 728, height: 680 };

  it("sits bottom left above the time controls on a wide view, the legend's width", () => {
    const b = insetBox(desktop, 96);
    expect(b.view).toEqual({
      x: INSET.gutter,
      y: 680 - 96 - INSET.height,
      width: INSET.width,
      height: INSET.height,
    });
    // The caption strip sits on top of the picture, inside the frame.
    expect(b.frame.x).toBe(b.view.x);
    expect(b.frame.y + b.frame.height).toBe(b.view.y + b.view.height);
    expect(b.frame.height).toBe(INSET.height + INSET.caption);
  });

  it("goes small at the top right on a narrow view, under Dyno's inspector", () => {
    const b = insetBox({ width: NARROW_VIEW - 1, height: 600 }, 120);
    expect(b.view.width).toBeLessThan(INSET.width);
    expect(b.view.x + b.view.width).toBe(NARROW_VIEW - 1 - INSET.gutter);
    expect(b.frame.y).toBe(INSET.narrowTop);
    // Wide enough for its caption on Dyno's narrowest view (388 px).
    expect(insetBox({ width: 388, height: 780 }, 120).view.width).toBe(
      INSET.narrowWidth,
    );
    const tiny = insetBox({ width: 300, height: 500 }, 120);
    expect(tiny.view.width).toBeLessThanOrEqual(INSET.narrowShare * 300);
  });

  // The tour caption (top right, 340 px wide) on a view 560 to about 700 px
  // wide: the inset narrows to stay clear of it, and keeps its place when
  // the two don't meet.
  const caption = (width: number, height: number) => ({
    x: width - INSET.gutter - 340,
    y: INSET.gutter,
    width: 340,
    height,
  });
  const meets = (
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
  ) =>
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height;

  for (const width of [560, 600, 680]) {
    it(`stays clear of the tour caption on a ${width} px view`, () => {
      // A short view, so the caption reaches down to the inset's height.
      const view = { width, height: 520 };
      const avoid = caption(width, 300);
      const b = insetBox(view, 96, avoid);
      expect(meets(b.frame, avoid)).toBe(false);
      expect(b.frame.x).toBe(INSET.gutter);
      expect(b.frame.x + b.frame.width).toBeLessThanOrEqual(
        avoid.x - INSET.gutter,
      );
      // Still the same picture: its aspect kept, its bottom above the time controls.
      expect(b.view.width / b.view.height).toBeCloseTo(
        INSET.width / INSET.height,
        1,
      );
      expect(b.view.y + b.view.height).toBe(520 - 96);
      expect(b.view.width).toBeGreaterThanOrEqual(INSET.minWidth);
    });
  }

  it("keeps its full size when the caption is clear of it", () => {
    const tall = { width: 600, height: 900 };
    expect(insetBox(tall, 96, caption(600, 300))).toEqual(insetBox(tall, 96));
    const wide = { width: 728, height: 520 };
    expect(insetBox(wide, 96, caption(728, 300))).toEqual(insetBox(wide, 96));
  });

  it("is the view's fraction for the engine's viewport", () => {
    const b = insetBox(desktop, 96);
    expect(insetViewport(b.view, desktop)).toEqual({
      x: b.view.x / 728,
      y: b.view.y / 680,
      width: b.view.width / 728,
      height: b.view.height / 680,
    });
  });
});

describe("the inset's camera", () => {
  // A point 20 km east of 122.44 W 37.75 N on the ellipsoid, and a rigid
  // point 31.4 m above it.
  const e = Ellipsoid.WGS84;
  const exact = e.cartographicToCartesian(
    fromDegrees(-122.216, 37.75, 0),
    new Float64Array(3),
  );
  const up = e.geodeticSurfaceNormal(exact, new Float64Array(3))!;
  const rigid = exact.map((v, i) => v + 31.4 * up[i]!);
  const east = Float64Array.from([
    -Math.sin((-122.216 * Math.PI) / 180),
    Math.cos((-122.216 * Math.PI) / 180),
    0,
  ]);
  const aspect = INSET.width / INSET.height;
  const fov = Math.PI / 3;
  const cam = insetCamera(exact, rigid, east, aspect, fov);
  const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
    a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;

  it("looks side-on: level, across the line", () => {
    expect(Math.abs(dot(cam.direction, east))).toBeLessThan(1e-9);
    expect(Math.abs(dot(cam.direction, up))).toBeLessThan(1e-9);
    expect(dot(cam.up, up)).toBeGreaterThan(1 - 1e-9);
    // From the south, looking north: east is to the right.
    expect(dot(cam.right, east)).toBeGreaterThan(1 - 1e-9);
  });

  it("frames the 31 m gap at about 45% of the picture's height, both lines in it", () => {
    const a = projectInto(exact, cam, aspect, fov)!;
    const b = projectInto(rigid, cam, aspect, fov)!;
    for (const p of [a, b]) {
      expect(p.x).toBeGreaterThan(0.4);
      expect(p.x).toBeLessThan(0.6);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(1);
    }
    expect(a.y - b.y).toBeCloseTo(INSET.fill, 3);
    // Close: a gap that fills the picture from about a hundred metres.
    const range = Math.hypot(
      ...[0, 1, 2].map((i) => cam.position[i]! - (exact[i]! + rigid[i]!) / 2),
    );
    expect(range).toBeGreaterThan(50);
    expect(range).toBeLessThan(200);
  });

  it("splits the gap into its drop (along the vertical) and its part along the line, as the inset sees them", () => {
    const leaned = exact.map((v, i) => v + 31.3 * up[i]! - 1.5 * east[i]!);
    const p = gapParts(exact, leaned, east);
    expect(p.drop).toBeCloseTo(31.3, 9);
    expect(p.along).toBeCloseTo(-1.5, 9);
    expect(Math.abs(p.across)).toBeLessThan(1e-9);
    expect(p.apart).toBeCloseTo(Math.hypot(31.3, 1.5), 9);
    // The line's direction needn't be level: the part along it is.
    const tilted = east.map((v, i) => v + 0.2 * up[i]!);
    expect(gapParts(exact, leaned, tilted).along).toBeCloseTo(-1.5, 9);
  });

  it("projects nothing behind the camera", () => {
    const behind = cam.position.map((v, i) => v - 10 * cam.direction[i]!);
    expect(projectInto(behind, cam, aspect, fov)).toBeUndefined();
  });
});
