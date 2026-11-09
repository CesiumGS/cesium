// Rig presets (frames 5b, Task 3): built on 5a's catalog, a synthetic target.
import { describe, expect, it } from "vitest";
import {
  createFrameCatalog,
  type FrameCatalog,
} from "../src/frames/catalog.ts";
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import { rotationPart } from "../src/frames/matrix.ts";
import { rigPreset } from "../src/frames/presets.ts";
import { identity } from "../src/math/mat4.ts";
import { MOON } from "../src/scene/Body.ts";
import { Instant } from "../src/time/Instant.ts";

const at = Instant.fromTdb(10);

/** A target on a circular orbit about the Earth's centre: 7,000 km, one radian per 1,000 s, tilted 0.4 rad. */
function target(catalog: FrameCatalog, name = "T"): Frame {
  const parent = catalog.get("EARTH_ICRF", { precision: "analytic" });
  return new Frame(
    name,
    parent,
    (i, out) => {
      identity(out);
      const a = 1e-3 * i.tdb();
      out[12] = 7e6 * Math.cos(a);
      out[13] = 7e6 * Math.sin(a) * Math.cos(0.4);
      out[14] = 7e6 * Math.sin(a) * Math.sin(0.4);
    },
    { cache: false },
  );
}
const body = (t: Frame): Frame =>
  Frame.constant("T body", t, identity(new Float64Array(16)));
const options = (catalog: FrameCatalog, t: Frame) => ({
  catalog,
  target: t,
  precision: "analytic" as const,
});
const rot = (f: Frame, base: Frame) =>
  rotationPart(frameTransform(f, base, at));

describe("rigPreset", () => {
  it("builds each preset's reference frames, and the rig's position frame is its own", () => {
    const catalog = createFrameCatalog();
    const t = target(catalog);
    const b = body(t);
    const orbital = rigPreset("orbital", options(catalog, t));
    expect(orbital.frames.map((f) => f.name)).toEqual(["T axes", "T orbital"]);
    expect(orbital.rig.position.frame).toBe(orbital.frames[1]);
    expect(orbital.rig.orientation).toMatchObject({
      kind: "axes",
      frame: orbital.frames[1],
      forward: [1, 0, 0],
      up: [0, 0, 1],
    });
    const level = rigPreset("level", { ...options(catalog, t), body: b });
    expect(level.frames[1]!.name).toBe("T level");
    const cockpit = rigPreset("cockpit", { ...options(catalog, t), body: b });
    expect(cockpit.frames).toEqual([]);
    expect(cockpit.rig.position.frame).toBe(b);
    const inertial = rigPreset("inertial", { ...options(catalog, t), at });
    expect(inertial.frames[1]!.name).toMatch(
      /^T inertial 2000-01-01T11:59:05.8/,
    );
    for (const p of [orbital, level, inertial]) {
      expect(p.rig.position).not.toHaveProperty("offset");
    }
  });

  it("orbital's +Z points away from the Earth's centre and its third axis completes the set", () => {
    const catalog = createFrameCatalog();
    const t = target(catalog);
    const orbital = rigPreset("orbital", options(catalog, t)).frames[1]!;
    const earth = catalog.get("EARTH_ICRF", { precision: "analytic" });
    const m = frameTransform(t, earth, at);
    const radius = Math.hypot(m[12]!, m[13]!, m[14]!);
    const r = rot(orbital, earth);
    // Row-major: column k of the rotation is axis k.
    const z = [r[2]!, r[5]!, r[8]!];
    const x = [r[0]!, r[3]!, r[6]!];
    const y = [r[1]!, r[4]!, r[7]!];
    expect(z[0]! * m[12]! + z[1]! * m[13]! + z[2]! * m[14]!).toBeCloseTo(
      radius,
      3,
    );
    const cross = [
      x[1]! * z[2]! - x[2]! * z[1]!,
      x[2]! * z[0]! - x[0]! * z[2]!,
      x[0]! * z[1]! - x[1]! * z[0]!,
    ];
    // y = z × x
    expect(
      Math.hypot(cross[0]! + y[0]!, cross[1]! + y[1]!, cross[2]! + y[2]!),
    ).toBeLessThan(1e-12);
    // +X is along the velocity: the circle's tangent at this instant.
    const a = 1e-3 * at.tdb();
    const tangent = [
      -Math.sin(a),
      Math.cos(a) * Math.cos(0.4),
      Math.cos(a) * Math.sin(0.4),
    ];
    expect(
      x[0]! * tangent[0]! + x[1]! * tangent[1]! + x[2]! * tangent[2]!,
    ).toBeGreaterThan(1 - 1e-6);
  });

  it("inertial keeps its freeze instant's matrix, and is built anew on each call", () => {
    const catalog = createFrameCatalog();
    const t = target(catalog);
    const a = rigPreset("inertial", { ...options(catalog, t), at });
    const b = rigPreset("inertial", { ...options(catalog, t), at });
    expect(a.frames[1]).not.toBe(b.frames[1]);
    const earth = catalog.get("EARTH_ICRF", { precision: "analytic" });
    const f = a.frames[1]!;
    expect(Array.from(rot(f, earth))).toEqual(
      Array.from(rotationPart(frameTransform(f, earth, Instant.fromTdb(900)))),
    );
  });

  it("names the preset when body or the freeze instant is missing", () => {
    const catalog = createFrameCatalog();
    const t = target(catalog);
    expect(() => rigPreset("cockpit", options(catalog, t))).toThrow(/cockpit/);
    expect(() => rigPreset("level", options(catalog, t))).toThrow(/level/);
    expect(() => rigPreset("inertial", options(catalog, t))).toThrow(
      /inertial/,
    );
  });

  it("memoizes per catalog, preset, target and central body", () => {
    const catalog = createFrameCatalog();
    const t = target(catalog);
    const a = rigPreset("orbital", options(catalog, t));
    expect(rigPreset("orbital", options(catalog, t))).toBe(a);
    expect(
      rigPreset("orbital", { ...options(catalog, t), central: MOON }),
    ).not.toBe(a);
    const other = createFrameCatalog();
    expect(rigPreset("orbital", options(other, target(other)))).not.toBe(a);
  });

  it("is data: one part changed, the rest kept, and the layer takes it", () => {
    const catalog = createFrameCatalog();
    const p = rigPreset("orbital", options(catalog, target(catalog)));
    const changed = {
      ...p.rig,
      orientation: { ...(p.rig.orientation as object), up: [0, 1, 0] },
    };
    expect(changed.position).toBe(p.rig.position);
    expect((changed.orientation as { up: number[] }).up).toEqual([0, 1, 0]);
  });

  it("adds each reference frame to the catalog as a rig's", () => {
    const catalog = createFrameCatalog();
    const t = target(catalog);
    const p = rigPreset("orbital", options(catalog, t));
    const entry = catalog.treeInUse().find((e) => e.frame === p.frames[1]);
    expect(entry?.users).toContain("rig");
  });
});
