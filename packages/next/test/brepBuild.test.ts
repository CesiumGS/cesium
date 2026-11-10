import { describe, expect, it } from "vitest";
import { BrepBuilder } from "../src/brep/build.ts";
import {
  evaluateCurve2,
  evaluateSurface,
  faceNormal,
} from "../src/brep/evaluate.ts";
import {
  edgeCount,
  faceCount,
  vertexCount,
  type BrepForm,
} from "../src/brep/form.ts";
import { validateBrep } from "../src/brep/validate.ts";
import { sphereBrep } from "../examples/brep-first-look/fixtures.ts";
import {
  boxBrep,
  cappedCylinderBrep,
  trimmedNurbsBrep,
} from "./brepFixtures.ts";

/** A copy of a form with its own arrays, so a test may break them. */
function copy(form: BrepForm): {
  -readonly [K in keyof BrepForm]: BrepForm[K];
} {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(form)) {
    out[key] = ArrayBuffer.isView(value)
      ? (value as unknown as Float64Array).slice()
      : value;
  }
  return out as unknown as ReturnType<typeof copy>;
}

/** The average of a face's outer loop's pcurve starts and ends, in (u, v). */
function centroid(form: BrepForm, face: number): [number, number] {
  const loop = form.faceLoops[face * 2]!;
  const first = form.loopUses[loop * 2]!;
  const count = form.loopUses[loop * 2 + 1]!;
  let u = 0;
  let v = 0;
  let n = 0;
  for (let k = first; k < first + count; k++) {
    const seg = form.usePcurve[k * 2]!;
    const segs = form.usePcurve[k * 2 + 1]!;
    for (const [s, t] of [
      [seg, 0],
      [seg + segs - 1, 1],
    ] as const) {
      const p = evaluateCurve2(form, s, t).position;
      u += p[0]!;
      v += p[1]!;
      n++;
    }
  }
  return [u / n, v / n];
}

describe("the fixtures", () => {
  it("validate with no problems", () => {
    expect(validateBrep(boxBrep())).toEqual([]);
    expect(validateBrep(cappedCylinderBrep())).toEqual([]);
    expect(validateBrep(trimmedNurbsBrep())).toEqual([]);
  });

  it("make a closed box of 6 faces, 12 edges and 8 vertices", () => {
    const box = boxBrep();
    expect(faceCount(box)).toBe(6);
    expect(edgeCount(box)).toBe(12);
    expect(vertexCount(box)).toBe(8);
    const uses = new Uint32Array(12);
    for (const e of box.useEdge) {
      uses[e]!++;
    }
    expect([...uses]).toEqual(Array(12).fill(2));
  });

  it("point each box face's normal away from the box's centre", () => {
    const box = boxBrep();
    for (let f = 0; f < 6; f++) {
      const [u, v] = centroid(box, f);
      const p = evaluateSurface(box, box.faceSurface[f]!, u, v).position;
      const n = faceNormal(box, f, u, v)!;
      const out =
        (p[0]! - 1) * n[0]! + (p[1]! - 1.5) * n[1]! + (p[2]! - 2) * n[2]!;
      expect(out).toBeGreaterThan(0);
    }
  });

  it("point the cylinder's normals away from it", () => {
    const form = cappedCylinderBrep();
    expect(faceCount(form)).toBe(3);
    expect(edgeCount(form)).toBe(3);
    const seam = form.useEdge[1]!;
    expect(form.useEdge[3]).toBe(seam);
    const side = faceNormal(form, 0, 1, 1)!;
    expect(side[0]).toBeCloseTo(Math.cos(1), 12);
    expect(side[1]).toBeCloseTo(Math.sin(1), 12);
    expect(faceNormal(form, 1, 0.1, 0.2)![2]).toBeCloseTo(-1, 12);
    expect(faceNormal(form, 2, 0.1, 0.2)![2]).toBeCloseTo(1, 12);
  });

  it("put the ids in order: faces, edges, then vertices", () => {
    const box = boxBrep();
    expect(box.ids).toHaveLength(6 + 12 + 8);
    expect(box.ids.slice(0, 6)).toEqual(["f0", "f1", "f2", "f3", "f4", "f5"]);
    expect(box.ids[6]).toBe("e0");
    expect(box.ids[18]).toBe("v0");
    const b = new BrepBuilder();
    const a = b.vertex([0, 0, 0]);
    const c = b.vertex([1, 0, 0], { id: "far" });
    b.edge(a, c);
    expect(b.build().ids).toEqual(["", "", "far"]);
  });
});

