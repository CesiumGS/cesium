// The profile layer's invariants over personas x looks x fidelity
// (docs/superpowers/plans/2026-11-13-engine-profiles.md, section 5, tests 1 to
// 9), and the first rules against the behavior they describe. Node only: the
// resolver reads no GPU.
import { describe, expect, it } from "vitest";
import { GpuDevice } from "../src/gpu/GpuDevice.ts";
import { glareTier } from "../src/render/post/glare.ts";
import {
  CATALOG,
  VARIANT_BUDGET,
  variantCount,
} from "../src/profile/catalog.ts";
import { evaluate, pathsRead } from "../src/profile/predicate.ts";
import { personas, type PersonaName } from "../src/profile/personas.ts";
import {
  orderAt,
  PROFILE_DATA,
  resolve,
  explain,
  type ProfileData,
} from "../src/profile/resolve.ts";
import { RULES } from "../src/profile/rules.ts";
import { REQUIRED_CONTENT, support } from "../src/profile/support.ts";
import type {
  Context,
  Fidelity,
  Look,
  Reason,
  Rule,
  Step,
} from "../src/profile/types.ts";
import { installPersona, personas as fakePersonas } from "./fakeGpu.ts";

const NAMES = Object.keys(personas) as PersonaName[];
const FEATURES = Object.keys(CATALOG);
const FIDELITIES: Fidelity[] = ["auto", "fixed"];

const CONTEXTS: Context[] = [];
for (const pixels of [1e6, 4e6, 9e6, 20e6]) {
  for (const altitudeKm of [1, 100, 700, 5000]) {
    CONTEXTS.push({ pixels, altitudeKm });
  }
}

/** Defaults, everything true, everything off, and every step of every feature pinned. */
const LOOKS: { name: string; look: Look }[] = [
  { name: "defaults", look: {} },
  {
    name: "all true",
    look: Object.fromEntries(FEATURES.map((f) => [f, true])),
  },
  {
    name: "all off",
    look: Object.fromEntries(FEATURES.map((f) => [f, false])),
  },
  { name: "glare true", look: { glare: true } },
  {
    name: "essential extras",
    look: { glare: true, importance: { glare: "essential" } },
  },
];
for (const [feature, entry] of Object.entries(CATALOG)) {
  for (const step of entry.steps) {
    LOOKS.push({
      name: `${feature} pinned ${step}`,
      look: { [feature]: step },
    });
  }
}

interface Row {
  persona: PersonaName;
  look: string;
  fidelity: Fidelity;
  context: Context;
  effective: ReturnType<typeof resolve>;
}

function* matrix(): Generator<Row> {
  for (const persona of NAMES) {
    for (const { name: look, look: l } of LOOKS) {
      for (const fidelity of FIDELITIES) {
        for (const context of CONTEXTS) {
          yield {
            persona,
            look: look,
            fidelity,
            context,
            effective: resolve({
              facts: personas[persona],
              look: l,
              fidelity,
              context,
            }),
          };
        }
      }
    }
  }
}

const rows = [...matrix()];

const asked = (look: Look, feature: string) =>
  feature in look
    ? look[feature]!
    : CATALOG[feature as keyof typeof CATALOG].defaultLook;

