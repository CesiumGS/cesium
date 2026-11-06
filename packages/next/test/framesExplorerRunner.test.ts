// The frames explorer's stress-test runner (examples/frames-explorer/tests.ts),
// with synthetic frames and stub cases. The real catalog runs against the
// frames data store in test/data/framesExplorer.test.ts.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  LENSES,
  STRESS_CASES,
  STRESS_GROUPS,
  compareFingerprint,
  expectThrow,
  formatEffect,
  groupResults,
  runStress,
  type Fingerprint,
  type StressCase,
  type StressContext,
  type StressResult,
} from "../examples/frames-explorer/tests.ts";
import { createFrames } from "../src/frames/frames.ts";
import type { ProjApi } from "../src/engineering/proj.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const frames = createFrames(syntheticFrameData());

const context = (extra: Partial<StressContext> = {}): StressContext => ({
  frames,
  loadProj: () => Promise.reject(new Error("PROJ is not in this test")),
  loadOrion: () => Promise.reject(new Error("the OEM is not in this test")),
  ...extra,
});

let counter = 0;
/** A case that returns `results` (each completed with the case's id, group and title). */
function stub(
  results: readonly Partial<StressResult>[] | (() => Promise<StressResult[]>),
  extra: Partial<StressCase> = {},
): StressCase {
  const id = `stub.${counter++}`;
  const base = { id, group: "projections", title: `Stub ${id}` };
  return {
    ...base,
    needs: [],
    run:
      typeof results === "function"
        ? results
        : () =>
            Promise.resolve(
              results.map((r, i) => ({
                ...base,
                id: `${id}.${i}`,
                pass: true,
                ...r,
              })),
            ),
    ...extra,
  };
}

const run = async (
  cases: readonly StressCase[],
  options: Parameters<typeof runStress>[1] = {},
  ctx: StressContext = context(),
) => runStress(ctx, { ...options, cases });

/** Every value is a primitive, a plain object or an array: structured-clone plain data. */
function expectPlain(value: unknown, path = "result"): void {
  if (value === null || typeof value !== "object") {
    expect(typeof value, path).not.toBe("function");
    expect(typeof value, path).not.toBe("symbol");
    return;
  }
  const proto = Object.getPrototypeOf(value);
  expect(
    proto === Object.prototype || proto === Array.prototype,
    `${path} is a ${proto?.constructor?.name}`,
  ).toBe(true);
  for (const [key, child] of Object.entries(value)) {
    expectPlain(child, `${path}.${key}`);
  }
}

describe("judging values against tolerances", () => {
  it("passes a value within its tolerance and fails one beyond it", async () => {
    const results = await run([
      stub([
        { value: 5e-5, tolerance: 1e-4, unit: "m" },
        { value: 2e-4, tolerance: 1e-4, unit: "m" },
      ]),
    ]);
    expect(results.map((r) => r.pass)).toEqual([true, false]);
    expect(results[1]!.detail).toMatch(/beyond its tolerance/);
  });

  it("fails a deliberately broken case: tolerance 0 (Review Focus 1)", async () => {
    const [r] = await run([stub([{ value: 1e-15, tolerance: 0 }])]);
    expect(r!.pass).toBe(false);
  });

  it("fails a value that is missing or not finite, whatever the case claims", async () => {
    const results = await run([
      stub([
        { value: Number.NaN, tolerance: 1, pass: true },
        { tolerance: 1, pass: true },
        { value: Number.POSITIVE_INFINITY, tolerance: 1, pass: true },
      ]),
    ]);
    expect(results.map((r) => r.pass)).toEqual([false, false, false]);
  });

  it("keeps a case's own failure even within tolerance", async () => {
    const [r] = await run([stub([{ value: 0, tolerance: 1, pass: false }])]);
    expect(r!.pass).toBe(false);
  });
});

