// A scenario's proof rows (examples/frames-explorer/scenarios/proof.ts),
// Review Focus 1: at the checked setup the catalog's judged results, against
// their published references; off it, "reference applies at the checked
// setup" with how far the setting moves the answer, and the live re-runs.
// Nothing off the checked setup reads as verified that isn't.
import { describe, expect, it } from "vitest";
import type { ScenarioEvaluation } from "../examples/frames-explorer/scenarios/evaluate.ts";
import {
  proofRows,
  type ProofRow,
} from "../examples/frames-explorer/scenarios/proof.ts";
import type { ScenarioSpec } from "../examples/frames-explorer/scenarios/spec.ts";
import { SCENARIOS } from "../examples/frames-explorer/scenarios/specs.ts";
import type { StressResult } from "../examples/frames-explorer/tests.ts";

const source = (reference: string) => ({
  reference,
  document: `The document of ${reference}`,
  retrieved: "2026-01-01",
});

/** A catalog result: compared with a published value when `cites` is given. */
const result = (
  id: string,
  cites?: string,
  extra: Partial<StressResult> = {},
): StressResult => ({
  id,
  group: "frame-tree",
  title: `The title of ${id}`,
  pass: true,
  value: 1e-6,
  tolerance: 1e-3,
  unit: "m",
  ...(cites !== undefined && { source: source(cites) }),
  ...extra,
});

const SPEC: ScenarioSpec = {
  id: "earth-turns",
  title: "The Earth turns",
  question: "How does the ground move against the stars?",
  knobs: [
    { id: "rate", label: "Clock rate", kind: "range", min: 1, max: 86_400 },
  ],
  checked: { epochUtc: "2026-03-20T12:00:00Z", knobs: { rate: 3600 } },
  needs: [],
  globe: "ellipsoid",
  proof: ["ref.a", "ref.b", "self.round-trip"],
};

const CATALOG: ReadonlyMap<string, StressResult> = new Map(
  [
    result("ref.a", "iers-a"),
    result("ref.b", "iers-b"),
    // A round trip: compared with itself, not a published value.
    result("self.round-trip"),
    result("not.proof", "other"),
  ].map((r) => [r.id, r]),
);

const LIVE: StressResult = {
  id: "live.round-trip",
  group: "frame-tree",
  title: "ITRF to GCRF and back at your setting",
  pass: true,
  value: 2e-9,
  tolerance: 1e-6,
  unit: "m",
};

const evaluation = (
  extra: Partial<ScenarioEvaluation> = {},
): ScenarioEvaluation => ({
  scenario: "earth-turns",
  added: [],
  answer: {
    headline: "The ground turns 15.04° an hour against the stars",
    value: 15.5,
    unit: "°",
    accuracy: { note: "IERS rotation, to 1 µas" },
  },
  overlays: [],
  live: [LIVE],
  checkedAnswerValue: 15.04,
  ...extra,
});

const kinds = (rows: readonly ProofRow[]) => rows.map((r) => r.kind);

describe("proofRows at the checked setup", () => {
  it("gives every proof id as checked, with its catalog result", () => {
    const rows = proofRows(SPEC, true, CATALOG, evaluation());
    expect(rows).toEqual(
      SPEC.proof.map((id) => ({ kind: "checked", result: CATALOG.get(id) })),
    );
    // The catalog's own judged result, not a copy.
    rows.forEach((row, i) => {
      expect(row.kind === "checked" && row.result).toBe(
        CATALOG.get(SPEC.proof[i]!),
      );
    });
  });

  it("gives a proof id the catalog hasn't given yet as pending, never a pass (R9)", () => {
    const catalog = new Map(CATALOG);
    catalog.delete("ref.b");
    const rows = proofRows(SPEC, true, catalog, evaluation());
    expect(rows).toEqual([
      { kind: "checked", result: CATALOG.get("ref.a") },
      { kind: "pending", id: "ref.b", title: "ref.b" },
      { kind: "checked", result: CATALOG.get("self.round-trip") },
    ]);
    expect("pass" in rows[1]!).toBe(false);
    expect("result" in rows[1]!).toBe(false);
    // Before the catalog has run, every proof id is pending.
    expect(kinds(proofRows(SPEC, true, new Map(), evaluation()))).toEqual(
      SPEC.proof.map(() => "pending"),
    );
  });

  it("never gives a display-only result as proof", () => {
    const catalog = new Map(CATALOG);
    catalog.set(
      "self.round-trip",
      result("self.round-trip", undefined, { displayOnly: true }),
    );
    const rows = proofRows(SPEC, true, catalog, evaluation());
    expect(rows).toEqual([
      { kind: "checked", result: CATALOG.get("ref.a") },
      { kind: "checked", result: CATALOG.get("ref.b") },
    ]);
  });
});