describe("profile invariants", () => {
  it("1. every feature resolves on every persona, with a documented fallback", () => {
    expect(rows.length).toBeGreaterThan(1000);
    for (const row of rows) {
      expect(Object.keys(row.effective.features).sort()).toEqual(
        [...FEATURES].sort(),
      );
      for (const [name, f] of Object.entries(row.effective.features)) {
        const entry = CATALOG[name as keyof typeof CATALOG];
        const allowed: Step[] = [...entry.steps, entry.fallback];
        expect(
          f.given === "off" || allowed.includes(f.given),
          `${row.persona} ${row.look} ${name} gave ${String(f.given)}`,
        ).toBe(true);
        expect(f.because.length).toBeGreaterThan(0);
      }
    }
  });

  it("2. every renderer persona supports the required content kinds", () => {
    for (const name of NAMES) {
      const report = support(personas[name]);
      for (const kind of REQUIRED_CONTENT) {
        expect(report.content.required, `${name}`).toContain(kind);
      }
      // Required content never depends on an optional feature.
      expect(report.renderer).toBe(personas[name].renderer);
    }
  });

  it("3. the step given is never better than the step asked", () => {
    for (const row of rows) {
      const look = LOOKS.find((l) => l.name === row.look)!.look;
      for (const name of FEATURES) {
        const a = asked(look, name);
        const given = row.effective.features[name]!.given;
        if (a === false) {
          expect(given).toBe("off");
          continue;
        }
        if (given === "off") {
          continue;
        }
        const order = orderAt(name, {
          facts: personas[row.persona],
          context: row.context,
        });
        const wanted = a === true ? 0 : Math.max(order.indexOf(a as Step), 0);
        const at = order.indexOf(given);
        if (at >= 0) {
          expect(
            at,
            `${row.persona} ${row.look} ${name}: ${String(given)} for ${String(a)}`,
          ).toBeGreaterThanOrEqual(wanted);
        }
      }
    }
  });

  it("4. under fixed no stepped or dropped notice appears", () => {
    for (const row of rows.filter((r) => r.fidelity === "fixed")) {
      for (const n of row.effective.notices) {
        expect(["stepped", "dropped"]).not.toContain(n.kind);
      }
    }
  });

  it("5. every rule fires on some persona and wins somewhere", () => {
    const applied = new Set<string>();
    for (const row of rows) {
      for (const f of Object.values(row.effective.features)) {
        for (const r of f.because) {
          if (r.applied) {
            applied.add(r.rule);
          }
        }
      }
    }
    const dead = RULES.map((r) => r.id).filter((id) => !applied.has(id));
    expect(dead).toEqual([]);
  });

  it("6. accuracy features step only by a limit rule", () => {
    for (const row of rows) {
      for (const [name, f] of Object.entries(row.effective.features)) {
        if (CATALOG[name as keyof typeof CATALOG].class === "accuracy") {
          for (const r of f.because) {
            expect(["cost"]).not.toContain(r.layer);
          }
        }
      }
    }
    // Data: no cost rule names an accuracy feature, and a limit on one states its effect.
    for (const rule of RULES as readonly Rule[]) {
      const entry = CATALOG[rule.feature as keyof typeof CATALOG];
      if (entry.class === "accuracy") {
        expect(rule.kind).not.toBe("cost");
        if (rule.kind === "limit") {
          expect(rule.accuracy).toBeTruthy();
        }
      }
    }
    // The resolver itself refuses: a cost rule injected on an accuracy feature does nothing.
    const hostile: ProfileData = {
      catalog: CATALOG,
      rules: [
        ...RULES,
        {
          id: "normals.hostile",
          kind: "cost",
          feature: "normals",
          when: { above: ["context.pixels", 0] },
          cap: "linear",
          reason: "test",
          provenance: "test",
        },
      ],
    };
    const effective = resolve(
      {
        facts: personas["m2-chrome"],
        look: {},
        fidelity: "auto",
        context: { pixels: 1e6, altitudeKm: 1 },
      },
      hostile,
    );
    expect(effective.features["normals"]!.given).toBe("exact");
    // A limit rule does step it, reported with its effect.
    const limited: ProfileData = {
      catalog: CATALOG,
      rules: [
        ...RULES,
        {
          id: "normals.memory",
          kind: "limit",
          feature: "normals",
          when: { above: ["context.pixels", 0] },
          cap: "linear",
          reason: "test",
          accuracy: "shading normals off by up to 2 degrees",
        },
      ],
    };
    const result = resolve(
      {
        facts: personas["m2-chrome"],
        look: {},
        fidelity: "fixed",
        context: { pixels: 1e6, altitudeKm: 1 },
      },
      limited,
    );
    expect(result.features["normals"]!.given).toBe("linear");
    expect(result.notices).toContainEqual(
      expect.objectContaining({
        kind: "limited",
        feature: "normals",
        accuracy: "shading normals off by up to 2 degrees",
      }),
    );
  });

  it("7. support, effective settings and notices survive structuredClone", () => {
    for (const name of NAMES) {
      const report = support(personas[name]);
      expect(structuredClone(report)).toEqual(report);
    }
    for (const row of rows) {
      expect(structuredClone(row.effective)).toEqual(row.effective);
    }
    // Rules are data too.
    expect(structuredClone(RULES)).toEqual(RULES);
  });

  it("8. compile-time steps stay within the variant budget", () => {
    expect(variantCount()).toBeLessThanOrEqual(VARIANT_BUDGET);
    for (const [name, entry] of Object.entries(CATALOG)) {
      expect(Object.keys(entry.stepKind).sort(), name).toEqual(
        entry.steps.map(String).sort(),
      );
    }
  });

  describe("9. snapshots", () => {
    const context = { pixels: 4e6, altitudeKm: 100 };
    for (const name of NAMES) {
      it(`${name}: support`, () => {
        expect(support(personas[name])).toMatchSnapshot();
      });
      for (const fidelity of FIDELITIES) {
        it(`${name}: effective, ${fidelity}, glare on`, () => {
          const effective = resolve({
            facts: personas[name],
            look: { glare: true },
            fidelity,
            context,
          });
          // The trail is the point: what was asked, given, and why.
          expect(
            Object.fromEntries(
              Object.entries(effective.features).map(([f, e]) => [
                f,
                {
                  asked: e.asked,
                  given: e.given,
                  because: e.because.map(
                    (r: Reason) => `${r.applied ? "*" : " "}${r.rule}`,
                  ),
                },
              ]),
            ),
          ).toMatchSnapshot();
          expect(effective.notices).toMatchSnapshot();
        });
      }
    }
  });
});

