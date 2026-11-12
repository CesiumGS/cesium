// The section caps' faces (scene/world/capFaces.ts): the rows after a view's clip
// table that the parity and cap passes read, and a CPU twin of the cap pass's
// choice of face (sectionCap.slang `fs`) for a ray.
import { describe, expect, it } from "vitest";
import { RecordFlags } from "../src/render/layout.ts";
import {
  CAP_FACE_ROWS,
  CAP_LOOK_ROWS,
  CAP_MAX_FACES,
  packCapFaces,
} from "../src/scene/world/capFaces.ts";
import {
  CLIP_TABLE_ROWS,
  packClipTable,
  tableKeeps,
  type ClipSet,
  type PlannedClip,
} from "../src/scene/world/clips.ts";

const IDENTITY = Float64Array.of(
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
);
const frame = { name: "test" } as ClipSet["frame"];
const plan = (
  set: Omit<ClipSet, "frame">,
  space: PlannedClip["space"] = "true",
) => ({ set: { frame, ...set }, space, matrix: IDENTITY }) as PlannedClip;

/** The table of `plans` seen from `camera`, with caps. */
function table(plans: PlannedClip[], camera: number[]) {
  const out = new Float32Array(CLIP_TABLE_ROWS * 4);
  const bytes = packClipTable(plans, camera, out);
  const caps = packCapFaces(
    plans,
    camera,
    { color: [1, 0, 0, 1] },
    out,
    bytes / 16,
    CLIP_TABLE_ROWS,
  );
  const u32 = new Uint32Array(out.buffer);
  return { out, u32, bytes, caps };
}

/** A face's plane (n, d), its set and its origin, from the rows. */
function face(t: ReturnType<typeof table>, k: number) {
  const at = (t.u32[2]! + CAP_FACE_ROWS * k) * 4;
  return {
    n: [t.out[at]!, t.out[at + 1]!, t.out[at + 2]!],
    w: t.out[at + 3]!,
    origin: [t.out[at + 4]!, t.out[at + 5]!, t.out[at + 6]!],
    set: t.u32[at + 7]!,
    u: [t.out[at + 8]!, t.out[at + 9]!, t.out[at + 10]!],
  };
}

/**
 * The cap pass's choice for a ray from the camera (the origin) along `ray`, as
 * the shader makes it with every face's parity odd: the nearest face the ray
 * crosses where the set keeps just past it and not just before.
 */
function capFace(
  t: ReturnType<typeof table>,
  ray: number[],
): number | undefined {
  const n = t.u32[3]!;
  let best = Infinity;
  let found: number | undefined;
  for (let k = 0; k < n; k++) {
    const f = face(t, k);
    const along = f.n[0]! * ray[0]! + f.n[1]! * ray[1]! + f.n[2]! * ray[2]!;
    if (along <= 1e-6) {
      continue;
    }
    const s = -f.w / along;
    if (s <= 0 || s >= best) {
      continue;
    }
    const p = ray.map((c) => c * s);
    const eps = 0.001 + 2e-5 * s;
    const past = p.map((c, i) => c + f.n[i]! * eps);
    const before = p.map((c, i) => c - f.n[i]! * eps);
    if (
      tableKeeps(t.out, { true: past, drawn: past }) &&
      !tableKeeps(t.out, { true: before, drawn: before })
    ) {
      best = s;
      found = k;
    }
  }
  return found;
}

