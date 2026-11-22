// The Since-you-last-looked view (CS-747): the board's read of what changed
// in the tracker between a point and HEAD (scripts/workBoard.mjs,
// readChanges and changesReader), and the view's model over it
// (bench/suite/workChanges.ts). The fixture is a throwaway git repository
// with one commit per kind of change.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CHANGES_REFUSED,
  type ChangesAnswer,
  ChangesRefused,
  type GitRun,
  changesReader,
  frontMatterOf,
  gitRun,
  readChanges,
} from "../scripts/workBoard.mjs";
import {
  type Change,
  type ChangeSection,
  changesInScope,
  changesOf,
  changesText,
  dayStart,
  readVisits,
  VISITS_KEY,
  withVisit,
  writeVisits,
  wordsText,
} from "../bench/suite/workChanges.ts";

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

let dir: string;
let clock = Date.parse("2026-11-10T12:00:00Z");
const git = (...args: string[]) =>
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      ...args,
    ],
    {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: new Date(clock).toISOString(),
        GIT_COMMITTER_DATE: new Date(clock).toISOString(),
      },
    },
  ).trim();

const PATHS: Record<string, string> = {};
/** Write a tracker file from its front matter and text. */
function put(id: string, fm: Record<string, string>, text = "") {
  const folder =
    fm.kind === "milestone"
      ? "milestones"
      : fm.kind === "project"
        ? "projects"
        : "items";
  const path = `packages/next/work/${folder}/${id}-x.md`;
  PATHS[id] = path;
  const lines = Object.entries({ id, ...fm }).map(([k, v]) => `${k}: ${v}`);
  const abs = join(dir, path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, `---\n${lines.join("\n")}\n---\n\n${text}\n`);
}
/** Commit everything, a day after the last commit. */
function commit(message: string) {
  clock += 86_400_000;
  git("add", "-A");
  git("commit", "-q", "-m", message);
  return git("rev-parse", "HEAD");
}

const BASE: Record<string, Record<string, string>> = {
  "CS-1": { title: "The project", kind: "project", state: "planned" },
  "CS-10": {
    title: "Milestone one",
    kind: "milestone",
    state: "planned",
    project: "CS-1",
    constraints: "[CS-20 c1, CS-21 c1, CS-23 c2]",
  },
  "CS-11": {
    title: "Milestone two",
    kind: "milestone",
    state: "planned",
    project: "CS-1",
    constraints: "[CS-22 c1]",
  },
  "CS-12": {
    title: "Milestone three",
    kind: "milestone",
    state: "planned",
    project: "CS-1",
  },
  "CS-14": {
    title: "Milestone four",
    kind: "milestone",
    state: "planned",
    project: "CS-1",
  },
  "CS-30": {
    title: "Release 2.0.0-alpha.1",
    kind: "work",
    state: "planned",
    project: "CS-1",
    needs: "[CS-10, CS-12]",
    release: "2.0.0-alpha.1",
  },
  "CS-31": {
    title: "Release 2.0.0-beta.1",
    kind: "work",
    state: "planned",
    project: "CS-1",
    needs: "[CS-30, CS-11]",
    release: "2.0.0-beta.1",
  },
  "CS-20": {
    title: "Work twenty",
    kind: "work",
    state: "planned",
    project: "CS-1",
  },
  "CS-21": {
    title: "Work twenty-one",
    kind: "work",
    state: "planned",
    project: "CS-1",
  },
  "CS-22": {
    title: "Work twenty-two",
    kind: "work",
    state: "planned",
    project: "CS-1",
  },
  "CS-23": {
    title: "Work twenty-three",
    kind: "work",
    state: "planned",
    project: "CS-1",
  },
  "CS-24": {
    title: "Work twenty-four",
    kind: "work",
    state: "in-progress",
    project: "CS-1",
  },
  "CS-40": {
    title: "Ship it or wait",
    kind: "decision",
    state: "planned",
    project: "CS-1",
    decider: "owner",
  },
};