describe("expected throws (R7)", () => {
  const base = { id: "t", group: "time", title: "Throws" };

  it("passes only when the message matches", async () => {
    const right = await expectThrow(base, /EOP table covers/, () => {
      throw new Error("ITRF: the EOP table covers 1962 to 2027");
    });
    const wrong = await expectThrow(base, /EOP table covers/, () => {
      throw new Error("outside the ephemeris span");
    });
    const none = await expectThrow(base, /EOP table covers/, () => 42);
    expect(right.error).toMatch(/EOP table/);
    expect(none.error).toBeUndefined();
    const results = await run([
      stub(() => Promise.resolve([right, wrong, none])),
    ]);
    expect(results.map((r) => r.pass)).toEqual([true, false, false]);
    expect(results[1]!.detail).toMatch(/different error/);
    expect(results[2]!.detail).toMatch(/nothing was thrown/);
  });

  it("returns a judged result itself, for callers outside the runner", async () => {
    const right = await expectThrow(base, /outside-runner grid/, () => {
      throw new Error("an outside-runner grid is missing");
    });
    const wrong = await expectThrow(base, /outside-runner grid/, () => {
      throw new Error("something else");
    });
    const none = await expectThrow(base, /outside-runner grid/, () => 0);
    expect([right.pass, wrong.pass, none.pass]).toEqual([true, false, false]);
    expect(wrong.detail).toMatch(/different error/);
    expect(none.detail).toMatch(/nothing was thrown/);
    // The runner's verdict agrees, and states the reason once.
    const [judged] = await run([stub(() => Promise.resolve([none]))]);
    expect(judged!.pass).toBe(false);
    expect(judged!.detail!.match(/nothing was thrown/g)).toHaveLength(1);
  });

  it("is judged from the result's fields, not the case's own pass", async () => {
    const results = await run([
      stub([
        { pass: true, expectedError: "grid", error: "a different message" },
        { pass: true, expectedError: "grid" },
        { pass: true, error: "an unexpected throw" },
      ]),
    ]);
    expect(results.map((r) => r.pass)).toEqual([false, false, false]);
    // "grid" was never declared through expectThrow: never compiled, so it fails.
    expect(results[0]!.detail).toMatch(/not declared through expectThrow/);
  });

  it("matches a declared pattern found in a result's fields", async () => {
    const base = { id: "d", group: "time", title: "Declared" };
    await expectThrow(base, /declared grid/, () => {
      throw new Error("x");
    });
    const results = await run([
      stub([
        {
          expectedError: "declared grid",
          error: "the declared grid is missing",
        },
        { expectedError: "declared grid", error: "something else" },
      ]),
    ]);
    expect(results.map((r) => r.pass)).toEqual([true, false]);
  });

  it("refuses a pattern with flags", async () => {
    await expect(
      expectThrow({ id: "f", group: "time", title: "Flags" }, /x/i, () => 0),
    ).rejects.toThrow(/flags/);
  });

  it("records a case that throws instead of returning, without rejecting", async () => {
    const results = await run([
      stub(() => Promise.reject(new Error("broken case"))),
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]!.pass).toBe(false);
    expect(results[0]!.error).toBe("broken case");
  });
});

describe("runStress", () => {
  it("stops before the next case when the signal aborts midway (Review Focus 9)", async () => {
    const controller = new AbortController();
    const second = vi.fn(() => Promise.resolve([] as StressResult[]));
    const first = stub(() => {
      controller.abort();
      return Promise.resolve([
        {
          id: "first",
          group: "projections",
          title: "First",
          pass: true,
        },
      ]);
    });
    const results = await run([first, stub(second)], {
      signal: controller.signal,
    });
    expect(second).not.toHaveBeenCalled();
    expect(results.map((r) => r.id)).toEqual(["first"]);
    expect(await run([stub([{}])], { signal: controller.signal })).toEqual([]);
  });

  it("calls onResult once per result, with the judged result", async () => {
    const seen: StressResult[] = [];
    const results = await run(
      [stub([{}, { value: 2, tolerance: 1 }]), stub([{}])],
      { onResult: (r) => seen.push(r) },
    );
    expect(seen).toHaveLength(3);
    expect(seen).toEqual(results);
    expect(seen[1]!.pass).toBe(false);
  });

  it("runs only the cases named by ids", async () => {
    const a = stub([{}]);
    const b = stub([{}]);
    const results = await run([a, b], { ids: [b.id] });
    expect(results.map((r) => r.group)).toEqual(["projections"]);
    expect(results[0]!.id.startsWith(b.id)).toBe(true);
  });

  it("gives plain, structured-clone data (R13)", async () => {
    const results = await run([
      stub([
        {
          value: 1,
          tolerance: 2,
          unit: "m",
          accuracy: { meters: undefined, terms: [], warnings: ["w"] },
          effect: { value: 3, unit: "cm", label: "Size" },
        },
      ]),
    ]);
    for (const r of results) {
      expectPlain(r);
      expect(structuredClone(r)).toEqual(r);
    }
  });
});

