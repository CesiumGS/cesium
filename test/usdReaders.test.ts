// CS-900's instrument, its own logic only: facts and coverage counted from
// prim records, each reader's adapter on small fixtures, sizes and what a
// reader's files ask of the page. No SimReady sample and no reader build is
// loaded here; those run in the Lab (dyno lab usdReaders).
import { describe, expect, it } from "vitest";
import { loadLayers, Stage } from "../spikes/usd-subset/compose.ts";
import { FIXTURE } from "../spikes/usd-subset/fixture.ts";
import {
  coverage,
  describeCoverage,
  FEATURES,
  stageFacts,
  type PrimRecord,
  type StageRecord,
} from "../spikes/usd-readers/facts.ts";
import {
  describeOutcome,
  settle,
  type Opened,
} from "../spikes/usd-readers/outcome.ts";
import { isRequest } from "../spikes/usd-readers/request.ts";
import {
  hostRequirements,
  shippedSizes,
  sizesOf,
} from "../spikes/usd-readers/host.ts";
import {
  attrFromUsda,
  lightusdRecords,
  usdaArrayElements,
} from "../spikes/usd-readers/lightusdRecords.ts";
import { subsetRecords } from "../spikes/usd-readers/subsetRecords.ts";

const prim = (
  path: string,
  typeName: string,
  more: Partial<PrimRecord> = {},
): PrimRecord => ({
  path,
  typeName,
  apiSchemas: [],
  attrs: {},
  rels: {},
  ...more,
});

/** A small stage with one of everything the facts count, worked out by hand. */
const STAGE: StageRecord = {
  upAxis: "Z",
  metersPerUnit: 1,
  defaultPrim: "Root",
  errors: [],
  prims: [
    prim("/Root", "Xform", {
      apiSchemas: ["PhysicsRigidBodyAPI", "SemanticsLabelsAPI:wikidata_class"],
      attrs: {
        "semantics:labels:wikidata_class": {
          type: "token[]",
          count: 2,
          value: ["cart", "toy"],
        },
      },
      rels: { "material:binding": ["/Root/Looks/Red"] },
    }),
    // A triangle and a quad: 1 + 2 triangles. Bound through /Root.
    prim("/Root/Body", "Mesh", {
      apiSchemas: ["PhysicsCollisionAPI", "PhysicsMassAPI"],
      attrs: {
        faceVertexCounts: { type: "int[]", count: 2, sum: 7 },
        extent: { type: "float3[]", count: 2 },
        "primvars:normals": { type: "normal3f[]", count: 7 },
        "primvars:st": { type: "texCoord2f[]", count: 7 },
      },
    }),
    // Its own binding to a prim that isn't a Material: unbound.
    prim("/Root/Wheel", "Mesh", {
      apiSchemas: ["SemanticsAPI:Semantics_x1"],
      attrs: { faceVertexCounts: { type: "int[]", count: 1, sum: 4 } },
      rels: { "material:binding": ["/Root/Body"] },
    }),
    prim("/Root/Looks", "Scope"),
    prim("/Root/Looks/Red", "Material", {
      apiSchemas: ["SemanticsLabelsAPI:material"],
      attrs: {
        "semantics:labels:material": {
          type: "token[]",
          count: 1,
          value: ["Q11469"],
        },
      },
    }),
    prim("/Root/Looks/Red/Surface", "Shader", {
      attrs: { "info:id": { type: "token", value: "UsdPreviewSurface" } },
    }),
    prim("/Root/Looks/Red/Texture", "Shader", {
      attrs: {
        "info:id": { type: "token", value: "UsdUVTexture" },
        "inputs:file": { type: "asset", value: "./red.png" },
      },
    }),
    // A texture with no file isn't counted.
    prim("/Root/Looks/Red/Unset", "Shader", {
      attrs: { "info:id": { type: "token", value: "UsdUVTexture" } },
    }),
    prim("/Root/Hinge", "PhysicsRevoluteJoint"),
    prim("/Root/Rubber", "Material", { apiSchemas: ["PhysicsMaterialAPI"] }),
  ],
};

