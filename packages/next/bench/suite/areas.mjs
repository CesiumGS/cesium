// Which scenes a change needs (plan §16, r39). The catalog's areas name
// the source paths they cover; scenes list the areas they exercise. A run
// with --changed takes the scenes of every area a changed file falls in;
// changes nothing measures (docs, Dyno's pages, widgets) select none.
import { execFileSync } from "node:child_process";

const git = (args, cwd) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Files changed in `root` (packages/next) since `ref`, uncommitted and
 * untracked ones included, relative to `root`.
 */
export function changedFiles(root, ref = "HEAD") {
  return [
    ...new Set([
      ...git(["diff", "--name-only", "--relative", ref], root),
      ...git(["ls-files", "--others", "--exclude-standard"], root),
    ]),
  ].sort();
}

/** `dir/**` matches below dir; anything else matches exactly. */
const matches = (pattern, file) =>
  pattern.endsWith("/**")
    ? file.startsWith(pattern.slice(0, -2))
    : file === pattern;

/** The areas `files` fall in, each with the files that put it there. */
export function areasFor(catalog, files) {
  const found = new Map();
  for (const area of catalog.areas ?? []) {
    const hits = files.filter((f) => area.paths.some((p) => matches(p, f)));
    if (hits.length) {
      found.set(area.id, hits);
    }
  }
  return found;
}

/** The scenes of `areaIds`, in catalog order. */
export function scenesFor(catalog, areaIds) {
  const unknown = areaIds.filter(
    (id) => !(catalog.areas ?? []).some((a) => a.id === id),
  );
  if (unknown.length) {
    throw new Error(
      `unknown areas: ${unknown.join(", ")} (areas: ${(catalog.areas ?? []).map((a) => a.id).join(", ")})`,
    );
  }
  return catalog.scenes.filter((s) =>
    (s.areas ?? []).some((a) => areaIds.includes(a)),
  );
}
