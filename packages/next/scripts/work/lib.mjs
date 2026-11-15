// The work tracker's shared code: the item format, the graph, the checks and
// the views. See docs/superpowers/plans/2026-11-13-work-tracker.md.
//
// Item files are read as data only. Nothing read from an item is executed,
// evaluated or imported, and the frontmatter parser accepts a small subset
// of YAML (scalars and lists), refusing anchors, tags and block strings.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/** The work folder, relative to the repository root. */
export const WORK_DIR = "packages/next/work";
export const KINDS = [
  "work",
  "decision",
  "external",
  "project",
  "initiative",
  "capability",
  "learning",
];
/** Milestones (human-in-the-lead's format): a capability or a learning goal. */
export const MILESTONE_KINDS = ["capability", "learning"];
/**
 * Keys human-in-the-lead's format retired: milestones are their own files,
 * and order is derived. `scripts/work/migrate.mjs` (or `hitld work migrate`)
 * removes them.
 */
export const RETIRED_KEYS = ["milestone", "milestones", "priority"];
export const STATUSES = [
  "Proposed",
  "Planned",
  "In progress",
  "Done",
  "Dropped",
];
const ITEM_KINDS = ["work", "decision", "external"];
/** Folder per kind: containers have their own, every item kind shares one. */
export const FOLDER = {
  initiative: "initiatives",
  project: "projects",
  work: "items",
  decision: "items",
  external: "items",
  capability: "milestones",
  learning: "milestones",
};
const COMMON_KEYS = ["id", "title", "kind", "status", "created"];
const MILESTONE_KEYS = [
  ...COMMON_KEYS,
  "project",
  "initiative",
  "outcome",
  "done_when",
  "needs",
  "serves",
  "appetite_tokens",
  "deadline",
  "check",
  "check_results",
  "reason",
];
/** The allowlist: any key not listed for an item's kind is an error. */
export const KEYS = {
  // estimate_tokens: human-in-the-lead's optional key, the tokens an item
  // is expected to take; the board scales its milestone map by it.
  work: [
    ...COMMON_KEYS,
    "project",
    "needs",
    "claimed",
    "reason",
    "estimate_tokens",
  ],
  decision: [
    ...COMMON_KEYS,
    "project",
    "needs",
    "claimed",
    "reason",
    "decided-by",
    "estimate_tokens",
  ],
  external: [
    ...COMMON_KEYS,
    "project",
    "needs",
    "claimed",
    "reason",
    "party",
    "estimate_tokens",
  ],
  project: [...COMMON_KEYS, "initiative", "lead", "plan", "reason"],
  initiative: [...COMMON_KEYS, "lead", "reason"],
  capability: MILESTONE_KEYS,
  learning: MILESTONE_KEYS,
};
/** Keys some tool would run as code. Refused with their own message. */
export const CODE_KEYS = [
  "onStatusChange",
  "on_status_change",
  "hooks",
  "hook",
  "script",
  "scripts",
  "run",
  "exec",
  "command",
  "cmd",
  "shell",
];
const LIST_KEYS = new Set([
  "needs",
  "milestones",
  "done_when",
  "serves",
  "check_results",
]);
export const ID_PATTERN = /^CS-[1-9]\d*$/;
const FILE_PATTERN = /^(CS-[1-9]\d*)(-[a-z0-9-]+)?\.md$/;

// --- Parsing ---------------------------------------------------------------

/**
 * Splits an item file into frontmatter data and body. Returns
 * `{ data, body, errors }`; `data` is null when there is no frontmatter.
 */
export function parseItem(text) {
  const errors = [];
  const normalized = text.replace(/\r\n/g, "\n");
  const m = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!m) {
    return { data: null, body: normalized, errors: ["no frontmatter"] };
  }
  const data = {};
  let listKey = null;
  for (const [n, line] of m[1].split("\n").entries()) {
    const at = `frontmatter line ${n + 2}`;
    if (line.trim() === "") {
      continue;
    }
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item) {
      if (!listKey) {
        errors.push(`${at}: a list entry with no key above it`);
      } else {
        data[listKey].push(scalar(item[1], at, errors));
      }
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):(?:\s+(.*))?$/);
    if (!kv) {
      errors.push(`${at}: not "key: value"`);
      listKey = null;
      continue;
    }
    const [, key, raw = ""] = kv;
    if (key in data) {
      errors.push(`${at}: "${key}" appears twice`);
    }
    listKey = null;
    const v = raw.trim();
    if (v === "") {
      data[key] = [];
      listKey = key;
    } else if (v.startsWith("[")) {
      if (!v.endsWith("]")) {
        errors.push(`${at}: an inline list must end on its line`);
      }
      data[key] = v
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => scalar(s, at, errors));
    } else {
      data[key] = scalar(v, at, errors);
    }
  }
  return { data, body: normalized.slice(m[0].length), errors };
}

