// The work tracker: the item format, checks, views, allocation and the
// cross-branch reads (scripts/work/). The last test checks the real items.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  type ItemData,
  allocate,
  bareSectionRefs,
  buildGraph,
  checkItems,
  findClaims,
  findCollisions,
  listPlaces,
  loadPlaces,
  loadWorkTree,
  mermaidItems,
  mermaidProjects,
  parseItem,
  projectDeps,
  renderItem,
  renderLists,
  replaceBetweenMarkers,
  slugify,
  staleNames,
  takenNumbers,
} from "../scripts/work/lib.mjs";

const repoRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const W = "packages/next/work";
const temps: string[] = [];

afterEach(() => {
  for (const t of temps.splice(0)) {
    rmSync(t, { recursive: true, force: true });
  }
});

function git(cwd: string, ...args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" });
}

function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), "work-"));
  temps.push(dir);
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "user.email", "test@example.invalid");
  git(dir, "config", "user.name", "Test");
  git(dir, "config", "commit.gpgsign", "false");
  return dir;
}

const FOLDERS: Record<string, string> = {
  initiative: "initiatives",
  project: "projects",
  work: "items",
  decision: "items",
  external: "items",
};

function put(root: string, data: ItemData, body = "\nBody.\n", name?: string) {
  const file = name ?? `${data.id}-${slugify(String(data.title))}.md`;
  const path = join(root, W, FOLDERS[String(data.kind)] ?? "items", file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, renderItem(data, body));
  return path;
}

/** A small valid tracker: one initiative, one project, five items. */
function sample(root: string) {
  put(root, {
    id: "CS-1",
    title: "Renderers",
    kind: "initiative",
    status: "Planned",
    lead: "owner",
  });
  put(root, {
    id: "CS-2",
    title: "The core",
    kind: "project",
    status: "Planned",
    initiative: "CS-1",
    lead: "owner",
    milestones: ["first", "second"],
  });
  put(root, {
    id: "CS-3",
    title: "Types",
    kind: "work",
    status: "Done",
    project: "CS-2",
    milestone: "first",
  });
  put(root, {
    id: "CS-4",
    title: "Format",
    kind: "work",
    status: "Planned",
    project: "CS-2",
    needs: ["CS-3"],
  });
  put(root, {
    id: "CS-5",
    title: "Passes",
    kind: "work",
    status: "Planned",
    project: "CS-2",
    needs: ["CS-4"],
  });
  put(root, {
    id: "CS-6",
    title: "Measure first?",
    kind: "decision",
    status: "Planned",
    project: "CS-2",
    "decided-by": "owner",
    needs: ["CS-4"],
  });
  put(root, {
    id: "CS-7",
    title: "Morph factors",
    kind: "work",
    status: "Proposed",
    project: "CS-2",
    needs: ["CS-6"],
  });
}

describe("the item format", () => {
  it("reads scalars, quoted values, inline and block lists", () => {
    const { data, body, errors } = parseItem(
      '---\nid: CS-4\ntitle: "A: title"\nneeds: [CS-1, CS-2]\nmilestones:\n  - one\n  - two\n---\n\nThe body.\n',
    );
    expect(errors).toEqual([]);
    expect(data).toEqual({
      id: "CS-4",
      title: "A: title",
      needs: ["CS-1", "CS-2"],
      milestones: ["one", "two"],
    });
    expect(body).toBe("\nThe body.\n");
  });

  it("refuses block strings, anchors, aliases, tags and duplicate keys", () => {
    for (const bad of [
      "title: |",
      "title: >-",
      "title: &a x",
      "title: *a",
      "title: !!python/object x",
      "title: {a: 1}",
    ]) {
      expect(
        parseItem(`---\nid: CS-1\n${bad}\n---\n`).errors.length,
        bad,
      ).toBeGreaterThan(0);
    }
    expect(parseItem("---\nid: CS-1\nid: CS-2\n---\n").errors[0]).toMatch(
      /twice/,
    );
    expect(parseItem("no frontmatter").data).toBeNull();
  });

  it("writes frontmatter that reads back the same", () => {
    const data = {
      id: "CS-9",
      title: 'Retargeting: as a job, with # and quotes "',
      kind: "work",
      status: "Planned",
      project: "CS-2",
      needs: ["CS-3", "CS-4"],
    };
    expect(parseItem(renderItem(data, "\nx\n")).data).toEqual(data);
  });

  it("makes short ASCII slugs", () => {
    expect(slugify("The `WorldDraws` seam: extracted — as pure moves")).toBe(
      "the-worlddraws-seam-extracted-as-pure-moves",
    );
    expect(slugify("Façade")).toBe("facade");
    expect(
      slugify(`${"a".repeat(30)} ${"b".repeat(30)}`).length,
    ).toBeLessThanOrEqual(48);
  });
});

