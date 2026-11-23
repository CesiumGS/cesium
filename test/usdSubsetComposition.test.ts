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
  MAX_ARC_DEPTH,
  MAX_LISTED,
  MAX_LAYER_BYTES,
  MAX_LAYERS,
  MAX_NAMESPACE_DEPTH,
  MAX_WORK,
  packagePath,
  quoted,
  resolveAsset,
  Stage,
  stripVariants,
} from "../spikes/usd-subset/compose.ts";
import { stageFacts } from "../spikes/usd-readers/facts.ts";
import { open } from "../spikes/usd-readers/subsetEntry.ts";
import {
  hostileCase,
  mutatedCrate,
  readBounded,
  type HostileCase,
} from "./usdHostileFiles.ts";

// The samples are data in the setup store (npm run setup), never in the repository.
const SAMPLES = `${homedir()}/.cesium-bench/simready/foundation-1abf3ae2/`;
const PALLET =
  "common_assets/props_general/industrialplasticpallet_a01/simready_usd/industrialplasticpallet_a01.usd";
/** A crate (USDC) file of the pallet's, for the mutated crate files. */
const PALLET_BASE =
  "common_assets/props_general/industrialplasticpallet_a01/simready_usd/industrialplasticpallet_a01_base.usd";

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
    expect(stage.errors.at(-1)).toBe(
      "50 more composition errors not listed (a repeated one is counted each time).",
    );
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

/** A stage over in-memory layers, some given as bytes. */
async function stageOfBytes(
  sources: Record<string, string>,
  raw: Record<string, Uint8Array>,
  root: string,
) {
  const bytes = new Map([...files(sources), ...Object.entries(raw)]);
  const layers = await loadLayers(root, {
    read: (p) => Promise.resolve(bytes.get(p)),
    exists: (p) => Promise.resolve(bytes.has(p)),
  });
  const stage = new Stage(layers, root);
  return { stage, prim: stage.compose() };
}

/** A stage over in-memory USDA layers, composed, and how long that took. */
async function stageOf(sources: Record<string, string>, root: string) {
  const bytes = files(sources);
  const t0 = performance.now();
  const layers = await loadLayers(root, {
    read: (p) => Promise.resolve(bytes.get(p)),
    exists: (p) => Promise.resolve(bytes.has(p)),
  });
  const stage = new Stage(layers, root);
  const prim = stage.compose();
  const paths: string[] = [];
  const walk = (p: typeof prim): void => {
    paths.push(p.path);
    p.children.forEach(walk);
  };
  walk(prim);
  return { stage, prim, paths, ms: performance.now() - t0 };
}

// Hostile files (CS-1097 A). Each is read in a worker thread with a
// deadline and a heap limit, which it fails by being killed: a test's own
// timeout can't interrupt a synchronous loop. Times in brackets are this
// Mac's; the limits leave room for a busy machine. The heap asserted is
// what reading leaves behind, under a worker limit four times higher, so
// the assertion can fail before the limit does.
const WIDE = { deadlineMs: 10_000, heapLimitMb: 1024 } as const;
const HEAP_MB = 256;
const stopMessage = `Reading stopped at the subset reader's work limit of ${MAX_WORK} units; the rest of the stage is not read or composed.`;
const one = (root: string): HostileCase => ({
  name: "h/root.usda",
  files: { "h/root.usda": root },
  root: "h/root.usda",
});