function scalar(raw, at, errors) {
  const s = raw.trim();
  if (/^".*"$/.test(s)) {
    try {
      return JSON.parse(s); // double quotes: JSON escapes, as renderItem writes
    } catch {
      errors.push(`${at}: a double-quoted value with a bad escape`);
      return s.slice(1, -1);
    }
  }
  const single = s.match(/^'(.*)'$/);
  if (single) {
    return single[1].replace(/''/g, "'");
  }
  if (/^[|>&*!{]/.test(s)) {
    errors.push(
      `${at}: "${s.slice(0, 20)}" uses YAML this format doesn't allow (block strings, anchors, aliases, tags or maps)`,
    );
  }
  return s;
}

/** Writes frontmatter in a fixed key order, then the body. */
export function renderItem(data, body = "") {
  const order = [...new Set([...KEYS[data.kind], ...Object.keys(data)])];
  const lines = ["---"];
  for (const key of order) {
    const v = data[key];
    if (v === undefined || v === null || v === "") {
      continue;
    }
    if (Array.isArray(v)) {
      if (v.length) {
        lines.push(`${key}: [${v.join(", ")}]`);
      }
    } else {
      lines.push(`${key}: ${needsQuotes(v) ? quote(String(v)) : v}`);
    }
  }
  lines.push("---", "");
  return `${lines.join("\n")}${body.replace(/^\n+/, "\n")}`;
}

// Prettier's choice: single quotes when the value has more double quotes
// than single ones, so a formatted file and a written one agree.
function quote(v) {
  const doubles = (v.match(/"/g) ?? []).length;
  const singles = (v.match(/'/g) ?? []).length;
  return doubles > singles ? `'${v.replace(/'/g, "''")}'` : JSON.stringify(v);
}

function needsQuotes(v) {
  return /^[\s|>&*!{["'#]|: |\s#|\s$/.test(String(v));
}

/** A file-name slug from a title: lower case, ASCII, at most 48 characters. */
export function slugify(title) {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const cut = slug.slice(0, 48);
  return (
    (cut.length < slug.length ? cut.replace(/-[^-]*$/, "") : cut) || "item"
  );
}

export function idNumber(id) {
  return Number(String(id).slice(3));
}

// --- Loading ---------------------------------------------------------------

/**
 * Reads every item file under `<root>/packages/next/work/` from the working
 * tree. Each entry: `{ path, file, folder, data, body, errors }`, `path`
 * repository-relative.
 */
export function loadWorkTree(root) {
  const items = [];
  for (const folder of ["initiatives", "projects", "items", "milestones"]) {
    const dir = join(root, WORK_DIR, folder);
    if (!existsSync(dir)) {
      continue;
    }
    for (const file of readdirSync(dir).sort()) {
      if (!file.endsWith(".md")) {
        continue;
      }
      const path = relative(root, join(dir, file)).split("\\").join("/");
      items.push({
        path,
        file,
        folder,
        ...parseItem(readFileSync(join(dir, file), "utf8")),
      });
    }
  }
  return items;
}

/** Item file names (not contents) in a list of repository-relative paths. */
export function itemFileNames(paths) {
  return paths
    .filter((p) => p.startsWith(`${WORK_DIR}/`))
    .map((p) => p.split("/").pop())
    .filter((f) => FILE_PATTERN.test(f));
}

// --- The graph -------------------------------------------------------------

/** Indexes loaded items. Later duplicates are kept in `duplicates`. */
export function buildGraph(items) {
  const byId = new Map();
  const duplicates = [];
  for (const it of items) {
    const id = it.data?.id;
    if (!id) {
      continue;
    }
    if (byId.has(id)) {
      duplicates.push([byId.get(id), it]);
    } else {
      byId.set(id, it);
    }
  }
  const all = [...byId.values()].sort(
    (a, b) => idNumber(a.data.id) - idNumber(b.data.id),
  );
  const g = {
    byId,
    duplicates,
    all,
    get: (id) => byId.get(id),
    // A milestone's entries carry a clause ("CS-52 c1"); the ID comes first.
    needs: (it) => list(it.data.needs).map((e) => String(e).split(/\s+/)[0]),
    isItem: (it) => ITEM_KINDS.includes(it.data.kind),
    isOpen: (it) => !["Done", "Dropped"].includes(it.data.status),
  };
  g.items = all.filter(g.isItem);
  g.milestones = all.filter((it) => MILESTONE_KINDS.includes(it.data.kind));
  /** The milestones whose constraints (`needs`) name an item. */
  g.milestonesOf = (id) => g.milestones.filter((m) => g.needs(m).includes(id));
  g.projects = all.filter((it) => it.data.kind === "project");
  g.initiatives = all.filter((it) => it.data.kind === "initiative");
  g.openNeeds = (it) =>
    g.needs(it).filter((id) => g.get(id)?.data.status !== "Done");
  g.isReady = (it) =>
    it.data.status === "Planned" && g.openNeeds(it).length === 0;
  g.isBlocked = (it) =>
    ["Planned", "Proposed"].includes(it.data.status) &&
    g.openNeeds(it).length > 0;
  g.itemsOf = (projectId) =>
    g.items.filter((it) => it.data.project === projectId);
  g.projectsOf = (initiativeId) =>
    g.projects.filter((p) => p.data.initiative === initiativeId);
  /** Items that need `id`, open ones only. */
  g.dependents = (id) =>
    g.items.filter((it) => g.isOpen(it) && g.needs(it).includes(id));
  return g;
}

function list(v) {
  if (v === undefined || v === null || v === "") {
    return [];
  }
  return Array.isArray(v) ? v : [v];
}

/** Progress counts for a set of items. */
export function progress(g, items) {
  const c = {
    total: 0,
    done: 0,
    dropped: 0,
    ready: 0,
    blocked: 0,
    inProgress: 0,
    proposed: 0,
  };
  for (const it of items) {
    c.total++;
    const s = it.data.status;
    if (s === "Done") {
      c.done++;
    } else if (s === "Dropped") {
      c.dropped++;
    } else if (s === "In progress") {
      c.inProgress++;
    } else if (g.isReady(it)) {
      c.ready++;
    } else if (g.isBlocked(it)) {
      c.blocked++;
    }
    if (s === "Proposed") {
      c.proposed++;
    }
  }
  return c;
}

export function describeProgress(c) {
  const live = c.total - c.dropped;
  const parts = [`${c.done} of ${live} done`];
  if (c.inProgress) {
    parts.push(`${c.inProgress} in progress`);
  }
  parts.push(`${c.ready} ready`, `${c.blocked} blocked`);
  if (c.proposed) {
    parts.push(`${c.proposed} proposed`);
  }
  if (c.dropped) {
    parts.push(`${c.dropped} dropped`);
  }
  return parts.join(", ");
}

// --- Checks ----------------------------------------------------------------

/**
 * Validates loaded items. Returns a list of problem strings. `root`, when
 * given, lets `plan` paths be checked for existence.
 */
export function checkItems(items, { root } = {}) {
  const problems = [];
  const say = (it, msg) => problems.push(`${it.path}: ${msg}`);
  for (const it of items) {
    for (const e of it.errors) {
      say(it, e);
    }
    const d = it.data;
    if (!d) {
      continue;
    }
    for (const key of Object.keys(d)) {
      if (CODE_KEYS.includes(key)) {
        say(it, `"${key}" is a key some tools run as code; never allowed`);
      }
    }
    if (!KINDS.includes(d.kind)) {
      say(it, `kind "${d.kind ?? ""}" isn't one of ${KINDS.join(", ")}`);
      continue;
    }
    for (const key of Object.keys(d)) {
      if (RETIRED_KEYS.includes(key)) {
        say(
          it,
          `"${key}" is retired (milestones are files; order is derived): run node scripts/work/migrate.mjs`,
        );
        continue;
      }
      if (!KEYS[d.kind].includes(key) && !CODE_KEYS.includes(key)) {
        say(it, `"${key}" isn't an allowed key for a ${d.kind}`);
      }
      if (Array.isArray(d[key]) !== LIST_KEYS.has(key)) {
        say(
          it,
          `"${key}" must be ${LIST_KEYS.has(key) ? "a list" : "a single value"}`,
        );
      }
    }
    const m = it.file.match(FILE_PATTERN);
    if (!ID_PATTERN.test(d.id ?? "")) {
      say(it, `id "${d.id ?? ""}" isn't CS-<n>`);
    } else if (!m || m[1] !== d.id) {
      say(it, `file name doesn't start with its id ${d.id}`);
    }
    if (!m) {
      say(it, "file name isn't CS-<n>-<slug>.md (lower-case slug)");
    }
    if (FOLDER[d.kind] !== it.folder) {
      say(it, `a ${d.kind} belongs in ${FOLDER[d.kind]}/, not ${it.folder}/`);
    }
    if (!d.title) {
      say(it, "no title");
    }
    if (!STATUSES.includes(d.status)) {
      say(it, `status "${d.status ?? ""}" isn't one of ${STATUSES.join(", ")}`);
    }
    if (d.created !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(d.created)) {
      say(it, `created "${d.created}" isn't YYYY-MM-DD`);
    }
    for (const key of ["estimate_tokens", "appetite_tokens"]) {
      if (d[key] !== undefined && !/^[1-9]\d*$/.test(String(d[key]))) {
        say(it, `${key} "${d[key]}" isn't a whole number of tokens`);
      }
    }
    if (d.status === "Dropped" && !d.reason) {
      say(it, "Dropped needs a reason");
    }
    if (d.reason && d.status !== "Dropped") {
      say(it, "a reason is only for Dropped");
    }
    if (ITEM_KINDS.includes(d.kind)) {
      if (!d.project) {
        say(it, "no project");
      }
      if (d.kind === "work" && d.status === "In progress" && !d.claimed) {
        say(it, "In progress needs claimed (who has it)");
      }
      if (d.claimed && !["In progress", "Done"].includes(d.status)) {
        say(it, `claimed, but ${d.status}`);
      }
    }
    if (d.kind === "decision" && !d["decided-by"]) {
      say(it, "a decision needs decided-by");
    }
    if (d.kind === "external" && !d.party) {
      say(it, "an external item needs party (who we wait on)");
    }
    if (["project", "initiative"].includes(d.kind) && !d.lead) {
      say(it, `a ${d.kind} needs a lead`);
    }
    if (d.kind === "project" && !d.initiative) {
      say(it, "a project needs an initiative");
    }
    if (MILESTONE_KINDS.includes(d.kind)) {
      if (!d.project === !d.initiative) {
        say(it, "a milestone sits under one project or one initiative");
      }
      if (d.status === "In progress") {
        say(
          it,
          "a milestone is never In progress: items are claimed, milestones aren't",
        );
      }
      const clauses = new Set();
      for (const c of list(d.done_when)) {
        const m = String(c).match(/^(c\d+): \S/);
        if (!m) {
          say(it, `done_when "${c}" isn't "c<n>: <text>"`);
        } else {
          clauses.add(m[1]);
        }
      }
      for (const e of list(d.needs)) {
        const m = String(e).match(/^(CS-[1-9]\d*) (c\d+|c\?)$/);
        if (!m) {
          say(
            it,
            `needs "${e}" isn't "<CS-n> <clause>" (c1, or c? until shaped)`,
          );
        } else if (m[2] !== "c?" && !clauses.has(m[2])) {
          say(
            it,
            `needs ${m[1]} links clause ${m[2]}, which done_when doesn't have`,
          );
        }
      }
      for (const e of list(d.serves)) {
        if (
          !/^CS-[1-9]\d* value=(1|2|3|5|8|13) confidence=(0(\.\d+)?|1(\.0+)?)$/.test(
            String(e),
          )
        ) {
          say(
            it,
            `serves "${e}" isn't "<CS-n> value=<1,2,3,5,8,13> confidence=<0 to 1>"`,
          );
        }
      }
      if (
        d.check !== undefined &&
        !/^(demo|integration-test|study) \S/.test(d.check)
      ) {
        say(
          it,
          `check "${d.check}" isn't "<demo|integration-test|study> <target>"`,
        );
      }
      if (d.status === "Done") {
        const last = list(d.check_results)
          .filter((r) => /^(pass|fail|verdict) /.test(String(r)))
          .at(-1);
        if (!last || String(last).startsWith("fail")) {
          say(
            it,
            "a milestone is Done only when its check passed (check_results)",
          );
        }
      }
    }
    if (d.plan && root && !existsSync(join(root, d.plan))) {
      say(it, `plan ${d.plan} doesn't exist`);
    }
  }

  const g = buildGraph(items);
  for (const [a, b] of g.duplicates) {
    problems.push(`${a.data.id}: in both ${a.path} and ${b.path}`);
  }
  for (const it of g.all) {
    const d = it.data;
    const ref = (key, kind) => {
      if (!d[key]) {
        return;
      }
      const target = g.get(d[key]);
      if (!target) {
        say(it, `${key} ${d[key]} doesn't exist`);
      } else if (target.data.kind !== kind) {
        say(it, `${key} ${d[key]} is a ${target.data.kind}, not a ${kind}`);
      }
      return target;
    };
    if (MILESTONE_KINDS.includes(d.kind)) {
      if (d.project) {
        ref("project", "project");
      }
      if (d.initiative) {
        ref("initiative", "initiative");
      }
      for (const e of list(d.serves)) {
        const id = String(e).split(/\s+/)[0];
        if (!g.get(id)) {
          say(it, `serves ${id}, which doesn't exist`);
        }
      }
    }
    if (ITEM_KINDS.includes(d.kind) || MILESTONE_KINDS.includes(d.kind)) {
      if (ITEM_KINDS.includes(d.kind)) {
        ref("project", "project");
      }
      for (const n of g.needs(it)) {
        const target = g.get(n);
        if (!target) {
          say(it, `needs ${n}, which doesn't exist`);
        } else if (
          !g.isItem(target) &&
          !MILESTONE_KINDS.includes(target.data.kind)
        ) {
          say(
            it,
            `needs ${n}, a ${target.data.kind}; needs name items and milestones only`,
          );
        } else if (target.data.status === "Dropped" && g.isOpen(it)) {
          say(it, `needs ${n}, which was dropped; it can never be ready`);
        }
        if (n === d.id) {
          say(it, "needs itself");
        }
      }
    }
    if (d.kind === "project") {
      ref("initiative", "initiative");
    }
  }
  for (const cycle of findCycles(g)) {
    problems.push(`cycle: ${cycle.join(" → ")}`);
  }
  return problems;
}

function findCycles(g) {
  const cycles = [];
  const state = new Map(); // 1 visiting, 2 done
  const stack = [];
  const visit = (id) => {
    state.set(id, 1);
    stack.push(id);
    for (const n of g.needs(g.get(id))) {
      if (!g.get(n)) {
        continue;
      }
      if (state.get(n) === 1) {
        cycles.push([...stack.slice(stack.indexOf(n)), n]);
      } else if (!state.has(n)) {
        visit(n);
      }
    }
    stack.pop();
    state.set(id, 2);
  };
  for (const it of [...g.items, ...g.milestones]) {
    if (!state.has(it.data.id)) {
      visit(it.data.id);
    }
  }
  return cycles;
}

// --- Stale names -------------------------------------------------------------

/** Where old names may appear: the renumbering table and the tests' fixtures. */
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

// --- Places: worktrees and branches -----------------------------------------

function git(root, args, input) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1 << 28,
    input,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "ignore"],
  });
}

/**
 * Every place an item can live in this clone: each worktree's working copy
 * (uncommitted files included) and each branch without a worktree (local
 * branches, and remote-tracking ones when `remotes` is set). Returns
 * `[{ where, path?, ref? }]`.
 */
export function listPlaces(root, { remotes = false } = {}) {
  const places = [];
  const withWorktree = new Set();
  for (const block of git(root, ["worktree", "list", "--porcelain"]).split(
    "\n\n",
  )) {
    const path = block.match(/^worktree (.*)$/m)?.[1];
    const branch = block.match(/^branch refs\/heads\/(.*)$/m)?.[1];
    if (!path || /^prunable/m.test(block)) {
      continue;
    }
    if (branch) {
      withWorktree.add(branch);
    }
    places.push({ where: `${branch ?? "detached"} (worktree)`, path });
  }
  const refs = git(root, [
    "for-each-ref",
    "--format=%(refname)",
    "refs/heads",
    ...(remotes ? ["refs/remotes"] : []),
  ]);
  for (const ref of refs.split("\n").filter(Boolean)) {
    const short = ref.replace(/^refs\/(heads|remotes)\//, "");
    if (ref.startsWith("refs/heads/") && withWorktree.has(short)) {
      continue;
    }
    if (ref.endsWith("/HEAD")) {
      continue;
    }
    places.push({ where: short, ref });
  }
  return places;
}

/** Item file names in a place, without reading their contents. */
export function fileNamesIn(root, place) {
  if (place.path) {
    return ["initiatives", "projects", "items", "milestones"].flatMap(
      (folder) => {
        const dir = join(place.path, WORK_DIR, folder);
        return existsSync(dir)
          ? readdirSync(dir).filter((f) => FILE_PATTERN.test(f))
          : [];
      },
    );
  }
  try {
    return itemFileNames(
      git(root, [
        "ls-tree",
        "-r",
        "--name-only",
        place.ref,
        "--",
        WORK_DIR,
      ]).split("\n"),
    );
  } catch {
    return [];
  }
}

/**
 * Reads every item in every place. Returns `[{ where, items }]`, items as
 * `loadWorkTree` returns them. Branch contents are read in one batch.
 */
export function loadPlaces(root, places) {
  const out = [];
  const wanted = [];
  for (const p of places) {
    if (p.path) {
      out.push({ where: p.where, items: loadWorkTree(p.path) });
      continue;
    }
    let listing;
    try {
      listing = git(root, ["ls-tree", "-r", p.ref, "--", WORK_DIR]);
    } catch {
      continue;
    }
    const entry = { where: p.where, items: [] };
    out.push(entry);
    for (const line of listing.split("\n").filter(Boolean)) {
      const m = line.match(/^\d+ blob ([0-9a-f]+)\t(.*)$/);
      const file = m?.[2].split("/").pop();
      if (m && FILE_PATTERN.test(file)) {
        const folder = m[2].split("/").at(-2);
        wanted.push({ entry, sha: m[1], path: m[2], file, folder });
      }
    }
  }
  if (wanted.length) {
    const shas = [...new Set(wanted.map((w) => w.sha))];
    const buf = execFileSync("git", ["cat-file", "--batch"], {
      cwd: root,
      maxBuffer: 1 << 28,
      input: `${shas.join("\n")}\n`,
      stdio: ["pipe", "pipe", "ignore"],
    });
    // Each answer: "<sha> blob <bytes>\n<content>\n". Sizes are bytes.
    const blobs = new Map();
    let at = 0;
    while (at < buf.length) {
      const eol = buf.indexOf(10, at);
      const [sha, type, size] = buf.subarray(at, eol).toString().split(" ");
      if (type !== "blob") {
        at = eol + 1;
        continue;
      }
      const start = eol + 1;
      const end = start + Number(size);
      blobs.set(sha, buf.subarray(start, end).toString("utf8"));
      at = end + 1;
    }
    for (const w of wanted) {
      w.entry.items.push({
        path: w.path,
        file: w.file,
        folder: w.folder,
        ...parseItem(blobs.get(w.sha) ?? ""),
      });
    }
  }
  return out;
}

/**
 * Claims elsewhere: items In progress or with `claimed` in another place,
 * where this checkout's copy differs. Returns `[{ id, title, who: [..] }]`,
 * an entry with two or more `who` being a double claim.
 */
export function findClaims(mine, placed) {
  const g = buildGraph(mine);
  const claims = new Map();
  for (const { where, items } of placed) {
    for (const it of items) {
      const d = it.data;
      if (!d?.id || d.status !== "In progress") {
        continue;
      }
      const here = g.get(d.id)?.data;
      if (here && here.status === d.status && here.claimed === d.claimed) {
        continue; // the same as this checkout: not news
      }
      if (!claims.has(d.id)) {
        claims.set(d.id, { id: d.id, title: d.title, who: [] });
      }
      const entry = claims.get(d.id);
      const label = `${d.claimed ?? "?"} on ${where}`;
      if (!entry.who.includes(label)) {
        entry.who.push(label);
      }
    }
  }
  // A claim in this checkout counts as one place too, for double claims.
  for (const entry of claims.values()) {
    const here = g.get(entry.id)?.data;
    if (here?.status === "In progress") {
      entry.who.unshift(`${here.claimed ?? "?"} here`);
    }
  }
  return [...claims.values()].sort((a, b) => idNumber(a.id) - idNumber(b.id));
}

/**
 * Number collisions across places: one ID under two different file names
 * (names are fixed at creation, so these are two different items).
 */
export function findCollisions(placed) {
  const names = new Map();
  for (const { where, items } of placed) {
    for (const it of items) {
      const m = it.file.match(FILE_PATTERN);
      if (!m) {
        continue;
      }
      if (!names.has(m[1])) {
        names.set(m[1], new Map());
      }
      const byName = names.get(m[1]);
      if (!byName.has(it.file)) {
        byName.set(it.file, []);
      }
      byName.get(it.file).push(where);
    }
  }
  const out = [];
  for (const [id, byName] of names) {
    if (byName.size > 1) {
      out.push({
        id,
        files: [...byName].map(([file, where]) => ({ file, where })),
      });
    }
  }
  return out.sort((a, b) => idNumber(a.id) - idNumber(b.id));
}

// --- Views -----------------------------------------------------------------

const BOX = {
  Done: "x",
  "In progress": "~",
  Planned: " ",
  Proposed: "?",
  Dropped: "-",
};

function joinIds(ids) {
  return ids.length < 3
    ? ids.join(" and ")
    : `${ids.slice(0, -1).join(", ")} and ${ids.at(-1)}`;
}

function needsText(g, it, projectId) {
  const needs = g.needs(it).map((n) => {
    const t = g.get(n);
    const other = t && t.data.project !== projectId;
    return other
      ? `${n} (${shortTitle(g.get(t.data.project)?.data.title)})`
      : n;
  });
  return needs.length ? `Needs ${joinIds(needs)}.` : "Needs nothing.";
}

function shortTitle(t = "") {
  return t.replace(/^The /, "");
}

function itemLine(g, it, projectId, linkBase) {
  const d = it.data;
  const tag = d.kind === "work" ? "" : `${d.kind}: `;
  const id = linkBase ? `[${d.id}](${linkBase}${it.folder}/${it.file})` : d.id;
  let tail;
  if (d.status === "Dropped") {
    tail = `Dropped: ${d.reason}`;
  } else if (d.status === "Done") {
    tail = "Done.";
  } else {
    tail = needsText(g, it, projectId);
    if (d.status === "In progress") {
      tail += ` Claimed by ${d.claimed ?? "?"}.`;
    } else if (d.status === "Proposed") {
      tail = `Proposed. ${tail}`;
    }
    if (d.kind === "decision") {
      tail += ` Decided by ${d["decided-by"]}.`;
    } else if (d.kind === "external") {
      tail += ` Waiting on ${d.party}.`;
    }
  }
  return `- [${BOX[d.status] ?? " "}] ${id} ${tag}${d.title.replace(/\.$/, "")}. ${tail}`;
}

/** The generated lists, as markdown: initiatives, projects, items. */
export function renderLists(g, { linkBase = "" } = {}) {
  const out = [];
  const projectBlock = (p, level) => {
    const items = g.itemsOf(p.data.id);
    const plan = p.data.plan
      ? ` Plan: [${p.data.plan.split("/").pop()}](${linkBase ? "../../../" : ""}${p.data.plan}).`
      : "";
    const pid = linkBase
      ? `[${p.data.id}](${linkBase}${p.folder}/${p.file})`
      : p.data.id;
    out.push(
      `${"#".repeat(level)} ${p.data.title}`,
      "",
      `${pid}, ${p.data.status}, led by ${p.data.lead}: ${describeProgress(progress(g, items))}.${plan}`,
      "",
    );
    // A project's milestones are files; an item is listed under each
    // milestone whose constraints name it, then the rest.
    const milestones = g.milestones.filter((m) => m.data.project === p.data.id);
    const inSome = new Set(milestones.flatMap((m) => g.needs(m)));
    const groups = milestones.length
      ? [
          ...milestones.map((m) => [
            m.data.title,
            items.filter((it) => g.needs(m).includes(it.data.id)),
          ]),
          ["", items.filter((it) => !inSome.has(it.data.id))],
        ]
      : [["", items]];
    for (const [m, its] of groups) {
      if (!its.length) {
        continue;
      }
      if (m) {
        out.push(`Milestone: ${m}`, "");
      } else if (milestones.length) {
        out.push("No milestone", "");
      }
      for (const it of its) {
        out.push(itemLine(g, it, p.data.id, linkBase));
      }
      out.push("");
    }
  };
  for (const ini of g.initiatives) {
    out.push(`### ${ini.data.title}`, "");
    const projects = g.projectsOf(ini.data.id);
    const all = projects.flatMap((p) => g.itemsOf(p.data.id));
    const iid = linkBase
      ? `[${ini.data.id}](${linkBase}${ini.folder}/${ini.file})`
      : ini.data.id;
    out.push(
      `${iid}, ${ini.data.status}: ${describeProgress(progress(g, all))}.`,
      "",
    );
    for (const p of projects) {
      projectBlock(p, 4);
    }
  }
  const orphans = g.projects.filter((p) => !g.get(p.data.initiative));
  for (const p of orphans) {
    projectBlock(p, 3);
  }
  return `${out.join("\n").replace(/\n+$/, "")}\n`;
}

export const LIST_BEGIN =
  "<!-- work:lists:begin (generated by views.mjs lists --write; don't edit by hand) -->";
export const LIST_END = "<!-- work:lists:end -->";

/** Replaces the text between the markers in `text`. Throws if absent. */
export function replaceBetweenMarkers(text, generated) {
  const a = text.indexOf("<!-- work:lists:begin");
  const b = text.indexOf(LIST_END);
  if (a < 0 || b < a) {
    throw new Error("the work:lists markers aren't in the file");
  }
  return `${text.slice(0, a)}${LIST_BEGIN}\n\n${generated}\n${text.slice(b)}`;
}

/** One line per item. */
export function itemRow(g, it) {
  const d = it.data;
  const project = g.get(d.project)?.data.title ?? d.project;
  const claim =
    d.claimed && d.status === "In progress" ? ` [${d.claimed}]` : "";
  return `${d.id}\t${d.kind === "work" ? "" : `${d.kind}: `}${d.title}${claim}\t(${shortTitle(project)})`;
}

export function projectDeps(g) {
  const edges = new Map(); // "from→to" (from waits on to) → count
  for (const it of g.items) {
    if (!g.isOpen(it)) {
      continue;
    }
    for (const n of g.needs(it)) {
      const t = g.get(n);
      if (!t || !g.isOpen(t) || t.data.project === it.data.project) {
        continue;
      }
      const key = `${it.data.project}→${t.data.project}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  return [...edges].map(([k, count]) => {
    const [from, to] = k.split("→");
    return { from, to, count };
  });
}

const CLASS_DEFS = [
  "  classDef open fill:#fff,stroke:#333",
  "  classDef done fill:#ddd,color:#666,stroke:#999",
  "  classDef dropped fill:#eee,color:#999,stroke:#ccc,stroke-dasharray:3",
  "  classDef proposed fill:#fff,stroke:#333,stroke-dasharray:4",
  "  classDef decision fill:#fff4d6,stroke:#a67c00",
  "  classDef external fill:#e6f0ff,stroke:#3366aa",
];

export function mermaidItems(g, projectId) {
  const node = (id) => id.replace("-", "_");
  const label = (it) =>
    `${it.data.id} ${it.data.title}`.replace(/["`]/g, "'").slice(0, 70);
  const lines = ["graph LR"];
  const shown = new Set();
  const projects = projectId ? [g.get(projectId)].filter(Boolean) : g.projects;
  for (const p of projects) {
    lines.push(
      `  subgraph ${node(p.data.id)}["${shortTitle(p.data.title).replace(/"/g, "'")}"]`,
    );
    for (const it of g.itemsOf(p.data.id)) {
      shown.add(it.data.id);
      lines.push(`    ${node(it.data.id)}["${label(it)}"]:::${classOf(it)}`);
    }
    lines.push("  end");
  }
  const edges = [];
  for (const it of g.items.filter((i) => shown.has(i.data.id))) {
    for (const n of g.needs(it)) {
      const t = g.get(n);
      if (t && !shown.has(n)) {
        shown.add(n);
        lines.push(`  ${node(n)}["${label(t)}"]:::${classOf(t)}`);
      }
      edges.push(`  ${node(n)} --> ${node(it.data.id)}`);
    }
  }
  lines.push(...edges, ...CLASS_DEFS);
  return `${lines.join("\n")}\n`;
}

function classOf(it) {
  const s = it.data.status;
  if (s === "Done") {
    return "done";
  }
  if (s === "Dropped") {
    return "dropped";
  }
  if (it.data.kind === "decision") {
    return "decision";
  }
  if (it.data.kind === "external") {
    return "external";
  }
  return s === "Proposed" ? "proposed" : "open";
}

export function mermaidProjects(g) {
  const node = (id) => id.replace("-", "_");
  const lines = ["graph LR"];
  for (const ini of g.initiatives) {
    lines.push(
      `  subgraph ${node(ini.data.id)}["${ini.data.title.replace(/"/g, "'")}"]`,
    );
    for (const p of g.projectsOf(ini.data.id)) {
      const c = progress(g, g.itemsOf(p.data.id));
      lines.push(
        `    ${node(p.data.id)}["${shortTitle(p.data.title).replace(/"/g, "'")}<br/>${c.done} of ${c.total - c.dropped} done"]`,
      );
    }
    lines.push("  end");
  }
  for (const e of projectDeps(g)) {
    lines.push(`  ${node(e.to)} -->|${e.count}| ${node(e.from)}`);
  }
  return `${lines.join("\n")}\n`;
}

// --- Allocation --------------------------------------------------------------

function numberOf(file) {
  return Number(file.match(FILE_PATTERN)?.[1].slice(3) ?? 0);
}

/** Every CS number taken in any worktree or on any local or remote branch. */
export function takenNumbers(
  root,
  places = listPlaces(root, { remotes: true }),
) {
  const taken = new Set();
  for (const p of places) {
    for (const f of fileNamesIn(root, p)) {
      taken.add(numberOf(f));
    }
  }
  return taken;
}

/**
 * Picks the next number and calls `write(n)`, which creates the file
 * exclusively and returns its repository-relative path. Then scans again:
 * if another file took the same number meanwhile, the one whose name sorts
 * first keeps it and the other is removed (`remove(path)`) and retried.
 */
export function allocate(root, write, remove, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const n = Math.max(0, ...takenNumbers(root)) + 1;
    let path;
    try {
      path = write(n);
    } catch (e) {
      if (e.code === "EEXIST") {
        continue;
      }
      throw e;
    }
    const mine = path.split("/").pop();
    const rivals = listPlaces(root, { remotes: true })
      .flatMap((p) => fileNamesIn(root, p))
      .filter((f) => numberOf(f) === n && f !== mine);
    if (rivals.some((f) => f < mine)) {
      remove(path);
      continue;
    }
    return { id: `CS-${n}`, path };
  }
  throw new Error("couldn't allocate a number; try again");
}

// --- Loops between projects and initiatives ----------------------------------

/**
 * Loops of waits above the item level: groups of projects (or of
 * initiatives) whose open items need each other's, round a loop. Not an
 * error, since the tree is for accountability and `needs` for dependency,
 * but a loop means the group has no order. For each group, the fewest
 * waits that tie it (removed smallest first, by how many items make each,
 * until what's left has an order), with the items behind them.
 * `level` is "project" or "initiative".
 */
export function containerLoops(g, level = "project") {
  const of = (it) => {
    const p = it?.data.project;
    return level === "project" ? p : g.get(p)?.data.initiative;
  };
  const waits = new Map(); // "a→b" → item IDs
  for (const it of g.items.filter(g.isOpen)) {
    const a = of(it);
    for (const n of g.openNeeds(it)) {
      const b = of(g.get(n));
      if (a && b && a !== b) {
        const key = `${a}→${b}`;
        waits.set(key, [...new Set([...(waits.get(key) ?? []), it.data.id])]);
      }
    }
  }
  const nodes = [...new Set([...waits.keys()].flatMap((k) => k.split("→")))];
  const out = (v, kept) =>
    [...kept.keys()]
      .filter((k) => k.startsWith(`${v}→`))
      .map((k) => k.split("→")[1]);
  // Tarjan's strongly connected components.
  const index = new Map();
  const low = new Map();
  const stack = [];
  const on = new Set();
  const groups = [];
  let next = 0;
  const strong = (v) => {
    index.set(v, next);
    low.set(v, next++);
    stack.push(v);
    on.add(v);
    for (const w of out(v, waits)) {
      if (!index.has(w)) {
        strong(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (on.has(w)) {
        low.set(v, Math.min(low.get(v), index.get(w)));
      }
    }
    if (low.get(v) === index.get(v)) {
      const group = [];
      let w;
      do {
        w = stack.pop();
        on.delete(w);
        group.push(w);
      } while (w !== v);
      if (group.length > 1) {
        groups.push(group.sort((x, y) => idNumber(x) - idNumber(y)));
      }
    }
  };
  for (const v of nodes) {
    if (!index.has(v)) {
      strong(v);
    }
  }
  return groups.map((group) => {
    const inside = new Set(group);
    const kept = new Map(
      [...waits].filter(([k]) => k.split("→").every((x) => inside.has(x))),
    );
    const reaches = (from, to, edges, seen = new Set()) =>
      from === to ||
      out(from, edges).some(
        (w) => !seen.has(w) && (seen.add(w), reaches(w, to, edges, seen)),
      );
    const ties = [];
    for (;;) {
      const onLoop = [...kept]
        .filter(([k]) => {
          const [a, b] = k.split("→");
          const rest = new Map(kept);
          rest.delete(k);
          return reaches(b, a, rest);
        })
        .sort((x, y) => x[1].length - y[1].length);
      if (!onLoop.length) {
        break;
      }
      const [k, items] = onLoop[0];
      const [from, to] = k.split("→");
      ties.push({ from, to, items });
      kept.delete(k);
    }
    return { group, ties };
  });
}