describe("needs that can't be met (Review Focus 4)", () => {
  it("skips, with pass false and what is missing, and never runs the case", async () => {
    const proj = vi.fn(() => Promise.resolve([] as StressResult[]));
    const orion = vi.fn(() => Promise.resolve([] as StressResult[]));
    const results = await run([
      stub(proj, { needs: ["proj"] }),
      stub(orion, { needs: ["orion"] }),
    ]);
    expect(proj).not.toHaveBeenCalled();
    expect(orion).not.toHaveBeenCalled();
    expect(results).toHaveLength(2);
    expect(results[0]!.pass).toBe(false);
    expect(results[0]!.missing).toEqual(["proj"]);
    expect(results[0]!.detail).toMatch(/PROJ/);
    expect(results[0]!.detail).toMatch(/PROJ is not in this test/);
    expect(results[0]!.detail).toMatch(/npm run setup/);
    expect(results[1]!.missing).toEqual(["orion"]);
    expect(results[1]!.detail).toMatch(/Artemis/);
  });

  it("skips a geoid case when the geoid fails to load, and loads PROJ once", async () => {
    const loadProj = vi.fn(() => Promise.resolve({} as ProjApi));
    const geoid = vi.fn(() => Promise.resolve([] as StressResult[]));
    const results = await run(
      [
        stub(geoid, { needs: ["proj", "geoid"] }),
        stub([{}], { needs: ["proj"] }),
      ],
      {},
      context({
        loadProj,
        loadGeoid: () => Promise.reject(new Error("404")),
      }),
    );
    expect(geoid).not.toHaveBeenCalled();
    expect(results[0]!.missing).toEqual(["geoid"]);
    expect(results[0]!.detail).toMatch(/GEOID18/);
    expect(results[1]!.pass).toBe(true);
    expect(loadProj).toHaveBeenCalledTimes(1);
  });

  it("passes the loaded data to the case", async () => {
    const proj = {} as ProjApi;
    let seen: ProjApi | undefined;
    await run(
      [
        stub(
          (ctx?: StressContext) => {
            seen = ctx?.proj;
            return Promise.resolve([]);
          },
          { needs: ["proj"] },
        ),
      ],
      {},
      context({ loadProj: () => Promise.resolve(proj) }),
    );
    expect(seen).toBe(proj);
  });
});