describe("stageFacts", () => {
  it("counts each fact by its rule", () => {
    expect(stageFacts(STAGE)).toEqual({
      upAxis: "Z",
      metersPerUnit: 1,
      defaultPrim: "Root",
      prims: 10,
      meshes: 2,
      triangles: 3 + 2,
      meshesWithNormals: 1,
      meshesWithExtent: 1,
      meshesWithUvs: 1,
      materials: 2,
      previewSurfaces: 1,
      textures: 1,
      boundMeshes: 1,
      labeledPrims: 2,
      labels: ["material=Q11469", "wikidata_class=cart", "wikidata_class=toy"],
      legacyLabeledPrims: 1,
      rigidBodies: 1,
      colliders: 1,
      massApis: 1,
      joints: 1,
      physicsMaterials: 1,
    });
  });

  it("every feature's checks are facts", () => {
    const facts = Object.keys(stageFacts(STAGE));
    for (const checks of Object.values(FEATURES)) {
      for (const c of checks) {
        expect(facts).toContain(c);
      }
    }
  });
});

describe("coverage", () => {
  const ref = stageFacts(STAGE);
  it("counts agreeing checks per feature, and names each mismatch", () => {
    const wrong = { ...ref, triangles: 4, labels: [] };
    const out = coverage({ a: ref, b: wrong }, { a: ref, b: ref });
    const fet001 = out.find((c) => c.feature.startsWith("FET001"))!;
    expect(fet001.total).toBe(2 * FEATURES[fet001.feature]!.length);
    expect(fet001.agree).toBe(fet001.total - 1);
    expect(fet001.mismatches).toEqual([
      { sample: "b", fact: "triangles", got: 4, want: 5 },
    ]);
    const fet011 = out.find((c) => c.feature.startsWith("FET011"))!;
    expect(fet011.mismatches.map((m) => m.fact)).toEqual(["labels"]);
  });

  it("a sample the reader didn't open fails every check; one the reference didn't open is left out", () => {
    const out = coverage({ a: undefined, b: ref }, { a: ref, c: undefined });
    for (const c of out) {
      expect(c.total).toBe(FEATURES[c.feature]!.length);
      expect(c.agree).toBe(0);
      expect(c.mismatches.every((m) => m.got === "(not opened)")).toBe(true);
    }
  });
});

describe("coverage, vacuous agreement", () => {
  const withPhysics = stageFacts(STAGE);
  const noPhysics = {
    ...withPhysics,
    rigidBodies: 0,
    colliders: 0,
    massApis: 0,
    joints: 0,
    physicsMaterials: 0,
  };
  // A reader that ignores physics: every physics fact is 0.
  const blind = noPhysics;
  const physics = (
    out: ReturnType<typeof coverage>,
  ): ReturnType<typeof coverage>[number] =>
    out.find((c) => c.feature === "UsdPhysics")!;

  it("a reader that ignores physics doesn't score full marks where the samples have physics", () => {
    // Sample a has physics, sample b has none (like most SimReady props).
    const out = physics(
      coverage({ a: blind, b: blind }, { a: withPhysics, b: noPhysics }),
    );
    // The plain count still reads 5 of 10 here, and 10 of 10 on b alone...
    expect(out.total).toBe(10);
    expect(out.agree).toBe(5);
    // ...but the informative checks say it read none of the five facts.
    expect(out.nonEmpty).toBe(5);
    expect(out.nonEmptyAgree).toBe(0);
    expect(describeCoverage(out)).toBe(
      "0/5 non-empty; 5/5 empty (agree trivially)",
    );
  });

  it("on samples with no physics, agreement is all vacuous", () => {
    const out = physics(coverage({ b: blind }, { b: noPhysics }));
    expect(out.agree).toBe(out.total);
    expect(out.nonEmpty).toBe(0);
    expect(describeCoverage(out)).toBe(
      "n/a (no non-empty checks); 5/5 empty (agree trivially)",
    );
  });

  it("a reader that reads physics scores on the non-empty checks", () => {
    const out = physics(
      coverage(
        { a: withPhysics, b: noPhysics },
        { a: withPhysics, b: noPhysics },
      ),
    );
    expect([out.nonEmpty, out.nonEmptyAgree]).toEqual([5, 5]);
    expect(describeCoverage(out)).toBe(
      "5/5 non-empty; 5/5 empty (agree trivially)",
    );
  });

  it("with no reference, there are no checks and the text is n/a", () => {
    const out = coverage({ a: withPhysics }, { a: undefined });
    for (const c of out) {
      expect(c.total).toBe(0);
      expect(describeCoverage(c)).toBe("n/a");
    }
  });
});

