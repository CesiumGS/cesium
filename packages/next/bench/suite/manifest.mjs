// Loads the benchmark catalog (plan §16.2): the public catalog in the repo,
// merged with a private manifest outside it when BENCH_MANIFEST names one.
// Private entries replace public ones with the same id. Checks references
// so a typo fails before a long run, not during it.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** The merged catalog: { datasets, scenes, scenarios, setups, engines, budgets, sources }. */
export function loadCatalog(manifest = process.env.BENCH_MANIFEST) {
  const sources = [join(here, "catalog", "public.json")];
  if (manifest) {
    if (!existsSync(manifest)) {
      throw new Error(`BENCH_MANIFEST not found: ${manifest}`);
    }
    sources.push(manifest);
  }
  const catalog = {
    datasets: [],
    scenes: [],
    scenarios: [],
    setups: [],
    budgets: [],
    areas: [],
    tiers: [],
    engines: { default: [], baseline: undefined, candidate: undefined },
  };
  const problems = [];
  for (const [index, path] of sources.entries()) {
    const json = JSON.parse(readFileSync(path, "utf8"));
    for (const dataset of json.datasets ?? []) {
      const problem = licenseProblem(dataset, index > 0);
      if (problem) {
        problems.push(`${index > 0 ? "private" : "public"} ${problem}`);
      }
    }
    // Render settings: the public catalog's, then the private manifest's.
    if (json.render) {
      catalog.render = { ...catalog.render, ...json.render };
      delete catalog.render.$comment;
    }
    // Default engines: the public catalog's, then the private manifest's.
    if (json.engines) {
      catalog.engines = { ...catalog.engines, ...json.engines };
      delete catalog.engines.$comment;
    }
    for (const key of [
      "datasets",
      "scenes",
      "scenarios",
      "setups",
      "budgets",
      "areas",
      "tiers",
    ]) {
      for (const entry of json[key] ?? []) {
        if (index > 0 && key === "datasets") {
          entry.private ??= true;
        }
        const at = catalog[key].findIndex((e) => e.id === entry.id);
        if (at >= 0) {
          catalog[key][at] = entry;
        } else {
          catalog[key].push(entry);
        }
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(`catalog licenses:\n  ${problems.join("\n  ")}`);
  }
  validate(catalog);
  return { ...catalog, sources: sources.length };
}

/**
 * Why a dataset may not be in a catalog (plan §16.2), or undefined. Public:
 * redistributable (compatible with Apache-2.0) or stream-only, and only
 * redistributable data may be mirrored. Private: cleared for commercial use
 * at Bentley (commercial-ok, redistributable, or stream-only through
 * Bentley's own account).
 */
function licenseProblem(dataset, isPrivate) {
  const license = dataset.license;
  const id = dataset.id;
  if (!license?.name || !license?.status) {
    return `dataset ${id}: no reviewed license`;
  }
  const allowed = isPrivate
    ? ["commercial-ok", "redistributable", "stream-only"]
    : ["redistributable", "stream-only"];
  if (!allowed.includes(license.status)) {
    return `dataset ${id}: license status "${license.status}" not allowed`;
  }
  if (dataset.mirror && license.status === "stream-only") {
    return `dataset ${id}: stream-only data may not be mirrored`;
  }
  if (
    isPrivate &&
    license.status === "stream-only" &&
    dataset.source?.token !== "env"
  ) {
    return `dataset ${id}: private stream-only data must use Bentley's own token`;
  }
  return undefined;
}

function validate(catalog) {
  const datasets = new Map(catalog.datasets.map((d) => [d.id, d]));
  const problems = [];
  for (const scene of catalog.scenes) {
    const refs = scene.layers.map((l) => l.dataset);
    if (typeof scene.globe === "object") {
      refs.push(scene.globe.terrain);
    }
    if (scene.imagery) {
      refs.push(scene.imagery);
    }
    for (const ref of refs) {
      if (!datasets.has(ref)) {
        problems.push(`scene ${scene.id}: unknown dataset "${ref}"`);
      }
    }
    if (!scene.camera?.kind) {
      problems.push(`scene ${scene.id}: no camera`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`catalog:\n  ${problems.join("\n  ")}`);
  }
}

/** The datasets a scene uses, in order: terrain, imagery, layers. */
export function sceneDatasets(catalog, scene) {
  const byId = new Map(catalog.datasets.map((d) => [d.id, d]));
  const ids = [
    ...(typeof scene.globe === "object" ? [scene.globe.terrain] : []),
    ...(scene.imagery ? [scene.imagery] : []),
    ...scene.layers.map((l) => l.dataset),
  ];
  return ids.map((id) => byId.get(id));
}

/**
 * Formats each engine can draw today (plan §16.4: unsupported scenes are
 * still run on the engines that can, and reported as gaps).
 */
export const ENGINE_FORMATS = {
  "1.x": [
    "quantized-mesh",
    "b3dm",
    "i3dm",
    "glb",
    "gltf",
    "pnts",
    "splats",
    "vector",
  ],
  "2.0": ["quantized-mesh", "b3dm", "i3dm", "glb", "gltf", "instancing"],
};

/** Why an engine can't run a scene, or undefined. */
export function unsupportedReason(catalog, scene, engine) {
  const formats = ENGINE_FORMATS[engine] ?? [];
  for (const dataset of sceneDatasets(catalog, scene)) {
    for (const format of dataset.formats ?? []) {
      if (!formats.includes(format)) {
        return `${engine} does not draw ${format} (${dataset.title})`;
      }
    }
  }
  return undefined;
}