describe("effect sizes and fingerprints (R11, R12)", () => {
  it("keeps an effect apart from pass or fail", async () => {
    const effect = { value: 2.000004, unit: "ppm", label: "Foot difference" };
    const results = await run([
      stub([
        { effect, value: 0.5, tolerance: 1 },
        { effect, value: 2, tolerance: 1 },
      ]),
    ]);
    expect(results.map((r) => r.pass)).toEqual([true, false]);
    expect(results[0]!.effect).toEqual(effect);
    expect(results[1]!.effect).toEqual(effect);
    const shown = formatEffect(effect);
    expect(shown).toMatch(/2\.00000\d* ppm/);
    expect(shown).toMatch(/Foot difference/);
    expect(shown).not.toMatch(/pass|fail/i);
  });

  it("shows a display-only result, neither passing nor failing it, and leaves it out of the counts", async () => {
    const effect = { value: 9.9, unit: "mm", label: "Method difference" };
    const results = await run([
      stub([
        { displayOnly: true, pass: false, effect },
        { displayOnly: true, effect, value: 1, tolerance: 0.5 },
        { pass: false, value: 2, tolerance: 1 },
      ]),
    ]);
    // Not judged: pass true whatever the case said; a tolerance on it is an error.
    expect(results.map((r) => r.pass)).toEqual([true, false, false]);
    expect(results[1]!.detail).toMatch(/display-only/);
    const projections = STRESS_GROUPS.find((g) => g.id === "projections")!;
    expect(projections.headline([results[0]!, results[2]!])).toMatch(
      /^0 of 1 pass/,
    );
  });

  const fingerprint: Fingerprint = {
    pipeline: "+proj=pipeline +step +inv +proj=utm +zone=10",
    grids: [{ name: "g.tif", sha256: "aa" }],
    coordinates: [-2_700_000.123, -4_290_000.456, 3_860_000.789],
  };

  it("compares the pipeline and grids exactly and coordinates within 1e-9 m", () => {
    expect(compareFingerprint(fingerprint, fingerprint)).toBeUndefined();
    const near = {
      ...fingerprint,
      coordinates: fingerprint.coordinates.map((c) => c + 4e-10),
    };
    expect(compareFingerprint(fingerprint, near)).toBeUndefined();
    expect(
      compareFingerprint(fingerprint, {
        ...fingerprint,
        pipeline: `${fingerprint.pipeline} +south`,
      }),
    ).toMatch(/pipeline/);
    expect(
      compareFingerprint(fingerprint, {
        ...fingerprint,
        grids: [{ name: "g.tif", sha256: "bb" }],
      }),
    ).toMatch(/grid/);
    expect(
      compareFingerprint(fingerprint, {
        ...fingerprint,
        coordinates: [...fingerprint.coordinates.slice(0, 2), 3_860_000.79],
      }),
    ).toMatch(/coordinate/);
    expect(
      compareFingerprint(fingerprint, {
        ...fingerprint,
        coordinates: fingerprint.coordinates.slice(0, 2),
      }),
    ).toMatch(/coordinate/);
  });

  it("fails a mismatched or unrecorded fingerprint and passes a match", async () => {
    const changed = {
      ...fingerprint,
      grids: [{ name: "g.tif", sha256: "bb" }],
    };
    const c = stub([
      { fingerprint },
      { fingerprint: changed },
      { fingerprint },
      { value: 0, tolerance: 1 },
    ]);
    const expected = {
      [`${c.id}.0`]: fingerprint,
      [`${c.id}.1`]: fingerprint,
    };
    const results = await run([c], { fingerprints: expected });
    expect(results.map((r) => r.pass)).toEqual([true, false, false, true]);
    expect(results[0]!.fingerprintCheck).toEqual({ match: true });
    expect(results[1]!.fingerprintCheck!.match).toBe(false);
    expect(results[1]!.fingerprintCheck!.difference).toMatch(/grid/);
    expect(results[2]!.fingerprintCheck!.difference).toMatch(/no recorded/);
    expect(results[3]!.fingerprintCheck).toBeUndefined();
    // Without recorded fingerprints (FRAMES_EXPLORER_UPDATE) nothing is compared.
    const unrecorded = await run([c]);
    expect(unrecorded.map((r) => r.pass)).toEqual([true, true, true, true]);
  });
});