describe("outcome of a reader's runs on one sample", () => {
  const run = { startMs: 10, loadMs: 2, composeMs: 5 };
  const opened = (): Opened => ({ run, records: STAGE });
  const composedThenFailed: Opened = { run, error: "describe failed" };
  const failed: Opened = { error: "UsdStage::Open failed" };

  it("opened: every run composed and delivered records; all are timed", () => {
    const o = settle([opened(), opened()]);
    expect(o.status).toBe("opened");
    expect(o.timed).toHaveLength(2);
    expect(o.records).toBe(STAGE);
    expect(describeOutcome(o)).toBe("opened");
  });

  it("a run that composed and then failed is named, and not timed", () => {
    const o = settle([composedThenFailed, opened(), opened()]);
    expect(o.status).toBe("mixed");
    expect(o.composedThenFailed).toBe(1);
    expect(o.timed).toHaveLength(2);
    expect(o.records).toBe(STAGE);
    expect(o.errors).toEqual(["describe failed"]);
    expect(describeOutcome(o)).toBe(
      "opened in 2 of 3 runs (1 composed, then failed)",
    );
  });

  it("failed in every run is not opened and has no timings, but keeps every distinct error", () => {
    const o = settle([failed, composedThenFailed, failed]);
    expect(o.status).toBe("failed");
    expect(o.timed).toEqual([]);
    expect(o.records).toBeUndefined();
    expect(o.errors).toEqual(["UsdStage::Open failed", "describe failed"]);
    expect(describeOutcome(o)).toBe(
      "did not open in any of 3 runs (1 composed, then failed, 2 failed before composing)",
    );
  });

  it("takes records and errors from every run, not run 0 only", () => {
    const later = { ...STAGE, errors: ["missing layer x"] };
    const o = settle([failed, { run, records: later }]);
    expect(o.records).toBe(later);
    expect(o.errors).toEqual(["UsdStage::Open failed", "missing layer x"]);
  });
});

describe("the worker's request check", () => {
  const good = {
    reader: "subset",
    module: "/usd-readers/build/subset/reader.js",
    root: "a/b.usd",
    files: { "a/b.usd": new ArrayBuffer(4) },
  };
  it("accepts a request from the harness", () => {
    expect(isRequest(good)).toBe(true);
  });
  it("refuses a null or missing files, and anything that isn't a request", () => {
    expect(isRequest({ ...good, files: null })).toBe(false);
    expect(isRequest({ ...good, files: undefined })).toBe(false);
    expect(isRequest({ ...good, files: [] })).toBe(false);
    expect(isRequest({ ...good, files: { x: "not a buffer" } })).toBe(false);
    expect(isRequest(null)).toBe(false);
    expect(isRequest("hello")).toBe(false);
    expect(isRequest({ ...good, reader: "other" })).toBe(false);
    expect(isRequest({ ...good, module: "/elsewhere.js" })).toBe(false);
  });
});

describe("the subset reader's records", () => {
  it("compose the spike's fixture into the prims its answers name", async () => {
    const io = {
      read: (p: string) =>
        Promise.resolve(
          FIXTURE[p] === undefined
            ? undefined
            : new TextEncoder().encode(FIXTURE[p]),
        ),
      exists: (p: string) => Promise.resolve(p in FIXTURE),
    };
    const layers = await loadLayers("fixture/root.usda", io);
    const stage = new Stage(layers, "fixture/root.usda");
    const records = subsetRecords(stage, stage.compose());
    const paths = records.prims.map((p) => p.path);
    expect(paths).toContain("/World/Cart/Body");
    expect(paths).toContain("/World/Cart/Wheel/Tire");
    const body = records.prims.find((p) => p.path === "/World/Cart/Body")!;
    expect(body.rels["material:binding"]).toHaveLength(1);
    const facts = stageFacts(records);
    expect(facts.labels.length).toBeGreaterThan(0);
    expect(facts.previewSurfaces).toBeGreaterThan(0);
  });
});

