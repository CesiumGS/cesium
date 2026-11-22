// CS-913: the subset reader's composition faults on broken assets. Fixtures
// in the shape of the pallet sample's faults (CS-900), and the pallet itself
// when the setup store has it. What OpenUSD does is read from its source
// (pcp/errors.cpp, pcp/primIndex.cpp, usd/stage.cpp, tag v26.11.1); the
// expected values below are worked out from those rules, and the pallet's
// from OpenUSD's own run (2026-11-22T10-56-32-200Z-apple-metal-3).
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadLayers, Stage } from "../spikes/usd-subset/compose.ts";
import { stageFacts } from "../spikes/usd-readers/facts.ts";
import { open } from "../spikes/usd-readers/subsetEntry.ts";

const files = (sources: Record<string, string>) =>
  new Map(
    Object.entries(sources).map(([k, v]) => [k, new TextEncoder().encode(v)]),
  );

/** Composes in-memory USDA layers; returns the stage's prim paths and its reported errors. */
async function compose(sources: Record<string, string>, root: string) {
  const opened = await open(files(sources), root);
  const record = opened.describe();
  return {
    paths: record.prims.map((p) => p.path),
    errors: record.errors,
    record,
  };
}

const HEAD = `#usda 1.0
(
    defaultPrim = "World"
    metersPerUnit = 1
    upAxis = "Z"
)
`;

describe("a missing referenced layer", () => {
  const sources = {
    "a/root.usda": `${HEAD}
def Xform "World"
{
    def Xform "Kept"
    {
        def Mesh "Body" {}
    }
    def Xform "Broken" (
        prepend references = @./missing.usda@
    )
    {
        def Scope "Local" {}
    }
    def Xform "BrokenPayload" (
        prepend payload = @./missing_payload.usda@
    )
    {
    }
    def Xform "Sibling" (
        prepend references = @./ok.usda@
    )
    {
    }
    def Xform "Asset" (
        variants = { string v = "on" }
        prepend variantSets = "v"
    )
    {
        variantSet "v" = {
            "on" {
                def Scope "Mats"
                {
                    def Material "plastic" (
                        prepend references = @./gone.usda@
                    )
                    {
                    }
                }
                def Mesh "M" {}
            }
        }
    }
}
`,
    "a/ok.usda": `#usda 1.0
(
    defaultPrim = "Thing"
)
def Xform "Thing"
{
    def Mesh "Part" {}
}
`,
  };

  it("keeps every prim that doesn't depend on it, and the broken prim's own opinions", async () => {
    const { paths } = await compose(sources, "a/root.usda");
    expect(paths).toEqual([
      "/World",
      "/World/Kept",
      "/World/Kept/Body",
      "/World/Broken",
      "/World/Broken/Local",
      "/World/BrokenPayload",
      "/World/Sibling",
      "/World/Sibling/Part",
      "/World/Asset",
      "/World/Asset/Mats",
      "/World/Asset/Mats/plastic",
      "/World/Asset/M",
    ]);
  });

  it("reports each failed reference by name, in OpenUSD's words", async () => {
    const { errors } = await compose(sources, "a/root.usda");
    // PcpErrorInvalidAssetPath::ToString: "Could not open asset @%s@ for %s
    // introduced by %s.", the site being @layer@<path in the layer's namespace>.
    expect([...errors].sort()).toEqual(
      [
        "Could not open asset @a/gone.usda@ for reference introduced by @a/root.usda@</World/Asset{v=on}Mats/plastic>.",
        "Could not open asset @a/missing.usda@ for reference introduced by @a/root.usda@</World/Broken>.",
        "Could not open asset @a/missing_payload.usda@ for payload introduced by @a/root.usda@</World/BrokenPayload>.",
      ].sort(),
    );
  });

  it("reports a missing sublayer as OpenUSD does, and composes the rest", async () => {
    const out = await compose(
      {
        "s/root.usda": `#usda 1.0
(
    defaultPrim = "World"
    subLayers = [@./nowhere.usda@]
)
def Xform "World" {}
`,
      },
      "s/root.usda",
    );
    expect(out.paths).toEqual(["/World"]);
    // PcpErrorInvalidSublayerPath::ToString.
    expect(out.errors).toEqual([
      "Could not load sublayer @s/nowhere.usda@ of layer @s/root.usda@; skipping.",
    ]);
  });

  it("a stage with nothing missing reports no errors", async () => {
    const out = await compose(
      { "n/root.usda": `${HEAD}def Xform "World" {}\n` },
      "n/root.usda",
    );
    expect(out.errors).toEqual([]);
  });
});