const at: Record<string, string> = {};

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "dyno-changes-"));
  git("init", "-q", "-b", "main");
  writeFileSync(join(dir, "README.md"), "fixture\n");
  at.root = commit("root: before the tracker");
  for (const [id, fm] of Object.entries(BASE)) {
    put(id, fm, `${fm.title}. Needs nothing.`);
  }
  at.point = commit("work: the tracker as of the point");

  // Added, with a reason in its commit's body.
  put(
    "CS-25",
    {
      title: "Work twenty-five",
      kind: "work",
      state: "planned",
      project: "CS-1",
    },
    "Filed from the review: the gap it found.",
  );
  put("CS-10", {
    ...BASE["CS-10"]!,
    constraints: "[CS-20 c1, CS-21 c1, CS-23 c2, CS-25 c2]",
  });
  at.added = commit(
    "work: file CS-25\n\nCS-25 covers the gap the review found. Joins CS-10 as c2.",
  );

  // Dropped, with a reason in its record.
  put("CS-23", {
    ...BASE["CS-23"]!,
    state: "dropped",
    reason: '"Superseded by CS-25."',
  });
  at.dropped = commit("work: drop CS-23");

  // Moved between milestones (and releases: CS-10 is alpha.1's, CS-11
  // beta.1's), with no reason anywhere in its record.
  put("CS-10", {
    ...BASE["CS-10"]!,
    constraints: "[CS-20 c1, CS-23 c2, CS-25 c2]",
  });
  put("CS-11", { ...BASE["CS-11"]!, constraints: "[CS-22 c1, CS-21 c1]" });
  at.moved = commit("work: CS-21 into CS-11");

  // A decision answered, and on its answer a milestone moves from alpha.1
  // to beta.1 and another joins beta.1.
  put("CS-40", {
    ...BASE["CS-40"]!,
    state: "done",
    answer: '"A. Ship it: alpha.1 goes out smaller."',
    answered_at: "2026-11-14T00:00:00Z",
    answered_by: "owner",
    rationale: '"owner: a smaller alpha.1, sooner"',
  });
  put("CS-30", { ...BASE["CS-30"]!, needs: "[CS-10]" });
  put("CS-31", { ...BASE["CS-31"]!, needs: "[CS-30, CS-11, CS-12, CS-14]" });
  at.answered = commit(
    "work: CS-40 answered; CS-12 moves to beta.1\n\nThe owner chose A on CS-40, so CS-12 moves to beta.1 and CS-14 joins it.\n\nCo-Authored-By: Someone <x@example.invalid>",
  );

  // Merged through the queue (linear): work commits with the trailer, then the close.
  writeFileSync(join(dir, "code.txt"), "one\n");
  commit("CS-24: the work itself\n\nWork-Item: CS-24\nDispatch: D-1");
  put("CS-24", { ...BASE["CS-24"]!, state: "done" });
  // A trailer block followed by another paragraph is still read.
  at.mergedQueue = commit(
    "close: CS-24\n\nWork-Item: CS-24\n\nCo-Authored-By: Someone <x@example.invalid>",
  );

  // Merged as a merge commit from a branch.
  git("checkout", "-q", "-b", "hitld/CS-22");
  put("CS-22", { ...BASE["CS-22"]!, state: "in-progress" });
  commit("claim: CS-22\n\nWork-Item: CS-22");
  put("CS-22", { ...BASE["CS-22"]!, state: "done" });
  commit("CS-22: done\n\nWork-Item: CS-22");
  at.side = git("rev-parse", "HEAD");
  git("checkout", "-q", "main");
  clock += 86_400_000;
  git("merge", "-q", "--no-ff", "-m", "Merge CS-22", "hitld/CS-22");
  at.mergedBranch = git("rev-parse", "HEAD");

  // A proposal filed.
  put(
    "CS-26",
    { title: "Maybe later", kind: "work", state: "proposed", project: "CS-1" },
    "**Proposal.** Why now: it came up.",
  );
  at.filed = commit("work: file CS-26 as a proposal");

  // A commit after which the tracker doesn't change.
  writeFileSync(join(dir, "code.txt"), "two\n");
  at.quiet = commit("code only");
  at.head = git("rev-parse", "HEAD");
  // A commit off the branch.
  git("checkout", "-q", "-b", "elsewhere", at.point);
  writeFileSync(join(dir, "other.txt"), "x\n");
  at.elsewhere = commit("off the branch");
  git("checkout", "-q", "main");
}, 60_000);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const titles = (a: ChangesAnswer) => (id: string) =>
  a.entities.find((e) => e.id === id)?.after?.title ??
  a.entities.find((e) => e.id === id)?.before?.title ??
  BASE[id]?.title ??
  id;