describe("hostile inputs stay bounded", () => {
  it("arcs that fan out without a cycle stop at the work limit [0.2 s]", async () => {
    // /L_i has two children that both reference /L_(i+1): 2^30 prims.
    const levels = 30;
    let src = `#usda 1.0\n(\n    defaultPrim = "L0"\n)\n`;
    for (let i = 0; i < levels; i++) {
      src += `def Xform "L${i}"\n{\n    def Xform "a" (\n        prepend references = </L${i + 1}>\n    )\n    {\n    }\n    def Xform "b" (\n        prepend references = </L${i + 1}>\n    )\n    {\n    }\n}\n`;
    }
    src += `def Xform "L${levels}" {}\n`;
    expect(src.length).toBeLessThan(6000);
    const [r] = await readBounded([one(src)], WIDE);
    expect(r!.ms).toBeLessThan(5000);
    expect(r!.heapMb).toBeLessThan(HEAP_MB);
    expect(r!.paths).toContain("/L0/a/a");
    expect(r!.stopped).toBe(true);
    // One error, first, naming the limit and nothing from the file.
    expect(r!.errors).toEqual([stopMessage]);
  }, 30_000);

  // The three inputs of the review that asked for this round, by name.
  it("the review's variant scan: one prim of 20,000 sites, each with a variant set [34 s before]", async () => {
    const n = 20_000;
    const src = `${HEAD}def Xform "R" (\n    prepend references = [${Array.from({ length: n }, (_, i) => `</B${i}>`).join(", ")}]\n)\n{\n}\n${Array.from({ length: n }, (_, i) => `over "B${i}" (\n    variantSets = "v"\n)\n{\n}\n`).join("")}`;
    expect(src.length).toBeGreaterThan(800_000);
    const [r] = await readBounded([one(src)], WIDE);
    expect(r!.ms).toBeLessThan(5000);
    expect(r!.heapMb).toBeLessThan(HEAP_MB);
    expect(r!.paths).toContain("/R");
  }, 30_000);

  it("the review's properties by sites: a 41 KB file, and 5,000 properties [31 s and over 120 s before]", async () => {
    const file = (props: number) =>
      `${HEAD}class "C" (\n    prepend references = [${Array.from({ length: 1000 }, (_, i) => `</B${i}>`).join(", ")}]\n)\n{\n}\nover "B0"\n{\n${Array.from({ length: props }, (_, k) => `    float a${k}\n`).join("")}}\n${Array.from({ length: 200 }, (_, i) => `def Xform "P${i}" (\n    inherits = </C>\n)\n{\n}\n`).join("")}`;
    expect(file(1000).length).toBeLessThan(50_000);
    const rs = await readBounded([one(file(1000)), one(file(5000))], WIDE);
    for (const r of rs) {
      expect(r.ms).toBeLessThan(5000);
      expect(r.heapMb).toBeLessThan(HEAP_MB);
    }
  }, 60_000);

  it("the review's regex inputs: 100,000 open braces in a target, 8,000 '.usdz[' in an asset [4.5 s and 0.25 s before]", async () => {
    const braces = `${HEAD}def Xform "World"\n{\n    rel r = </${"{".repeat(100_000)}>\n}\n`;
    const brackets = `${HEAD}def Xform "World" (\n    prepend references = @${".usdz[".repeat(8000)}@\n)\n{\n}\n`;
    const rs = await readBounded([one(braces), one(brackets)], WIDE);
    for (const r of rs) {
      expect(r.ms).toBeLessThan(1000);
    }
    // The scans do what the regexes did.
    expect(stripVariants("/A{v=x}B/C{w=y}")).toBe("/AB/C");
    expect(stripVariants("/A{{v=x}B{open")).toBe("/AB{open");
    expect(packagePath("a.usdz[b/c.usda]")).toBe("a.usdz/b/c.usda");
    expect(packagePath("a.usdz[x].usdz[y]")).toBe("a.usdz[x].usdz/y");
    expect(packagePath("a.usdz[x]\n]")).toBeUndefined();
    expect(packagePath("plain.usda")).toBeUndefined();
  }, 30_000);

  it("one prim with 60,000 variant sets [0.3 s]", async () => {
    const n = 60_000;
    const sets = Array.from({ length: n }, (_, i) => `"v${i}"`).join(", ");
    const sels = Array.from({ length: n }, (_, i) => `string v${i} = "x"`).join(
      "\n        ",
    );
    const [r] = await readBounded(
      [
        one(
          `${HEAD}def Xform "World" (\n    variants = {\n        ${sels}\n    }\n    prepend variantSets = [${sets}]\n)\n{\n}\n`,
        ),
      ],
      WIDE,
    );
    expect(r!.ms).toBeLessThan(5000);
    expect(r!.counts.variantSelections).toBe(n);
    expect(r!.counts.selected).toHaveLength(MAX_LISTED);
    expect((r!.counts.selected as string[])[0]).toBe("v0=x");
    expect(r!.counts.selectedOmitted).toBe(n - MAX_LISTED);
  }, 30_000);

  it("one prim with 60,000 children [0.3 s]", async () => {
    const n = 60_000;
    const kids = Array.from(
      { length: n },
      (_, i) => `    def Scope "c${i}" {}\n`,
    ).join("");
    const [r] = await readBounded(
      [one(`${HEAD}def Xform "World"\n{\n${kids}}\n`)],
      WIDE,
    );
    expect(r!.ms).toBeLessThan(5000);
    expect(r!.prims).toBe(n + 2);
    expect(r!.paths.slice(0, 3)).toEqual(["/", "/World", "/World/c0"]);
  }, 30_000);

  it("keeps no error text past the cap, and never hides the stop behind it", async () => {
    const n = 5000;
    const prims = Array.from(
      { length: n },
      (_, i) =>
        `    def Xform "P${i}" (\n        prepend references = @./${"m".repeat(100)}${i}.usda@\n    )\n    {\n    }\n`,
    ).join("");
    const src = `${HEAD}def Xform "World"\n{\n${prims}}\n`;
    const [full, stopped] = await readBounded(
      [one(src), { ...one(src), name: "stopped" }],
      WIDE,
    );
    // More layers than MAX_LAYERS are named: that note is the first error.
    expect(full!.errors[0]).toBe(
      `The stage names more than ${MAX_LAYERS} layers, the subset reader's limit; the rest are not read.`,
    );
    expect(full!.errors).toHaveLength(MAX_LISTED + 1);
    expect(full!.errors.at(-1)).toBe(
      `${n - MAX_LISTED + 1} more composition errors not listed (a repeated one is counted each time).`,
    );
    // Only the listed messages are kept.
    expect(full!.listed).toBe(MAX_LISTED);
    expect(stopped!.stopped).toBe(false);
  }, 30_000);

  it("the stop message comes first even when the error list is full", async () => {
    // 200 failed references fill the list; then 2^30 prims spend the budget.
    let src = `${HEAD}def Xform "World"\n{\n${Array.from({ length: 200 }, (_, i) => `    def Xform "M${i}" (\n        prepend references = </Gone${i}>\n    )\n    {\n    }\n`).join("")}}\n`;
    for (let i = 0; i < 30; i++) {
      src += `def Xform "L${i}"\n{\n    def Xform "a" (\n        prepend references = </L${i + 1}>\n    )\n    {\n    }\n    def Xform "b" (\n        prepend references = </L${i + 1}>\n    )\n    {\n    }\n}\n`;
    }
    const [r] = await readBounded([one(src)], WIDE);
    expect(r!.stopped).toBe(true);
    expect(r!.errors[0]).toBe(stopMessage);
  }, 30_000);

  it("a chain of 12,000 sublayers composes without overflowing the stack", async () => {
    const n = 12_000;
    const files: Record<string, string> = {};
    for (let i = 0; i < n; i++) {
      const next = i + 1 < n ? `\n    subLayers = [@./s${i + 1}.usda@]` : "";
      files[`k/s${i}.usda`] =
        `#usda 1.0\n(\n    defaultPrim = "World"${next}\n)\n${
          i === n - 1
            ? `def Xform "World"\n{\n    def Scope "Deep" {}\n}\n`
            : ""
        }`;
    }
    const chain = { name: "chain", files, root: "k/s0.usda" };
    // Straight to the stage, past loadLayers's cap on layers, for the stack's loop.
    const [direct] = await readBounded([chain], { ...WIDE, direct: true });
    expect(direct!.counts.sublayers).toBe(n - 1);
    expect(direct!.paths).toEqual(["/", "/World", "/World/Deep"]);
    expect(direct!.errors).toEqual([]);
    // Through loadLayers: the first MAX_LAYERS are read, and the stage says so.
    const [loaded] = await readBounded([chain], WIDE);
    expect(loaded!.counts.sublayers).toBe(MAX_LAYERS - 1);
    expect(loaded!.errors[0]).toBe(
      `The stage names more than ${MAX_LAYERS} layers, the subset reader's limit; the rest are not read.`,
    );
  }, 60_000);

  it("refuses a layer over the byte limit before parsing it", async () => {
    const big = new Uint8Array(MAX_LAYER_BYTES + 1);
    big.set(new TextEncoder().encode("#usda 1.0\n"));
    const { stage } = await stageOfBytes(
      {
        "b/root.usda": `${HEAD}def Xform "World" (\n    prepend references = @./big.usda@\n)\n{\n}\n`,
      },
      { "b/big.usda": big },
      "b/root.usda",
    );
    expect(stage.errors).toEqual([
      `Could not open asset @b/big.usda@ for reference introduced by @b/root.usda@</World> -- ${MAX_LAYER_BYTES + 1} bytes, over the subset reader's limit of ${MAX_LAYER_BYTES} for one layer.`,
    ]);
  });

  // The invariant: every input finishes within a stated time and heap. A
  // few hundred seeded files, each one shape or a mix of two or three, are
  // read with the reader's own MAX_WORK. Each must finish in 4 s (the
  // slowest takes about 1.3 s on this Mac when it's idle), or be killed at
  // 6 s, and leave under 256 MiB, in a worker whose limit is 1 GiB.
  it("every generated hostile file finishes within 4 s and 256 MiB", async () => {
    const cases = Array.from({ length: 300 }, (_, i) => hostileCase(9130 + i));
    const rs = await readBounded(cases, {
      deadlineMs: 6000,
      heapLimitMb: 1024,
    });
    const worst = rs.reduce((a, b) => (b.ms > a.ms ? b : a));
    const heaviest = rs.reduce((a, b) => (b.heapMb > a.heapMb ? b : a));
    console.log(
      `${rs.length} generated files, ${rs.filter((r) => r.stopped).length} stopped by the budget; slowest ${worst.ms.toFixed(0)} ms (${worst.name}); most heap ${heaviest.heapMb.toFixed(0)} MiB (${heaviest.name})`,
    );
    for (const r of rs) {
      expect(r.ms, r.name).toBeLessThan(4000);
      expect(r.heapMb, r.name).toBeLessThan(HEAP_MB);
    }
  }, 600_000);

  it.skipIf(!existsSync(SAMPLES + PALLET_BASE))(
    "every mutated crate file finishes within 4 s and 256 MiB (needs the setup store)",
    async () => {
      const bytes = new Uint8Array(readFileSync(SAMPLES + PALLET_BASE));
      const cases = Array.from({ length: 100 }, (_, i) =>
        mutatedCrate(bytes, 913 + i),
      );
      const rs = await readBounded(cases, {
        deadlineMs: 6000,
        heapLimitMb: 1024,
      });
      for (const r of rs) {
        expect(r.ms, r.name).toBeLessThan(4000);
        expect(r.heapMb, r.name).toBeLessThan(HEAP_MB);
      }
    },
    300_000,
  );

  it("reports a library's missing sublayer once, however many arcs use the library", async () => {
    const refs = Array.from(
      { length: 50 },
      (_, i) =>
        `    def Xform "U${i}" (\n        prepend references = @./lib.usda@\n    )\n    {\n    }\n`,
    ).join("");
    const { stage } = await stageOf(
      {
        "b/root.usda": `${HEAD}def Xform "World"\n{\n${refs}}\n`,
        "b/lib.usda": `#usda 1.0\n(\n    defaultPrim = "Lib"\n    subLayers = [@./gone.usda@]\n)\ndef Xform "Lib" {}\n`,
      },
      "b/root.usda",
    );
    expect(stage.errors).toEqual([
      "Could not load sublayer @b/gone.usda@ of layer @b/lib.usda@; skipping.",
    ]);
    expect(stage.counts.unresolved).toEqual(["./gone.usda"]);
  });

  it(`stops composing below ${MAX_NAMESPACE_DEPTH} prims of namespace, and says so`, async () => {
    const depth = MAX_NAMESPACE_DEPTH + 20;
    let src = "";
    for (let i = 0; i < depth; i++) {
      src += `def Scope "P"\n{\n`;
    }
    src += "}\n".repeat(depth);
    const { stage, paths } = await stageOf(
      { "n/root.usda": `#usda 1.0\n${src}` },
      "n/root.usda",
    );
    const deepest = Math.max(...paths.map((p) => p.split("/").length - 1));
    expect(deepest).toBe(MAX_NAMESPACE_DEPTH);
    expect(stage.errors).toHaveLength(1);
    expect(stage.errors[0]).toMatch(
      new RegExp(
        `^Namespace deeper than ${MAX_NAMESPACE_DEPTH} prims at </P/P/.*; its children are not composed\\.$`,
      ),
    );
  });

  it(`reports arcs nested deeper than ${MAX_ARC_DEPTH}`, async () => {
    // /R0 references /R1, which references /R2, and so on: no cycle, but a
    // chain longer than the composer follows.
    let src = `#usda 1.0\n(\n    defaultPrim = "R0"\n)\n`;
    for (let i = 0; i < 40; i++) {
      src += `def Xform "R${i}" (\n    prepend references = </R${i + 1}>\n)\n{\n}\n`;
    }
    src += `def Xform "R40" {}\n`;
    const { stage } = await stageOf({ "a/root.usda": src }, "a/root.usda");
    expect(stage.errors).toContain(
      `Arcs nested deeper than ${MAX_ARC_DEPTH} at @a/root.usda@</R${MAX_ARC_DEPTH + 1}>; not followed.`,
    );
  });

  it("quotes only the path of an arc to a layer with no default prim", async () => {
    const long = "y".repeat(400);
    const { stage } = await stageOf(
      {
        "q/root.usda": `${HEAD}def Xform "World" (\n    prepend references = @./${long}.usda@\n)\n{\n}\n`,
        [`q/${long}.usda`]: `#usda 1.0\ndef Xform "NotDefault" {}\n`,
      },
      "q/root.usda",
    );
    expect(stage.counts.unresolved).toHaveLength(1);
    expect(stage.counts.unresolved[0]).toBe(
      `./${"y".repeat(198)}… (407 characters) (no default prim)`,
    );
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

// The pallet sample (SAMPLES and PALLET, above). OpenUSD's facts for it, from
// run 2026-11-22T10-56-32-200Z-apple-metal-3, are what CS-900's rule compares with.

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
