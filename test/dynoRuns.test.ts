// `dyno runs`, `show` and `pin` (CS-392), on a fixture results store in a
// temporary folder: never the real one. Nothing measures.
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dispatch } from "../bench/suite/commands/dispatch.mjs";
import { pinnedRuns } from "../bench/suite/commands/runs.mjs";
import { TABLE } from "../bench/suite/commands/table.mjs";
import { planPrune } from "../bench/suite/studies.mjs";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const A = "2026-11-10T09-00-00-000Z-mac-apple";
const B = "2026-11-15T12-30-00-000Z-mac-apple";
const C = "2026-11-20T18-45-00-000Z-win-nvidia";
const OLD = "2026-10-01T08-00-00-000Z"; // a run from before ids

let results: string;
let env: Record<string, string | undefined>;

function summary(over: Json, scenes: string[]): Json {
  return {
    date: over.date,
    purpose: "dev",
    commit: "aaaaaaaaaaaa",
    branch: "main",
    baseline: "1.146.0",
    candidate: "2.0",
    validity: { valid: 2, warning: 0, invalid: 0 },
    tags: [],
    scenes: scenes.map((scene) => ({
      scene,
      scenario: "cold-orbit",
      config: "2.0",
      warnings: 0,
      metrics: { cpuMs: { median: 4.2, values: [4.1, 4.2, 4.3] } },
    })),
    ...over,
  };
}

const put = (id: string, body: Json) =>
  writeFileSync(join(results, `${id}.summary.json`), JSON.stringify(body));

beforeEach(() => {
  results = mkdtempSync(join(tmpdir(), "dyno-runs-"));
  env = { ...process.env, BENCH_RESULTS: results, DYNO_FAKE: undefined };
  put(
    A,
    summary(
      {
        id: A,
        date: "2026-11-10T09:00:00.000Z",
        commit: "1111111abc",
        tags: ["alpha"],
      },
      ["tiles", "terrain"],
    ),
  );
  put(
    B,
    summary(
      {
        id: B,
        date: "2026-11-15T12:30:00.000Z",
        commit: "2222222abc",
        item: "CS-396",
        branch: "hitld/x",
        tags: ["alpha", "sweep"],
      },
      ["tiles"],
    ),
  );
  put(
    C,
    summary(
      {
        id: C,
        date: "2026-11-20T18:45:00.000Z",
        purpose: "baseline",
        commit: "3333333abc",
        machine: "win-nvidia",
        tags: ["cold-start"],
      },
      ["viewer"],
    ),
  );
  put(
    OLD,
    summary(
      { date: "2026-10-01T08:00:00.000Z", purpose: undefined, id: undefined },
      ["tiles"],
    ),
  );
});

afterEach(() => rmSync(results, { recursive: true, force: true }));

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
const ids = (body: Json) => body.runs.map((r: Json) => r.id);

