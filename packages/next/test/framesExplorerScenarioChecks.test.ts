// A scenario's check rows (examples/frames-explorer/scenarios/checks.ts),
// each with its kind (Task 6c),
// Review Focus 1: at the checked setup the catalog's judged results, against
// their published references; off it, "reference applies at the checked
// setup" with how far the setting moves the answer, and the live re-runs.
// Nothing off the checked setup reads as verified that isn't.
import { describe, expect, it } from "vitest";
import type { ScenarioEvaluation } from "../examples/frames-explorer/scenarios/evaluate.ts";
import {
  checkKind,
  checkRows,
  groupOf,
  isMeasuredReference,
  maskCheckRow,
  type MaskView,
  type CheckKind,
  type CheckRow,
} from "../examples/frames-explorer/scenarios/checks.ts";
import { extrasOf } from "../examples/frames-explorer/panelModel.ts";
import {
  checkRowStrings,
  checkRowText,
} from "../examples/frames-explorer/panel/checkText.ts";
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
  checks: ["ref.a", "ref.b", "self.round-trip"],
};

const CATALOG: ReadonlyMap<string, StressResult> = new Map(
  [
    result("ref.a", "iers-a"),
    result("ref.b", "iers-b"),
    // A round trip: compared with itself, not a published value.
    result("self.round-trip"),
    result("not.checks", "other"),
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
    label: "an hour",
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

/** The kinds `checkRows` gives SPEC's checks with CATALOG's results. */
const KIND: Readonly<Record<string, CheckKind>> = {
  "ref.a": "published",
  "ref.b": "published",
  "self.round-trip": "roundTrip",
};

const statuses = (rows: readonly CheckRow[]) => rows.map((r) => r.status);

describe("checkRows at the checked setup", () => {
  it("gives every check id as checked, with its catalog result", () => {
    const rows = checkRows(SPEC, true, CATALOG, evaluation());
    expect(rows).toEqual(
      SPEC.checks.map((id) => ({
        status: "checked",
        kind: KIND[id],
        result: CATALOG.get(id),
      })),
    );
    // The catalog's own judged result, not a copy.
    rows.forEach((row, i) => {
      expect(row.status === "checked" && row.result).toBe(
        CATALOG.get(SPEC.checks[i]!),
      );
    });
  });

  it("gives a check id the catalog hasn't given yet as pending, never a pass (R9)", () => {
    const catalog = new Map(CATALOG);
    catalog.delete("ref.b");
    const rows = checkRows(SPEC, true, catalog, evaluation());
    expect(rows).toEqual([
      { status: "checked", kind: "published", result: CATALOG.get("ref.a") },
      // Not in yet, and nothing says what it compares with: taken as
      // reference-backed, as checkRows takes it off the checked setup.
      { status: "pending", kind: "published", id: "ref.b", title: "ref.b" },
      {
        status: "checked",
        kind: "roundTrip",
        result: CATALOG.get("self.round-trip"),
      },
    ]);
    expect("pass" in rows[1]!).toBe(false);
    expect("result" in rows[1]!).toBe(false);
    // Before the catalog has run, every check id is pending.
    expect(statuses(checkRows(SPEC, true, new Map(), evaluation()))).toEqual(
      SPEC.checks.map(() => "pending"),
    );
  });

  it("never gives a display-only result as a check", () => {
    const catalog = new Map(CATALOG);
    catalog.set(
      "self.round-trip",
      result("self.round-trip", undefined, { displayOnly: true }),
    );
    const rows = checkRows(SPEC, true, catalog, evaluation());
    expect(rows).toEqual([
      { status: "checked", kind: "published", result: CATALOG.get("ref.a") },
      { status: "checked", kind: "published", result: CATALOG.get("ref.b") },
    ]);
  });
});

describe("checkRows off the checked setup (Review Focus 1)", () => {
  it("turns reference-backed ids into reference-only rows with the answer's delta, and lists the live results", () => {
    const rows = checkRows(SPEC, false, CATALOG, evaluation());
    const delta = { value: 15.5 - 15.04, unit: "°" };
    expect(rows).toEqual([
      {
        status: "reference-only",
        kind: "published",
        id: "ref.a",
        title: "The title of ref.a",
        delta,
      },
      {
        status: "reference-only",
        kind: "published",
        id: "ref.b",
        title: "The title of ref.b",
        delta,
      },
      { status: "live", kind: "live", result: LIVE },
    ]);
  });

  it("never gives a reference-only row a pass, or a catalog result as checked", () => {
    for (const extra of [
      {},
      { checkedAnswerValue: undefined },
      { live: [] },
    ] as Partial<ScenarioEvaluation>[]) {
      const rows = checkRows(SPEC, false, CATALOG, evaluation(extra));
      expect(statuses(rows)).not.toContain("checked");
      for (const row of rows.filter((r) => r.status === "reference-only")) {
        expect("pass" in row).toBe(false);
        expect("result" in row).toBe(false);
      }
      // The round trip ran at the checked setup only: its catalog pass isn't
      // shown as if it held at this setting.
      expect(JSON.stringify(rows)).not.toContain("self.round-trip");
    }
  });

  it("gives no delta without the checked answer, or without a finite answer, and still no pass", () => {
    const noChecked = checkRows(
      SPEC,
      false,
      CATALOG,
      evaluation({ checkedAnswerValue: undefined }),
    );
    const noValue = checkRows(
      SPEC,
      false,
      CATALOG,
      evaluation({
        answer: {
          label: "x",
          headline: "no value",
          accuracy: { note: "none" },
        },
      }),
    );
    const nan = checkRows(
      SPEC,
      false,
      CATALOG,
      evaluation({ checkedAnswerValue: NaN }),
    );
    for (const rows of [noChecked, noValue, nan]) {
      const references = rows.filter((r) => r.status === "reference-only");
      expect(references.map((r) => r.id)).toEqual(["ref.a", "ref.b"]);
      for (const row of references) {
        expect("delta" in row).toBe(false);
        expect("pass" in row).toBe(false);
      }
    }
  });

  it("states a delta of zero when the setting doesn't move the answer, still reference-only", () => {
    const rows = checkRows(
      SPEC,
      false,
      CATALOG,
      evaluation({ checkedAnswerValue: 15.5 }),
    );
    expect(rows[0]).toEqual({
      status: "reference-only",
      kind: "published",
      id: "ref.a",
      title: "The title of ref.a",
      delta: { value: 0, unit: "°" },
    });
  });

  it("treats a check id the catalog hasn't given yet as reference-backed: reference-only, never a pass", () => {
    const catalog = new Map(CATALOG);
    catalog.delete("ref.b");
    catalog.delete("self.round-trip");
    const rows = checkRows(SPEC, false, catalog, evaluation());
    expect(rows.filter((r) => r.status === "reference-only")).toEqual([
      expect.objectContaining({ id: "ref.a" }),
      expect.objectContaining({ id: "ref.b", title: "ref.b" }),
      expect.objectContaining({
        id: "self.round-trip",
        title: "self.round-trip",
      }),
    ]);
  });

  it("holds for every scenario's real check list: nothing off the checked setup is checked", () => {
    for (const spec of SCENARIOS) {
      const catalog = new Map(
        spec.checks.map((id) => [id, result(id, `ref-${id}`)] as const),
      );
      const rows = checkRows(
        spec,
        false,
        catalog,
        evaluation({ scenario: spec.id, live: [] }),
      );
      expect(rows.map((r) => r.status)).toEqual(
        spec.checks.map(() => "reference-only"),
      );
      const at = checkRows(
        spec,
        true,
        catalog,
        evaluation({ scenario: spec.id }),
      );
      expect(at.map((r) => r.status)).toEqual(spec.checks.map(() => "checked"));
    }
  });

  it("refuses an evaluation of another scenario", () => {
    expect(() =>
      checkRows(SPEC, false, CATALOG, evaluation({ scenario: "bim-site" })),
    ).toThrow(/bim-site.*earth-turns/);
  });
});

describe("each check's kind (Task 6c)", () => {
  it("derives a kind from what a result cites or is compared with, and the spec's word where it gives one", () => {
    const none = {};
    // A cited published value; a measured one.
    expect(checkKind(none, "x.y", result("x.y", "jpl-horizons-x"))).toBe(
      "published",
    );
    expect(checkKind(none, "x.y", result("x.y", "ngs-GU2195"))).toBe(
      "measured",
    );
    expect(checkKind(none, "x.y", result("x.y", "dsn-horizon-masks"))).toBe(
      "measured",
    );
    // An input is not a value compared with.
    expect(
      checkKind(
        none,
        "frame-tree.x",
        result("frame-tree.x", undefined, {
          source: { ...source("ngs-GU2195"), input: true },
        }),
      ),
    ).toBe("roundTrip");
    // No citation: its comparison (content.ts, else its group's).
    expect(checkKind(none, "rigid-placement-budget.site-gap.drop")).toBe(
      "hand",
    );
    expect(checkKind(none, "measurement.clothoid")).toBe("roundTrip");
    expect(checkKind(none, "space.moon-from-sacramento.range")).toBe(
      "published",
    );
    // The spec's word wins.
    expect(
      checkKind(
        { checkKinds: { "x.y": "hand" } },
        "x.y",
        result("x.y", "naif-moon-me-de440"),
      ),
    ).toBe("hand");
    expect(isMeasuredReference("ngs-AK7130")).toBe(true);
    expect(isMeasuredReference("iers-frame-bias")).toBe(false);
  });

  it("gives every scenario's check rows a kind, on and off the checked setup, and only live rows the live kind", () => {
    for (const spec of SCENARIOS) {
      const catalog = new Map(
        spec.checks.map((id) => {
          const group = id.slice(0, id.indexOf("."));
          return [id, { ...result(id), group }] as const;
        }),
      );
      for (const at of [true, false]) {
        for (const c of [catalog, new Map<string, StressResult>()]) {
          const rows = checkRows(
            spec,
            at,
            c,
            evaluation({ scenario: spec.id }),
          );
          for (const row of rows) {
            expect(
              CHECK_KIND_SET.has(row.kind),
              `${spec.id} ${row.status}`,
            ).toBe(true);
            expect(row.kind === "live", spec.id).toBe(row.status === "live");
          }
        }
      }
    }
  });

  it("only uses the word 'validated' on measured-data rows (scenarios' notes, labels, comparisons and row text)", () => {
    const validated = /\bvalidated\b/i;
    for (const spec of SCENARIOS) {
      for (const id of spec.checks) {
        const kind = checkKind(spec, id);
        const r = { ...result(id), group: groupOf(id) };
        const extras = extrasOf(r);
        const note = spec.checkNotes?.[id];
        const row: CheckRow = {
          status: "checked",
          kind,
          result: r,
          ...(note !== undefined && { note }),
        };
        const t = checkRowText(row, { [id]: extras });
        const text = checkRowStrings(row, t, extras).join(" ");
        if (kind !== "measured") {
          expect(validated.test(text), `${spec.id} ${id}`).toBe(false);
        }
      }
    }
  });
});

describe("checkKind's fallbacks (fix 1)", () => {
  it("takes an id nothing says anything about as reference-backed, as checkRows does off the checked setup", () => {
    expect(checkKind({}, "nowhere.at-all")).toBe("published");
    expect(checkKind({}, "nodot")).toBe("published");
    const spec = { ...SPEC, checks: ["nowhere.at-all"] };
    const off = checkRows(spec, false, new Map(), evaluation());
    expect(off[0]).toMatchObject({
      status: "reference-only",
      kind: "published",
    });
    const at = checkRows(spec, true, new Map(), evaluation());
    expect(at[0]).toMatchObject({ status: "pending", kind: "published" });
  });

  it("reads a group from an id without a dot whole, not one character short", () => {
    expect(groupOf("frame-tree")).toBe("frame-tree");
    expect(groupOf("frame-tree.compositions.x")).toBe("frame-tree");
    // A bare group id gets its group's comparison (round trips).
    expect(checkKind({}, "frame-tree")).toBe("roundTrip");
  });
});

describe("the dish's measured-data row (fix 1): our terrain against the DSN's mask", () => {
  const check = {
    label: "DSS-43's published receive mask",
    samples: 8,
    source: { document: "DSN 810-005, Module 301", publisher: "NASA JPL" },
  };
  const view = (
    state: MaskView["state"],
    mask?: MaskView["mask"],
  ): MaskView => ({
    state,
    text: `Our terrain against DSS-43's published receive mask (measured data), at 8 azimuths: ${state}`,
    ...(mask && { mask }),
    meters: 38,
  });
  const words = (row: CheckRow) => checkRowText(row, {});
  const validated = /\bvalidated\b/i;

  it("is of the measured kind whatever its outcome", () => {
    for (const v of [
      undefined,
      view("waiting"),
      view("clear", { azimuths: 8, below: 8, above: 0, unsure: 0 }),
      view("blocked", { azimuths: 8, below: 6, above: 2, unsure: 0 }),
      view("may-block", { azimuths: 8, below: 0, above: 0, unsure: 8 }),
      view("unknown"),
    ]) {
      const row = maskCheckRow(check, v);
      expect(row.kind).toBe("measured");
      expect(row.status).toBe("page");
    }
  });

  it("says Consistent, and validated, only where our terrain lies below the mask everywhere", () => {
    const t = words(
      maskCheckRow(
        check,
        view("clear", { azimuths: 8, below: 8, above: 0, unsure: 0 }),
      ),
    );
    expect(t.status).toBe("Consistent");
    expect(t.tone).toBe("pass");
    expect(t.summary).toMatch(validated);
    expect(t.title).toBe(
      "Our terrain horizon vs DSS-43's published receive mask, 8 azimuths",
    );
  });

  it("never passes when it can't tell, nor over terrain not traced (Review Focus 2), and says what it compared", () => {
    for (const v of [
      view("may-block", { azimuths: 8, below: 0, above: 0, unsure: 8 }),
      view("unknown"),
    ]) {
      const row = maskCheckRow(check, v);
      const t = words(row);
      expect(t.status).toBe("Can't tell");
      expect(t.tone).toBe("unsure");
      expect(checkRowStrings(row, t, undefined).join(" ")).not.toMatch(
        validated,
      );
    }
    const loading = words(maskCheckRow(check, undefined));
    expect(loading.status).toBe("Loading");
    expect(loading.tone).toBe("loading");
    expect(words(maskCheckRow(check, view("waiting"))).status).toBe("Loading");
  });

  it("says where our terrain rises above the mask, without validated", () => {
    const row = maskCheckRow(
      check,
      view("blocked", { azimuths: 8, below: 6, above: 2, unsure: 0 }),
    );
    const t = words(row);
    expect(t.status).toBe("Rises above the mask");
    expect(t.tone).toBe("fail");
    expect(t.summary).toBe(
      "our terrain rises above the published mask at 2 of 8 azimuths",
    );
    expect(checkRowStrings(row, t, undefined).join(" ")).not.toMatch(validated);
  });

  it("keeps its verdict while the clock plays (the mask is the station's), and withholds it while a new setup is worked out", () => {
    const row = maskCheckRow(
      check,
      view("clear", { azimuths: 8, below: 8, above: 0, unsure: 0 }),
    );
    expect(checkRowText(row, {}, "following").status).toBe("Consistent");
    const stale = checkRowText(row, {}, "updating");
    expect(stale.status).toBe("Updating");
    expect(stale.summary).not.toMatch(validated);
  });

  it("joins the row's citation into what the guard reads", () => {
    const row = maskCheckRow(check, undefined);
    const all = checkRowStrings(row, words(row), undefined);
    expect(all).toContain("DSN 810-005, Module 301");
    expect(all).toContain("NASA JPL");
  });
});

const CHECK_KIND_SET: ReadonlySet<string> = new Set([
  "published",
  "measured",
  "hand",
  "roundTrip",
  "live",
]);