describe("the catalog's groups and lenses (R14)", () => {
  it("files every case under a group that exists", () => {
    const ids = new Set(STRESS_GROUPS.map((g) => g.id));
    expect(ids.size).toBe(STRESS_GROUPS.length);
    for (const c of STRESS_CASES) {
      expect(ids.has(c.group), `${c.id} in ${c.group}`).toBe(true);
    }
    const caseIds = STRESS_CASES.map((c) => c.id);
    expect(new Set(caseIds).size).toBe(caseIds.length);
  });

  it("gives every group but the virtual one at least one case", () => {
    for (const g of STRESS_GROUPS) {
      if (g.collects !== undefined) {
        continue;
      }
      expect(
        STRESS_CASES.some((c) => c.group === g.id),
        `${g.id} has a case`,
      ).toBe(true);
    }
  });

  it("leaves the user's own input (R18) out of a card's count", () => {
    const card = STRESS_GROUPS.find((g) => g.id === "bound-crss")!;
    const results: StressResult[] = [
      { id: "a", group: "bound-crss", title: "A", pass: true },
      {
        id: "b",
        group: "bound-crss",
        title: "B",
        pass: false,
        userInput: true,
      },
    ];
    expect(card.headline(results)).toMatch(/^1 of 1 pass/);
  });

  it("gives every group a lens and a plain question ending in ?", () => {
    for (const g of STRESS_GROUPS) {
      expect(g.lenses.length, g.id).toBeGreaterThan(0);
      expect(g.question, g.id).toMatch(/^[A-Z].*\?$/);
      for (const lens of g.lenses) {
        expect(LENSES).toContain(lens);
      }
    }
  });

  it("gives every lens at least three groups", () => {
    for (const lens of LENSES) {
      const groups = STRESS_GROUPS.filter((g) => g.lenses.includes(lens));
      expect(groups.length, lens).toBeGreaterThanOrEqual(3);
    }
    expect([...LENSES].sort()).toEqual(
      ["av", "bim", "civil", "gis", "offshore", "space", "timing"].sort(),
    );
  });

  it("collects every fingerprinted result in Reproducibility", () => {
    const group = STRESS_GROUPS.find((g) => g.id === "reproducibility")!;
    expect(group.question).toBe(
      "Does the same file land the same in browser and Node?",
    );
    const results: StressResult[] = [
      { id: "a", group: "projections", title: "A", pass: true },
      {
        id: "b",
        group: "projections",
        title: "B",
        pass: true,
        fingerprint: { pipeline: "p", grids: [], coordinates: [] },
      },
    ];
    expect(groupResults(group, results).map((r) => r.id)).toEqual(["b"]);
    const projections = STRESS_GROUPS.find((g) => g.id === "projections")!;
    expect(groupResults(projections, results)).toHaveLength(2);
    expect(projections.headline(results)).toMatch(/2 of 2/);
    expect(projections.headline([])).toBeUndefined();
  });
});

describe("the catalog uses only the package's public API (F7)", () => {
  // The catalog imports library names from their modules, because the index
  // can't load under vitest; each name must also be exported by the index.
  const read = (path: string) =>
    readFileSync(new URL(path, import.meta.url), "utf8");

  it("imports from src/ only names src/index.ts exports", () => {
    // Every module of the catalog: tests.ts and stress/ (its runner, helpers
    // and groups).
    const root = new URL("../examples/frames-explorer/", import.meta.url);
    const files = readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".ts"))
      .sort();
    expect(files).toContain("tests.ts");
    expect(files.some((f) => f.startsWith("stress"))).toBe(true);
    const tests = files
      .map((f) => readFileSync(new URL(f, root), "utf8"))
      .join("\n");
    const index = read("../src/index.ts");
    const exported = new Set<string>();
    for (const m of index.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
      for (const part of m[1]!.split(",")) {
        const name = part
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)
          .pop()!
          .trim();
        if (name !== "") {
          exported.add(name);
        }
      }
    }
    for (const m of index.matchAll(/export\s+\*\s+as\s+(\w+)/g)) {
      exported.add(m[1]!);
    }
    const imported: string[] = [];
    const statements = [
      ...tests.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"([^"]+)"/g),
    ];
    for (const m of statements) {
      const from = m[2]!;
      if (!/^(\.\.\/)+src\//.test(from)) {
        continue;
      }
      for (const part of m[1]!.split(",")) {
        const name = part
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)[0]!
          .trim();
        if (name !== "") {
          imported.push(name);
        }
      }
    }
    expect(imported.length).toBeGreaterThan(10);
    for (const name of imported) {
      expect(exported.has(name), `${name} is exported by src/index.ts`).toBe(
        true,
      );
    }
    // Every library import goes through a named import that the check sees.
    expect(tests).not.toMatch(/import\s+\*\s+as\s+\w+\s+from\s+"(\.\.\/)+src/);
    expect(tests).not.toMatch(
      /import\s+(?!type\b)\w+\s*,?\s*(\{|from)\s*[^;]*"(\.\.\/)+src/,
    );
  });
});