const section = (v: ReturnType<typeof changesOf>, s: ChangeSection) =>
  v.sections.find((x) => x.section === s)!.changes;
const one = (list: Change[], id: string) => {
  const found = list.filter((c) => c.id === id);
  expect(found, `one change for ${id}`).toHaveLength(1);
  return found[0]!;
};

describe("frontMatterOf", () => {
  it("reads plain, quoted and listed values, and the lead of the text", () => {
    const fm = frontMatterOf(
      [
        "---",
        "id: CS-7",
        'title: "A \\"quoted\\" title: with a colon"',
        "kind: milestone",
        "constraints: [CS-1 c1, 'CS-2 c2', \"CS-3, odd\"]",
        "done_when:",
        '  - "c1: a block list, skipped"',
        "touches: [not, read]",
        "---",
        "",
        "## Heading",
        "",
        "The lead paragraph",
        "on two lines.",
        "",
        "More.",
      ].join("\n"),
    )!;
    expect(fm).toEqual({
      id: "CS-7",
      title: 'A "quoted" title: with a colon',
      kind: "milestone",
      constraints: ["CS-1 c1", "CS-2 c2", "CS-3, odd"],
      lead: "The lead paragraph on two lines.",
    });
  });

  it("reads the states written before CS-521 in human-in-the-lead's names", () => {
    expect(
      frontMatterOf("---\nid: CS-7\nstatus: In progress\n---\n")?.state,
    ).toBe("in-progress");
  });

  it("reads an answer of one letter as its option's words and the Answer section", () => {
    const text = [
      "---",
      "id: CS-8",
      "kind: decision",
      "answer: B",
      "---",
      "",
      "## Options and recommendation",
      "",
      "- **A. Wait.** For the next release.",
      "- **B. Ship it,** now.",
      "",
      "## Answer",
      "",
      "Recorded in the front matter once answered.",
    ].join("\n");
    expect(frontMatterOf(text)).toMatchObject({
      answer: "B",
      answer_option: "B. Ship it, now.",
    });
    expect(frontMatterOf(text)!.answer_note).toBeUndefined();
    const noted = frontMatterOf(
      text.replace(
        "Recorded in the front matter once answered.",
        "B, ship it (owner, 2026-11-19).",
      ),
    )!;
    expect(noted.answer_note).toBe("B, ship it (owner, 2026-11-19).");
    // The view reads the owner's words first.
    const v = changesOf({
      api_version: 3,
      point: { commit: "a".repeat(40) },
      base: {
        sha: "a".repeat(40),
        short: "aaaaaaa",
        at: "2026-11-18T00:00:00Z",
        subject: "x",
      },
      head: {
        sha: "b".repeat(40),
        short: "bbbbbbb",
        at: "2026-11-19T00:00:00Z",
        subject: "y",
      },
      base_files: 1,
      entities: [
        {
          id: "CS-8",
          path: "p",
          before: { id: "CS-8", kind: "decision", state: "planned" },
          after: { ...noted, state: "done" },
        },
      ],
      commits: [],
      work_items: {},
      truncated: false,
    });
    expect(
      v.sections.find((x) => x.section === "answered")!.changes[0]!.answer,
    ).toBe("B, ship it (owner, 2026-11-19).");
  });

  it("takes a commit's message for a change only where it speaks of it", () => {
    const ref = (sha: string) => ({
      sha,
      short: sha.slice(0, 7),
      at: "2026-11-19T00:00:00Z",
      subject: "s",
    });
    const added = (id: string) => ({
      id,
      path: id,
      after: {
        id,
        title: `T ${id}`,
        kind: "work",
        state: "planned",
        lead: `Lead of ${id}.`,
      },
    });
    const v = changesOf({
      api_version: 3,
      point: { commit: "a".repeat(40) },
      base: ref("a".repeat(40)),
      head: ref("b".repeat(40)),
      base_files: 3,
      entities: [added("CS-91"), added("CS-92"), added("CS-93")],
      commits: [
        {
          ...ref("c".repeat(40)),
          subject: "work: file three",
          body: "Filed from a review. CS-93 comes first.",
          parents: 1,
          files: ["CS-91", "CS-92", "CS-93"].map((id) => ({
            id,
            keys: ["id", "state"],
          })),
        },
      ],
      work_items: {},
      truncated: false,
    });
    const why = (id: string) =>
      v.sections
        .find((x) => x.section === "added")!
        .changes.find((c) => c.id === id)!.why;
    // The sentence that names it, else its own lead: the message's first
    // paragraph speaks for a commit of three files only where it names one.
    expect(why("CS-93")).toEqual({
      from: "commit",
      text: "CS-93 comes first.",
    });
    expect(why("CS-91")).toEqual({ from: "text", text: "Lead of CS-91." });
  });

  it("refuses a file that isn't a tracker file", () => {
    expect(frontMatterOf("no front matter")).toBeUndefined();
    expect(frontMatterOf("---\nid: ../etc\n---\n")).toBeUndefined();
  });
});

