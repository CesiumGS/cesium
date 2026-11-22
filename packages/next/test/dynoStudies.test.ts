// Studies (CS-404): the file format and its validator, the commands, other
// branches, retention, `run --study` and `--hypothesis`, the computed
// verdict on fixtures, and the dev server's endpoint.
//
// Every test works in a temporary git repository and a temporary results
// store (DYNO_REPO, BENCH_RESULTS). Nothing measures: runs are fixture
// summaries in the shape summarizeRun writes.
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { request, createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EXIT, dispatch } from "../bench/suite/commands/dispatch.mjs";
import { TABLE } from "../bench/suite/commands/table.mjs";
import {
  KIND_FIELDS,
  checkAll,
  checkStudy,
  parseStudy,
  planPrune,
  serializeStudy,
  studyFile,
  studyRuns,
} from "../bench/suite/studies.mjs";
import {
  checkHealth,
  computeVerdict,
  loadEvidence,
} from "../bench/suite/studyVerdict.mjs";
import {
  MAX_STUDY_BODY,
  handleStudies,
  studiesEndpoint,
} from "../bench/suite/studiesEndpoint.mjs";
import { machineState } from "../bench/suite/telemetry.mjs";
import { gaussian, seededRandom } from "../bench/suite/studyStats.mjs";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const here = fileURLToPath(new URL("..", import.meta.url));
const dynoBin = join(here, "bench", "dyno.mjs");
const DATE = "2026-11-21";
const ID = `${DATE}-alpha-default`;
const MAC = "mac-apple";

let repo: string;
let results: string;
let env: Record<string, string | undefined>;

const git = (...args: string[]) =>
  execFileSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "dyno-studies-repo-"));
  results = mkdtempSync(join(tmpdir(), "dyno-studies-results-"));
  mkdirSync(join(repo, "packages/next/work/studies"), { recursive: true });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "test");
  git("config", "commit.gpgsign", "false");
  writeFileSync(join(repo, "README.md"), "test\n");
  git("add", "README.md");
  git("commit", "-q", "-m", "init");
  env = {
    ...process.env,
    DYNO_REPO: repo,
    BENCH_RESULTS: results,
    DYNO_FAKE: undefined,
  };
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
  rmSync(results, { recursive: true, force: true });
});