describe("dyno runs", () => {
  it("lists runs newest first, as a table by default", async () => {
    const { code, out } = await dyno("runs");
    expect(code).toBe(0);
    const lines = out.split("\n");
    expect(lines[0]).toMatch(/^id\s+date \(UTC\)\s+kind\s+purpose\s+commit/);
    expect(lines[1]).toContain(C);
    expect(lines[4]).toContain(OLD);
    expect(lines.at(-1)).toBe("4 runs");
  });

  it("reads summaries only, never a run's full record", async () => {
    // Full records that cannot be read: a listing that opened one would
    // fail or drop the run.
    for (const id of [A, B, C]) {
      const file = join(results, `${id}.json`);
      writeFileSync(file, "not json, and not for reading");
      chmodSync(file, 0o000);
    }
    try {
      const { code, body } = await json("runs");
      expect(code).toBe(0);
      expect(ids(body)).toEqual([C, B, A, OLD]);
    } finally {
      for (const id of [A, B, C]) {
        chmodSync(join(results, `${id}.json`), 0o600);
      }
    }
    const source = readFileSync(
      fileURLToPath(
        new URL("../bench/suite/commands/runs.mjs", import.meta.url),
      ),
      "utf8",
    );
    const code = source
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(code).not.toMatch(/readdirSync|\.json`/);
  });

  it("filters by kind, commit, scene, tag, pinned, dates, purpose, item and branch", async () => {
    expect(ids((await json("runs", "--kind", "coldstart")).body)).toEqual([C]);
    expect(ids((await json("runs", "--kind", "bench")).body)).toEqual([
      B,
      A,
      OLD,
    ]);
    expect(ids((await json("runs", "--commit", "2222")).body)).toEqual([B]);
    expect(ids((await json("runs", "--scene", "terrain")).body)).toEqual([A]);
    expect(ids((await json("runs", "--tag", "alpha")).body)).toEqual([B, A]);
    expect(ids((await json("runs", "--purpose", "baseline")).body)).toEqual([
      C,
      OLD,
    ]);
    expect(ids((await json("runs", "--item", "CS-396")).body)).toEqual([B]);
    expect(ids((await json("runs", "--branch", "hitld/x")).body)).toEqual([B]);
    expect(
      ids(
        (await json("runs", "--since", "2026-11-15", "--until", "2026-11-15"))
          .body,
      ),
    ).toEqual([B]);
    expect(ids((await json("runs", "--since", "2026-11-11")).body)).toEqual([
      C,
      B,
    ]);
    expect(ids((await json("runs", "--until", "2026-11-10")).body)).toEqual([
      A,
      OLD,
    ]);
    await dyno("pin", A);
    expect(ids((await json("runs", "--pinned")).body)).toEqual([A]);
    const limited = (await json("runs", "--limit", "2")).body;
    expect(ids(limited)).toEqual([C, B]);
    expect(limited.total).toBe(4);
  });

  it("refuses a bad kind, date or limit", async () => {
    expect((await dyno("runs", "--kind", "x")).code).toBe(2);
    expect((await dyno("runs", "--since", "yesterday")).code).toBe(2);
    expect((await dyno("runs", "--limit", "0")).code).toBe(2);
  });

  it("--json is stable", async () => {
    await dyno("pin", B);
    const { code, body } = await json("runs", "--limit", "2");
    expect(code).toBe(0);
    expect(body).toEqual({
      api_version: 1,
      command: "runs",
      ok: true,
      total: 4,
      runs: [
        {
          id: C,
          date: "2026-11-20T18:45:00.000Z",
          kind: "coldstart",
          purpose: "baseline",
          commit: "3333333abc",
          branch: "main",
          item: null,
          study: null,
          machine: "win-nvidia",
          scenes: ["viewer"],
          tags: ["cold-start"],
          validity: { valid: 2, warning: 0, invalid: 0 },
          note: null,
          pinned: false,
        },
        {
          id: B,
          date: "2026-11-15T12:30:00.000Z",
          kind: "bench",
          purpose: "dev",
          commit: "2222222abc",
          branch: "hitld/x",
          item: "CS-396",
          study: null,
          machine: null,
          scenes: ["tiles"],
          tags: ["alpha", "sweep"],
          validity: { valid: 2, warning: 0, invalid: 0 },
          note: null,
          pinned: true,
        },
      ],
    });
  });

  it("says so when nothing matches", async () => {
    expect((await dyno("runs", "--tag", "none")).out).toBe("no runs match");
  });
});

describe("dyno show", () => {
  it("prints one run, without measured values unless asked", async () => {
    const { code, out } = await dyno("show", B);
    expect(code).toBe(0);
    expect(out).toContain("CS-396");
    expect(out).toContain("pinned    no");
    const { body } = await json("show", B);
    expect(body).toEqual({
      api_version: 1,
      command: "show",
      ok: true,
      run: {
        id: B,
        date: "2026-11-15T12:30:00.000Z",
        purpose: "dev",
        commit: "2222222abc",
        branch: "hitld/x",
        baseline: "1.146.0",
        candidate: "2.0",
        item: "CS-396",
        validity: { valid: 2, warning: 0, invalid: 0 },
        tags: ["alpha", "sweep"],
        kind: "bench",
        scenes: ["tiles"],
        note: null,
        pinned: false,
      },
      verdict: null,
      scenes: [
        {
          scene: "tiles",
          scenario: "cold-orbit",
          config: "2.0",
          warnings: 0,
          metrics: ["cpuMs"],
        },
      ],
      values_included: false,
      report: join(results, `${B}.html`),
    });
    expect(JSON.stringify(body)).not.toContain("4.2");
    expect(JSON.stringify((await json("show", B, "--values")).body)).toContain(
      "4.2",
    );
  });

  it("refuses an unknown run, naming it", async () => {
    const { code, err } = await dyno("show", "2026-01-01T00-00-00-000Z-nope");
    expect(code).not.toBe(0);
    expect(err).toContain("2026-01-01T00-00-00-000Z-nope");
    const { body } = await json("show", "2026-01-01T00-00-00-000Z-nope");
    expect(body).toMatchObject({ ok: false });
    expect(body.message).toContain("2026-01-01T00-00-00-000Z-nope");
  });
});

describe("dyno pin", () => {
  it("pins, lists the run as pinned, and unpins", async () => {
    const pinned = await json("pin", A);
    expect(pinned.body).toEqual({
      api_version: 1,
      command: "pin",
      ok: true,
      id: A,
      pinned: true,
      changed: true,
    });
    expect((await json("show", A)).body.run.pinned).toBe(true);
    expect(
      (await json("runs")).body.runs.find((r: Json) => r.id === A).pinned,
    ).toBe(true);
    expect((await json("pin", A)).body).toMatchObject({
      pinned: true,
      changed: false,
    });
    expect((await json("pin", A, "--unpin")).body).toMatchObject({
      pinned: false,
      changed: true,
    });
    expect((await json("pin", A, "--unpin")).body).toMatchObject({
      pinned: false,
      changed: false,
    });
    expect(ids((await json("runs", "--pinned")).body)).toEqual([]);
  });

  it("refuses a run that isn't in the store, and writes nothing", async () => {
    const { code, err } = await dyno("pin", "2026-01-01T00-00-00-000Z-nope");
    expect(code).toBe(2);
    expect(err).toContain("2026-01-01T00-00-00-000Z-nope");
    expect((await dyno("pin", "../etc/passwd")).code).toBe(2);
    expect(await json("pin", "2026-01-01T00-00-00-000Z-nope")).toEqual({
      code: 2,
      body: {
        api_version: 1,
        command: "pin",
        ok: false,
        error: "usage",
        message: expect.stringContaining("2026-01-01T00-00-00-000Z-nope"),
        run: "2026-01-01T00-00-00-000Z-nope",
      },
    });
  });

  it("a pinned run survives retention", async () => {
    await dyno("pin", A);
    await dyno("pin", C);
    await dyno("pin", C, "--unpin");
    const pins = pinnedRuns(results);
    expect([...pins]).toEqual([A]);
    const plan = planPrune([A, B, C], { pinned: pins });
    expect(plan.prune).toEqual([B, C]);
    expect(plan.kept).toEqual([{ id: A, reason: "pinned" }]);
    // The pin is in pins.json, not in the run's summary.
    expect(
      JSON.parse(readFileSync(join(results, "pins.json"), "utf8")).pins[A],
    ).toHaveProperty("pinned");
    expect(
      readFileSync(join(results, `${A}.summary.json`), "utf8"),
    ).not.toContain("pinned");
  });
});

describe("a corrupt pins.json", () => {
  const pinsFile = () => join(results, "pins.json");
  const corrupt = '{"version": 1, "pins": {'; // cut off mid-write

  it("makes pin refuse and leaves the file as it was, byte for byte", async () => {
    writeFileSync(pinsFile(), corrupt);
    for (const argv of [
      ["pin", B],
      ["pin", A, "--unpin"],
    ]) {
      const { code, err } = await dyno(...argv);
      expect(code).toBe(1);
      expect(err).toContain("pins.json");
      expect(err).toContain("fix it or remove it");
    }
    const { code, body } = await json("pin", B);
    expect(code).toBe(1);
    expect(body).toMatchObject({ ok: false, error: "problem" });
    expect(readFileSync(pinsFile(), "utf8")).toBe(corrupt);
    // No temporary file was left beside it either.
    expect(readdirSync(results).filter((f) => f.endsWith(".tmp"))).toEqual([]);
  });

  it("refuses a file that parses but isn't a pins file", async () => {
    writeFileSync(pinsFile(), "[]");
    expect((await dyno("pin", B)).code).toBe(1);
    expect(readFileSync(pinsFile(), "utf8")).toBe("[]");
  });

  it("makes pinnedRuns throw, so retention can't prune pinned runs", () => {
    writeFileSync(pinsFile(), corrupt);
    expect(() => pinnedRuns(results)).toThrow(/pins\.json/);
  });

  it("still lists runs, with a warning on stderr", async () => {
    writeFileSync(pinsFile(), corrupt);
    const { code, out, err } = await dyno("runs");
    expect(code).toBe(0);
    expect(out).toContain(C);
    expect(err).toContain("pins.json");
    expect(err).toContain("warning");
    const shown = await dyno("show", B);
    expect(shown.code).toBe(0);
    expect(shown.err).toContain("warning");
    expect(readFileSync(pinsFile(), "utf8")).toBe(corrupt);
  });

  it("a missing file is still no pins, and no warning", async () => {
    expect([...pinnedRuns(results)]).toEqual([]);
    const { code, err } = await dyno("runs");
    expect(code).toBe(0);
    expect(err).toBe("");
  });
});

describe("--since and --until", () => {
  it("read an ISO time without a zone as UTC", async () => {
    // B ran at 12:30 UTC. In any machine zone, these cut at exactly 12:30 UTC.
    expect(
      ids((await json("runs", "--since", "2026-11-15T12:30:00")).body),
    ).toEqual([C, B]);
    expect(
      ids((await json("runs", "--since", "2026-11-15T12:30:01")).body),
    ).toEqual([C]);
    expect(
      ids((await json("runs", "--until", "2026-11-15T12:30:00")).body),
    ).toEqual([B, A, OLD]);
    expect(
      ids((await json("runs", "--until", "2026-11-15T12:29:59")).body),
    ).toEqual([A, OLD]);
  });

  it("refuse an empty value with exit 2, naming the flag", async () => {
    for (const flag of ["--since", "--until"]) {
      const { code, err } = await dyno("runs", flag, "");
      expect(code).toBe(2);
      expect(err).toContain(flag);
    }
  });
});

describe("help", () => {
  it("each command has help", async () => {
    for (const name of ["runs", "show", "pin"]) {
      const { code, out } = await dyno(name, "--help");
      expect(code).toBe(0);
      expect(out).toContain(`dyno ${name}:`);
      expect(out).toContain("Usage: dyno");
    }
  });
  it("an empty store lists no runs", async () => {
    mkdirSync(join(results, "empty"));
    env.BENCH_RESULTS = join(results, "empty");
    expect((await json("runs")).body).toMatchObject({ runs: [], total: 0 });
  });
});
