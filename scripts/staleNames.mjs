#!/usr/bin/env node
// Old-style names in the repository: the milestone names and the section
// references into the old overall plan that the move to work items
// (2026-11-13) replaced. Kept from scripts/work when the tracker moved onto
// human-in-the-lead (CS-522): hitld checks the tracker's files, and this
// checks every other document. `npm test` runs it (test/work.test.ts).
//
//   node scripts/staleNames.mjs     prints each hit; exits 1 if there are any

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const STALE_EXEMPT = [
  "docs/history/2026-11-13-work-items-renumbered.md",
  "packages/next/test/work.test.ts", // fixtures hold old names on purpose
];

/**
 * Old-style names. `global` patterns can't mean anything else, so they are
 * searched everywhere; `scoped` ones (a bare R- or M-number, "5i") also name
 * other things (the frames explorer's review rounds, design-globe stories),
 * so they are searched only in the files that used them for milestones.
 */
export const STALE_PATTERNS = [
  {
    name: "old milestone name",
    regex: String.raw`\b(?:IR-(?:[1-9]|1[0-5])|IR-G[1-6]|JP-[1-9]|LT-[1-8]|MX-(?:[1-9]|1[01])[a-d]?|SR-(?:[1-9]|1[0-3])|WF-(?:[1-9]|1[0-2])[a-d]?|W(?:[0-9]|1[01])|Profiles M[1-9][a-c]?)\b(?!-)`,
    paths: ["docs", "CESIUM2_WEBGPU_PLAN.md", "packages/next"],
  },
  {
    name: "old milestone name",
    regex: String.raw`(?<!\x60)\b(?:R(?:[1-9]|10)|M(?:7|8|9|1[0-3])|5i)\b(?![\s,]*[-0-9.])`,
    paths: [
      "CESIUM2_WEBGPU_PLAN.md",
      "docs/decisions",
      "docs/superpowers/plans/2026-11-12-transform-graph.md",
      "docs/superpowers/plans/2026-11-13-*",
      "packages/next/AGENTS.md",
      "packages/next/work",
      "packages/next/handbook/src",
      "packages/next/.claude",
    ],
  },
  {
    name: "section reference into the old overall plan",
    regex: String.raw`(?:CESIUM2_WEBGPU_PLAN(?:\.md)?\x60?|[Oo]verall plan(?:'s)?|the plan(?:'s)?|\b[Pp]lan),? *§|(?:CESIUM2_WEBGPU_PLAN(?:\.md)?\x60?|[Oo]verall plan(?:'s)?|\bthe plan),? *section +[0-9]|\b[Pp]lan section +[0-9]`,
    paths: ["docs", "CESIUM2_WEBGPU_PLAN.md", "packages/next"],
  },
];

/** Files the stale-name search never reads: binary data and generated code. */
const STALE_EXCLUDE = [
  ":!**/*.json",
  ":!**/*.svg",
  ":!**/*.glb",
  ":!**/*.png",
  ":!**/*.jpg",
  ":!packages/next/spikes/slang/reference/**",
  ":!packages/next/src/**/*.wgsl",
  ":!packages/next/api/**",
  ...STALE_EXEMPT.map((p) => `:!${p}`),
];

/**
 * Searches tracked and untracked files (git grep) for old-style names.
 * Returns `{ path, line, text, name }` entries.
 */
export function staleNames(root, patterns = STALE_PATTERNS) {
  const hits = [];
  for (const p of patterns) {
    let out;
    try {
      out = execFileSync(
        "git",
        [
          "grep",
          "--untracked",
          "-I",
          "-n",
          "-P",
          "-e",
          p.regex,
          "--",
          ...p.paths,
          ...STALE_EXCLUDE,
        ],
        { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 },
      );
    } catch (e) {
      if (e.status === 1) {
        continue; // no matches
      }
      throw e;
    }
    for (const line of out.split("\n").filter(Boolean)) {
      const m = line.match(/^(.*?):(\d+):(.*)$/);
      if (m) {
        hits.push({ path: m[1], line: Number(m[2]), text: m[3], name: p.name });
      }
    }
  }
  return hits;
}

/** The old overall plan's numbered sections, the only targets of a stale reference. */
const OLD_SECTIONS = new Set([
  ...[...Array(16).keys()].map((i) => String(i + 1)),
  ...[...Array(11).keys()].map((i) => `3.${i + 1}`),
  "4.1",
  "4.2",
  "7.1",
  "7.2",
  "7.3",
  ...[...Array(43).keys()].map((i) => `13.${i + 1}`),
  ...[...Array(10).keys()].map((i) => `16.${i + 1}`),
]);

/**
 * A bare section sign followed by a number, in a markdown file that has no
 * numbered heading of its own with that number, reads as a reference into
 * the old overall plan. Returns hits like `staleNames`.
 */
export function bareSectionRefs(root, paths = ["docs", "packages/next"]) {
  let out;
  try {
    out = execFileSync(
      "git",
      [
        "grep",
        "--untracked",
        "-I",
        "-n",
        "-P",
        "-e",
        "§ ?[0-9]",
        "--",
        ...paths,
        ...STALE_EXCLUDE,
      ],
      { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 },
    );
  } catch (e) {
    if (e.status === 1) {
      return [];
    }
    throw e;
  }
  const own = new Map();
  const ownSections = (path) => {
    if (!own.has(path)) {
      const nums = new Set();
      if (path.endsWith(".md")) {
        for (const line of readFileSync(join(root, path), "utf8").split("\n")) {
          const h = line.match(/^#+ +(?:Section +)?([0-9]+(?:\.[0-9]+)*)\.? /);
          if (h) {
            nums.add(h[1]);
          }
        }
      }
      own.set(path, nums);
    }
    return own.get(path);
  };
  const hits = [];
  for (const line of out.split("\n").filter(Boolean)) {
    const m = line.match(/^(.*?):(\d+):(.*)$/);
    if (!m) {
      continue;
    }
    const [, path, n, text] = m;
    for (const ref of text.matchAll(/(\S*)\s*§ ?([0-9]+(?:\.[0-9]+)*)/g)) {
      const before = text.slice(0, ref.index + ref[0].length);
      // Qualified by a document named just before it ("spec.md §5",
      // "RFC 3339 §5.6", "the 3D Tiles spec §2"): not ours.
      if (
        /(\.md|\bspec|\bRFC ?[0-9]+|\bISO[ 0-9-]*|\bIEEE|\bIERS|\bIAU|\bIOGP|\bIS-GPS|\bEPSG|\bU\.S\.C\.|\bet al\b|\bApache-2\.0|\blicen[cs]e|\bstandard|\bspecification|\bguide|\bdocument|\bpaper)(?:[^§]|§ ?[0-9.]+){0,60}§ ?[0-9.]+$/i.test(
          before,
        )
      ) {
        continue;
      }
      const num = ref[2];
      if (!OLD_SECTIONS.has(num)) {
        continue; // never a section of the old plan: someone else's
      }
      const sections = ownSections(path);
      const top = num.split(".")[0];
      if (sections.has(num) || (sections.size && sections.has(top))) {
        continue;
      }
      hits.push({
        path,
        line: Number(n),
        text,
        name: `bare §${num} (no such section in this file)`,
      });
    }
  }
  return hits;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const hits = [...staleNames(root), ...bareSectionRefs(root)];
  for (const h of hits) {
    console.log(`${h.path}:${h.line}: ${h.name}: ${h.text.trim()}`);
  }
  console.log(`${hits.length} old-style name(s)`);
  process.exit(hits.length ? 1 : 0);
}