describe("variant selection across a reference", () => {
  // The pallet's shape: a prim references a layer whose root prim selects
  // "None", while an `over` of that prim inside the referencing prim's own
  // selected variant selects "Rigid". The stronger opinion wins.
  const sources = {
    "v/root.usda": `${HEAD}
def Xform "World"
{
    def Xform "Item" (
        variants = { string phys = "Rigid" }
        prepend variantSets = "phys"
    )
    {
        def Xform "Inst" (
            prepend references = @./inst.usda@
        )
        {
        }
        variantSet "phys" = {
            "None" {
                over "Inst" (
                    variants = { string phys = "None" }
                )
                {
                }
            }
            "Rigid" {
                over "Inst" (
                    variants = { string phys = "Rigid" }
                )
                {
                }
            }
        }
    }
}
`,
    "v/inst.usda": `#usda 1.0
(
    defaultPrim = "Item"
)
def Xform "Item" (
    variants = { string phys = "None" }
    prepend variantSets = "phys"
)
{
    variantSet "phys" = {
        "None" {
            def Scope "Geometry" {}
        }
        "Rigid" {
            def Scope "Geometry"
            {
                def Mesh "Body" (
                    prepend apiSchemas = ["PhysicsCollisionAPI"]
                )
                {
                }
            }
            def Scope "PhysicsMaterials"
            {
                def Material "plastic" (
                    prepend apiSchemas = ["PhysicsMaterialAPI"]
                )
                {
                }
            }
        }
    }
}
`,
  };

  it("takes the stronger site's selection, not the referenced layer's", async () => {
    const { paths, record } = await compose(sources, "v/root.usda");
    expect(paths).toContain("/World/Item/Inst/PhysicsMaterials/plastic");
    expect(paths).toContain("/World/Item/Inst/Geometry/Body");
    const facts = stageFacts(record);
    expect(facts.colliders).toBe(1);
    expect(facts.physicsMaterials).toBe(1);
  });
});

describe("prims with no defining specifier", () => {
  const sources = {
    "o/root.usda": `${HEAD}
def Xform "World"
{
    over "Ghost" (
        prepend payload = @./missing.usda@
    )
    {
    }
    over "GhostParent"
    {
        def Scope "Child" {}
    }
    def Xform "Real" (
        prepend references = @./real.usda@
    )
    {
        over "Part"
        {
            custom string note = "kept"
        }
        over "Extra" {}
    }
}
`,
    "o/real.usda": `#usda 1.0
(
    defaultPrim = "Real"
)
def Xform "Real"
{
    def Mesh "Part" {}
}
`,
  };

  it("are not on the stage, nor is anything under them (UsdPrim::IsDefined)", async () => {
    const { paths } = await compose(sources, "o/root.usda");
    // usd/primData.cpp: defined = a defining specifier (def or class) and a defined parent.
    expect(paths).toEqual(["/World", "/World/Real", "/World/Real/Part"]);
  });

  it("a defining specifier in any layer wins over a stronger over", async () => {
    const { paths } = await compose(
      {
        "w/root.usda": `${HEAD}
def Xform "World" (
    prepend references = @./weak.usda@
)
{
    over "Thing" {}
}
`,
        "w/weak.usda": `#usda 1.0
(
    defaultPrim = "World"
)
def Xform "World"
{
    def Scope "Thing" {}
}
`,
      },
      "w/root.usda",
    );
    expect(paths).toEqual(["/World", "/World/Thing"]);
  });
});

// The pallet sample is data in the setup store (npm run setup), never in the
// repository. OpenUSD's facts for it, from run
// 2026-11-22T10-56-32-200Z-apple-metal-3, are what CS-900's rule compares with.
const SAMPLES = `${homedir()}/.cesium-bench/simready/foundation-1abf3ae2/`;
const PALLET =
  "common_assets/props_general/industrialplasticpallet_a01/simready_usd/industrialplasticpallet_a01.usd";

describe.skipIf(!existsSync(SAMPLES + PALLET))(
  "the pallet sample (needs the setup store)",
  () => {
    it("passes the three checks it missed: prims, materials and colliders", async () => {
      const io = {
        read: (p: string) =>
          Promise.resolve(
            existsSync(SAMPLES + p)
              ? new Uint8Array(readFileSync(SAMPLES + p))
              : undefined,
          ),
        exists: (p: string) => Promise.resolve(existsSync(SAMPLES + p)),
      };
      const layers = await loadLayers(PALLET, io);
      const stage = new Stage(layers, PALLET);
      const { subsetRecords } =
        await import("../spikes/usd-readers/subsetRecords.ts");
      const records = subsetRecords(stage, stage.compose());
      const facts = stageFacts(records);
      // OpenUSD's values for the three checks the subset reader missed.
      expect(facts.prims).toBe(14);
      expect(facts.materials).toBe(3);
      expect(facts.colliders).toBe(1);
      const paths = records.prims.map((p) => p.path);
      expect(paths).not.toContain("/Tagging/ThumbRig");
      expect(paths).toContain(
        "/RootNode/industrialplasticpallet_a01_inst/PhysicsMaterials/plastic",
      );
    });
  },
);
