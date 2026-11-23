// CS-913: the subset reader's composition faults on broken assets. Fixtures
// in the shape of the pallet sample's faults (CS-900), and the pallet itself
// when the setup store has it. What OpenUSD does is read from its source
// (pcp/errors.cpp, pcp/primIndex.cpp, usd/stage.cpp, tag v26.11.1); the
// expected values below are worked out from those rules, and the pallet's
// from OpenUSD's own run (2026-11-22T10-56-32-200Z-apple-metal-3).
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  loadLayers,
  MAX_LISTED,
  quoted,
  resolveAsset,
  Stage,
} from "../spikes/usd-subset/compose.ts";
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

// pcp/primIndex.cpp, _CheckForCycle: an arc to a site in the same layer
// stack whose path is an ancestor or a descendant of a node it hangs under is
// a cycle. OpenUSD drops the arc, reports PcpErrorArcCycle and composes the
// rest. Without the check, each of these recursed until the stack overflowed.
describe("arc cycles", () => {
  it("a prim that references its own parent", async () => {
    const out = await compose(
      {
        "c/root.usda": `${HEAD}
def Xform "World"
{
    def Xform "B" (
        prepend references = </World>
    )
    {
        def Scope "Own" {}
    }
    def Xform "Other" {}
}
`,
      },
      "c/root.usda",
    );
    expect(out.paths).toEqual([
      "/World",
      "/World/B",
      "/World/B/Own",
      "/World/Other",
    ]);
    expect(out.errors).toEqual([
      "Cycle detected:\n@c/root.usda@</World/B>\nCANNOT reference:\n@c/root.usda@</World>\n",
    ]);
  });

  it("a reference to an ancestor two levels up", async () => {
    const out = await compose(
      {
        "c/root.usda": `${HEAD}
def Xform "World"
{
    def Xform "Mid"
    {
        def Xform "Leaf" (
            prepend references = </World>
        )
        {
        }
    }
    def Xform "Other" {}
}
`,
      },
      "c/root.usda",
    );
    expect(out.paths).toEqual([
      "/World",
      "/World/Mid",
      "/World/Mid/Leaf",
      "/World/Other",
    ]);
    expect(out.errors).toEqual([
      "Cycle detected:\n@c/root.usda@</World/Mid/Leaf>\nCANNOT reference:\n@c/root.usda@</World>\n",
    ]);
  });

  it("a payload cycle between two layers", async () => {
    const out = await compose(
      {
        "c/root.usda": `${HEAD}
def Xform "World"
{
    def Xform "P" (
        prepend payload = @./a.usda@</A>
    )
    {
    }
    def Xform "Other" {}
}
`,
        "c/a.usda": `#usda 1.0
def Xform "A" (
    prepend payload = @./b.usda@</B>
)
{
    def Scope "Kept" {}
}
`,
        "c/b.usda": `#usda 1.0
def Xform "B" (
    prepend payload = @./a.usda@</A>
)
{
    def Scope "AlsoKept" {}
}
`,
      },
      "c/root.usda",
    );
    expect([...out.paths].sort()).toEqual(
      [
        "/World",
        "/World/P",
        "/World/P/Kept",
        "/World/P/AlsoKept",
        "/World/Other",
      ].sort(),
    );
    expect(out.errors).toEqual([
      "Cycle detected:\n@c/root.usda@</World/P>\ngets payload from:\n@c/a.usda@</A>\nwhich gets payload from:\n@c/b.usda@</B>\nwhich CANNOT get payload from:\n@c/a.usda@</A>\n",
    ]);
  });

  it("a cycle below a referenced prim, through two layers", async () => {
    const out = await compose(
      {
        "c/root.usda": `${HEAD}
def Xform "World"
{
    def Xform "R" (
        prepend references = @./x.usda@</X>
    )
    {
    }
}
`,
        "c/x.usda": `#usda 1.0
def Xform "X"
{
    def Xform "B" (
        prepend references = @./y.usda@</Y>
    )
    {
    }
}
`,
        "c/y.usda": `#usda 1.0
def Xform "Y" (
    prepend references = @./x.usda@</X>
)
{
    def Scope "Part" {}
}
`,
      },
      "c/root.usda",
    );
    expect(out.paths).toEqual([
      "/World",
      "/World/R",
      "/World/R/B",
      "/World/R/B/Part",
    ]);
    expect(out.errors).toEqual([
      "Cycle detected:\n@c/root.usda@</World/R/B>\nreferences:\n@c/x.usda@</X/B>\nwhich references:\n@c/y.usda@</Y>\nwhich CANNOT reference:\n@c/x.usda@</X>\n",
    ]);
  });
});