describe("the first rules describe today's behavior", () => {
  it("glare's auto tier is glareTier() on every persona and size", () => {
    for (const name of NAMES) {
      for (const pixels of [
        1e5,
        1e6,
        3.7e6,
        3.7e6 + 1,
        8.3e6,
        8.3e6 + 1,
        2e7,
      ]) {
        const today = glareTier(personas[name].adapter, pixels);
        const effective = resolve({
          facts: personas[name],
          look: { glare: true },
          fidelity: "auto",
          context: { pixels, altitudeKm: 1 },
        });
        expect(effective.features["glare"]!.given, `${name} ${pixels}`).toBe(
          today,
        );
      }
    }
  });

  it("glare is off by default, and a pinned tier is not lowered by cost", () => {
    const facts = personas["swiftshader"];
    const context = { pixels: 2e7, altitudeKm: 1 };
    expect(
      resolve({ facts, look: {}, fidelity: "auto", context }).features["glare"]!
        .given,
    ).toBe("off");
    const pinned = resolve({
      facts,
      look: { glare: "full" },
      fidelity: "auto",
      context,
    });
    expect(pinned.features["glare"]!.given).toBe("full");
    expect(pinned.notices.filter((n) => n.feature === "glare")).toEqual([]);
  });

  it("translucency's moments drop to 16 bits without float32-blendable", () => {
    const context = { pixels: 1e6, altitudeKm: 1 };
    for (const name of NAMES) {
      const facts = personas[name];
      const blendable = (facts.features as readonly string[]).includes(
        "float32-blendable",
      );
      const effective = resolve({
        facts,
        look: { translucency: "moments32" },
        fidelity: "auto",
        context,
      });
      expect(effective.features["translucency"]!.given).toBe(
        blendable ? "moments32" : "moments16",
      );
      expect(effective.notices.map((n) => n.kind)).toEqual(
        blendable ? [] : ["unmet"],
      );
    }
    // Asked for the best, the exact lists need nothing.
    expect(
      resolve({
        facts: personas["no-float32-blendable"],
        look: {},
        fidelity: "auto",
        context,
      }).features["translucency"]!.given,
    ).toBe("exact");
  });

  it("ambient occlusion is skipped above 4096 by 4096 pixels, under any fidelity", () => {
    for (const fidelity of FIDELITIES) {
      const at = (pixels: number) =>
        resolve({
          facts: personas["m2-chrome"],
          look: {},
          fidelity,
          context: { pixels, altitudeKm: 1 },
        });
      expect(at(4096 * 4096).features["ambientOcclusion"]!.given).toBe("full");
      const over = at(4096 * 4096 + 1);
      expect(over.features["ambientOcclusion"]!.given).toBe("off");
      expect(over.notices).toEqual([
        expect.objectContaining({
          kind: "limited",
          rule: "ambientOcclusion.maxPixels",
        }),
      ]);
    }
  });

  it("under fixed, aerial perspective is today's altitude choice", () => {
    const best = (altitudeKm: number) =>
      resolve({
        facts: personas["m2-chrome"],
        look: {},
        fidelity: "fixed",
        context: { pixels: 1e6, altitudeKm },
      }).features["aerialPerspective"]!.given;
    expect(best(1)).toBe("volume");
    expect(best(10)).toBe("march");
    expect(best(499)).toBe("march");
    expect(best(500)).toBe("screen");
    expect(best(5000)).toBe("screen");
  });

  it("a pinned aerial step that isn't offered at this altitude is unmet", () => {
    const effective = resolve({
      facts: personas["m2-chrome"],
      look: { aerialPerspective: "march" },
      fidelity: "auto",
      context: { pixels: 1e6, altitudeKm: 5000 },
    });
    expect(effective.features["aerialPerspective"]!.given).toBe("screen");
    expect(effective.notices).toEqual([
      expect.objectContaining({ kind: "unmet", feature: "aerialPerspective" }),
    ]);
  });

  it("its rank rules cover every altitude exactly once", () => {
    for (const altitudeKm of [
      0, 1.999, 2, 4, 499.999, 500, 999.999, 1000, 1e6,
    ]) {
      const matched = RULES.filter(
        (r) =>
          r.kind === "rank" &&
          evaluate(r.when, {
            facts: personas["m2-chrome"],
            context: { pixels: 1, altitudeKm },
          }),
      );
      expect(matched, `${altitudeKm} km`).toHaveLength(1);
    }
  });
});

