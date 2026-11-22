// The Flow view (CS-752): the board's read of the ledger, the items and the
// tracker's history (scripts/workBoard.mjs, readFlow and flowReader), and
// the view's model over it (bench/suite/workFlow.ts), one describe per
// measure group. The endpoint's fixture is a throwaway git repository
// whose commits carry separate author and committer dates, as a branch
// replayed onto main does; the model's is a hand-made answer.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type FlowAnswer,
  type FlowCommit,
  type FlowEntity,
  type FlowEvent,
  FLOW_UNREAD,
  type GitRun,
  flowEventOf,
  flowFieldsOf,
  flowPolicyOf,
  flowReader,
  gitRun,
  readFlow,
  type WorkMilestone,
} from "../scripts/workBoard.mjs";
import {
  bucketsOf,
  durationText,
  flowText,
  flowViewOf,
  mergeDecisionItems,
  tookRecommendation,
  type FlowView,
} from "../bench/suite/workFlow.ts";

const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

const H = 3_600_000;

// ------------------------------------------------------------ endpoint

let dir: string;
let authored = Date.parse("2026-11-10T08:00:00Z");
let committed = authored;
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
        GIT_AUTHOR_DATE: new Date(authored).toISOString(),
        GIT_COMMITTER_DATE: new Date(committed).toISOString(),
      },
    },
  ).trim();

function put(id: string, fm: Record<string, string>, text = "") {
  const path = join(dir, `packages/next/work/items/${id}-x.md`);
  mkdirSync(dirname(path), { recursive: true });
  const lines = Object.entries({ id, ...fm }).map(([k, v]) => `${k}: ${v}`);
  writeFileSync(path, `---\n${lines.join("\n")}\n---\n\n${text}\n`);
}
/** Commit, written at `a` and landing at `c` (hours after the start). */
function commit(message: string, a: number, c = a) {
  authored = Date.parse("2026-11-10T08:00:00Z") + a * H;
  committed = Date.parse("2026-11-10T08:00:00Z") + c * H;
  git("add", "-A");
  git("commit", "-q", "-m", message);
}

const DECISION = `## Question

Merge CS-20?

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: replay it onto main.
- B. Hold it: nothing merges.

Recommended: Merge it. Every gate passes.
`;