describe("bounds on untrusted input", () => {
  it("lists the first errors and unresolved arcs, then counts the rest", async () => {
    const n = MAX_LISTED + 50;
    const prims = Array.from(
      { length: n },
      (_, i) =>
        `    def Xform "P${i}" (\n        prepend references = @./missing${i}.usda@\n    )\n    {\n    }\n`,
    ).join("");
    const root = `${HEAD}def Xform "World"\n{\n${prims}}\n`;
    const layers = await loadLayers("e/root.usda", {
      read: (p) =>
        Promise.resolve(
          p === "e/root.usda" ? new TextEncoder().encode(root) : undefined,
        ),
      exists: (p) => Promise.resolve(p === "e/root.usda"),
    });
    const stage = new Stage(layers, "e/root.usda");
    const prim = stage.compose();
    expect(prim.children[0]!.children).toHaveLength(n);
    expect(stage.errors).toHaveLength(MAX_LISTED + 1);
    expect(stage.errors[0]).toBe(
      "Could not open asset @e/missing0.usda@ for reference introduced by @e/root.usda@</World/P0>.",
    );
    expect(stage.errors.at(-1)).toBe("50 more composition errors not listed.");
    expect(stage.counts.unresolved).toHaveLength(MAX_LISTED);
    expect(stage.counts.unresolvedOmitted).toBe(50);
  });

  it("cuts long paths and replaces control characters in messages", async () => {
    expect(quoted("a\u0007b\nc\u009b")).toBe("a?b?c?");
    const long = "x".repeat(500);
    const out = await compose(
      {
        "l/root.usda": `${HEAD}
def Xform "World" (
    prepend references = @./${long}.usda@
)
{
}
`,
      },
      "l/root.usda",
    );
    expect(out.paths).toEqual(["/World"]);
    expect(out.errors).toHaveLength(1);
    expect(out.errors[0]!.length).toBeLessThan(400);
    expect(out.errors[0]).toContain(
      `@l/${"x".repeat(198)}… (507 characters)@ for reference`,
    );
  });

  it("refuses a path that climbs above the root, and names it as written", async () => {
    expect(resolveAsset("a/b/root.usda", "../../x.usda")).toBe("x.usda");
    expect(resolveAsset("a/root.usda", "../../x.usda")).toBeUndefined();
    expect(resolveAsset("/a/root.usda", "../../x.usda")).toBeUndefined();
    const out = await compose(
      {
        "d/root.usda": `${HEAD}
def Xform "World"
{
    def Xform "Up" (
        prepend references = @../../../x.usda@
    )
    {
    }
}
`,
        // What the clamped path used to reach, silently.
        "x.usda": `#usda 1.0
(
    defaultPrim = "X"
)
def Xform "X"
{
    def Scope "Outside" {}
}
`,
      },
      "d/root.usda",
    );
    expect(out.paths).toEqual(["/World", "/World/Up"]);
    expect(out.errors).toEqual([
      "Could not open asset @../../../x.usda@ for reference introduced by @d/root.usda@</World/Up>.",
    ]);
  });
});

describe("arcs anchored to the layer that authored them", () => {
  // pcp/composeSite.cpp anchors each reference before its list op composes,
  // so the same relative path in two layers of a stack is two arcs when it
  // names two files.
  it("keeps the same relative reference from two layers as two arcs", async () => {
    const { paths } = await compose(
      {
        "r/root.usda": `#usda 1.0
(
    defaultPrim = "World"
    subLayers = [@./sub/s.usda@]
)
def Xform "World" (
    prepend references = @./thing.usda@
)
{
}
`,
        "r/sub/s.usda": `#usda 1.0
over "World" (
    prepend references = @./thing.usda@
)
{
}
`,
        "r/thing.usda": `#usda 1.0
(
    defaultPrim = "T"
)
def Xform "T"
{
    def Scope "Top" {}
}
`,
        "r/sub/thing.usda": `#usda 1.0
(
    defaultPrim = "T"
)
def Xform "T"
{
    def Scope "Sub" {}
}
`,
      },
      "r/root.usda",
    );
    expect([...paths].sort()).toEqual(
      ["/World", "/World/Sub", "/World/Top"].sort(),
    );
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
      // The two layers the sample names but doesn't ship, by name, as OpenUSD reports them.
      expect([...stage.errors].sort()).toEqual(
        [
          "Could not open asset @common_assets/materials/physics/physics_plastic.usda@ for reference introduced by @common_assets/props_general/industrialplasticpallet_a01/simready_usd/industrialplasticpallet_a01_inst_base.usd@</RootNode{PhysicsVariant=RigidBody}PhysicsMaterials/plastic>.",
          "Could not open asset @common_assets/common_tools/content_tagging/thumbnail_rigs/thumb_rig_prop.usd@ for payload introduced by @common_assets/props_general/industrialplasticpallet_a01/simready_usd/industrialplasticpallet_a01.usd@</Tagging/ThumbRig>.",
        ].sort(),
      );
    });
  },
);
