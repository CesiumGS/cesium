// Engine names for the benchmark suite (docs/design/benchmark-suite.md, "Engines and versions"): what was built, from
// where, with which settings. One grammar for the CLI, results, reports
// and Dyno:
//
//   1.147.0                 released CesiumJS from npm (also "latest" and
//                           other dist-tags, resolved to an exact version)
//   2.0                     2.0 from the working tree
//   2.0@main                2.0 built at a git ref (branch, tag, commit),
//                           from a snapshot worktree
//   …+stepwise, …+sse=32    settings on top: a catalog setup's variant
//                           (2.0+stepwise) or swept values (key=value)
//
// A run resolves the working tree to its current branch, so results name
// "2.0@cesium-2.0-webgpu-poc" and, after a merge, "2.0@main". 1.x is always
// a release: its source left this repository (CS-611), so "1.x" (the working
// tree's build) and "1.x@<ref>" refuse, naming the pinned release. Older
// results keep those ids. Swept values name settings of the registry
// (settings.mjs), which also gives their words.
import { variantWords } from "./settings.mjs";

/**
 * The CesiumJS release the workspace root pins as `cesium-1x` (its
 * package.json; test/pinned1x.test.ts keeps the two the same).
 */
export const PINNED_1X = "1.147.0";

/** Released CesiumJS versions look like 1.146.0 (prereleases allowed). */
const VERSION = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
/** npm dist-tags we accept for releases. */
const TAGS = new Set(["latest", "next"]);

/**
 * Parses an engine spec: { engine: "1.x" | "2.0", source, variants }.
 * `source` is { kind: "release", version } (version may be a dist-tag
 * until resolved), { kind: "tree" } or { kind: "ref", ref }. `variants`
 * are the "+" parts in order (catalog setup names or key=value).
 * This reads ids as results recorded them, older 1.x sources included;
 * what a run may ask for is `parseEngine`'s.
 */
export function parseId(spec) {
  const [base, ...variants] = String(spec).split("+");
  if (VERSION.test(base) || TAGS.has(base)) {
    if (!base.startsWith("1.") && !TAGS.has(base)) {
      throw new Error(`engine "${spec}": releases are CesiumJS 1 versions`);
    }
    return {
      engine: "1.x",
      source: { kind: "release", version: base },
      variants,
    };
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

/**
 * Parses an engine spec a run asks for: `parseId`'s grammar, except that 1.x
 * comes only as a release. Its source left this repository (CS-611), so "1.x"
 * and "1.x@<ref>" refuse, naming the pinned release.
 */
export function parseEngine(spec) {
  const parsed = parseId(spec);
  if (parsed.engine === "1.x" && parsed.source.kind !== "release") {
    throw new Error(
      `engine "${spec}": 1.x's source left this repository, so 1.x runs only as a release: use ${PINNED_1X} (the pinned cesium-1x) or another version`,
    );
  }
  return parsed;
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
    return parseId(id).source.kind === "release";
  } catch {
    return false;
  }
}

/** "1.x" or "2.0" for any id (old-style ids included). */
export function engineOf(id) {
  try {
    return parseId(id).engine;
  } catch {
    return String(id).startsWith("1") ? "1.x" : "2.0";
  }
}

/**
 * The catalog setup an id runs: "2.0", "1.x" or "2.0+stepwise" (the
 * engine plus named variants, without build source or swept values).
 * Budgets and defaults refer to setups.
 */
export function setupOf(id) {
  try {
    const { engine, variants } = parseId(id);
    return [engine, ...variants.filter((v) => !v.includes("="))].join("+");
  } catch {
    return String(id);
  }
}

/** Words for variants: "stepwise" → "stepwise selection". */
const VARIANT_WORDS = {
  stepwise: "stepwise selection",
  budgeted: "budgeted selection",
};

/**
 * A person's name for an id: "1.146.0", "2.0 · main",
 * "2.0 · cesium-2.0-webgpu-poc · stepwise selection", "2.0 · main · SSE 32",
 * "2.0 · main · error exponent 0.5 · shadows off".
 * `short` drops the source for compact places (legends) when the caller
 * shows it elsewhere.
 */
export function engineLabel(id, { short = false } = {}) {
  let parsed;
  try {
    parsed = parseId(id);
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
    const at = v.indexOf("=");
    parts.push(
      at < 0
        ? (VARIANT_WORDS[v] ?? v)
        : variantWords(v.slice(0, at), v.slice(at + 1)),
    );
  }
  return parts.join(" · ");
}

/** Sorts ids for display: releases (by version), then 1.x, then 2.0. */
export function compareEngines(a, b) {
  const rank = (id) => {
    const p = (() => {
      try {
        return parseId(id);
      } catch {
        return undefined;
      }
    })();
    return p?.source.kind === "release" ? 0 : p?.engine === "1.x" ? 1 : 2;
  };
  return (
    rank(a) - rank(b) ||
    String(a).localeCompare(String(b), undefined, { numeric: true })
  );
}