describe("LightUSD's records", () => {
  it("split USDA array text at its top level", () => {
    expect(usdaArrayElements("[3, 4, 3]")).toEqual(["3", "4", "3"]);
    expect(usdaArrayElements("[(0, 0, 1), (1, 0, 0)]")).toHaveLength(2);
    expect(usdaArrayElements('["a, b", "c"]')).toEqual(['"a, b"', '"c"']);
    expect(usdaArrayElements("[]")).toEqual([]);
    expect(usdaArrayElements("1")).toEqual([]);
  });

  it("read each value type as the facts need it", () => {
    expect(attrFromUsda("int[]", "[3, 4]")).toEqual({
      type: "int[]",
      count: 2,
      sum: 7,
    });
    expect(attrFromUsda("token[]", '["apple", "Q89"]')).toEqual({
      type: "token[]",
      count: 2,
      value: ["apple", "Q89"],
    });
    expect(attrFromUsda("point3f[]", "[(0, 0, 0), (1, 1, 1)]")).toEqual({
      type: "point3f[]",
      count: 2,
    });
    expect(attrFromUsda("token", '"UsdPreviewSurface"').value).toBe(
      "UsdPreviewSurface",
    );
    expect(attrFromUsda("asset", "@./textures/a.png@").value).toBe(
      "./textures/a.png",
    );
    expect(attrFromUsda("float", "0.5").value).toBe(0.5);
  });

  it("walk the exported layer, leaving classes out", () => {
    const json = JSON.stringify({
      metas: { upAxis: "Z", metersPerUnit: 1, defaultPrim: "Root" },
      primSpecs: {
        Root: {
          typeName: "Xform",
          specifier: "def",
          properties: {
            "material:binding": {
              propertyType: "relationship",
              relationTargets: ["/Root/Red"],
            },
          },
          children: {
            Body: {
              typeName: "Mesh",
              specifier: "def",
              properties: {
                faceVertexCounts: {
                  propertyType: "attribute",
                  attribute: {
                    typeName: "int[]",
                    hasValue: true,
                    value: "[3, 4]",
                  },
                },
                "outputs:surface": {
                  propertyType: "connection",
                  attribute: { typeName: "token" },
                },
                unset: {
                  propertyType: "emptyAttribute",
                  attribute: { typeName: "float" },
                },
              },
            },
            Red: { typeName: "Material", specifier: "def" },
          },
        },
        _Class: { typeName: "Xform", specifier: "class" },
      },
    });
    const records = lightusdRecords(json, (p) =>
      p === "/Root/Body" ? ["PhysicsCollisionAPI"] : [],
    );
    expect(records.prims.map((p) => p.path)).toEqual([
      "/Root",
      "/Root/Body",
      "/Root/Red",
    ]);
    const body = records.prims[1]!;
    expect(body.apiSchemas).toEqual(["PhysicsCollisionAPI"]);
    expect(Object.keys(body.attrs).sort()).toEqual([
      "faceVertexCounts",
      "outputs:surface",
    ]);
    const facts = stageFacts(records);
    expect(facts.triangles).toBe(3);
    expect(facts.boundMeshes).toBe(1);
    expect(facts.colliders).toBe(1);
    expect(facts.defaultPrim).toBe("Root");
  });
});

/** A module whose only content is a memory import, shared or not. */
function wasmImportingMemory(shared: boolean): Uint8Array {
  const name = (s: string) => [s.length, ...new TextEncoder().encode(s)];
  const body = [
    1,
    ...name("env"),
    ...name("memory"),
    2,
    shared ? 3 : 0,
    1,
    ...(shared ? [1] : []),
  ];
  return new Uint8Array([
    0x00,
    0x61,
    0x73,
    0x6d,
    1,
    0,
    0,
    0,
    2,
    body.length,
    ...body,
  ]);
}

describe("host", () => {
  it("sizes: raw, gzip and Brotli, and their total", () => {
    const bytes = new TextEncoder().encode("usd ".repeat(1000));
    const s = sizesOf(bytes);
    expect(s.raw).toBe(4000);
    expect(s.gzip).toBeLessThan(s.raw);
    expect(s.brotli).toBeLessThan(s.raw);
    const both = shippedSizes({ a: bytes, b: bytes });
    expect(both.total.raw).toBe(8000);
    expect(both.total.gzip).toBe(2 * s.gzip);
  });

  it("requirements: shared memory means isolation; any module means wasm-unsafe-eval", () => {
    const threaded = hostRequirements({ "a.wasm": wasmImportingMemory(true) });
    expect(threaded.crossOriginIsolation).toBe(true);
    expect(threaded.wasmUnsafeEval).toBe(true);
    const plain = hostRequirements({ "a.wasm": wasmImportingMemory(false) });
    expect(plain.crossOriginIsolation).toBe(false);
    expect(plain.wasmUnsafeEval).toBe(true);
  });

  it("requirements: code from strings means unsafe-eval; plain JavaScript asks nothing", () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    const glue = hostRequirements({
      "glue.js": enc("var f = new Function('a', 'return a');"),
    });
    expect(glue.unsafeEval).toBe(true);
    expect(glue.evidence[0]).toContain("glue.js");
    const plain = hostRequirements({
      "reader.js": enc("export const x = (y) => y.evaluate(1);"),
    });
    expect(plain).toEqual({
      crossOriginIsolation: false,
      wasmUnsafeEval: false,
      unsafeEval: false,
      evidence: [],
    });
  });
});
