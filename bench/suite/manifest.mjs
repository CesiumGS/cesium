// Loads the benchmark catalog (docs/design/benchmark-suite.md, "Manifests and storage"): the public catalog in the repo
// and its development scenes (catalog/dev.json, group D: gallery examples),
// merged with a private manifest outside it when BENCH_MANIFEST names one.
// Private entries replace public ones with the same id. Checks references
// so a typo fails before a long run, not during it.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * The merged catalog: { datasets, scenes, exampleScenes, scenarios, setups,
 * engines, budgets, sources }. `exampleScenes` are group D's (dev.json and
 * a private manifest's), kept apart from `scenes` so everything that runs
 * or counts the catalog's scenes (default runs, areas, image checks, the
 * handbook) leaves them out unless a run names them.
 */
export function loadCatalog(manifest = process.env.BENCH_MANIFEST) {
  const sources = [
    { path: join(here, "catalog", "public.json"), private: false },
    { path: join(here, "catalog", "dev.json"), private: false },
  ];
  if (manifest) {
    if (!existsSync(manifest)) {
      throw new Error(`BENCH_MANIFEST not found: ${manifest}`);
    }
    sources.push({ path: manifest, private: true });
  }
  const catalog = {
    datasets: [],
    scenes: [],
    exampleScenes: [],
    scenarios: [],
    setups: [],
    budgets: [],
    areas: [],
    tiers: [],
    engines: { default: [], baseline: undefined, candidate: undefined },
  };
  const problems = [];
  for (const source of sources) {
    const json = JSON.parse(readFileSync(source.path, "utf8"));
    for (const dataset of json.datasets ?? []) {
      const problem = licenseProblem(dataset, source.private);
      if (problem) {
        problems.push(`${source.private ? "private" : "public"} ${problem}`);
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
      "exampleScenes",
      "scenarios",
      "setups",
      "budgets",
      "areas",
      "tiers",
    ]) {
      for (const entry of json[key] ?? []) {
        if (source.private && key === "datasets") {
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
  // Counted as before dev.json: 1, the public catalog; 2 with a private
  // manifest (reports read `sources > 1` as "public+private").
  return { ...catalog, sources: sources.length - 1 };
}

/**
 * Why a dataset may not be in a catalog (docs/design/benchmark-suite.md, "Manifests and storage"), or undefined. Public:
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
  const ids = new Set(catalog.scenes.map((s) => s.id));
  for (const scene of catalog.exampleScenes) {
    if (ids.has(scene.id)) {
      problems.push(`example scene ${scene.id}: also a catalog scene's id`);
    }
    if (scene.group !== "D") {
      problems.push(`example scene ${scene.id}: group "${scene.group}", not D`);
    }
    if (typeof scene.example !== "string" || !scene.example) {
      problems.push(`example scene ${scene.id}: no example`);
    }
    if (!Array.isArray(scene.datasets)) {
      problems.push(
        `example scene ${scene.id}: no datasets list (the datasets its example streams; [] for none)`,
      );
    }
    for (const ref of scene.datasets ?? []) {
      if (!datasets.has(ref)) {
        problems.push(`example scene ${scene.id}: unknown dataset "${ref}"`);
      }
    }
    const { holdMs, capSeconds } = scene.settle ?? {};
    if (
      (holdMs !== undefined && !(holdMs >= 0)) ||
      (capSeconds !== undefined && !(capSeconds > 0))
    ) {
      problems.push(
        `example scene ${scene.id}: settle needs holdMs ≥ 0 and capSeconds > 0`,
      );
    }
  }
  if (problems.length > 0) {
    throw new Error(`catalog:\n  ${problems.join("\n  ")}`);
  }
}

/** Whether a scene is group D's: a gallery example (dev.json). */
export const isExampleScene = (scene) =>
  scene?.group === "D" && typeof scene.example === "string";

/** Every scene a run may name: the catalog's, then group D's. */
export const allScenes = (catalog) => [
  ...catalog.scenes,
  ...(catalog.exampleScenes ?? []),
];

/**
 * The datasets a scene uses, in order: terrain, imagery, layers (an
 * example scene: the ones it lists).
 */
export function sceneDatasets(catalog, scene) {
  const byId = new Map(catalog.datasets.map((d) => [d.id, d]));
  if (isExampleScene(scene)) {
    return (scene.datasets ?? []).map((id) => byId.get(id));
  }
  const ids = [
    ...(typeof scene.globe === "object" ? [scene.globe.terrain] : []),
    ...(scene.imagery ? [scene.imagery] : []),
    ...scene.layers.map((l) => l.dataset),
  ];
  return ids.map((id) => byId.get(id));
}

/**
 * Formats each engine can draw today (docs/design/benchmark-suite.md, "Catalog (initial)": unsupported scenes are
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
  if (isExampleScene(scene)) {
    if (engine !== "2.0") {
      return "an example runs on 2.0 only (no 1.x adapter)";
    }
    if (scene.engines && !scene.engines.includes(engine)) {
      return `the scene runs on ${scene.engines.join(", ")} only`;
    }
  }
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
