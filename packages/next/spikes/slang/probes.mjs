// Compiles the Slang feature probes (probes/*.slang) with slangc to WGSL,
// recording each result in generated/probes.json for the probe page
// (spikes/slang-probes.html, Dyno's /#/lab/slang-probes), which validates
// the WGSL in WebGPU. Re-run on each Slang release: it is the migration's
// step 1 (CESIUM2_WEBGPU_PLAN.md §3.4, "Slang-first, for real").
// Usage: node spikes/slang/probes.mjs (slangc from `npm run setup`, or SLANGC)
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SLANG_VERSION, slangcPath } from "../../scripts/slangTools.mjs";

const slangc = slangcPath();
if (!slangc) {
  throw new Error(
    "No slangc: run `npm run setup --workspace @cesium/next` (or set SLANGC).",
  );
}

/**
 * Each probe: the feature, its entry points, and what is expected: it
 * compiles and validates ("works"), Slang refuses it ("slang-rejects": a
 * gap, or a type refusing misuse), or WebGPU must reject what Slang emits
 * ("webgpu-rejects").
 */
const PROBES = [
  { id: "names", feature: "Names by default (no boundary declared)", entries: [["main", "compute"]], expect: "works" },
  { id: "boundary", feature: "Runtime boundary kept by __extern_cpp (no rewriting)", entries: [["vs", "vertex"], ["fs", "fragment"]], expect: "works", runtime: "fn userFragment(c: vec3f) -> vec3f { return c; }" },
  { id: "atomics", feature: "32-bit atomics (typed buffers, workgroup)", entries: [["main", "compute"]], expect: "works" },
  { id: "coverage", feature: "Sample mask in/out, flat interpolation, instance_index", entries: [["vs", "vertex"], ["fs", "fragment"]], expect: "works" },
  { id: "override-scalar", feature: "Scalar override constants", entries: [["main", "compute"]], expect: "works" },
  { id: "override-array", feature: "Override-sized workgroup arrays", entries: [["main", "compute"]], expect: "works" },
  { id: "storage3d", feature: "3D rgba16float storage texture (write)", entries: [["main", "compute"]], expect: "works" },
  { id: "subgroups", feature: "Subgroup operations", entries: [["main", "compute"]], expect: "works" },
  { id: "primitive-index", feature: "primitive_index (CAD edges)", entries: [["vs", "vertex"], ["fs", "fragment"]], expect: "works" },
  { id: "clip-distance", feature: "Clip distances", entries: [["vs", "vertex"], ["fs", "fragment"]], expect: "works" },
  { id: "uniformity", feature: "Non-uniform textureSample rejected (uniformity analysis)", entries: [["vs", "vertex"], ["fs", "fragment"]], expect: "webgpu-rejects" },
  { id: "precision", feature: "hi/lo as a type (SplitPosition), bit-exact with WGSL", entries: [["main", "compute"]], expect: "works" },
  { id: "precision-misuse", feature: "Misusing SplitPosition is a compile error", entries: [["main", "compute"]], expect: "slang-rejects" },
  { id: "matrix", feature: "Matrices in storage buffers", entries: [["main", "compute"]], expect: "works" },
  { id: "parameter-block", feature: "ParameterBlock group numbering", entries: [["vs", "vertex"], ["fs", "fragment"]], expect: "works" },
];

const here = dirname(fileURLToPath(import.meta.url));
const temp = mkdtempSync(join(tmpdir(), "slang-probes-"));
const results = [];
try {
  for (const probe of PROBES) {
    const out = join(temp, `${probe.id}.wgsl`);
    const args = [join(here, "probes", `${probe.id}.slang`), "-target", "wgsl"];
    for (const [name, stage] of probe.entries) {
      args.push("-entry", name, "-stage", stage);
    }
    args.push("-o", out);
    let wgsl;
    let error;
    try {
      execFileSync(slangc, args, { stdio: ["ignore", "pipe", "pipe"] });
      wgsl = readFileSync(out, "utf8");
    } catch (e) {
      error = String(e.stderr ?? e.message)
        .replaceAll(here, "")
        .trim()
        .slice(0, 1200);
    }
    results.push({
      ...probe,
      ...(wgsl !== undefined ? { wgsl } : {}),
      ...(error !== undefined ? { error } : {}),
    });
    console.log(`${probe.id}: ${wgsl !== undefined ? "compiled" : "slangc error"}`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}
writeFileSync(
  join(here, "generated", "probes.json"),
  `${JSON.stringify({ slang: SLANG_VERSION, probes: results }, null, 2)}\n`,
);