describe("readChanges: the points it takes", () => {
  it("refuses a commit or date in another form before it reaches git", async () => {
    const calls: string[][] = [];
    const run: GitRun = (root, args, input) => {
      calls.push(args);
      return gitRun(root, args, input);
    };
    for (const point of [
      { commit: "HEAD" },
      { commit: "abc" },
      { commit: "--output=/tmp/x" },
      { commit: "abcdef0;ls" },
      { date: "last week" },
      { date: "--all" },
      { date: "2026-13-45" },
    ]) {
      await expect(readChanges(dir, point, { run })).rejects.toMatchObject({
        reason: "form",
      });
    }
    // Only HEAD was read: no refused value went to git.
    expect(calls.every((a) => a.join(" ") === "rev-parse --verify HEAD")).toBe(
      true,
    );
  });

  it("refuses a commit it doesn't have, or one off this branch's history", async () => {
    await expect(
      readChanges(dir, { commit: "0123456789abcdef" }),
    ).rejects.toMatchObject({
      reason: "commit",
      message: CHANGES_REFUSED.commit,
    });
    await expect(
      readChanges(dir, { commit: at.elsewhere! }),
    ).rejects.toBeInstanceOf(ChangesRefused);
    await expect(
      readChanges(dir, { commit: at.elsewhere! }),
    ).rejects.toMatchObject({
      reason: "ancestor",
    });
  });

  it("takes a date as the last mainline commit before it", async () => {
    const before = await readChanges(dir, { date: "2026-11-01" }).catch(
      (e: ChangesRefused) => e.reason,
    );
    expect(before).toBe("date");
    const a = await readChanges(dir, {
      date: new Date(
        Date.parse("2026-11-12T12:00:00Z") + 3_600_000,
      ).toISOString(),
    });
    expect(a.base.sha).toBe(at.point);
    expect(a.head.sha).toBe(at.head);
    // A short commit and a day work too.
    const short = await readChanges(dir, { commit: at.point!.slice(0, 9) });
    expect(short.base.sha).toBe(at.point);
    expect((await readChanges(dir, { date: "2026-11-13" })).base.sha).toBe(
      at.point,
    );
  });

  it("says when the tracker began after the point", async () => {
    const a = await readChanges(dir, { commit: at.root! });
    expect(a.base_files).toBe(0);
    const v = changesOf(a);
    expect(v.began).toBe(true);
    expect(v.total).toBe(0);
    expect(changesText(v, "the start", titles(a))).toContain(
      "The tracker began after that point",
    );
  });
});