describe("validateBrep on a broken box", () => {
  it("names a use whose edge is out of range", () => {
    const box = copy(boxBrep());
    box.useEdge[5] = 99;
    const problems = validateBrep(box);
    expect(problems).toContainEqual(
      expect.objectContaining({ kind: "index", entity: "use", index: 5 }),
    );
  });

  it("finds an open loop when two uses swap places", () => {
    const box = copy(boxBrep());
    for (const array of [box.useEdge, box.useReversed] as Uint8Array[]) {
      [array[0], array[1]] = [array[1]!, array[0]!];
    }
    for (const k of [0, 1]) {
      [box.usePcurve[k], box.usePcurve[2 + k]] = [
        box.usePcurve[2 + k]!,
        box.usePcurve[k]!,
      ];
    }
    expect(validateBrep(box).some((p) => p.kind === "openLoop")).toBe(true);
  });

  it("finds a vertex moved by 1 cm", () => {
    const box = copy(boxBrep());
    box.vertexPosition[0]! += 0.01;
    const problems = validateBrep(box);
    expect(problems.length).toBeGreaterThan(0);
    for (const p of problems) {
      expect(["pcurveOffEdge", "openLoop"]).toContain(p.kind);
      expect(p.entity).toBeDefined();
    }
  });

  it("finds an edge left with no uses", () => {
    const box = boxBrep();
    // Faces 0 and 2 share an edge: drop both and it has no uses.
    const keep = [1, 3, 4, 5];
    const form = copy(box);
    form.faceSurface = Uint32Array.from(keep.map((f) => box.faceSurface[f]!));
    form.faceReversed = Uint8Array.from(keep.map((f) => box.faceReversed[f]!));
    form.faceLoops = Uint32Array.from(
      keep.flatMap((f) => [box.faceLoops[f * 2]!, 1]),
    );
    const problems = validateBrep(form);
    expect(problems).toContainEqual(
      expect.objectContaining({ kind: "edgeUses", entity: "edge" }),
    );
  });

  it("does not throw on an empty or truncated form", () => {
    const box = copy(boxBrep());
    box.faceLoops = new Uint32Array(3);
    box.curves3 = {
      degree: new Uint8Array(0),
      first: new Uint32Array(0),
      points: new Float64Array(0),
    };
    expect(() => validateBrep(box)).not.toThrow();
    expect(validateBrep(box).length).toBeGreaterThan(0);
  });
});

describe("validateBrep, malformed and cone", () => {
  it("reports one malformed problem, and does not throw, with curves2 missing", () => {
    const box = copy(boxBrep()) as Record<string, unknown>;
    delete box.curves2;
    let problems: ReturnType<typeof validateBrep> = [];
    expect(() => {
      problems = validateBrep(box as unknown as BrepForm);
    }).not.toThrow();
    expect(problems).toHaveLength(1);
    expect(problems[0]!.kind).toBe("malformed");
    expect(problems[0]!.message).toMatch(/could not be read/);
  });

  it("finds a cone whose half-angle is a quarter turn or more", () => {
    for (const angle of [Math.PI / 2, -Math.PI / 2, 2, NaN]) {
      const b = new BrepBuilder();
      b.cone([0, 0, 0], [1, 0, 0], [0, 1, 0], 1, angle);
      const problems = validateBrep(b.build());
      expect(problems).toContainEqual(
        expect.objectContaining({
          kind: "degenerate",
          entity: "surface",
          index: 0,
        }),
      );
    }
    const ok = new BrepBuilder();
    ok.cone([0, 0, 0], [1, 0, 0], [0, 1, 0], 1, 0.5);
    expect(
      validateBrep(ok.build()).filter((p) => p.entity === "surface"),
    ).toEqual([]);
  });
});