describe("checks", () => {
  it("passes a valid tracker", () => {
    const root = tempRepo();
    sample(root);
    expect(checkItems(loadWorkTree(root), { root })).toEqual([]);
  });

  it("refuses keys outside the allowlist, and names code-running keys", () => {
    const root = tempRepo();
    sample(root);
    put(root, {
      id: "CS-8",
      title: "Hook",
      kind: "work",
      status: "Planned",
      project: "CS-2",
      onStatusChange: "rm -rf ~",
    });
    put(root, {
      id: "CS-9",
      title: "Extra",
      kind: "work",
      status: "Planned",
      project: "CS-2",
      assignee: "x",
    });
    const problems = checkItems(loadWorkTree(root)).join("\n");
    expect(problems).toMatch(
      /"onStatusChange" is a key some tools run as code/,
    );
    expect(problems).toMatch(/"assignee" isn't an allowed key for a work/);
  });

  it("finds bad IDs, names, folders and missing fields", () => {
    const root = tempRepo();
    sample(root);
    put(
      root,
      {
        id: "CS-10a",
        title: "Lettered",
        kind: "work",
        status: "Planned",
        project: "CS-2",
      },
      "",
      "CS-10a.md",
    );
    put(
      root,
      {
        id: "CS-11",
        title: "Misnamed",
        kind: "work",
        status: "Planned",
        project: "CS-2",
      },
      "",
      "CS-12-misnamed.md",
    );
    put(root, {
      id: "CS-13",
      title: "Claimless",
      kind: "work",
      status: "In progress",
      project: "CS-2",
    });
    put(root, {
      id: "CS-14",
      title: "Reasonless",
      kind: "work",
      status: "Dropped",
      project: "CS-2",
    });
    put(root, {
      id: "CS-15",
      title: "Orphan",
      kind: "work",
      status: "Planned",
    });
    put(root, {
      id: "CS-16",
      title: "No party",
      kind: "external",
      status: "Planned",
      project: "CS-2",
    });
    put(root, {
      id: "CS-17",
      title: "Bad milestone",
      kind: "work",
      status: "Planned",
      project: "CS-2",
      milestone: "third",
    });
    const problems = checkItems(loadWorkTree(root)).join("\n");
    expect(problems).toMatch(/id "CS-10a" isn't CS-<n>/);
    expect(problems).toMatch(
      /CS-12-misnamed.md: file name doesn't start with its id CS-11/,
    );
    expect(problems).toMatch(/In progress needs claimed/);
    expect(problems).toMatch(/Dropped needs a reason/);
    expect(problems).toMatch(/CS-15-orphan.md: no project/);
    expect(problems).toMatch(/an external item needs party/);
    expect(problems).toMatch(
      /milestone "third" isn't one of CS-2's \(first, second\)/,
    );
  });

  it("finds duplicates, dangling and wrong-kind needs, dropped needs and cycles", () => {
    const root = tempRepo();
    sample(root);
    put(root, {
      id: "CS-4",
      title: "Second four",
      kind: "work",
      status: "Planned",
      project: "CS-2",
    });
    put(root, {
      id: "CS-20",
      title: "Dangling",
      kind: "work",
      status: "Planned",
      project: "CS-2",
      needs: ["CS-99", "CS-2"],
    });
    put(root, {
      id: "CS-21",
      title: "Gone",
      kind: "work",
      status: "Dropped",
      project: "CS-2",
      reason: "not needed",
    });
    put(root, {
      id: "CS-22",
      title: "Needs gone",
      kind: "work",
      status: "Planned",
      project: "CS-2",
      needs: ["CS-21"],
    });
    put(root, {
      id: "CS-23",
      title: "Loop a",
      kind: "work",
      status: "Planned",
      project: "CS-2",
      needs: ["CS-24"],
    });
    put(root, {
      id: "CS-24",
      title: "Loop b",
      kind: "work",
      status: "Planned",
      project: "CS-2",
      needs: ["CS-23"],
    });
    const problems = checkItems(loadWorkTree(root)).join("\n");
    expect(problems).toMatch(/CS-4: in both/);
    expect(problems).toMatch(/needs CS-99, which doesn't exist/);
    expect(problems).toMatch(/needs CS-2, a project/);
    expect(problems).toMatch(/needs CS-21, which was dropped/);
    expect(problems).toMatch(/cycle: CS-2[34] → CS-2[34] → CS-2[34]/);
  });
});

describe("views", () => {
  it("derives ready and blocked; Proposed is never ready", () => {
    const root = tempRepo();
    sample(root);
    const g = buildGraph(loadWorkTree(root));
    expect(g.items.filter(g.isReady).map((i) => i.data?.id)).toEqual(["CS-4"]);
    expect(g.items.filter(g.isBlocked).map((i) => i.data?.id)).toEqual([
      "CS-5",
      "CS-6",
      "CS-7",
    ]);
    expect(g.dependents("CS-6").map((i) => i.data?.id)).toEqual(["CS-7"]);
  });

  it("writes lists between markers, grouped by milestone", () => {
    const root = tempRepo();
    sample(root);
    const g = buildGraph(loadWorkTree(root));
    const lists = renderLists(g);
    expect(lists).toContain("### Renderers");
    expect(lists).toContain("#### The core");
    expect(lists).toContain("Milestone: first");
    expect(lists).toContain("- [x] CS-3 Types. Done.");
    expect(lists).toContain("- [ ] CS-5 Passes. Needs CS-4.");
    expect(lists).toContain(
      "- [ ] CS-6 decision: Measure first?. Needs CS-4. Decided by owner.",
    );
    expect(lists).toContain("- [?] CS-7 Morph factors. Proposed. Needs CS-6.");
    const page =
      "# Work\n\n<!-- work:lists:begin -->\nold\n<!-- work:lists:end -->\n\nAfter.\n";
    const out = replaceBetweenMarkers(page, lists);
    expect(out).toContain("CS-5 Passes");
    expect(out).not.toContain("old");
    expect(out.endsWith("<!-- work:lists:end -->\n\nAfter.\n")).toBe(true);
    expect(replaceBetweenMarkers(out, lists)).toBe(out);
    expect(() => replaceBetweenMarkers("no markers", lists)).toThrow();
  });

  it("draws item and project graphs and counts project dependencies", () => {
    const root = tempRepo();
    sample(root);
    put(root, {
      id: "CS-30",
      title: "Other",
      kind: "project",
      status: "Planned",
      initiative: "CS-1",
      lead: "owner",
    });
    put(root, {
      id: "CS-31",
      title: "Uses passes",
      kind: "work",
      status: "Planned",
      project: "CS-30",
      needs: ["CS-5", "CS-4"],
    });
    const g = buildGraph(loadWorkTree(root));
    expect(projectDeps(g)).toEqual([{ from: "CS-30", to: "CS-2", count: 2 }]);
    expect(mermaidItems(g, "CS-30")).toContain("CS_5 --> CS_31");
    expect(mermaidProjects(g)).toContain("CS_2 -->|2| CS_30");
  });
});

describe("across worktrees and branches", () => {
  it("allocates past every worktree and branch, and sees claims and collisions", () => {
    const main = tempRepo();
    sample(main);
    git(main, "add", "-A");
    git(main, "commit", "-q", "-m", "items");
    // A branch without a worktree that created CS-40 and claimed CS-5.
    git(main, "branch", "far");
    const far = join(main, "..", `${main.split("/").pop()}-far`);
    temps.push(far);
    git(main, "worktree", "add", "-q", far, "far");
    put(far, {
      id: "CS-40",
      title: "Far item",
      kind: "work",
      status: "Planned",
      project: "CS-2",
    });
    put(far, {
      id: "CS-5",
      title: "Passes",
      kind: "work",
      status: "In progress",
      project: "CS-2",
      needs: ["CS-4"],
      claimed: "session-far",
    });
    git(far, "add", "-A");
    git(far, "commit", "-q", "-m", "claim");
    git(main, "worktree", "remove", "--force", far);
    // A worktree with an uncommitted item and a second claim on CS-5.
    const near = join(main, "..", `${main.split("/").pop()}-near`);
    temps.push(near);
    git(main, "worktree", "add", "-q", "-b", "near", near);
    put(near, {
      id: "CS-41",
      title: "Near item",
      kind: "work",
      status: "Planned",
      project: "CS-2",
    });
    put(near, {
      id: "CS-5",
      title: "Passes",
      kind: "work",
      status: "In progress",
      project: "CS-2",
      needs: ["CS-4"],
      claimed: "session-near",
    });
    // And a collision: CS-41 under another name on main.
    put(main, {
      id: "CS-41",
      title: "Main item",
      kind: "work",
      status: "Planned",
      project: "CS-2",
    });

    expect(Math.max(...takenNumbers(main))).toBe(41);
    const placed = loadPlaces(main, listPlaces(main));
    const claims = findClaims(loadWorkTree(main), placed);
    expect(claims).toHaveLength(1);
    expect(claims[0]?.who.sort()).toEqual([
      "session-far on far",
      "session-near on near (worktree)",
    ]);
    expect(findCollisions(placed)).toEqual([
      {
        id: "CS-41",
        files: [
          { file: "CS-41-main-item.md", where: ["main (worktree)"] },
          { file: "CS-41-near-item.md", where: ["near (worktree)"] },
        ],
      },
    ]);

    const made = allocate(
      main,
      (n) => {
        const p = put(main, {
          id: `CS-${n}`,
          title: "New",
          kind: "work",
          status: "Planned",
          project: "CS-2",
        });
        return p.slice(main.length + 1);
      },
      (p) => rmSync(join(main, p)),
    );
    expect(made.id).toBe("CS-42");
    expect(made.path).toBe(`${W}/items/CS-42-new.md`);
  });
});

describe("stale names", () => {
  it("finds old milestone names and plan section references, not other uses", () => {
    const root = tempRepo();
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(
      join(root, "docs", "a.md"),
      [
        "# A",
        "",
        "Needs IR-5 and WF-2c, then Profiles M4a and W3.",
        "See the plan §13.41 and CESIUM2_WEBGPU_PLAN.md §6.",
        "Not stale: MIR-5, W3C, the spec's §2.4, r23, IR-ready.",
        "",
      ].join("\n"),
    );
    const hits = staleNames(root, [
      {
        name: "old",
        regex: String.raw`\b(?:IR-G?[0-9]+|WF-[0-9]+[a-d]?|W(?:[0-9]|1[01])|Profiles M[0-9]+[a-c]?)\b`,
        paths: ["docs"],
      },
      {
        name: "section",
        regex: String.raw`(?:CESIUM2_WEBGPU_PLAN(?:\.md)?|[Pp]lan) *§`,
        paths: ["docs"],
      },
    ]);
    expect(hits.map((h) => `${h.name}:${h.line}`)).toEqual([
      "old:3",
      "section:4",
    ]);
  });

  it("flags a bare section sign only where the file has no such section", () => {
    const root = tempRepo();
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(
      join(root, "docs", "own.md"),
      "# Own\n\n## 2. Two\n\nAs §2 says, and §2.1.\n",
    );
    writeFileSync(
      join(root, "docs", "other.md"),
      "# Other\n\nAs §13.43 says; clamping-1x-spec.md §5 and RFC 3339 §5.6 are fine.\n",
    );
    const hits = bareSectionRefs(root, ["docs"]);
    expect(hits.map((h) => `${h.path}:${h.name}`)).toEqual([
      "docs/other.md:bare §13.43 (no such section in this file)",
    ]);
  });
});

describe("the real items", () => {
  it("pass check", () => {
    expect(checkItems(loadWorkTree(repoRoot), { root: repoRoot })).toEqual([]);
  });
});