const LEDGER: FlowEvent[] = [
  {
    event: "run-started",
    run: "2026-11-10-1",
    at: "2026-11-10T07:00:00Z",
    max_executors: 2,
  },
];

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "dyno-work-flow-"));
  git("init", "-q", "-b", "main");
  mkdirSync(join(dir, ".human-in-the-lead"));
  writeFileSync(
    join(dir, ".human-in-the-lead", "policy.json"),
    JSON.stringify({ attention: { decisions_per_digest_max: 3 } }),
  );
  put("CS-20", {
    title: "Work twenty",
    kind: "work",
    state: "planned",
    project: "CS-1",
    estimate_tokens: "50000",
  });
  put(
    "CS-40",
    { title: "A follow-up", kind: "work", state: "proposed", project: "CS-1" },
    "Why it matters.\n\nSource: CS-20's report, relayed by orch-1. Filed: 2026-11-10.",
  );
  commit("work: file CS-20 and CS-40", 0);
  put("CS-20", {
    title: "Work twenty",
    kind: "work",
    state: "in-progress",
    project: "CS-1",
    claimed_by: "D-1",
  });
  commit(
    "claim: CS-20\n\nWork-Item: CS-20\n\nCo-Authored-By: Someone <x@example.invalid>",
    2,
    10,
  );
  put("CS-20", {
    title: "Work twenty",
    kind: "work",
    state: "done",
    project: "CS-1",
    claimed_by: "D-1",
  });
  commit(
    "CS-20: close\n\nWork-Item: CS-20\n\nCo-Authored-By: Someone <x@example.invalid>",
    5,
    10,
  );
  put(
    "CS-50",
    {
      title: "Merge CS-20, the work",
      kind: "decision",
      state: "done",
      project: "CS-1",
      decider: "owner",
      answer: '"A. Merge it: replay it onto main."',
      answered_at: "2026-11-10T17:00:00.000Z",
      answered_via: "question-tool",
      answered_by: "owner",
    },
    DECISION,
  );
  commit("work: answered A, merge CS-20", 9);
  writeFileSync(join(dir, "code.txt"), "one\n");
  commit("code: add", 11);
  git("revert", "--no-edit", "HEAD");
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("the board's Flow read (readFlow)", () => {
  it("reads the items' fields and the lines of text the measures need", async () => {
    const a = await readFlow(dir, {
      ledger: async () => ({ ok: true, events: LEDGER }),
    });
    const byId = new Map(a.entities.map((e) => [e.id, e]));
    expect(byId.get("CS-20")).toMatchObject({
      kind: "work",
      state: "done",
      claimed_by: "D-1",
    });
    expect(byId.get("CS-40")!.follows).toEqual(["CS-20"]);
    expect(byId.get("CS-50")).toMatchObject({
      door: "two-way",
      options: [
        { letter: "A", label: "Merge it" },
        { letter: "B", label: "Hold it" },
      ],
      answered_via: "question-tool",
    });
    expect(byId.get("CS-50")!.recommended).toMatch(/^Merge it/);
    expect(tookRecommendation(byId.get("CS-50")!)).toBe(true);
  });

  it("keeps both dates of each commit, and the Work-Item trailer behind Co-Authored-By", async () => {
    const a = await readFlow(dir, {
      ledger: async () => ({ ok: true, events: [] }),
    });
    expect(a.history.ok).toBe(true);
    const close = a.history.commits.find((c) => c.subject === "CS-20: close")!;
    expect(close.work_item).toBe("CS-20");
    expect(Date.parse(close.committed) - Date.parse(close.authored)).toBe(
      5 * H,
    );
    expect(close.files).toEqual([{ id: "CS-20", added: false, state: "done" }]);
    // Oldest first, the filing commit adding both files.
    expect(a.history.commits[0]!.files.map((f) => f.added)).toEqual([
      true,
      true,
    ]);
    expect(a.reverts.map((r) => r.subject)).toEqual(['Revert "code: add"']);
  });

  it("takes a band from the policy where it sets one, else hitld's default", async () => {
    const a = await readFlow(dir, {
      ledger: async () => ({ ok: true, events: [] }),
    });
    expect(a.policy.decisions_per_digest_max).toEqual({
      value: 3,
      source: "policy",
    });
    expect(a.policy.interrupts_per_day_max).toEqual({
      value: 6,
      source: "hitld default",
    });
    expect(flowPolicyOf(undefined).silence_max_hours.value).toBe(48);
  });

  it("cuts a ledger event to the fields the measures read: no notes, text, hosts or sessions", () => {
    const e = flowEventOf({
      event: "logged",
      at: "2026-11-10T08:00:00Z",
      text: "a call, in words",
      notes: "why",
      host: "a device",
      session: "orch-1",
      harness_ref: "abc",
      run: "2026-11-10-1",
    });
    expect(e).toEqual({
      event: "logged",
      at: "2026-11-10T08:00:00Z",
      run: "2026-11-10-1",
    });
    expect(
      flowEventOf({
        event: "run-started",
        at: "x",
        scope: { max_executors: 3 },
      }),
    ).toMatchObject({
      max_executors: 3,
    });
    expect(flowEventOf({ at: "x" })).toBeUndefined();
  });

  it("reads nothing but fixed front-matter keys and the text's own lines", () => {
    const fm = flowFieldsOf(
      "---\nid: CS-9\ntitle: T\nkind: work\nstate: planned\nscript: rm -rf /\n---\n\nText.\n",
    );
    expect(fm).toEqual({
      id: "CS-9",
      title: "T",
      kind: "work",
      state: "planned",
    });
    expect(flowFieldsOf("no front matter")).toBeUndefined();
  });

  it("says why when the ledger can't be read", async () => {
    const a = await readFlow(dir, {
      ledger: async () => ({ ok: false, why: FLOW_UNREAD.ledger }),
    });
    const v = flowViewOf(a);
    expect(v.byRuns).toBe(false);
    expect(v.unread[0]).toMatch(/^hitld's ledger couldn't be read/);
    expect(v.metrics.find((m) => m.id === "setup-started")!.notYet).toMatch(
      /ledger/,
    );
  });
});