describe("proofRows off the checked setup (Review Focus 1)", () => {
  it("turns reference-backed ids into reference-only rows with the answer's delta, and lists the live results", () => {
    const rows = proofRows(SPEC, false, CATALOG, evaluation());
    const delta = { value: 15.5 - 15.04, unit: "°" };
    expect(rows).toEqual([
      {
        kind: "reference-only",
        id: "ref.a",
        title: "The title of ref.a",
        delta,
      },
      {
        kind: "reference-only",
        id: "ref.b",
        title: "The title of ref.b",
        delta,
      },
      { kind: "live", result: LIVE },
    ]);
  });

  it("never gives a reference-only row a pass, or a catalog result as checked", () => {
    for (const extra of [
      {},
      { checkedAnswerValue: undefined },
      { live: [] },
    ] as Partial<ScenarioEvaluation>[]) {
      const rows = proofRows(SPEC, false, CATALOG, evaluation(extra));
      expect(kinds(rows)).not.toContain("checked");
      for (const row of rows.filter((r) => r.kind === "reference-only")) {
        expect("pass" in row).toBe(false);
        expect("result" in row).toBe(false);
      }
      // The round trip ran at the checked setup only: its catalog pass isn't
      // shown as if it held at this setting.
      expect(JSON.stringify(rows)).not.toContain("self.round-trip");
    }
  });

  it("gives no delta without the checked answer, or without a finite answer, and still no pass", () => {
    const noChecked = proofRows(
      SPEC,
      false,
      CATALOG,
      evaluation({ checkedAnswerValue: undefined }),
    );
    const noValue = proofRows(
      SPEC,
      false,
      CATALOG,
      evaluation({
        answer: { headline: "no value", accuracy: { note: "none" } },
      }),
    );
    const nan = proofRows(
      SPEC,
      false,
      CATALOG,
      evaluation({ checkedAnswerValue: NaN }),
    );
    for (const rows of [noChecked, noValue, nan]) {
      const references = rows.filter((r) => r.kind === "reference-only");
      expect(references.map((r) => r.id)).toEqual(["ref.a", "ref.b"]);
      for (const row of references) {
        expect("delta" in row).toBe(false);
        expect("pass" in row).toBe(false);
      }
    }
  });

  it("states a delta of zero when the setting doesn't move the answer, still reference-only", () => {
    const rows = proofRows(
      SPEC,
      false,
      CATALOG,
      evaluation({ checkedAnswerValue: 15.5 }),
    );
    expect(rows[0]).toEqual({
      kind: "reference-only",
      id: "ref.a",
      title: "The title of ref.a",
      delta: { value: 0, unit: "°" },
    });
  });

  it("treats a proof id the catalog hasn't given yet as reference-backed: reference-only, never a pass", () => {
    const catalog = new Map(CATALOG);
    catalog.delete("ref.b");
    catalog.delete("self.round-trip");
    const rows = proofRows(SPEC, false, catalog, evaluation());
    expect(rows.filter((r) => r.kind === "reference-only")).toEqual([
      expect.objectContaining({ id: "ref.a" }),
      expect.objectContaining({ id: "ref.b", title: "ref.b" }),
      expect.objectContaining({
        id: "self.round-trip",
        title: "self.round-trip",
      }),
    ]);
  });

  it("holds for every scenario's real proof list: nothing off the checked setup is checked", () => {
    for (const spec of SCENARIOS) {
      const catalog = new Map(
        spec.proof.map((id) => [id, result(id, `ref-${id}`)] as const),
      );
      const rows = proofRows(
        spec,
        false,
        catalog,
        evaluation({ scenario: spec.id, live: [] }),
      );
      expect(rows.map((r) => r.kind)).toEqual(
        spec.proof.map(() => "reference-only"),
      );
      const at = proofRows(
        spec,
        true,
        catalog,
        evaluation({ scenario: spec.id }),
      );
      expect(at.map((r) => r.kind)).toEqual(spec.proof.map(() => "checked"));
    }
  });

  it("refuses an evaluation of another scenario", () => {
    expect(() =>
      proofRows(SPEC, false, CATALOG, evaluation({ scenario: "bim-site" })),
    ).toThrow(/bim-site.*earth-turns/);
  });
});