describe("what changed since the point", () => {
  let a: ChangesAnswer;
  let v: ReturnType<typeof changesOf>;
  beforeAll(async () => {
    a = await readChanges(dir, { commit: at.point! });
    v = changesOf(a, {
      title: (id) => BASE[id]?.title,
      kind: () => undefined,
      milestones: (id) => (id === "CS-21" ? ["CS-11"] : undefined),
    });
  });

  it("reads the mainline commits that change the tracker, merges against their first parent", () => {
    expect(a.commits.map((c) => c.subject)).toEqual([
      "work: file CS-26 as a proposal",
      "Merge CS-22",
      "close: CS-24",
      "work: CS-40 answered; CS-12 moves to beta.1",
      "work: CS-21 into CS-11",
      "work: drop CS-23",
      "work: file CS-25",
    ]);
    const merge = a.commits.find((c) => c.subject === "Merge CS-22")!;
    expect(merge.parents).toBe(2);
    expect(merge.files).toEqual([{ id: "CS-22", keys: ["state"] }]);
    // Trailers come apart from the message.
    expect(
      a.commits.find((c) => c.subject.startsWith("work: CS-40"))!.body,
    ).toBe(
      "The owner chose A on CS-40, so CS-12 moves to beta.1 and CS-14 joins it.\n\nCo-Authored-By: Someone <x@example.invalid>".split(
        "\n\nCo-Authored-By",
      )[0],
    );
  });

  it("an item added, with its commit's reason", () => {
    const c = one(section(v, "added"), "CS-25");
    expect(wordsText(c.what, titles(a))).toBe("Added to “Milestone one”");
    expect(c.why).toEqual({
      from: "commit",
      text: "CS-25 covers the gap the review found. Joins CS-10 as c2.",
    });
    expect(c.commit?.sha).toBe(at.added);
    // Its joining CS-10 is part of its Added row, not a move.
    expect(section(v, "moved").some((x) => x.id === "CS-25")).toBe(false);
  });

  it("an item dropped, with the reason in its record", () => {
    const c = one(section(v, "dropped"), "CS-23");
    expect(wordsText(c.what, titles(a))).toBe("Dropped, was planned");
    expect(c.why).toMatchObject({
      from: "record",
      text: "Superseded by CS-25.",
    });
    // Leaving a milestone because it was dropped isn't a move.
    expect(section(v, "moved").some((x) => x.id === "CS-23")).toBe(false);
  });

  it("an item moved between milestones and releases, with no reason in its record", () => {
    const c = one(section(v, "moved"), "CS-21");
    expect(wordsText(c.what, titles(a))).toBe(
      "Moved from “Milestone one” to “Milestone two”, from alpha.1 to beta.1",
    );
    expect(c.why).toBeUndefined();
    expect(c.commit?.subject).toBe("work: CS-21 into CS-11");
    expect(c.ids).toEqual(["CS-21", "CS-10", "CS-11"]);
  });

  it("a decision answered, with its answer and rationale", () => {
    const c = one(section(v, "answered"), "CS-40");
    expect(wordsText(c.what, titles(a))).toBe("The owner answered");
    expect(c.answer).toBe("A. Ship it: alpha.1 goes out smaller.");
    expect(c.why).toMatchObject({
      from: "record",
      text: "owner: a smaller alpha.1, sooner",
    });
  });

  it("a milestone moved between releases, and one joining a release, on the decision's answer", () => {
    const moved = one(section(v, "releases"), "CS-12");
    expect(wordsText(moved.what, titles(a))).toBe(
      "Moved from alpha.1 to beta.1",
    );
    expect(moved.why).toEqual({
      from: "decision",
      decision: "CS-40",
      text: "A. Ship it: alpha.1 goes out smaller.",
    });
    expect(moved.commit?.sha).toBe(at.answered);
    const joined = one(section(v, "releases"), "CS-14");
    expect(wordsText(joined.what, titles(a))).toBe("Joined 2.0.0-beta.1");
    expect(joined.title).toBe("Milestone four");
    // Release items themselves aren't changes when only their needs change.
    expect(
      section(v, "releases")
        .map((x) => x.id)
        .sort(),
    ).toEqual(["CS-12", "CS-14"]);
  });

  it("merges, through the queue and as a merge commit, with their commits", () => {
    const queued = one(section(v, "done"), "CS-24");
    expect(wordsText(queued.what, titles(a))).toBe("Merged");
    expect(queued.commits).toBe(2);
    expect(queued.commit?.subject).toBe("close: CS-24");
    const merged = one(section(v, "done"), "CS-22");
    expect(merged.commit).toMatchObject({
      subject: "Merge CS-22",
      merge: true,
    });
    expect(merged.commits).toBe(2); // the claim and the work, behind the merge
  });

  it("a proposal filed, apart from the plan's changes", () => {
    const c = one(section(v, "filed"), "CS-26");
    expect(c.proposed).toBe(true);
    expect(c.why).toEqual({
      from: "text",
      text: "**Proposal.** Why now: it came up.",
    });
    expect(v.total).toBe(
      v.sections.filter((x) => x.section !== "filed").flatMap((x) => x.changes)
        .length,
    );
    expect(v.total).toBe(8);
  });

  it("narrows to the scope", () => {
    const inM2 = changesInScope(v, (id) => id === "CS-11");
    // CS-21 moved into it; CS-22, merged, is in it.
    expect(inM2.sections.flatMap((x) => x.changes).map((c) => c.id)).toEqual([
      "CS-21",
      "CS-22",
    ]);
    expect(inM2.total).toBe(2);
  });

  it("copies as text with titles, never bare IDs", () => {
    const text = changesText(v, "your last visit", titles(a));
    expect(text).not.toMatch(/CS-\d/);
    expect(text).toContain(
      "What changed in the plan since your last visit: 8 changes.",
    );
    expect(text).toContain(
      "- Ship it or wait: A. Ship it: alpha.1 goes out smaller.",
    );
    expect(text).toContain("- Milestone three: moved from alpha.1 to beta.1");
    expect(text).toContain(
      "- Work twenty-one: moved from “Milestone one” to “Milestone two”, from alpha.1 to beta.1",
    );
    expect(text).toContain("1 proposal filed, not committed to yet.");
  });

  it("nothing after a point past the last tracker change", async () => {
    for (const point of [at.quiet!, at.head!]) {
      const q = changesOf(await readChanges(dir, { commit: point }));
      expect(q.commits).toBe(0);
      expect(q.total).toBe(0);
      expect(q.sections.every((x) => x.changes.length === 0)).toBe(true);
    }
    const q = changesOf(await readChanges(dir, { commit: at.quiet! }));
    expect(changesText(q, "Friday", () => "")).toBe(
      "What changed in the plan since Friday: nothing.",
    );
  });
});