describe("the read budget (CS-704's: under 3 s first, under 1 s warm)", () => {
  it("keeps the read while HEAD and the ledger hold: warm, one git process and no ledger read", async () => {
    const calls: string[][] = [];
    const run: GitRun = (root, args, input) => {
      calls.push(args);
      return gitRun(root, args, input);
    };
    let ledgerReads = 0;
    let key = "a";
    const reader = flowReader(dir, {
      run,
      ledger: async () => {
        ledgerReads++;
        return { ok: true, events: LEDGER };
      },
      ledgerKey: () => key,
    });
    const first = await reader.read();
    // HEAD (twice: the key and the commit), the tree, the blobs, the
    // history and the reverts; one ledger read.
    expect(calls.length).toBeLessThanOrEqual(6);
    expect(calls.every((c) => !c.some((x) => /[;&|`$]/.test(x)))).toBe(true);
    expect(ledgerReads).toBe(1);
    calls.length = 0;
    await new Promise((r) => setTimeout(r, 300)); // past the shared key
    expect(await reader.read()).toBe(first);
    expect(calls).toEqual([["rev-parse", "--verify", "HEAD"]]);
    expect(ledgerReads).toBe(1);
    key = "b"; // the ledger file changed
    expect(await reader.read()).not.toBe(first);
    expect(ledgerReads).toBe(2);
  });

  it("answers within the budget on this repository", async () => {
    const reader = flowReader(repoRoot);
    const t0 = performance.now();
    const a = await reader.read();
    expect(performance.now() - t0).toBeLessThan(3000);
    const t1 = performance.now();
    expect(await reader.read()).toBe(a);
    expect(performance.now() - t1).toBeLessThan(1000);
    const t2 = performance.now();
    flowViewOf(a);
    expect(performance.now() - t2).toBeLessThan(500);
  }, 30_000);
});

// --------------------------------------------------------------- model

const NOW = Date.parse("2026-11-20T12:00:00Z");
const at = (h: number) =>
  new Date(Date.parse("2026-11-16T00:00:00Z") + h * H).toISOString();
const RUNS: FlowEvent[] = [
  { event: "run-started", run: "2026-11-16-1", at: at(0), max_executors: 2 },
  { event: "run-started", run: "2026-11-18-1", at: at(48), max_executors: 2 },
];

function work(id: string, extra: Partial<FlowEntity> = {}): FlowEntity {
  return { id, title: `Title of ${id}`, kind: "work", state: "done", ...extra };
}
function decision(id: string, extra: Partial<FlowEntity> = {}): FlowEntity {
  return {
    id,
    title: `Decision ${id}`,
    kind: "decision",
    state: "done",
    decider: "owner",
    answered_by: "owner",
    options: [
      { letter: "A", label: "Merge it" },
      { letter: "B", label: "Hold it" },
    ],
    recommended: "Merge it. Every gate passes.",
    answer: "A. Merge it",
    door: "two-way",
    ...extra,
  };
}
/** An item claimed at `c`, closed at `d` and landing at `m` (hours from the start). */
function life(
  id: string,
  p: number,
  c: number,
  d: number,
  m: number,
): FlowCommit[] {
  return [
    {
      short: `p${id}`,
      authored: at(p),
      committed: at(p),
      subject: "file",
      files: [{ id, added: true, state: "planned" }],
    },
    {
      short: `c${id}`,
      authored: at(c),
      committed: at(m),
      subject: "claim",
      files: [{ id, added: false, state: "in-progress" }],
    },
    {
      short: `d${id}`,
      authored: at(d),
      committed: at(m),
      subject: "close",
      files: [{ id, added: false, state: "done" }],
    },
  ];
}
function answerOf({
  entities = [],
  commits = [],
  events = [],
  ledger = true,
  reverts = [],
  policy = {},
}: {
  entities?: FlowEntity[];
  commits?: FlowCommit[];
  events?: FlowEvent[];
  ledger?: boolean;
  reverts?: FlowAnswer["reverts"];
  policy?: Record<string, unknown>;
}): FlowAnswer {
  return {
    api_version: 3,
    read_at: new Date(NOW).toISOString(),
    head: { sha: "f".repeat(40), short: "fffffff", at: at(90), subject: "x" },
    entities,
    history: {
      ok: true,
      commits: [...commits].sort(
        (a, b) => Date.parse(a.authored) - Date.parse(b.authored),
      ),
      truncated: false,
    },
    reverts,
    ledger: ledger
      ? { ok: true, events: [...RUNS, ...events] }
      : { ok: false, why: FLOW_UNREAD.ledger },
    policy: flowPolicyOf(policy),
  };
}
const metric = (v: FlowView, id: string) => {
  const m = v.metrics.find((x) => x.id === id);
  if (!m) {
    throw new Error(`no metric ${id}`);
  }
  return m;
};
const milestone = (
  id: string,
  constraints: WorkMilestone["constraints"],
  appetite?: number,
): WorkMilestone => ({
  id,
  title: `Milestone ${id}`,
  kind: "milestone",
  learning: false,
  state: "planned",
  done_when: [],
  constraints,
  contributions: [],
  check_results: [],
  path: "",
  progress: { done: 0, total: constraints.length },
  check_due: false,
  to_shape: [],
  ...(appetite ? { appetite_tokens: appetite } : {}),
});

describe("buckets: the trends are over runs", () => {
  it("makes a bucket per run, labeled by its ID, the last running to now", () => {
    const { buckets, byRuns } = bucketsOf(RUNS, NOW);
    expect(byRuns).toBe(true);
    expect(buckets.map((b) => b.label)).toEqual(["Nov 16 #1", "Nov 18 #1"]);
    expect(buckets[1]!.end).toBe(NOW);
    expect(buckets[0]!.maxExecutors).toBe(2);
  });
  it("falls back to eight weeks without a run", () => {
    const { buckets, byRuns } = bucketsOf([], NOW);
    expect(byRuns).toBe(false);
    expect(buckets).toHaveLength(8);
  });
});

describe("cost", () => {
  const entities = [work("CS-1"), work("CS-2"), work("CS-3")];
  const commits = [
    ...life("CS-1", 1, 2, 4, 6),
    ...life("CS-2", 1, 3, 5, 50),
    ...life("CS-3", 1, 50, 52, 54),
  ];
  const events: FlowEvent[] = [
    {
      event: "dispatched",
      dispatch: "D-1",
      item: "CS-1",
      at: at(2),
      estimate_tokens: 100_000,
    },
    {
      event: "reported",
      dispatch: "D-1",
      item: "CS-1",
      at: at(4),
      tokens: 200_000,
    },
    {
      event: "verified",
      item: "CS-1",
      at: at(4.5),
      result: "fail",
      commit: "aaa",
    },
    { event: "dispatched", dispatch: "D-2", item: "CS-1", at: at(4.6) },
    {
      event: "reported",
      dispatch: "D-2",
      item: "CS-1",
      at: at(5),
      tokens: 100_000,
    },
    {
      event: "verified",
      item: "CS-1",
      at: at(5.5),
      result: "pass",
      commit: "bbb",
    },
  ];

  it("gives tokens per merged item with how many have tokens, and the rework", () => {
    const v = flowViewOf(answerOf({ entities, commits, events }), { now: NOW });
    const t = metric(v, "tokens-per-item");
    expect(t.value).toBe("300k tokens");
    expect(t.sub).toMatch(/tokens are known for 1 of 3 items merged/);
    expect(t.series.map((p) => p.v)).toEqual([300_000, undefined]);
    const r = metric(v, "rework");
    expect(r.value).toBe("1 of 2 dispatches");
    expect(r.sub).toMatch(
      /100k tokens, 33% of the tokens known · 1 failed check · 0 reverts/,
    );
  });

  it("says plainly when no merged item has tokens, and that money isn't recorded", () => {
    const v = flowViewOf(answerOf({ entities, commits }), { now: NOW });
    expect(metric(v, "tokens-per-item").notYet).toMatch(
      /None of the 3 items merged since the first run has tokens/,
    );
    expect(metric(v, "money").notYet).toMatch(/No price per token/);
    expect(metric(v, "appetite").notYet).toMatch(
      /No milestone has an appetite/,
    );
  });

  it("puts a milestone past its appetite out of band", () => {
    const v = flowViewOf(answerOf({ entities, commits, events }), {
      now: NOW,
      milestones: [milestone("CS-90", [{ id: "CS-1", clause: "c1" }], 250_000)],
    });
    const a = metric(v, "appetite");
    expect(a.out).toBe("1 milestone past its appetite");
    expect(a.refs).toEqual([{ id: "CS-90", words: "300k tokens of 250k" }]);
    expect(v.outOfBand.map((m) => m.id)).toContain("appetite");
  });
});

describe("throughput", () => {
  const entities = [
    work("CS-1"),
    work("CS-2"),
    work("CS-3"),
    work("CS-4", { state: "planned" }),
  ];
  const commits = [
    ...life("CS-1", 1, 2, 4, 6),
    ...life("CS-2", 1, 3, 5, 50),
    ...life("CS-3", 10, 50, 52, 96),
    {
      short: "p4",
      authored: at(1),
      committed: at(1),
      subject: "file",
      files: [{ id: "CS-4", added: true, state: "planned" as const }],
    },
  ];

  it("counts merges by when they landed, and the spans between the dates", () => {
    const v = flowViewOf(answerOf({ entities, commits }), { now: NOW });
    const m = metric(v, "merged");
    expect(m.series.map((p) => p.v)).toEqual([1, 2]);
    expect(m.value).toBe("3 in the last 7 days");
    expect(m.refs![0]!.id).toBe("CS-3"); // the latest first
    expect(metric(v, "claimed-done").value).toBe("2.0 h");
    expect(metric(v, "planned-claimed").value).toBe("2.0 h");
    // CS-1: 2 h, CS-2: 45 h, CS-3: 44 h.
    expect(metric(v, "done-merged").value).toBe(durationText(44 * H));
  });

  it("counts clauses once every linked item has merged, by the last one", () => {
    const v = flowViewOf(answerOf({ entities, commits }), {
      now: NOW,
      milestones: [
        milestone("CS-90", [
          { id: "CS-1", clause: "c1" },
          { id: "CS-2", clause: "c1" },
          { id: "CS-4", clause: "c2" },
          { id: "CS-3", clause: "c?" },
        ]),
      ],
    });
    const c = metric(v, "clauses");
    expect(c.sub).toBe("1 of 2 linked clauses done");
    expect(c.series.map((p) => p.v)).toEqual([0, 1]);
  });

  it("puts work in progress over the run's executor cap out of band", () => {
    const v = flowViewOf(answerOf({ entities, commits }), {
      now: NOW,
      inFlight: ["CS-4", "CS-5", "CS-6"],
    });
    const w = metric(v, "wip");
    expect(w.value).toBe("3 now");
    expect(w.band).toMatchObject({ hi: 2, source: "the run's scope" });
    expect(w.out).toBe("3 in progress, the cap is 2");
  });
});

describe("latencies", () => {
  const entities = [
    work("CS-1"),
    decision("CS-10", {
      title: "Merge CS-1, the work",
      answered_at: at(8),
      door: "two-way",
    }),
    decision("CS-11", { answered_at: at(60), door: "one-way" }),
    decision("CS-12", { state: "planned", answer: undefined }),
  ];
  const commits = [
    ...life("CS-1", 1, 2, 4, 10),
    {
      short: "a10",
      authored: at(6),
      committed: at(6),
      subject: "asked",
      files: [{ id: "CS-10", added: true, state: "planned" as const }],
    },
    {
      short: "a11",
      authored: at(50),
      committed: at(50),
      subject: "asked",
      files: [{ id: "CS-11", added: true, state: "planned" as const }],
    },
    {
      short: "a12",
      authored: at(70),
      committed: at(70),
      subject: "asked",
      files: [{ id: "CS-12", added: true, state: "planned" as const }],
    },
  ];
  const events: FlowEvent[] = [
    { event: "sent", decision: "CS-11", delivery: "now", at: at(51) },
    { event: "dispatched", dispatch: "D-1", item: "CS-1", at: at(1.9) },
    { event: "started", dispatch: "D-1", item: "CS-1", at: at(2) },
    { event: "dispatched", dispatch: "D-2", item: "CS-1", at: at(3) },
    { event: "started", dispatch: "D-2", item: "CS-1", at: at(3) },
  ];

  it("gives your decision time by door and by delivery, and the oldest open", () => {
    const v = flowViewOf(answerOf({ entities, commits, events }), { now: NOW });
    const d = metric(v, "decision-latency");
    // CS-10: 2 h; CS-11: 10 h.
    expect(d.value).toBe("6.0 h");
    expect(d.split).toEqual([
      { name: "Two-way door", n: 1, value: "2.0 h" },
      { name: "One-way door", n: 1, value: "10 h" },
      { name: "Sent now", n: 1, value: "10 h" },
      { name: "Not recorded as sent", n: 1, value: "2.0 h" },
    ]);
    expect(d.refs![0]).toMatchObject({ id: "CS-12" });
    expect(d.sub).toMatch(/1 open, the oldest asked 1\.6 days ago/);
  });

  it("times merge-ready to merged from the merge decision being asked", () => {
    const v = flowViewOf(answerOf({ entities, commits, events }), { now: NOW });
    expect(mergeDecisionItems("Merge CS-53 and CS-35, two items")).toEqual([
      "CS-53",
      "CS-35",
    ]);
    expect(metric(v, "merge-wait").value).toBe("4.0 h");
  });

  it("leaves out ledger pairs written in the same second, and says so", () => {
    const v = flowViewOf(answerOf({ entities, commits, events }), { now: NOW });
    const s = metric(v, "setup-started");
    expect(s.value).toBe("6 min");
    expect(s.sub).toMatch(/1 of 2 were recorded in the same second/);
    expect(metric(v, "check-time").notYet).toMatch(/no check durations/);
  });
});

describe("quality", () => {
  const entities = [
    work("CS-1"),
    work("CS-2"),
    work("CS-3"),
    work("CS-4", { kind: "work", state: "proposed", follows: ["CS-1"] }),
    decision("CS-10", { title: "Merge CS-2, the work", answer: "B. Hold it" }),
    decision("CS-11", { title: "Merge CS-2, again" }),
    decision("CS-12", { title: "Merge CS-3, the work" }),
  ];
  const commits = [
    ...life("CS-1", 1, 2, 4, 6),
    ...life("CS-2", 1, 3, 5, 50),
    ...life("CS-3", 1, 50, 52, 54),
    {
      short: "f4",
      authored: at(60),
      committed: at(60),
      subject: "file",
      files: [{ id: "CS-4", added: true, state: "proposed" as const }],
    },
  ];
  const events: FlowEvent[] = [
    {
      event: "dispatched",
      dispatch: "D-1",
      item: "CS-1",
      at: at(2),
      estimate_tokens: 100_000,
    },
    {
      event: "reported",
      dispatch: "D-1",
      item: "CS-1",
      at: at(4),
      tokens: 150_000,
    },
    {
      event: "verified",
      item: "CS-1",
      at: at(4.5),
      result: "fail",
      commit: "aaa",
    },
    {
      event: "verified",
      item: "CS-1",
      at: at(4.8),
      result: "pass",
      commit: "aaa",
    },
    {
      event: "verified",
      item: "CS-3",
      at: at(52),
      result: "fail",
      commit: "ccc",
    },
    {
      event: "verified",
      item: "CS-3",
      at: at(53),
      result: "pass",
      commit: "ddd",
    },
  ];

  it("counts first-pass merges from dispatches, checks and merge decisions", () => {
    const v = flowViewOf(answerOf({ entities, commits, events }), { now: NOW });
    const f = metric(v, "first-pass");
    // CS-1 failed a check, CS-2 was held once, CS-3 failed a check.
    expect(f.value).toBe("0%");
    expect(f.sub).toBe("0 of 3 items; too few to call");
  });

  it("tells a failure a rerun cleared from one a new commit fixed", () => {
    const v = flowViewOf(answerOf({ entities, commits, events }), { now: NOW });
    expect(metric(v, "check-failures").split).toEqual([
      { name: "Real: a new commit fixed it", value: "1", n: 1 },
      { name: "Passed on a rerun", value: "1", n: 1 },
    ]);
  });

  it("gives follow-ups per merged item, the estimate's accuracy and the reverts", () => {
    const v = flowViewOf(
      answerOf({
        entities,
        commits,
        events,
        reverts: [{ short: "r1", at: at(70), subject: 'Revert "x"' }],
      }),
      { now: NOW },
    );
    expect(metric(v, "follow-ups").value).toBe("0.33");
    expect(metric(v, "follow-ups").refs).toEqual([
      { id: "CS-4", words: "from CS-1" },
    ]);
    const e = metric(v, "estimates");
    expect(e.value).toBe("1.5× the estimate");
    expect(e.sub).toBe("1 item: too few to call");
    expect(metric(v, "defects").value).toBe("1 since the first run");
  });
});

describe("you and the system", () => {
  const entities = [
    decision("CS-10", { answered_at: at(2) }),
    decision("CS-11", { answered_at: at(3), answer: "B. Hold it" }),
    decision("CS-12", { answered_at: at(4), recommended: undefined }),
    decision("CS-13", {
      state: "done",
      answered_by: "default",
      answered_at: at(5),
    }),
  ];
  const commits = entities.map((e, i) => ({
    short: `a${i}`,
    authored: at(1),
    committed: at(1),
    subject: "asked",
    files: [{ id: e.id, added: true, state: "planned" as const }],
  }));
  const digest = (h: number, n: number): FlowEvent[] =>
    Array.from({ length: n }, (_, i) => ({
      event: "sent",
      decision: `CS-${100 + h * 10 + i}`,
      delivery: "digest",
      at: at(h + i / 3600),
    }));

  it("reads a recommendation taken from the decision's text", () => {
    expect(tookRecommendation(decision("CS-1"))).toBe(true);
    expect(tookRecommendation(decision("CS-1", { answer: "B. Hold it" }))).toBe(
      false,
    );
    expect(
      tookRecommendation(
        decision("CS-1", { recommended: "B, because it waits." }),
      ),
    ).toBe(false);
    expect(
      tookRecommendation(decision("CS-1", { recommended: undefined })),
    ).toBeUndefined();
    expect(
      tookRecommendation(decision("CS-1", { answer: "Something else" })),
    ).toBeUndefined();
    const v = flowViewOf(answerOf({ entities, commits }), { now: NOW });
    const r = metric(v, "took-recommendation");
    expect(r.value).toBe("50%");
    expect(r.sub).toMatch(/^1 of 2 answers/);
    expect(metric(v, "defaults").value).toBe("1 since the tracker began");
  });

  it("puts a digest over the policy's band, and a long silence, out of band", () => {
    const events = [
      ...digest(50, 4),
      ...digest(52, 2),
      { event: "logged", at: at(90) },
    ];
    const v = flowViewOf(
      answerOf({
        entities,
        commits,
        events,
        policy: { attention: { decisions_per_digest_max: 3 } },
      }),
      { now: Date.parse(at(110)) },
    );
    const d = metric(v, "per-digest");
    expect(d.value).toBe("3 a digest");
    expect(d.band).toMatchObject({ hi: 3, source: "policy" });
    expect(d.out).toBe("1 digest this run over 3");
    const s = metric(v, "digest-silence");
    expect(s.value).toBe("2.4 days");
    expect(s.out).toBe("No digest recorded for 2.4 days");
    expect(s.band!.source).toBe("hitld default");
    expect(v.outOfBand.map((m) => m.id)).toEqual([
      "per-digest",
      "digest-silence",
    ]);
  });

  it("counts interrupts in any 24 hours against the band", () => {
    const now: FlowEvent[] = Array.from({ length: 7 }, (_, i) => ({
      event: "sent",
      decision: `CS-${200 + i}`,
      delivery: "now",
      at: at(100 + i),
    }));
    const v = flowViewOf(answerOf({ entities, commits, events: now }), {
      now: Date.parse(at(108)),
    });
    const i = metric(v, "interrupts");
    expect(i.value).toBe("7 in the last 24 hours");
    expect(i.out).toBe("7 in the last 24 hours, the band is 6");
  });

  it("says that worth-asking ratings and reversals need the trust record", () => {
    const v = flowViewOf(answerOf({ entities, commits }), { now: NOW });
    expect(metric(v, "worth-asking").notYet).toMatch(/trust record/);
    expect(metric(v, "reversals").notYet).toMatch(/trust record/);
    expect(metric(v, "corrections").notYet).toMatch(/No record holds them/);
  });
});

describe("the machine", () => {
  it("counts lease expiries apart from hand-overs, and stalls", () => {
    const events: FlowEvent[] = [
      { event: "lease-released", reason: "handover", at: at(10) },
      { event: "lease-released", reason: "expired", at: at(60) },
      { event: "abandoned", item: "CS-1", dispatch: "D-1", at: at(61) },
    ];
    const v = flowViewOf(answerOf({ events }), { now: NOW });
    expect(metric(v, "leases").value).toBe("1 since the first run");
    expect(metric(v, "leases").sub).toBe("1 hand-over");
    expect(metric(v, "leases").series.map((p) => p.v)).toEqual([0, 1]);
    expect(metric(v, "stalls").value).toBe("1 since the first run");
    expect(metric(v, "contention").notYet).toMatch(/aren't recorded/);
    expect(metric(v, "refusals").notYet).toMatch(/no refusals/);
  });
});

describe("every measure", () => {
  it("has a trend per bucket, a line on what to do, or says why it can't be told", () => {
    const v = flowViewOf(
      answerOf({ entities: [work("CS-1")], commits: life("CS-1", 1, 2, 4, 6) }),
      { now: NOW },
    );
    for (const m of v.metrics) {
      if (m.notYet) {
        expect(m.notYet.length).toBeGreaterThan(10);
      } else {
        expect(m.series).toHaveLength(v.buckets.length);
        expect(m.act).toBeTruthy();
        expect(m.how).toBeTruthy();
      }
    }
  });

  it("narrows item measures to the scope, and leaves the run's measures whole", () => {
    const entities = [work("CS-1"), work("CS-2")];
    const commits = [...life("CS-1", 1, 2, 4, 6), ...life("CS-2", 1, 2, 4, 50)];
    const events: FlowEvent[] = [{ event: "logged", at: at(5) }];
    const v = flowViewOf(answerOf({ entities, commits, events }), {
      now: NOW,
      inScope: (id) => id === "CS-1",
    });
    expect(metric(v, "merged").series.map((p) => p.v)).toEqual([1, 0]);
    expect(metric(v, "calls").value).toBe("1 since the first run");
    expect(metric(v, "calls").runWide).toBe(true);
  });
});

describe("the shareable summary", () => {
  const entities = [work("CS-1"), decision("CS-10", { answered_at: at(8) })];
  const commits = [
    ...life("CS-1", 1, 2, 4, 6),
    {
      short: "a10",
      authored: at(6),
      committed: at(6),
      subject: "asked",
      files: [{ id: "CS-10", added: true, state: "planned" as const }],
    },
  ];
  const events: FlowEvent[] = [
    { event: "dispatched", dispatch: "D-7", item: "CS-1", at: at(2) },
    {
      event: "reported",
      dispatch: "D-7",
      item: "CS-1",
      at: at(4),
      tokens: 123_000,
    },
  ];
  const v = flowViewOf(answerOf({ entities, commits, events }), { now: NOW });
  const titleOf = (id: string) => `The title of item ${id.slice(3)}`;

  it("uses titles, not IDs, and holds token counts back unless allowed", () => {
    const text = flowText(v, { titleOf, asOf: "Fri, Nov 20 (commit fffffff)" });
    expect(text).toMatch(
      /^How the work is going, as of Fri, Nov 20 \(commit fffffff\):/,
    );
    expect(text).toContain("Lately: The title of item 1.");
    expect(text).not.toMatch(/CS-\d/);
    expect(text).not.toMatch(/D-7|token/i);
    const allowed = flowText(v, { titleOf, asOf: "now", tokens: true });
    expect(allowed).toContain(
      "Tokens: 123k tokens per merged item (median; known for 1 of 1).",
    );
  });

  it("names what's out of band and what can't be told yet", () => {
    const text = flowText(v, { titleOf, asOf: "now" });
    expect(text).toMatch(/Can't be told yet: .*check run time/);
    expect(text).toMatch(/- (Nothing with a band is out of it|Out of band: )/);
  });
});
