// The frames module's pick interpreter (plan 5a, Task 15; spec section
// 7.9): a core pick turned into a point tagged with its reference frame,
// its body, its body-fixed position, design coordinates where the content
// has a placement, and the composed accuracy. Closes plan 3's R8.
import { beforeAll, describe, expect, it } from "vitest";
import { ANALYTIC_ACCURACY } from "../src/frames/analytic.ts";
import { createFrameCatalog } from "../src/frames/catalog.ts";
import type { FrameData } from "../src/ephemeris/loadFrameData.ts";
import type { EarthOrientationParameters } from "../src/time/eop.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import { createFramesPickInterpreter } from "../src/frames/pickInterpreter.ts";
import { createFramesResolver } from "../src/frames/resolver.ts";
import type { FrameKey } from "../src/camera/frameResolver.ts";
import { EARTH } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { createBox } from "../src/scene/meshes.ts";
import type { CorePick } from "../src/scene/pick.ts";
import { OffscreenTarget, View } from "../src/scene/View.ts";
import type { AnchorHandle, DrawHandle, World } from "../src/scene/World.ts";
import type { DesignPlacement } from "../src/streaming/designPlacement.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { SAMPLE, syntheticFrameData } from "./syntheticFrames.ts";

const R = 6_378_137;
const SECONDS = Date.UTC(2026, 2, 20, 14, 3, 7, 250) / 1000;
/** An Earth-fixed point on the ground (m). */
const POINT = [R + 10, 20, 30];

const catalog = createFrameCatalog();
const resolver = createFramesResolver(catalog);
const itrf = catalog.get("ITRF");
const gcrf = catalog.get("GCRF");
const instant = resolver.instant(SECONDS);

let engine: Engine;
let world: World;
let earth: AnchorHandle;
let view: View;
let site: DrawHandle;
let other: DrawHandle;

/** A site grid 10 m east of nothing: design = body-fixed minus (R, 0, 0). */
const placement: DesignPlacement = {
  mode: "rigid",
  frameName: "site grid",
  displayed: (d, out = new Float64Array(3)) => {
    out.set([d[0]! + R, d[1]!, d[2]!]);
    return out;
  },
  designOf: (p, out = new Float64Array(3)) => {
    out.set([p[0]! - R, p[1]!, p[2]!]);
    return out;
  },
  // Rigid: a sag of 4.2 cm at every point, for the content term.
  displayError: () => 0.042,
};

beforeAll(async () => {
  engine = await fakeEngine();
  world = engine.createWorld({ maxDraws: 8 });
  earth = world.bodyAnchor(EARTH);
  const mesh = world.addMesh(createBox());
  site = world.addDraw({
    mesh,
    origin: Float64Array.of(R, 0, 0),
    parent: earth,
  });
  other = world.addDraw({
    mesh,
    origin: Float64Array.of(R, 0, 0),
    parent: earth,
  });
  view = new View({ target: new OffscreenTarget(64, 48), world });
});