async function dyno(...argv: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await dispatch(argv, {
    table: TABLE,
    env,
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
  });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

async function json(...argv: string[]): Promise<{ code: number; body: Json }> {
  const { code, out } = await dyno(...argv, "--json");
  return { code, body: JSON.parse(out) };
}

const studyText = (id = ID) =>
  readFileSync(join(repo, "packages/next/work/studies", `${id}.md`), "utf8");

const COMPARISON = [
  "--kind",
  "comparison",
  "--item",
  "CS-396",
  "--question",
  "Does the candidate cut CPU time per tick?",
  "--hypothesis",
  "The candidate cuts CPU per tick by 5% or more without slowing settling.",
  "--baseline",
  "2.0@main",
  "--candidate",
  "2.0",
  "--primary",
  "cpuP50:lower:0.05",
  "--guardrails",
  "settleMs:0.03",
  "--noise",
  "0.04",
  "--date",
  DATE,
];

/** COMPARISON's options, with `extra`'s replacing those it names. */
function options(extra: string[]) {
  const args = [...COMPARISON];
  for (let i = 0; i < extra.length; i += 2) {
    const at = args.indexOf(extra[i]!);
    if (at >= 0) {
      args[at + 1] = extra[i + 1]!;
    } else {
      args.push(extra[i]!, extra[i + 1]!);
    }
  }
  return args;
}

const newStudy = (slug = "alpha-default", extra: string[] = []) =>
  json("study", "new", slug, ...options(extra));

interface RunFixture {
  id: string;
  study?: string;
  machine?: string;
  gain?: number;
  guardrailGain?: number;
  reps?: number;
  scenes?: string[];
  seed?: number;
  state?: Record<string, unknown> | null;
  validity?: { valid: number; warning: number; invalid: number };
  baseline?: string;
  candidate?: string;
}

/**
 * Writes a bench run's summary and record into the store: baseline and
 * candidate cells per scene, each repetition paired, the candidate's CPU
 * time lower by `gain` (a log ratio) and its settle time higher by
 * `guardrailGain`.
 */
function writeRun({
  id,
  study = ID,
  machine = MAC,
  gain = 0.06,
  guardrailGain = 0,
  reps = 8,
  scenes = ["valley", "zermatt"],
  seed = 1,
  state = {
    power: "ac",
    battery: 100,
    loadAverage: [2, 2, 2],
    thermal: "nominal",
  },
  validity,
  baseline = "2.0@main",
  candidate = "2.0",
}: RunFixture) {
  const random = seededRandom(seed);
  const cells = [];
  for (const scene of scenes) {
    const b: number[] = [];
    const c: number[] = [];
    const sb: number[] = [];
    const sc: number[] = [];
    for (let r = 0; r < reps; r++) {
      const base = 10 * Math.exp(0.02 * gaussian(random));
      b.push(base);
      c.push(base * Math.exp(-gain + 0.03 * gaussian(random)));
      const settle = 3000 * Math.exp(0.01 * gaussian(random));
      sb.push(settle);
      sc.push(settle * Math.exp(guardrailGain + 0.005 * gaussian(random)));
    }
    cells.push(
      {
        scene,
        scenario: "cold-orbit",
        config: baseline,
        metrics: { cpuP50: { values: b }, settleMs: { values: sb } },
      },
      {
        scene,
        scenario: "cold-orbit",
        config: candidate,
        metrics: { cpuP50: { values: c }, settleMs: { values: sc } },
      },
    );
  }
  const summary = {
    id,
    date: "2026-11-21T10:00:00.000Z",
    purpose: "dev",
    item: "CS-396",
    ...(study ? { study } : {}),
    machine,
    baseline,
    candidate,
    validity: validity ?? {
      valid: reps * scenes.length * 2,
      warning: 0,
      invalid: 0,
    },
    tags: [],
    scenes: cells,
  };
  writeFileSync(join(results, `${id}.summary.json`), JSON.stringify(summary));
  writeFileSync(
    join(results, `${id}.json`),
    JSON.stringify({ id, environment: state ? { machineState: state } : {} }),
  );
}

const run = (hour: number, machine = MAC) =>
  `2026-11-21T${String(hour).padStart(2, "0")}-00-00-000Z-${machine}`;

describe("the file format", () => {
  it("round-trips: writing what was read gives the same text back", async () => {
    await newStudy();
    const text = studyText();
    expect(serializeStudy(parseStudy(text))).toBe(text);
    expect(checkStudy(parseStudy(text), { file: `${ID}.md` }).errors).toEqual(
      [],
    );
  });

  it("records its kind and instruments", async () => {
    await newStudy("two-instruments", [
      "--instruments",
      "suite,images",
      "--guardrails",
      "settleMs:0.03,flipMean<=0.02",
    ]);
    const { fm } = parseStudy(studyText(`${DATE}-two-instruments`));
    expect(fm.kind).toBe("comparison");
    expect(fm.instruments).toEqual(["suite", "images"]);
    expect(fm.guardrails).toEqual(["settleMs:0.03", "flipMean<=0.02"]);
  });

  it("refuses unknown keys, a metric no instrument measures, and an override without its reason", () => {
    const base = `---\nid: ${ID}\ntitle: t\nkind: comparison\nitem: CS-1\nstatus: open\ncreated: ${DATE}\ninstruments: [suite]\nbaseline: a\ncandidate: b\nprimary: [nosuch:lower:0.05]\nguardrails: [settleMs:0.03]\nruns: 10\norder: paired-interleaved\nstopping: fixed\nnoise: 0.04\nflavor: x\n---\n\n## Question\n\nq\n`;
    const { errors } = checkStudy(parseStudy(base), { file: `${ID}.md` });
    expect(errors.join("\n")).toMatch(/unknown key flavor/);
    expect(errors.join("\n")).toMatch(
      /no instrument of this study measures "nosuch"/,
    );
    const concluded = base
      .replace(
        "flavor: x\n",
        "computed: inconclusive\noutcome: supported\nholds_for: []\ncites: []\n",
      )
      .replace("nosuch", "cpuP50")
      .replace("status: open", "status: concluded")
      .concat("\n## Hypothesis\n\nh\n\n## Verdict\n\nSupported.\n");
    expect(
      checkStudy(parseStudy(concluded), { file: `${ID}.md` }).errors.join("\n"),
    ).toMatch(/Override: /);
  });

  it("the file's name is its id, and the validator checks the files committed in this repository", () => {
    const text = `---\nid: ${ID}\n---\n`;
    expect(
      checkStudy(parseStudy(text), { file: "other.md" }).errors.join("\n"),
    ).toMatch(/the name is the id/);
    // The tracker's check runs the same validator on every committed study.
    const committed = checkAll(join(here, "..", ".."));
    for (const study of committed) {
      expect(study.errors, study.path).toEqual([]);
    }
  });
});

describe("study new asks for what its kind requires", () => {
  it("names each missing field, and writes nothing", async () => {
    for (const kind of Object.keys(KIND_FIELDS)) {
      const { code, body } = await json(
        "study",
        "new",
        `bare-${kind}`,
        "--kind",
        kind,
        "--item",
        "CS-1",
        "--question",
        "q",
        "--date",
        DATE,
      );
      expect(code, kind).toBe(EXIT.usage);
      expect(body.message, kind).toMatch(/before any run counts/);
      expect(body.missing.length, kind).toBeGreaterThan(0);
    }
    expect(readdirSync(join(repo, "packages/next/work/studies"))).toEqual([]);
  });

  it("a comparison without a primary metric, a minimum effect, guardrail margins or a sample plan is refused", async () => {
    const without = (option: string) => {
      const args = [...COMPARISON];
      const at = args.indexOf(option);
      args.splice(at, 2);
      return args;
    };
    expect(
      (await json("study", "new", "a", ...without("--primary"))).body.missing,
    ).toContain("primary");
    expect(
      (await json("study", "new", "b", ...without("--guardrails"))).body
        .missing,
    ).toContain("guardrails");
    expect(
      (await json("study", "new", "c", ...without("--noise"))).body.missing,
    ).toEqual(["noise", "runs"]);
    const noEffect = [...COMPARISON];
    noEffect[noEffect.indexOf("cpuP50:lower:0.05")] = "cpuP50:lower";
    expect((await json("study", "new", "d", ...noEffect)).body.message).toMatch(
      /primary "cpuP50:lower"/,
    );
    const noMargin = [...COMPARISON];
    noMargin[noMargin.indexOf("settleMs:0.03")] = "settleMs";
    expect((await json("study", "new", "e", ...noMargin)).body.message).toMatch(
      /guardrails "settleMs"/,
    );
  });

  it("takes the run count from the power analysis", async () => {
    await newStudy();
    // noise 0.04 against −ln(0.95) = 0.0513: 7 runs per arm.
    expect(parseStudy(studyText()).fm.runs).toBe("7");
  });

  it("refuses an id that exists on another local branch", async () => {
    git("checkout", "-q", "-b", "other");
    await newStudy();
    git("add", "packages/next/work/studies");
    git("commit", "-q", "-m", "a study");
    git("checkout", "-q", "main");
    const { code, body } = await newStudy();
    expect(code).toBe(EXIT.usage);
    expect(body.message).toMatch(/exists on other/);
  });
});

describe("a study from the CLI, start to verdict", () => {
  it("is made, run against, noted and concluded, and reads back with its evidence; each change diffs cleanly", async () => {
    expect((await newStudy()).code).toBe(EXIT.ok);
    git("add", "packages/next/work/studies");
    git("commit", "-q", "-m", "study");
    writeRun({ id: run(10), seed: 1 });
    writeRun({ id: run(11), seed: 2 });
    writeRun({ id: run(9), study: "", seed: 3 });
    expect((await json("study", "attach", ID, run(9))).body.added).toEqual([
      run(9),
    ]);
    expect(
      (
        await dyno(
          "study",
          "note",
          ID,
          "the valley settles late",
          "--date",
          DATE,
        )
      ).code,
    ).toBe(EXIT.ok);
    git("commit", "-q", "-am", "note");
    // A second note diffs as one added line.
    await dyno("study", "note", ID, "the second look agrees", "--date", DATE);
    expect(git("diff", "--numstat").trim()).toMatch(/^1\t0\t/);
    git("commit", "-q", "-am", "note 2");

    const shown = await json("study", "show", ID);
    expect(shown.code).toBe(EXIT.ok);
    expect(shown.body.evidence.map((e: Json) => e.id)).toEqual([
      run(9),
      run(10),
      run(11),
    ]);
    expect(
      shown.body.evidence.find((e: Json) => e.id === run(9)).attached,
    ).toBe(true);
    expect(shown.body.computed.outcome).toBe("supported");

    const verdict = await json(
      "study",
      "verdict",
      ID,
      "--cite",
      `${run(10)}:CPU per tick 6% lower in both scenes`,
      "--cite",
      `${run(11)}:the same on a second run`,
      "--decision",
      "CS-400",
    );
    expect(verdict.code).toBe(EXIT.ok);
    expect(verdict.body.outcome).toBe("supported");
    expect(verdict.body.computed.holds_for).toEqual([MAC]);
    const diff = git("diff", "--", `packages/next/work/studies/${ID}.md`);
    expect(diff).toMatch(/^-status: open$/m);
    expect(diff).toMatch(/^\+status: concluded$/m);
    expect(diff).not.toMatch(/^-(id|title|kind|item|primary):/m);
    const { fm, sections } = parseStudy(studyText());
    expect(fm).toMatchObject({
      status: "concluded",
      computed: "supported",
      outcome: "supported",
      decision: "CS-400",
      holds_for: [MAC],
    });
    expect(fm.cites).toEqual([run(10), run(11)]);
    expect(sections.Verdict).toMatch(
      /`2026-11-21T10-00-00-000Z-mac-apple`: CPU per tick 6% lower/,
    );
    // No milliseconds or bytes in the file: relative changes only.
    expect(sections.Verdict).not.toMatch(/\d\s?ms\b|MB\b/);
    const back = await json("study", "show", ID);
    expect(back.body.study.outcome).toBe("supported");
  });

  it("a verdict citing an invalid run warns", async () => {
    await newStudy();
    writeRun({ id: run(10) });
    writeRun({
      id: run(12),
      seed: 5,
      validity: { valid: 10, warning: 0, invalid: 6 },
    });
    const { code, body } = await json(
      "study",
      "verdict",
      ID,
      "--cite",
      `${run(12)}:its runs`,
    );
    expect(code).toBe(EXIT.ok);
    expect(body.warnings.join("\n")).toMatch(
      /2026-11-21T12-00-00-000Z-mac-apple: an invalid run/,
    );
  });

  it("a verdict citing a run not in this store warns, naming its machine", async () => {
    await newStudy();
    writeRun({ id: run(10) });
    const { body } = await json(
      "study",
      "verdict",
      ID,
      "--cite",
      `${run(13, "win-nvidia")}:elsewhere`,
    );
    expect(body.warnings.join("\n")).toMatch(
      /not in this store \(made on win-nvidia\)/,
    );
  });

  it("overriding the computed verdict needs a written reason, kept in the file", async () => {
    await newStudy();
    writeRun({ id: run(10) });
    const refused = await json(
      "study",
      "verdict",
      ID,
      "--cite",
      `${run(10)}:x`,
      "--outcome",
      "refuted",
    );
    expect(refused.code).toBe(EXIT.usage);
    expect(refused.body.message).toMatch(/--override/);
    const ok = await json(
      "study",
      "verdict",
      ID,
      "--cite",
      `${run(10)}:x`,
      "--outcome",
      "refuted",
      "--override",
      "the scenes don't represent the workload",
    );
    expect(ok.code).toBe(EXIT.ok);
    expect(parseStudy(studyText()).sections.Verdict).toMatch(
      /^Override: the scenes don't represent the workload$/m,
    );
  });

  it("abandons and reopens, saying when and why", async () => {
    await newStudy();
    await dyno(
      "study",
      "abandon",
      ID,
      "--reason",
      "superseded by CS-500",
      "--date",
      DATE,
    );
    expect(parseStudy(studyText()).fm.status).toBe("abandoned");
    await dyno(
      "study",
      "reopen",
      ID,
      "--reason",
      "CS-500 was dropped",
      "--date",
      DATE,
    );
    const { fm, sections } = parseStudy(studyText());
    expect(fm.status).toBe("open");
    expect(sections.Notes).toMatch(/Abandoned: superseded by CS-500/);
    expect(sections.Notes).toMatch(
      /Reopened \(was abandoned\): CS-500 was dropped/,
    );
  });
});

describe("studies on other branches", () => {
  it("lists a study on another local branch with its branch, read-only, and shows it", async () => {
    git("checkout", "-q", "-b", "hitld/CS-396-alpha");
    await newStudy();
    git("add", "packages/next/work/studies");
    git("commit", "-q", "-m", "a study");
    git("checkout", "-q", "main");
    expect((await json("studies")).body.studies).toEqual([]);
    const all = await json("studies", "--all-branches");
    expect(all.body.studies).toHaveLength(1);
    expect(all.body.studies[0]).toMatchObject({
      id: ID,
      branch: "hitld/CS-396-alpha",
      readOnly: true,
    });
    const shown = await json(
      "study",
      "show",
      ID,
      "--branch",
      "hitld/CS-396-alpha",
    );
    expect(shown.body.branch).toBe("hitld/CS-396-alpha");
    // Here, it says where the study is.
    const here = await json("study", "show", ID);
    expect(here.body.message).toMatch(/it is on hitld\/CS-396-alpha/);
  });

  it("studies --item --json is stable for the tracker", async () => {
    await newStudy();
    await newStudy("other", ["--item", "CS-9"]);
    const { body } = await json("studies", "--item", "CS-396");
    expect(body.studies).toHaveLength(1);
    expect(Object.keys(body.studies[0])).toEqual([
      "id",
      "title",
      "kind",
      "item",
      "status",
      "created",
      "instruments",
      "question",
      "outcome",
      "decision",
      "holds_for",
      "branch",
      "path",
      "uncommitted",
      "valid",
    ]);
    expect(body.studies[0]).toMatchObject({
      id: ID,
      kind: "comparison",
      item: "CS-396",
      status: "open",
      branch: "main",
      path: `packages/next/work/studies/${ID}.md`,
      uncommitted: true,
      valid: true,
    });
  });
});

describe("retention", () => {
  it("keeps every run a study cites or attaches, on any local branch", async () => {
    git("checkout", "-q", "-b", "elsewhere");
    await newStudy();
    writeRun({ id: run(10) });
    await json("study", "attach", ID, run(8));
    await json("study", "verdict", ID, "--cite", `${run(10)}:6% lower`);
    git("add", "packages/next/work/studies");
    git("commit", "-q", "-m", "concluded");
    git("checkout", "-q", "main");
    const cited = studyRuns(repo);
    const plan = planPrune([run(7), run(8), run(10), run(14)], {
      cited,
      pinned: new Set([run(14)]),
    });
    expect(plan.prune).toEqual([run(7)]);
    expect(plan.kept.map((k) => k.id)).toEqual([run(8), run(10), run(14)]);
    expect(plan.kept[0]!.reason).toMatch(
      /cited by 2026-11-21-alpha-default \(elsewhere\)/,
    );
  });
});

describe("runs and studies", () => {
  const suiteRun = (...args: string[]) =>
    spawnSync(process.execPath, [dynoBin, "suite", "run", ...args, "--json"], {
      cwd: here,
      env: { ...env, BENCH_RUN_LOCK: join(results, "lock.json") },
      encoding: "utf8",
    });

  it("a run with --hypothesis and no study is refused, naming study new, and creates no file", () => {
    const before = readdirSync(results);
    const out = suiteRun("--hypothesis", "faster", "--scenes", "nosuchscene");
    expect(out.status).toBe(EXIT.usage);
    expect(JSON.parse(out.stdout).message).toMatch(/dyno study new/);
    expect(readdirSync(results)).toEqual(before);
    expect(readdirSync(join(repo, "packages/next/work/studies"))).toEqual([]);
  });

  it("measure start refuses it too, before anything is queued", async () => {
    const { code, body } = await json(
      "measure",
      "start",
      "suite",
      "--hypothesis",
      "faster",
      "--fake",
    );
    expect(code).toBe(EXIT.usage);
    expect(body.message).toMatch(/dyno study new/);
  });

  it("refuses a run against a study that isn't ready: no run counts before its pre-registration", async () => {
    await newStudy();
    // A hand edit drops the guardrails' margins.
    const file = join(repo, "packages/next/work/studies", `${ID}.md`);
    writeFileSync(
      file,
      studyText().replace("guardrails: [settleMs:0.03]\n", ""),
    );
    const out = suiteRun("--study", ID, "--scenes", "nosuchscene");
    expect(out.status).toBe(EXIT.refused);
    expect(JSON.parse(out.stdout).message).toMatch(
      /without guardrails: no run counts/,
    );
  });

  it("inherits the study's item and expectations, and records an override", async () => {
    const { studyForRun, applyStudy } =
      await import("../bench/suite/commands/studies.mjs");
    await newStudy();
    const opts: Record<string, unknown> = { study: ID, baseline: "2.0@other" };
    const found = studyForRun(opts, { env, cwd: repo })!;
    const overrides = applyStudy(opts, found);
    expect(opts).toMatchObject({
      item: "CS-396",
      candidate: "2.0",
      primary: "cpuP50",
      guardrails: "settleMs",
      tolerance: "0.03",
      hypothesis: expect.stringMatching(/cuts CPU per tick/),
    });
    expect(overrides).toEqual({
      baseline: { study: "2.0@main", run: "2.0@other" },
    });
    expect(found.expectations).toMatchObject({
      id: ID,
      kind: "comparison",
      primary: ["cpuP50:lower:0.05"],
      noise: "0.04",
    });
  });
});

describe("the computed verdict", () => {
  const fmOf = async (extra: string[] = []) => {
    await newStudy("alpha-default", extra);
    return parseStudy(studyText()).fm;
  };

  it("is refuted when a guardrail fails, naming it", async () => {
    const fm = await fmOf();
    writeRun({ id: run(10), guardrailGain: 0.08 });
    const v = computeVerdict(fm, loadEvidence(fm, { results }));
    expect(v.outcome).toBe("refuted");
    expect(v.readout.join("\n")).toMatch(
      /guardrail settleMs \(margin 3\.0%\): broken/,
    );
  });

  it("is inconclusive when an instrument's runs are missing, and says what would settle it", async () => {
    const fm = await fmOf([
      "--instruments",
      "suite,images",
      "--guardrails",
      "settleMs:0.03,flipMean<=0.02",
    ]);
    writeRun({ id: run(10) });
    const v = computeVerdict(fm, loadEvidence(fm, { results }));
    expect(v.outcome).toBe("inconclusive");
    expect(v.reasons.join("\n")).toMatch(/mac-apple: no runs from images/);
    expect(v.settle).toMatch(/runs from images on mac-apple/);
  });

  it("excludes a run whose machine state fails the health bar, and says so", async () => {
    const fm = await fmOf(["--health", "power:ac,load:8,thermal:nominal"]);
    writeRun({ id: run(10) });
    writeRun({
      id: run(11),
      seed: 2,
      state: {
        power: "battery",
        battery: 60,
        loadAverage: [2, 2, 2],
        thermal: "nominal",
      },
    });
    writeRun({
      id: run(12),
      seed: 3,
      state: { power: "ac", loadAverage: [12.5, 9, 7], thermal: "nominal" },
    });
    const v = computeVerdict(fm, loadEvidence(fm, { results }));
    expect(v.excluded.map((e) => [e.id, e.reasons])).toEqual([
      [run(11), ["on battery"]],
      [run(12), ["load 12.5 above 8"]],
    ]);
    expect(v.reasons.join("\n")).toMatch(
      /excluded 2026-11-21T11-00-00-000Z-mac-apple: on battery/,
    );
    expect(v.outcome).toBe("supported");
  });

  it("keeps a run that didn't record its state, with a warning", () => {
    expect(checkHealth(undefined, ["power:ac"])).toEqual({
      ok: true,
      reasons: [],
      unknown: ["power"],
    });
  });

  it("fixed stopping decides nothing before the plan's runs are in", async () => {
    const fm = await fmOf(["--runs", "20"]);
    writeRun({ id: run(10), reps: 8 });
    const v = computeVerdict(fm, loadEvidence(fm, { results }));
    expect(v.outcome).toBe("inconclusive");
    expect(v.settle).toMatch(/12 more runs on mac-apple \(the plan's 20\)/);
  });

  it("is refuted when the effect is smaller than worth having", async () => {
    const fm = await fmOf(["--runs", "16"]);
    writeRun({ id: run(10), gain: 0, reps: 16, scenes: ["a", "b", "c", "d"] });
    const v = computeVerdict(fm, loadEvidence(fm, { results }));
    expect(v.outcome).toBe("refuted");
    expect(v.readout.join("\n")).toMatch(/no effect worth having/);
  });

  it("names the hardware it holds for, and is inconclusive when devices disagree", async () => {
    const fm = await fmOf();
    writeRun({ id: run(10) });
    writeRun({
      id: run(11, "win-nvidia"),
      machine: "win-nvidia",
      seed: 4,
      gain: -0.08,
    });
    const v = computeVerdict(fm, loadEvidence(fm, { results }));
    expect(v.outcome).toBe("inconclusive");
    expect(v.reasons.join("\n")).toMatch(
      /supported on mac-apple, refuted on win-nvidia/,
    );
  });

  it("gives the Bayesian readout and flags a scene that differs", async () => {
    const fm = await fmOf();
    writeRun({ id: run(10), scenes: ["a", "b", "c", "d", "e"] });
    writeRun({ id: run(11), scenes: ["odd"], gain: -0.3, seed: 9 });
    const v = computeVerdict(fm, loadEvidence(fm, { results }));
    const lines = v.readout.join("\n");
    expect(lines).toMatch(/P\(beats the minimum effect\) \d\.\d\d/);
    expect(lines).toMatch(/cpuP50 differs in odd\|cold-orbit/);
  });
});

describe("the machine's state", () => {
  it("reads macOS's power source, charge and thermal state, and keeps no battery id", () => {
    const outputs: Record<string, string> = {
      batt: "Now drawing from 'Battery Power'\n -InternalBattery-0 (id=1234567)\t42%; discharging; 3:10 remaining present: true",
      therm:
        "Note: No thermal warning level has been recorded\nCPU_Speed_Limit = 80",
    };
    const state = machineState({
      os: "darwin",
      run: (_f, args) => outputs[args[1]!],
      load: () => [3.14159, 2, 1],
    });
    expect(state).toEqual({
      loadAverage: [3.14, 2, 1],
      power: "battery",
      battery: 42,
      thermal: "CPU speed limited to 80%",
    });
    expect(JSON.stringify(state)).not.toMatch(/1234567/);
  });
});

describe("the dev server's endpoint", () => {
  const headers = {
    "x-dyno-study": "1",
    "content-type": "application/json",
    "sec-fetch-site": "same-origin",
  };
  const post = (
    path: string,
    body: unknown,
    extra: Record<string, string> = {},
  ) =>
    handleStudies({
      method: "POST",
      path,
      headers: { ...headers, ...extra },
      body: typeof body === "string" ? body : JSON.stringify(body),
      root: repo,
      results,
    });

  /** Every file under the repository, but git's. */
  const files = (dir = repo): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.name === ".git"
        ? []
        : d.isDirectory()
          ? files(join(dir, d.name))
          : [join(dir, d.name)],
    );

  it("reads the list and a study", async () => {
    await newStudy();
    const list = handleStudies({
      method: "GET",
      path: "/index.json",
      root: repo,
      results,
    });
    expect(list.status).toBe(200);
    expect((list.json.studies as Json[])[0]!.id).toBe(ID);
    const one = handleStudies({
      method: "GET",
      path: `/${ID}`,
      root: repo,
      results,
    });
    expect(one.status).toBe(200);
    expect(one.json).toMatchObject({ id: ID, study: { kind: "comparison" } });
    expect(
      handleStudies({
        method: "GET",
        path: `/${DATE}-nothing`,
        root: repo,
        results,
      }).status,
    ).toBe(404);
  });

  it("writes a note through the same validation", async () => {
    await newStudy();
    const out = post(`/${ID}`, { op: "note", text: "seen in Dyno" });
    expect(out.status).toBe(200);
    expect(parseStudy(studyText()).sections.Notes).toMatch(/seen in Dyno/);
  });

  it("records a verdict from Dyno that study show reads", async () => {
    await newStudy();
    writeRun({ id: run(10) });
    const out = post(`/${ID}`, {
      op: "verdict",
      cites: [{ run: run(10), showed: "6% lower" }],
      decision: "CS-400",
    });
    expect(out.status).toBe(200);
    expect((await json("study", "show", ID)).body.study).toMatchObject({
      status: "concluded",
      outcome: "supported",
    });
  });

  it("rejects a malformed or oversized body, a page that isn't Dyno's, and never writes outside work/studies/", async () => {
    await newStudy();
    const before = files().sort();
    const text = studyText();
    expect(post(`/${ID}`, "{not json").status).toBe(400);
    expect(post(`/${ID}`, "[1,2]").status).toBe(400);
    expect(post(`/${ID}`, { op: "delete" }).status).toBe(400);
    expect(post(`/${ID}`, { op: "note", text: 42 }).status).toBe(400);
    expect(post(`/${ID}`, { op: "note", text: "x".repeat(5000) }).status).toBe(
      400,
    );
    expect(
      post(`/${ID}`, { op: "note", text: "x".repeat(MAX_STUDY_BODY) }).status,
    ).toBe(413);
    expect(
      post(`/${ID}`, { op: "note", text: "x" }, { "x-dyno-study": "0" }).status,
    ).toBe(403);
    expect(
      post(
        `/${ID}`,
        { op: "note", text: "x" },
        { "sec-fetch-site": "cross-site" },
      ).status,
    ).toBe(403);
    expect(
      post(
        `/${ID}`,
        { op: "note", text: "x" },
        { origin: "http://evil.example", host: "127.0.0.1:5190" },
      ).status,
    ).toBe(403);
    expect(
      post(
        `/${ID}`,
        { op: "note", text: "x" },
        { "content-type": "text/plain" },
      ).status,
    ).toBe(415);
    for (const path of [
      "/../../../README",
      "/..%2F..%2F..%2FREADME",
      `/${DATE}-x%2F..%2F..%2Fescape`,
      "/2026-11-21-UPPER",
      "/%E0%A4%A",
      `/${DATE}-${"a".repeat(80)}`,
    ]) {
      const out = post(path, { op: "note", text: "x" });
      expect(out.status, path).toBe(400);
      expect(JSON.stringify(out.json), path).not.toMatch(
        /\/(Users|private|tmp|home)\//,
      );
    }
    // A study that doesn't exist yet isn't created by a write.
    expect(post(`/${DATE}-new-one`, { op: "note", text: "x" }).status).toBe(
      404,
    );
    expect(files().sort()).toEqual(before);
    expect(studyText()).toBe(text);
    expect(
      studyFile(join(repo, "packages/next/work/studies"), "../x"),
    ).toBeUndefined();
  });

  it("drops a body over the limit as it streams, with a 413", async () => {
    await newStudy();
    const plugin = studiesEndpoint({ root: repo, results });
    let handler: ((req: unknown, res: unknown) => void) | undefined;
    (plugin.configureServer as (s: unknown) => void)({
      middlewares: {
        use: (_prefix: string, fn: typeof handler) => (handler = fn),
      },
    });
    const server: Server = createServer((req, res) => {
      req.url = req.url!.replace(/^\/bench-results\/studies/, "");
      handler!(req, res);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    const send = (body: string) =>
      new Promise<{ status: number; text: string }>((resolve, reject) => {
        const req = request(
          {
            host: "127.0.0.1",
            port,
            method: "POST",
            path: `/bench-results/studies/${ID}`,
            headers: { ...headers, "content-length": Buffer.byteLength(body) },
          },
          (res) => {
            let text = "";
            res.on("data", (c) => (text += c));
            res.on("end", () => resolve({ status: res.statusCode!, text }));
          },
        );
        req.on("error", reject);
        req.end(body);
      });
    try {
      expect(
        (
          await send(
            JSON.stringify({
              op: "note",
              text: "y".repeat(2 * MAX_STUDY_BODY),
            }),
          )
        ).status,
      ).toBe(413);
      expect(
        (await send(JSON.stringify({ op: "note", text: "over the wire" })))
          .status,
      ).toBe(200);
    } finally {
      server.close();
    }
    expect(parseStudy(studyText()).sections.Notes).toMatch(/over the wire/);
    expect(parseStudy(studyText()).sections.Notes).not.toMatch(/yyyy/);
    expect(
      existsSync(join(repo, "packages/next/work/studies", `${ID}.md`)),
    ).toBe(true);
  });
});
