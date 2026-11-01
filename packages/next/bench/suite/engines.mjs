// Engine names for the benchmark suite (plan §16.6): what was built, from
// where, with which settings. One grammar for the CLI, results, reports
// and Dyno:
//
//   1.146.0                 released CesiumJS from npm (also "latest" and
//                           other dist-tags, resolved to an exact version)
//   2.0, 1.x                that engine from the working tree
//   2.0@main, 1.x@v1.140    that engine built at a git ref (branch, tag,
//                           commit), from a snapshot worktree
//   …+legacy1x, …+sse=32    settings on top: a catalog setup's variant
//                           (2.0+legacy1x) or swept values (key=value)
//
// A run resolves the working tree to its current branch, so results name
// "2.0@cesium-2.0-webgpu-poc" and, after a merge, "2.0@main". "1.x" always
// means "a CesiumJS 1 build", never a release.

/** Released CesiumJS versions look like 1.146.0 (prereleases allowed). */
const VERSION = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
/** npm dist-tags we accept for releases. */
const TAGS = new Set(["latest", "next"]);

/**
 * Parses an engine spec: { engine: "1.x" | "2.0", source, variants }.
 * `source` is { kind: "release", version } (version may be a dist-tag
 * until resolved), { kind: "tree" } or { kind: "ref", ref }. `variants`
 * are the "+" parts in order (catalog setup names or key=value).
 */
export function parseEngine(spec) {
  const [base, ...variants] = String(spec).split("+");
  if (VERSION.test(base) || TAGS.has(base)) {
    if (!base.startsWith("1.") && !TAGS.has(base)) {
      throw new Error(`engine "${spec}": releases are CesiumJS 1 versions`);
    }
    return { engine: "1.x", source: { kind: "release", version: base }, variants };
  }
  const match = /^(1\.x|2\.0)(?:@(.+))?$/.exec(base);
  if (!match) {
    throw new Error(
      `engine "${spec}": expected a release (1.146.0), 1.x or 2.0, optionally @<git ref> and +<settings>`,
    );
  }
  const [, engine, ref] = match;
  return {
    engine,
    source: ref ? { kind: "ref", ref } : { kind: "tree" },
    variants,
  };
}

/** The canonical id of a parsed engine (the form results record). */
export function engineId({ engine, source, variants = [] }) {
  const base =
    source.kind === "release"
      ? source.version
      : source.kind === "ref"
        ? `${engine}@${source.ref}`
        : engine;
  return [base, ...variants].join("+");
}

/** Whether an id names a CesiumJS release (never throws). */
export function isRelease(id) {
  try {
    return parseEngine(id).source.kind === "release";
  } catch {
    return false;
  }
}

/** "1.x" or "2.0" for any id (old-style ids included). */
export function engineOf(id) {
  try {
    return parseEngine(id).engine;
  } catch {
    return String(id).startsWith("1") ? "1.x" : "2.0";
  }
}

/**
 * The catalog setup an id runs: "2.0", "1.x" or "2.0+legacy1x" (the
 * engine plus named variants, without build source or swept values).
 * Budgets and defaults refer to setups.
 */
export function setupOf(id) {
  try {
    const { engine, variants } = parseEngine(id);
    return [engine, ...variants.filter((v) => !v.includes("="))].join("+");
  } catch {
    return String(id);
  }
}

/** Words for variants: "legacy1x" → "legacy1x selection". */
const VARIANT_WORDS = {
  legacy1x: "legacy1x selection",
  budgeted: "budgeted selection",
};
const PARAM_WORDS = {
  maximumScreenSpaceError: "SSE",
  sse: "SSE",
  "render.pixelRatio": "pixel ratio",
};

/**
 * A person's name for an id: "1.146.0", "2.0 · main",
 * "2.0 · cesium-2.0-webgpu-poc · legacy1x selection", "2.0 · main · SSE 32".
 * `short` drops the source for compact places (legends) when the caller
 * shows it elsewhere.
 */
export function engineLabel(id, { short = false } = {}) {
  let parsed;
  try {
    parsed = parseEngine(id);
  } catch {
    return String(id);
  }
  const { engine, source, variants } = parsed;
  const parts = [];
  if (source.kind === "release") {
    parts.push(source.version);
  } else {
    parts.push(engine);
    if (!short && source.kind === "ref") {
      parts.push(source.ref);
    }
  }
  for (const v of variants) {
    const [key, value] = v.split("=");
    parts.push(
      value === undefined
        ? (VARIANT_WORDS[v] ?? v)
        : `${PARAM_WORDS[key] ?? key} ${value}`,
    );
  }
  return parts.join(" · ");
}

/** Sorts ids for display: releases (by version), then 1.x, then 2.0. */
export function compareEngines(a, b) {
  const rank = (id) => {
    const p = (() => {
      try {
        return parseEngine(id);
      } catch {
        return undefined;
      }
    })();
    return p?.source.kind === "release" ? 0 : p?.engine === "1.x" ? 1 : 2;
  };
  return rank(a) - rank(b) || String(a).localeCompare(String(b), undefined, { numeric: true });
}