describe("the read budget (CS-704's: under 3 s first, under 1 s warm)", () => {
  it("keeps a point's read while HEAD holds: warm, at most one git process", async () => {
    const calls: string[][] = [];
    const run: GitRun = (root, args, input) => {
      calls.push(args);
      return gitRun(root, args, input);
    };
    const reader = changesReader(dir, { run });
    const first = await reader.read({ commit: at.point! });
    // HEAD, the point (two), both commits, both trees, the blobs, the
    // log and the trailers: ten git processes, none of them hitld's.
    expect(calls.length).toBeLessThanOrEqual(10);
    expect(calls.map((c) => c[0])).toContain("log");
    calls.length = 0;
    await new Promise((r) => setTimeout(r, 300)); // past the shared key
    const again = await reader.read({ commit: at.point! });
    expect(again).toBe(first);
    expect(calls).toEqual([["rev-parse", "--verify", "HEAD"]]);
  });

  it("reads again once HEAD moves", async () => {
    const reader = changesReader(dir);
    const first = await reader.read({ commit: at.point! });
    put("CS-27", {
      title: "Late",
      kind: "work",
      state: "planned",
      project: "CS-1",
    });
    commit("work: file CS-27");
    await new Promise((r) => setTimeout(r, 300));
    const again = await reader.read({ commit: at.point! });
    expect(again).not.toBe(first);
    expect(again.entities.some((e) => e.id === "CS-27")).toBe(true);
    git("reset", "-q", "--hard", at.head!);
  });

  it("answers within the budget on this repository, a week back", async () => {
    const reader = changesReader(repoRoot);
    const week = new Date(Date.now() - 7 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const t0 = performance.now();
    const a = await reader.read({ date: week });
    const cold = performance.now() - t0;
    expect(cold).toBeLessThan(3000);
    const t1 = performance.now();
    expect(await reader.read({ date: week })).toBe(a);
    expect(performance.now() - t1).toBeLessThan(1000);
    // The view's model reads it in well under the budget too.
    const t2 = performance.now();
    changesOf(a);
    expect(performance.now() - t2).toBeLessThan(500);
  }, 30_000);
});

describe("visits kept in the browser", () => {
  const memory = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
    };
  };
  const refusing = {
    getItem: () => {
      throw new Error("SecurityError");
    },
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  };

  it("keeps the latest visits, newest first, one per commit", () => {
    const s = memory();
    let v = readVisits(s);
    expect(v).toEqual([]);
    v = withVisit(v, { commit: "aaaaaaa", at: "2026-11-18T10:00:00Z" });
    v = withVisit(v, { commit: "bbbbbbb", at: "2026-11-19T10:00:00Z" });
    v = withVisit(v, { commit: "aaaaaaa", at: "2026-11-20T10:00:00Z" });
    expect(writeVisits(s, v)).toBe(true);
    expect(readVisits(s)).toEqual([
      { commit: "aaaaaaa", at: "2026-11-20T10:00:00Z" },
      { commit: "bbbbbbb", at: "2026-11-19T10:00:00Z" },
    ]);
    for (let i = 0; i < 20; i++) {
      v = withVisit(v, {
        commit: `c${String(i).padStart(6, "0")}`.replace("c", "c"),
        at: "2026-11-20T10:00:00Z",
      });
    }
    expect(v.length).toBe(8);
  });

  it("reads nothing, and says it kept nothing, when the browser refuses", () => {
    expect(readVisits(refusing)).toEqual([]);
    expect(readVisits(undefined)).toEqual([]);
    expect(
      writeVisits(refusing, [
        { commit: "aaaaaaa", at: "2026-11-20T10:00:00Z" },
      ]),
    ).toBe(false);
  });

  it("ignores what it didn't write", () => {
    const s = memory();
    s.setItem(VISITS_KEY, "not json");
    expect(readVisits(s)).toEqual([]);
    s.setItem(
      VISITS_KEY,
      JSON.stringify([
        { commit: "--all", at: "x" },
        { commit: "abcdef0", at: "2026-11-20T10:00:00Z" },
      ]),
    );
    expect(readVisits(s)).toEqual([
      { commit: "abcdef0", at: "2026-11-20T10:00:00Z" },
    ]);
  });

  it("starts a chosen day at local midnight, with its zone", () => {
    expect(dayStart("2026-11-13", -480)).toBe("2026-11-13T00:00:00-08:00");
    expect(dayStart("2026-11-13", 330)).toBe("2026-11-13T00:00:00+05:30");
  });
});