/** Column-major translation by (x, y, z). */
function translation(x: number, y: number, z: number): Float64Array {
  const m = new Float64Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

/** `m · p` for a column-major matrix. */
function apply(m: Float64Array, p: ArrayLike<number>): Float64Array {
  return Float64Array.from(
    [0, 1, 2],
    (i) => m[i]! * p[0]! + m[4 + i]! * p[1]! + m[8 + i]! * p[2]! + m[12 + i]!,
  );
}

/**
 * A core pick of `POINT` under the Earth's anchor (or, with `under`
 * `"none"`, under no anchor), with `root` as the render root.
 */
function corePick(
  root: FrameKey,
  draw: DrawHandle | undefined,
  under: "earth" | "none" = "earth",
): CorePick {
  const anchor = under === "earth" ? earth : undefined;
  const anchorPosition = Float64Array.from(POINT);
  const position = anchor
    ? apply(
        resolver.resolve(anchor, root, SECONDS, new Float64Array(16)),
        POINT,
      )
    : Float64Array.from(POINT);
  return {
    view,
    position,
    root,
    anchor,
    anchorPosition,
    draw,
    feature: undefined,
    seconds: SECONDS,
    camera: {
      position: Float64Array.of(R + 1000, 0, 0),
      direction: Float64Array.of(-1, 0, 0),
      up: Float64Array.of(0, 0, 1),
      right: Float64Array.of(0, 1, 0),
      fovy: 1,
      near: 0.1,
      width: 64,
      height: 48,
    },
  };
}

describe("createFramesPickInterpreter", () => {
  const interpreter = createFramesPickInterpreter(resolver, catalog, {
    placements: (draw) => (draw.index === site.index ? placement : undefined),
  });

  it("tags a pick under the Earth's anchor with ITRF, the Earth and its body-fixed position", () => {
    const point = interpreter.interpret(corePick(gcrf, other))!;
    expect(point.frame).toBe(itrf);
    expect(point.body).toBe(EARTH);
    expect(Array.from(point.bodyFixed!)).toEqual(POINT);
    expect(point.design).toBeUndefined();
  });

  describe("its accuracy, composed from the point's own terms", () => {
    // The pick's camera, as `corePick` gives it, is 990 m above the point
    // along x: this far from it.
    const distance = Math.hypot(990, 20, 30);

    it("the pick's footprint: one CSS pixel at the hit's distance (pickDesign's tolerance)", () => {
      const { terms } = interpreter.interpret(corePick(gcrf, other))!.accuracy;
      const footprint = terms.find(
        (t) => t.kind === "pick" && t.part === "footprint",
      )!;
      expect(footprint.frame).toBe("ITRF");
      // fovy 1 rad over 48 CSS pixels.
      expect(footprint.meters).toBeCloseTo(
        (distance * 2 * Math.tan(0.5)) / 48,
        12,
      );
      expect(footprint.meters).toBeGreaterThan(20);
      expect(terms[0]).toBe(footprint);
    });

    it("the pick's depth: half a float32 step of the stored depth, along the ray", () => {
      const { terms } = interpreter.interpret(corePick(gcrf, other))!.accuracy;
      const depth = terms.find((t) => t.kind === "pick" && t.part === "depth")!;
      // z = 990 m along the view axis; near 0.1 m: depth = 0.1 / 990.
      const d = Math.fround(0.1 / 990);
      const step = 2 ** (Math.floor(Math.log2(d)) - 23);
      expect(depth.meters).toBeCloseTo((distance * step) / 2 / d, 15);
      // About 30 µm at a kilometre: a float32 step is 2⁻²³ to 2⁻²⁴ of it.
      expect(depth.meters).toBeGreaterThan(distance * 2 ** -25);
      expect(depth.meters).toBeLessThan(distance * 2 ** -24);
    });

    it("the content's own error: the placement's displayError, only with design coordinates", () => {
      const placed = interpreter.interpret(corePick(gcrf, site))!.accuracy;
      const content = placed.terms.find((t) => t.kind === "content")!;
      expect(content).toMatchObject({ frame: "site grid", meters: 0.042 });
      expect(content.note).toMatch(/rigid placement/);
      const bare = interpreter.interpret(corePick(gcrf, other))!.accuracy;
      expect(bare.terms.some((t) => t.kind === "content")).toBe(false);
    });

    it("an Earth pick on the default analytic catalog: no reference frame term, so metres (the pick's and the content's)", () => {
      for (const root of [gcrf, world.root]) {
        const { accuracy } = interpreter.interpret(corePick(root, site))!;
        // Tagged in ITRF, the body-fixed frame itself: nothing above it
        // (the Earth's orientation, its place among the planets) moves the
        // point relative to the Earth.
        expect(accuracy.terms.map((t) => t.kind)).toEqual([
          "pick",
          "pick",
          "content",
        ]);
        expect(accuracy.meters).toBe(
          Math.hypot(...accuracy.terms.map((t) => t.meters!)),
        );
        expect(accuracy.meters).toBeGreaterThan(20);
        expect(accuracy.meters).toBeLessThan(30);
        expect(accuracy.unboundedBy).toBeUndefined();
        expect(accuracy.combination).toMatch(/fixed reference frame \(ITRF\)/);
      }
    });

    it("a point in an application's reference frame: its edges up to the body-fixed frame, as drawn", () => {
      const site = Frame.constant("site", itrf, translation(R, 0, 0), {
        accuracy: { meters: 0.5, note: "surveyed site origin" },
      });
      const arm = Frame.constant("arm", site, translation(0, 0, 2), {
        accuracy: { radians: 1e-6, note: "encoder" },
      });
      catalog.add(site);
      catalog.add(arm);
      const tool = world.addAnchor("tool");
      resolver.bindAnchor(tool, arm);
      const local = [1, 2, 3];
      const pick = {
        ...corePick(world.root, undefined),
        anchor: tool,
        anchorPosition: Float64Array.from(local),
      };
      const point = interpreter.interpret(pick)!;
      expect(point.frame).toBe(arm);
      expect(point.body).toBe(EARTH);
      expect(Array.from(point.bodyFixed!)).toEqual([R + 1, 2, 5]);
      const edges = point.accuracy.terms.filter(
        (t) => t.kind !== "pick" && t.kind !== "content",
      );
      expect(edges).toEqual([
        {
          frame: "arm",
          kind: "angular",
          meters: 1e-6 * Math.hypot(...local),
          radians: 1e-6,
          lever: Math.hypot(...local),
          note: "encoder",
        },
        {
          frame: "site",
          kind: "meters",
          meters: 0.5,
          note: "surveyed site origin",
        },
      ]);
      expect(point.accuracy.combination).toMatch(/\(ITRF\)/);
    });

    it("a point with no body walks to the tree's root, and says so", () => {
      const { accuracy } = interpreter.interpret(
        corePick(gcrf, undefined, "none"),
      )!;
      const edges = accuracy.terms.filter((t) => t.kind !== "pick");
      expect(edges).toEqual([
        {
          frame: "GCRF",
          kind: "meters",
          meters: ANALYTIC_ACCURACY.GCRF.meters,
          note: ANALYTIC_ACCURACY.GCRF.note,
        },
      ]);
      expect(accuracy.combination).toMatch(
        /tree's root: the point has no body/,
      );
    });

    it("never 0 m: on the default rig too, the pick's own terms remain", () => {
      const { accuracy } = interpreter.interpret(corePick(world.root, other))!;
      expect(accuracy.terms.length).toBe(2);
      expect(accuracy.meters).toBeGreaterThan(0);
    });
  });

  it("gives the point in any reference frame: in(GCRF) is frameTransform of the body-fixed point", () => {
    const point = interpreter.interpret(corePick(gcrf, other))!;
    const m = frameTransform(itrf, gcrf, instant);
    expect(Array.from(point.in(gcrf))).toEqual(Array.from(apply(m, POINT)));
    expect(Array.from(point.in(itrf))).toEqual(POINT);
    // The render-space position is the GCRF one, to rounding.
    const rendered = corePick(gcrf, other).position;
    const there = point.in(gcrf);
    expect(
      Math.hypot(
        there[0]! - rendered[0]!,
        there[1]! - rendered[1]!,
        there[2]! - rendered[2]!,
      ),
    ).toBeLessThan(1e-6);
  });

  it("a hit on content with a placement carries design coordinates; one without carries none", () => {
    const placed = interpreter.interpret(corePick(gcrf, site))!;
    expect(placed.design?.placement).toBe(placement);
    expect(Array.from(placed.design!.coordinates)).toEqual([10, 20, 30]);
    expect(
      interpreter.interpret(corePick(gcrf, other))!.design,
    ).toBeUndefined();
    // Without the option, never.
    const bare = createFramesPickInterpreter(resolver, catalog);
    expect(bare.interpret(corePick(gcrf, site))!.design).toBeUndefined();
  });

  it("on the default rig (render space Earth-fixed) gives the same reference frame and design", () => {
    const point = interpreter.interpret(corePick(world.root, site))!;
    expect(point.frame).toBe(itrf);
    expect(Array.from(point.design!.coordinates)).toEqual([10, 20, 30]);
  });

  it("content under no anchor is in the render root's reference frame; with none to name, no answer", () => {
    const loose = interpreter.interpret(corePick(gcrf, undefined, "none"))!;
    expect(loose.frame).toBe(gcrf);
    expect(loose.body).toBeUndefined();
    expect(loose.bodyFixed).toBeUndefined();
    expect(Array.from(loose.in(gcrf))).toEqual(POINT);
    expect(
      interpreter.interpret(corePick(world.root, undefined, "none")),
    ).toBeUndefined();
  });

  it("a placement that can't invert the hit gives the true values without design", () => {
    const failing = createFramesPickInterpreter(resolver, catalog, {
      placements: () => ({
        ...placement,
        designOf: () => {
          throw new RangeError("outside the operation's domain");
        },
      }),
    });
    const point = failing.interpret(corePick(gcrf, site))!;
    expect(point.frame).toBe(itrf);
    expect(point.design).toBeUndefined();
  });
});

describe("createFramesPickInterpreter, at precise", () => {
  const leap = LeapSeconds.builtIn();
  /** UTC ms at TT `tt` seconds past J2000. */
  const utcMsAt = (tt: number): number => Instant.fromTt(tt).toUtc(leap);
  /** The synthetic EOP ends (degraded) 1,000 s of TT past J2000. */
  const EOP_END_TT = 1000;

  /** Synthetic frame data whose EOP ends, as test/framesResolver.test.ts's. */
  function dataWithEopEnd(): FrameData {
    const data = syntheticFrameData();
    const eop = {
      atInstant: (at: Instant) =>
        at.tt > EOP_END_TT ? { ...SAMPLE, degraded: true } : SAMPLE,
      first: Date.UTC(1999, 11, 1),
      last: utcMsAt(EOP_END_TT),
    } as unknown as EarthOrientationParameters;
    return { ...data, eop };
  }

  it("states an edge's precise accuracy inside its data, and the wider stand-in's outside it, without throwing", async () => {
    const precise = createFrameCatalog({ data: dataWithEopEnd() });
    const gcrfPrecise = precise.get("GCRF", { precision: "precise" });
    await precise.ready("GCRF", "precise");
    const r = createFramesResolver(precise, { precision: "precise" });
    const interpreter = createFramesPickInterpreter(r, precise);
    // Content under no anchor, a GCRF render root: no body, so GCRF's edge.
    const at = (ms: number) => {
      const pick = {
        ...corePick(gcrfPrecise, undefined, "none"),
        seconds: ms / 1000,
      };
      const terms = interpreter.interpret(pick)!.accuracy.terms;
      return terms.find((t) => t.frame === "GCRF" && t.kind === "meters")!;
    };
    const inside = at(utcMsAt(0));
    expect(inside.meters).toBe(
      gcrfPrecise.accuracy(Instant.fromUtc(utcMsAt(0), leap)).meters,
    );
    // A day past the synthetic packs: the resolver draws GCRF on its stand-in.
    const outside = at(utcMsAt(0) + 86_400_000);
    expect(outside.meters).toBe(ANALYTIC_ACCURACY.GCRF.meters);
    expect(outside.note).toMatch(/drawn on its stand-in at this instant/);
    expect(outside.meters).toBeGreaterThan(inside.meters!);
  });
});