describe("the resolver's contract", () => {
  const base = {
    facts: personas["m2-chrome"],
    fidelity: "auto" as const,
    context: { pixels: 1e6, altitudeKm: 1 },
  };

  it("throws for an unknown option or a value outside its type", () => {
    expect(() => resolve({ ...base, look: { glow: true } })).toThrow(/unknown/);
    expect(() => resolve({ ...base, look: { glare: "huge" } })).toThrow(
      /glare must be/,
    );
    expect(() => resolve({ ...base, look: { resolution: 0.6 } })).toThrow(
      /resolution must be/,
    );
    expect(() =>
      resolve({
        ...base,
        look: { glare: true, importance: { glare: "vital" as never } },
      }),
    ).toThrow(/importance/);
    expect(() =>
      resolve({ ...base, look: { importance: { nope: "extra" } } }),
    ).toThrow(/unknown feature/);
  });

  it("explains a value with its rules, winners and losers", () => {
    const effective = resolve({
      ...base,
      facts: personas["intel-uhd-4k"],
      look: { glare: true },
      context: { pixels: 4e6, altitudeKm: 1 },
    });
    const { asked: a, given, trail } = explain(effective, "glare");
    expect([a, given]).toEqual([true, "sources"]);
    const byRule = Object.fromEntries(trail.map((r) => [r.rule, r.applied]));
    expect(byRule["glare.intel.pixels"]).toBe(true);
    expect(byRule["glare.intel.start"]).toBe(false);
    expect(
      trail.find((r) => r.rule === "glare.intel.pixels")?.provenance,
    ).toMatch(/estimated/);
  });

  it("never drops a preferred feature for cost, and an extra one it may", () => {
    const rules: Rule[] = [
      ...RULES,
      {
        id: "shadows.test",
        kind: "cost",
        feature: "translucency",
        when: { above: ["context.pixels", 0] },
        cap: "off",
        reason: "test",
        provenance: "test",
      },
    ];
    const effective = resolve(
      { ...base, look: {} },
      { catalog: CATALOG, rules },
    );
    expect(effective.features["translucency"]!.given).toBe("moments16");
    const extra = resolve(
      { ...base, look: { importance: { translucency: "extra" } } },
      { catalog: CATALOG, rules },
    );
    expect(extra.features["translucency"]!.given).toBe("off");
    expect(extra.notices).toContainEqual(
      expect.objectContaining({ kind: "dropped", feature: "translucency" }),
    );
  });

  it("gives unknown hardware the best supported step", () => {
    const facts = {
      ...personas["m2-chrome"],
      adapter: {
        vendor: "newcomer",
        architecture: "x",
        isFallbackAdapter: false,
      },
    };
    const effective = resolve({
      facts,
      look: { glare: true },
      fidelity: "auto",
      context: { pixels: 1e6, altitudeKm: 1 },
    });
    expect(effective.features["glare"]!.given).toBe("full");
    expect(
      effective.features["glare"]!.because.filter((r) => r.layer === "cost"),
    ).toEqual([]);
  });

  it("keeps rules well formed: unique ids, known features and steps, support rules read no context", () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const rule of RULES as readonly Rule[]) {
      const entry = CATALOG[rule.feature as keyof typeof CATALOG];
      expect(entry, rule.id).toBeDefined();
      expect(rule.id.startsWith(`${rule.feature}.`)).toBe(true);
      expect(rule.reason.length).toBeGreaterThan(0);
      const steps = entry.steps as readonly Step[];
      if (rule.kind === "requires") {
        expect(steps).toContain(rule.step);
        expect(
          pathsRead(rule.needs).filter((p) => p.startsWith("context.")),
        ).toEqual([]);
      } else if (rule.kind === "rank") {
        for (const s of rule.order) {
          expect(steps).toContain(s);
        }
      } else {
        if (rule.cap !== "off") {
          expect(steps).toContain(rule.cap);
        }
        if (rule.kind === "cost") {
          expect(rule.provenance).toMatch(/measured|estimated/);
        }
      }
    }
    expect(PROFILE_DATA.rules).toBe(RULES);
  });

  it("evaluates the predicate language and rejects a shape it doesn't know", () => {
    const subject = {
      facts: personas["intel-uhd-4k"],
      context: { pixels: 5, altitudeKm: 7 },
    };
    expect(evaluate({ equals: ["adapter.vendor", "intel"] }, subject)).toBe(
      true,
    );
    expect(
      evaluate({ in: ["canvasFormat", ["rgba8unorm", "bgra8unorm"]] }, subject),
    ).toBe(true);
    expect(
      evaluate({ includes: ["adapter.architecture", "GEN"] }, subject),
    ).toBe(true);
    expect(evaluate({ above: ["context.pixels", 5] }, subject)).toBe(false);
    expect(evaluate({ below: ["context.altitudeKm", 8] }, subject)).toBe(true);
    expect(evaluate({ has: "timestamp-query" }, subject)).toBe(true);
    expect(evaluate({ has: "texture-compression-astc" }, subject)).toBe(false);
    expect(evaluate({ not: { has: "subgroups" } }, subject)).toBe(false);
    expect(
      evaluate(
        { any: [{ has: "subgroups" }, { has: "timestamp-query" }] },
        subject,
      ),
    ).toBe(true);
    expect(() =>
      evaluate({ equals: ["context.pixels", 1] }, { facts: subject.facts }),
    ).toThrow(/no context/);
    expect(() => evaluate({ bogus: 1 } as never, subject)).toThrow(
      /not a predicate/,
    );
  });
});

describe("personas", () => {
  for (const name of NAMES) {
    it(`${name} agrees with the fake GPU's`, async () => {
      const fake = fakePersonas[name];
      installPersona(name);
      const gpu = await GpuDevice.create({ recoverFromLoss: false });
      const { features, adapter, canvasFormat } = gpu.facts;
      expect(personas[name].features).toEqual(features);
      expect(personas[name].adapter).toEqual(fake.info);
      expect(personas[name].adapter).toEqual(adapter);
      expect(personas[name].canvasFormat).toBe(canvasFormat);
      gpu.destroy();
    });
  }
});