describe("BrepBuilder", () => {
  it("leaves the builder unchanged when a face throws on its second use", () => {
    const b = new BrepBuilder();
    const s = b.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]);
    const v = [b.vertex([0, 0, 0]), b.vertex([1, 0, 0]), b.vertex([0, 1, 0])];
    const e = [
      b.edge(v[0]!, v[1]!),
      b.edge(v[1]!, v[2]!),
      b.edge(v[2]!, v[0]!),
    ];
    const before = JSON.stringify(b.build(), (_k, x) =>
      ArrayBuffer.isView(x) ? Array.from(x as unknown as number[]) : x,
    );
    const quartic = {
      degree: 4,
      knots: Float64Array.from([0, 0, 0, 0, 0, 1, 1, 1, 1, 1]),
      count: 5,
      dimension: 2 as const,
      points: new Float64Array(10),
    };
    expect(() =>
      b.face(s, [
        [
          {
            edge: e[0]!,
            pcurve: [
              [0, 0],
              [1, 0],
            ],
          },
          { edge: e[1]!, pcurve: quartic },
        ],
      ]),
    ).toThrow(/degree 4/);
    const after = JSON.stringify(b.build(), (_k, x) =>
      ArrayBuffer.isView(x) ? Array.from(x as unknown as number[]) : x,
    );
    expect(after).toBe(before);
    b.face(s, [
      [
        {
          edge: e[0]!,
          pcurve: [
            [0, 0],
            [1, 0],
          ],
        },
        {
          edge: e[1]!,
          pcurve: [
            [1, 0],
            [0, 1],
          ],
        },
        {
          edge: e[2]!,
          pcurve: [
            [0, 1],
            [0, 0],
          ],
        },
      ],
    ]);
    const form = b.build();
    expect(faceCount(form)).toBe(1);
    expect(form.useEdge.length).toBe(3);
    expect(validateBrep(form)).toEqual([]);
  });

  it("throws a clear error for a pcurve of degree 4 or an unknown edge", () => {
    const b = new BrepBuilder();
    const s = b.plane([0, 0, 0], [1, 0, 0], [0, 1, 0]);
    const a = b.vertex([0, 0, 0]);
    const c = b.vertex([1, 0, 0]);
    const e = b.edge(a, c);
    const quartic = {
      degree: 4,
      knots: Float64Array.from([0, 0, 0, 0, 0, 1, 1, 1, 1, 1]),
      count: 5,
      dimension: 2 as const,
      points: new Float64Array(10),
    };
    expect(() => b.face(s, [[{ edge: e, pcurve: quartic }]])).toThrow(
      /degree 4/,
    );
    expect(() =>
      b.face(s, [
        [
          {
            edge: 7,
            pcurve: [
              [0, 0],
              [1, 0],
            ],
          },
        ],
      ]),
    ).toThrow(/no edge 7/);
  });
});

describe("degenerate edges at a pole", () => {
  it("validates a sphere whose poles are zero-length edges with pcurves along the pole", () => {
    expect(validateBrep(sphereBrep())).toEqual([]);
  });

  it("rejects a pole whose pcurve strays off the vertex", () => {
    const form = sphereBrep();
    // Lift the south pole's pcurve off v = -π/2: its image leaves the vertex.
    const south = form.usePcurve[0]!;
    const at = form.curves2.first[south]! * 3;
    const broken = {
      ...form,
      curves2: {
        ...form.curves2,
        points: Float64Array.from(form.curves2.points),
      },
    };
    broken.curves2.points[at + 1] = -0.5;
    broken.curves2.points[at + 4] = -0.5;
    expect(validateBrep(broken).some((p) => p.kind === "pcurveOffEdge")).toBe(
      true,
    );
  });
});