describe("packCapFaces", () => {
  const level: Omit<ClipSet, "frame"> = {
    shapes: [{ kind: "plane", point: [0, 0, 5], normal: [0, 0, 1] }],
  };

  it("writes a plane's face with the camera on its negative side, and the header", () => {
    const t = table([plan(level)], [0, 0, 20]);
    expect(t.caps.faces).toBe(1);
    expect(t.caps.rows).toBe(CAP_LOOK_ROWS + CAP_FACE_ROWS);
    expect(t.u32[3]).toBe(1);
    expect(t.u32[2]).toBe(t.bytes / 16 + CAP_LOOK_ROWS);
    const f = face(t, 0);
    // The kept side is below (the normal points away from it): the ray enters it going down.
    expect(f.n.map((c) => c + 0)).toEqual([0, 0, -1]);
    expect(f.w).toBeCloseTo(-15);
    expect(f.origin).toEqual([0, 0, -15]);
    expect(f.set).toBe(0);
    expect(Math.hypot(...f.u)).toBeCloseTo(1);
    expect(
      f.u[0]! * f.n[0]! + f.u[1]! * f.n[1]! + f.u[2]! * f.n[2]!,
    ).toBeCloseTo(0);
  });

  it("writes no face when the camera is inside what is kept", () => {
    const t = table([plan(level)], [0, 0, 1]);
    expect(t.caps.faces).toBe(0);
    expect(t.u32[3]).toBe(0);
    expect(t.caps.rows).toBe(0);
  });

  it("chooses the cut of a box a ray enters, and none beside it", () => {
    const box: Omit<ClipSet, "frame"> = {
      shapes: [{ kind: "box", center: [0, 0, 0], halfExtents: [10, 10, 10] }],
    };
    const t = table([plan(box)], [0, -50, 0]);
    // Seen from the south only its south face has the camera outside it... and the
    // others' planes lie to the sides, which the camera is not outside of.
    expect(t.caps.faces).toBeGreaterThanOrEqual(1);
    const hit = capFace(t, [0, 1, 0]);
    expect(hit).toBeDefined();
    const f = face(t, hit!);
    expect(f.n[1]).toBeCloseTo(1);
    // A ray that misses the box's south face past its edge crosses no cap.
    expect(capFace(t, [0.5, 1, 0])).toBeUndefined();
    // Inside the box, looking out, a ray enters nothing.
    const inside = table([plan(box)], [0, 0, 0]);
    expect(capFace(inside, [0, 1, 0])).toBeUndefined();
  });

  it("makes a face for each plane of a union, and a set that keeps outside is cut the other way", () => {
    const two = table(
      [
        plan({
          combine: "union",
          shapes: [
            { kind: "plane", point: [0, 0, 5], normal: [0, 0, 1] },
            { kind: "plane", point: [5, 0, 0], normal: [1, 0, 0] },
          ],
        }),
      ],
      [20, 0, 20],
    );
    expect(two.caps.faces).toBe(2);
    const outside = table([plan({ ...level, keep: "outside" })], [0, 0, 1]);
    expect(outside.caps.faces).toBe(1);
    expect(face(outside, 0).n.map((c) => c + 0)).toEqual([0, 0, 1]);
  });

  it("makes none of a curved set, an effect or a polygon, saying why", () => {
    const curved = table([plan(level), plan(level, "curved")], [0, 0, 20]);
    expect(curved.caps.faces).toBe(0);
    expect(curved.caps.note).toMatch(/curved/);
    const ghost = table(
      [plan({ ...level, effect: { kind: "translucent" } })],
      [0, 0, 20],
    );
    expect(ghost.caps.faces).toBe(0);
    const polygon = table(
      [
        plan({
          shapes: [
            {
              kind: "polygon",
              ring: [
                [0, 0],
                [1, 0],
                [0, 1],
              ],
            },
          ],
        }),
      ],
      [0, 0, 20],
    );
    expect(polygon.caps.faces).toBe(0);
    expect(polygon.caps.note).toBeDefined();
  });

  it("names its set in each face, and keeps at most the targets' eight", () => {
    const sets = Array.from({ length: 6 }, (_, i) =>
      plan({
        combine: "intersection",
        shapes: [
          { kind: "plane", point: [0, 0, i], normal: [0, 0, 1] },
          { kind: "plane", point: [0, 0, i], normal: [1, 0, 0] },
        ],
      }),
    );
    const t = table(sets, [30, 0, 30]);
    expect(t.caps.faces).toBe(CAP_MAX_FACES);
    expect(t.caps.note).toMatch(/only 8/);
    expect(face(t, 7).set).toBe(3);
  });

  it("leaves the table alone when it has no room", () => {
    const out = new Float32Array(CLIP_TABLE_ROWS * 4);
    const plans = [plan(level)];
    const bytes = packClipTable(plans, [0, 0, 20], out);
    const caps = packCapFaces(
      plans,
      [0, 0, 20],
      {},
      out,
      bytes / 16,
      bytes / 16 + 2,
    );
    expect(caps.faces).toBe(0);
    expect(new Uint32Array(out.buffer)[3]).toBe(0);
  });
});

describe("RecordFlags.solid", () => {
  it("is a bit of its own", () => {
    const bits = Object.entries(RecordFlags).filter(
      ([name]) => name !== "solid",
    );
    for (const [, value] of bits) {
      expect(value & RecordFlags.solid).toBe(0);
    }
    expect(RecordFlags.solid & (RecordFlags.solid - 1)).toBe(0);
    // Not the patch iso lines' division count, bits 16 to 23.
    expect(RecordFlags.solid & (255 << 16)).toBe(0);
  });
});
