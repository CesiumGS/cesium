// The dyno command (CS-721): the dispatch, --help for every command, the
// JSON each command prints, the fake target, `serve` refusing a port someone
// else holds, the measurement worker, and the old entry points.
//
// Nothing here measures, and nothing touches the owner's servers: `serve`
// runs against a temporary servers folder and ports the tests open
// themselves, and the owner's ports are only ever refused.
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  API_VERSION,
  EXIT,
  dispatch,
  type CommandNode,
} from "../bench/suite/commands/dispatch.mjs";
import {
  readMeasurement,
  storeDirectory,
  work,
} from "../bench/suite/commands/measure.mjs";
import {
  answers,
  serverLogs,
  serverStatus,
  startServer,
  stopServer,
} from "../bench/suite/commands/serve.mjs";
import { TABLE } from "../bench/suite/commands/table.mjs";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let state: string;
let servers: string;
let env: Record<string, string | undefined>;

beforeEach(() => {
  state = mkdtempSync(join(tmpdir(), "dyno-state-"));
  servers = mkdtempSync(join(tmpdir(), "dyno-servers-"));
  env = {
    ...process.env,
    DYNO_STATE: state,
    DYNO_SERVERS: servers,
    DYNO_FAKE: undefined,
    DYNO_FAKE_STALE: undefined,
  };
});

afterEach(() => {
  rmSync(state, { recursive: true, force: true });
  rmSync(servers, { recursive: true, force: true });
});

/** Runs dyno in this process: its exit code, standard output and error. */
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

/** Runs dyno with --json and parses the one object it prints. */
async function json(...argv: string[]): Promise<{ code: number; body: Json }> {
  const { code, out } = await dyno(...argv, "--json");
  return { code, body: JSON.parse(out) };
}

/** Every command in the table, as its words. */
function leaves(
  table: Record<string, CommandNode>,
  prefix: string[] = [],
): string[][] {
  return Object.entries(table).flatMap(([name, node]) =>
    node.hidden
      ? []
      : node.children
        ? leaves(node.children, [...prefix, name])
        : [[...prefix, name]],
  );
}

describe("the dispatch", () => {
  it("lists every command in --help, with the exit codes", async () => {
    const { code, out } = await dyno("--help");
    expect(code).toBe(EXIT.ok);
    for (const name of Object.keys(TABLE)) {
      expect(out).toContain(`  ${name}`);
    }
    expect(out).toMatch(
      /Exit codes: 0 ok; 1 .*; 2 usage.*; 3 not built.*; 4 refused/,
    );
  });

  it.each(leaves(TABLE).map((words) => [words.join(" "), words]))(
    "dyno %s --help says what it does and takes",
    async (_, words) => {
      const { code, out } = await dyno(...(words as string[]), "--help");
      expect(code).toBe(EXIT.ok);
      expect(out).toMatch(new RegExp(`^dyno ${words.join(" ")}: `));
      expect(out).toMatch(/Usage: /);
    },
  );

  it("gives --help as JSON too", async () => {
    const { code, body } = await json("serve", "--help");
    expect(code).toBe(EXIT.ok);
    expect(body.api_version).toBe(API_VERSION);
    expect(body.help.map((c: Json) => c.command)).toEqual([
      "serve start",
      "serve stop",
      "serve status",
      "serve logs",
    ]);
  });

  it("fails on anything unclear, with exit 2, and never prompts", async () => {
    expect((await dyno()).code).toBe(EXIT.usage);
    expect((await dyno("nonsense")).err).toMatch(/unknown command nonsense/);
    expect((await dyno("serve")).err).toMatch(
      /which one\? start, stop, status, logs/,
    );
    expect((await dyno("status", "--verbose")).err).toMatch(
      /unknown option --verbose/,
    );
    expect((await dyno("serve", "start")).err).toMatch(/missing <server>/);
    expect((await dyno("serve", "start", "vite")).err).toMatch(
      /one of dyno, handbook/,
    );
    expect((await dyno("status", "extra")).err).toMatch(
      /unexpected argument extra/,
    );
    expect((await dyno("serve", "start", "dyno", "--port")).err).toMatch(
      /needs a value/,
    );
    expect((await dyno("serve", "start", "dyno", "--port=4106")).err).toMatch(
      /after a space/,
    );
    for (const argv of [[], ["nonsense"], ["serve"], ["status", "--verbose"]]) {
      expect((await dyno(...argv)).code).toBe(EXIT.usage);
    }
    const { code, body } = await json("status", "--verbose");
    expect(code).toBe(EXIT.usage);
    expect(body).toMatchObject({
      api_version: API_VERSION,
      ok: false,
      error: "usage",
    });
  });

  it("refuses a suite option it doesn't know, before the suite runs", async () => {
    const { code, err } = await dyno(
      "suite",
      "run",
      "--scenes",
      "x",
      "--bogus",
    );
    expect(code).toBe(EXIT.usage);
    expect(err).toMatch(/unknown option --bogus/);
  });

  it("says a planned command is planned, with exit 3 and its item", async () => {
    const { code, body } = await json("study", "list");
    expect(code).toBe(EXIT["not-built"]);
    expect(body).toMatchObject({
      ok: false,
      error: "not-built",
      item: "CS-404",
    });
    for (const words of [
      ["device"],
      ["runner"],
      ["store"],
      ["result", "pin"],
    ]) {
      expect((await dyno(...words)).code).toBe(EXIT["not-built"]);
    }
  });
});

describe("each command's JSON", () => {
  it("capabilities: every command with its state, the targets, states and exit codes", async () => {
    const { code, body } = await json("capabilities");
    expect(code).toBe(EXIT.ok);
    expect(body).toMatchObject({
      api_version: API_VERSION,
      command: "capabilities",
      ok: true,
      states: ["busy", "waiting-for-quiet", "quiet"],
      measurement_kinds: ["suite", "images", "coldstart", "lab"],
    });
    const commands = new Map(body.commands.map((c: Json) => [c.command, c]));
    for (const words of leaves(TABLE)) {
      expect(commands.has(words.join(" ")), words.join(" ")).toBe(true);
    }
    expect(commands.get("measure start")).toMatchObject({ state: "built" });
    expect(commands.get("study")).toMatchObject({
      state: "planned",
      item: "CS-404",
    });
    expect(body.targets.map((t: Json) => t.id)).toEqual(["local", "fake"]);
    expect(body.completion_record.fields).toContain("handle");
    expect(Object.keys(body.exit_codes)).toEqual(["0", "1", "2", "3", "4"]);
  });

  it("status: the three-state machine, who measures, whether measuring is allowed", async () => {
    const { code, body } = await json("status", "--fake");
    expect(code).toBe(EXIT.ok);
    expect(body).toMatchObject({
      api_version: API_VERSION,
      command: "status",
      ok: true,
      target: "fake",
      state: "quiet",
      current: null,
      waiting: [],
      targets: [{ id: "fake", state: "quiet" }],
      measure: { allowed: true, reasons: [] },
    });
    expect(body.machine).toMatchObject({ quiet_enough: true, power: "ac" });
    expect(body.data).toEqual({ out_of_date: [], missing: [] });
  });

  it("status on this machine has the same shape", async () => {
    const { code, body } = await json("status");
    expect(code).toBe(EXIT.ok);
    expect(["busy", "waiting-for-quiet", "quiet"]).toContain(body.state);
    expect(body.machine.load).toHaveProperty("cores");
    expect(typeof body.measure.allowed).toBe("boolean");
  });

  it("data status: each dataset, its format and its fix; exit 1 when one is out of date", async () => {
    const current = await json("data", "status", "--fake");
    expect(current.code).toBe(EXIT.ok);
    expect(current.body.datasets).toHaveLength(8);
    expect(current.body.datasets[0]).toEqual({
      name: "sky",
      label: "sky pack",
      state: "current",
      found: 2,
      expected: 2,
      fix: "npm run sky -- build",
    });
    env.DYNO_FAKE_STALE = "sky";
    const stale = await json("data", "status", "--fake");
    expect(stale.code).toBe(EXIT.problem);
    expect(stale.body.out_of_date).toEqual(["sky"]);
    expect(stale.body.datasets[0].message).toMatch(
      /sky pack: out of date, run `npm run sky -- build`/,
    );
    // And measuring is refused, naming the dataset and the fix.
    const status = await json("status", "--fake");
    expect(status.body.measure.allowed).toBe(false);
    expect(status.body.measure.reasons[0]).toMatch(/sky pack/);
    const start = await json("measure", "start", "suite", "--fake");
    expect(start.code).toBe(EXIT.refused);
    expect(start.body).toMatchObject({
      error: "refused",
      out_of_date: ["sky"],
    });
    expect(start.body.message).toMatch(/npm run sky -- build/);
  });

  it("data status on this machine reads setup's records", async () => {
    const { code, body } = await json("data", "status");
    expect([EXIT.ok, EXIT.problem]).toContain(code);
    expect(body.datasets.map((d: Json) => d.name)).toEqual([
      "sky",
      "frames",
      "designTiles",
      "smlib",
      "occt",
      "slangc",
      "slangWasm",
      "step",
    ]);
  });

  it("storage status: each store's path, size and files", async () => {
    const { code, body } = await json("storage", "status", "--fake");
    expect(code).toBe(EXIT.ok);
    expect(body.stores.map((s: Json) => s.name)).toEqual([
      "results",
      "datasets",
      "servers",
      "measurements",
    ]);
    expect(body.stores[0]).toMatchObject({
      exists: true,
      bytes: 1000,
      files: 1,
    });
  });

  it("suite list: the catalog", async () => {
    const { code, body } = await json("suite", "list");
    expect(code).toBe(EXIT.ok);
    expect(body.scenes.length).toBeGreaterThan(0);
    expect(body.scenes[0]).toHaveProperty("id");
    expect(body.tiers.map((t: Json) => t.id)).toContain("quick");
  });

  it("lab --list: the harnesses", async () => {
    const { code, body } = await json("lab", "--list");
    expect(code).toBe(EXIT.ok);
    expect(body.suites).toContain("baseline");
    expect((await dyno("lab", "no-such-suite")).code).toBe(EXIT.usage);
  });

  it("serve status: the servers on record", async () => {
    const { code, body } = await json("serve", "status");
    expect(code).toBe(EXIT.ok);
    expect(body).toMatchObject({ directory: servers, servers: [] });
  });
});

describe("the fake target", () => {
  it("runs a measurement deterministically: start, poll, done, with a completion record", async () => {
    const start = await json(
      "measure",
      "start",
      "suite",
      "--tier",
      "quick",
      "--caller",
      "hitld",
      "--fake-wait",
      "1",
      "--fake",
    );
    expect(start.code).toBe(EXIT.ok);
    expect(start.body).toMatchObject({
      handle: "fake-0001",
      kind: "suite",
      args: ["--tier", "quick"],
      target: "fake",
      state: "waiting-for-quiet",
      requested_by: { via: "caller", caller: "hitld" },
      requested: "2026-01-01T00:01:00.000Z",
      completion: null,
    });
    const waiting = await json("status", "--fake");
    expect(waiting.body.state).toBe("waiting-for-quiet");
    expect(waiting.body.waiting[0]).toMatchObject({
      handle: "fake-0001",
      caller: "hitld",
    });

    const states = [];
    for (let i = 0; i < 3; i++) {
      states.push(
        (await json("measure", "status", "fake-0001", "--fake")).body.state,
      );
    }
    expect(states).toEqual(["running", "running", "done"]);
    const busy = await json("measure", "start", "lab", "precision", "--fake");
    expect(busy.body.state).toBe("running");
    expect((await json("status", "--fake")).body).toMatchObject({
      state: "busy",
      current: { handle: "fake-0002", via: "cli" },
    });

    const done = (await json("measure", "status", "fake-0001", "--fake")).body;
    expect(done.completion).toMatchObject({
      api_version: API_VERSION,
      event: "measurement-finished",
      handle: "fake-0001",
      state: "done",
      run_id: "fake-run-0001",
      exit_code: 0,
      duration_s: 120,
    });
    const events = readFileSync(
      join(storeDirectory({ env, fake: true }), "events.jsonl"),
      "utf8",
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events).toEqual([done.completion]);
  });

  it("gives the same result for the same request", async () => {
    await dyno("measure", "start", "suite", "--tier", "quick", "--fake");
    await dyno("measure", "status", "fake-0001", "--fake");
    await dyno("measure", "status", "fake-0001", "--fake");
    const first = (await json("result", "show", "fake-run-0001", "--fake"))
      .body;
    rmSync(state, { recursive: true, force: true });
    mkdirSync(state);
    await dyno("measure", "start", "suite", "--tier", "quick", "--fake");
    await dyno("measure", "status", "fake-0001", "--fake");
    await dyno("measure", "status", "fake-0001", "--fake");
    expect(
      (await json("result", "show", "fake-run-0001", "--fake")).body,
    ).toEqual(first);
  });

  it("shows no measured values without --values", async () => {
    await dyno("measure", "start", "suite", "--fake", "--fake-steps", "1");
    await dyno("measure", "status", "fake-0001", "--fake");
    const plain = (await json("result", "show", "fake-run-0001", "--fake"))
      .body;
    expect(plain.values_included).toBe(false);
    expect(plain.metrics.cpuP50).not.toHaveProperty("values");
    expect(plain.metrics.cpuP50).toHaveProperty("ratio");
    const full = (
      await json("result", "show", "fake-run-0001", "--fake", "--values")
    ).body;
    expect(full.metrics.cpuP50.values).toHaveProperty("baseline_ms");
    const list = (await json("result", "list", "--fake")).body;
    expect(list.runs.map((r: Json) => r.id)).toEqual(["fake-run-0001"]);
  });

  it("cancels, fails, and queues one measurement behind another", async () => {
    await dyno("measure", "start", "suite", "--fake", "--fake-steps", "5");
    const queued = await json(
      "measure",
      "start",
      "images",
      "--fake",
      "--fake-outcome",
      "failed",
      "--fake-steps",
      "1",
    );
    expect(queued.body.state).toBe("queued");
    const cancel = await json("measure", "cancel", "fake-0001", "--fake");
    expect(cancel.body).toMatchObject({ canceled: true, state: "canceled" });
    expect(cancel.body.completion.state).toBe("canceled");
    expect(
      (await json("measure", "status", "fake-0002", "--fake")).body,
    ).toMatchObject({
      state: "failed",
      completion: { exit_code: 1, run_id: null },
    });
    const again = await json("measure", "cancel", "fake-0001", "--fake");
    expect(again.body.canceled).toBe(false);
    const list = (await json("measure", "list", "--fake")).body;
    expect(list.measurements.map((m: Json) => m.state)).toEqual([
      "canceled",
      "failed",
    ]);
  });

  it("refuses with --no-queue when the target isn't quiet, and says when there is no such measurement", async () => {
    await dyno("measure", "start", "suite", "--fake");
    const refused = await json(
      "measure",
      "start",
      "suite",
      "--no-queue",
      "--fake",
    );
    expect(refused.code).toBe(EXIT.refused);
    expect(refused.body.state).toBe("busy");
    expect((await json("measure", "status", "fake-9999", "--fake")).code).toBe(
      EXIT.problem,
    );
    expect(
      (await dyno("measure", "start", "suite", "--fake-wait", "1")).err,
    ).toMatch(/are for --fake/);
    expect(
      (await dyno("measure", "start", "lab", "--tier", "quick", "--fake")).code,
    ).toBe(EXIT.usage);
  });
});

describe("the local measurement worker", () => {
  const record = (handle: string) => ({
    api_version: 1,
    handle,
    kind: "suite",
    args: ["--tier", "quick"],
    target: "local",
    requested_by: { via: "caller", caller: "hitld" },
    requested: new Date().toISOString(),
    state: "queued",
  });

  function put(handle: string) {
    const dir = join(state, "measurements");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${handle}.json`), JSON.stringify(record(handle)));
  }

  it("waits for quiet, runs the dyno command, and writes the completion record", async () => {
    put("m-test");
    let polls = 0;
    const seen: string[] = [];
    const done = await work({
      handle: "m-test",
      env,
      pollMs: 1,
      log: () => {},
      quiet: () => {
        seen.push(readMeasurement(state, "m-test").state);
        polls++;
        return polls < 3
          ? { quiet: false, reasons: ["load 9 on 8 cores"] }
          : { quiet: true, reasons: [] };
      },
      runCommand: async (r) => {
        expect(r.state).toBe("running");
        return {
          code: 0,
          answer: { ok: true, run_id: "2026-11-20T00-00-00-000Z-mac-apple" },
        };
      },
    });
    expect(seen).toEqual(["queued", "waiting-for-quiet", "waiting-for-quiet"]);
    expect(done.state).toBe("done");
    expect(done.completion).toMatchObject({
      state: "done",
      run_id: "2026-11-20T00-00-00-000Z-mac-apple",
      requested_by: { via: "caller", caller: "hitld" },
    });
    expect(readFileSync(join(state, "events.jsonl"), "utf8")).toContain(
      '"handle":"m-test"',
    );
  });

  it("says failed when its command does, and stops when canceled while waiting", async () => {
    put("m-fail");
    const failed = await work({
      handle: "m-fail",
      env,
      log: () => {},
      quiet: () => ({ quiet: true, reasons: [] }),
      runCommand: async () => ({ code: 1, answer: { ok: false } }),
    });
    expect(failed).toMatchObject({ state: "failed", exit_code: 1 });

    put("m-cancel");
    let n = 0;
    const canceled = await work({
      handle: "m-cancel",
      env,
      pollMs: 1,
      log: () => {},
      quiet: () => {
        if (n++ === 1) {
          // Another process cancels it while it waits.
          spawnSync(
            process.execPath,
            [dynoBin, "measure", "cancel", "m-cancel"],
            { env, encoding: "utf8" },
          );
        }
        return { quiet: false, others: true, reasons: [] };
      },
      runCommand: async () => {
        throw new Error("a canceled measurement never runs");
      },
    });
    expect(canceled.state).toBe("canceled");
  });
});

const dynoBin = fileURLToPath(new URL("../bench/dyno.mjs", import.meta.url));

describe("serve", () => {
  /** A port a listener of this test's own holds. */
  async function held(): Promise<{ server: Server; port: number }> {
    const server = createServer();
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    return { server, port: (server.address() as { port: number }).port };
  }

  it("refuses a port someone else's server holds, starting nothing", async () => {
    const { server, port } = await held();
    try {
      const { code, body } = await json(
        "serve",
        "start",
        "dyno",
        "--port",
        String(port),
      );
      expect(code).toBe(EXIT.refused);
      expect(body).toMatchObject({ ok: false, error: "refused", port });
      expect(body.message).toMatch(/held by a process dyno didn't start/);
      expect((await serverStatus({ directory: servers })).servers).toEqual([]);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it("refuses the owner's ports, and --owner from a linked worktree", async () => {
    for (const port of ["5190", "5199"]) {
      const { code, body } = await json(
        "serve",
        "start",
        "handbook",
        "--port",
        port,
      );
      expect(code).toBe(EXIT.refused);
      expect(body.message).toMatch(/is the owner's/);
    }
    // Never the real main checkout here: a linked worktree, said so.
    await expect(
      startServer({
        name: "dyno",
        owner: true,
        directory: servers,
        here: { worktree: "/somewhere/else", linked: true },
      }),
    ).rejects.toMatchObject({ kind: "refused" });
    await expect(
      stopServer({
        name: "dyno",
        owner: true,
        directory: servers,
        here: { worktree: "/somewhere/else", linked: true },
      }),
    ).rejects.toMatchObject({ kind: "refused" });
  });

  it("starts a server detached, says where it is when asked again, and stops it", async () => {
    const { server, port } = await held();
    await new Promise((r) => server.close(r));
    // A stand-in for Vite: a plain HTTP server on the port.
    const command = (_name: string, p: number) => ({
      file: process.execPath,
      args: [
        "-e",
        `require("node:http").createServer((q, s) => s.end("ok")).listen(${p}, "127.0.0.1")`,
      ],
      cwd: tmpdir(),
    });
    const here = { worktree: "/this/worktree", linked: true };
    const first = await startServer({
      name: "dyno",
      port,
      directory: servers,
      command,
      here,
      wait: 20,
    });
    try {
      expect(first).toMatchObject({
        started: true,
        server: { port, alive: true, answering: true, mine: true },
      });
      const again = await startServer({
        name: "dyno",
        directory: servers,
        command,
        here,
      });
      expect(again).toMatchObject({
        started: false,
        already_running: true,
        server: { port },
      });
      // Another worktree's start doesn't take or stop it.
      const other = { worktree: "/another/worktree", linked: true };
      await expect(
        startServer({
          name: "dyno",
          port,
          directory: servers,
          command,
          here: other,
        }),
      ).rejects.toThrow(/held by another worktree's dyno/);
      expect(
        await stopServer({ name: "dyno", directory: servers, here: other }),
      ).toMatchObject({ stopped: false });
    } finally {
      const stopped = await stopServer({
        name: "dyno",
        directory: servers,
        here,
      });
      expect(stopped).toMatchObject({ stopped: true, port });
    }
    expect(await answers(port)).toBe(false);
    expect((await serverStatus({ directory: servers, here })).servers).toEqual(
      [],
    );
    // Its log stays, found by its port.
    expect(
      serverLogs({ name: "dyno", port, directory: servers, here }).log,
    ).toBe(join(servers, `dyno-${port}.log`));
  });
});

describe("the old entry points", () => {
  it("cli.mjs runs the suite and says the new command", () => {
    const cli = fileURLToPath(
      new URL("../bench/suite/cli.mjs", import.meta.url),
    );
    const out = spawnSync(process.execPath, [cli, "list"], {
      encoding: "utf8",
      env,
      timeout: 60000,
    });
    expect(out.status).toBe(0);
    expect(out.stderr).toMatch(/is now `dyno suite list`/);
    expect(out.stdout).toMatch(/scenes, \d+ datasets/);
  });

  it("run.mjs runs the Lab and says the new command", () => {
    const run = fileURLToPath(new URL("../bench/run.mjs", import.meta.url));
    const out = spawnSync(process.execPath, [run, "no-such-suite"], {
      encoding: "utf8",
      env,
      timeout: 60000,
    });
    expect(out.status).not.toBe(0);
    expect(out.stderr).toMatch(/is now `dyno lab no-such-suite`/);
    expect(out.stderr).toMatch(/unknown suite "no-such-suite"/);
  });

  it("bench/dyno.mjs is the command", () => {
    const out = spawnSync(
      process.execPath,
      [dynoBin, "capabilities", "--json"],
      { encoding: "utf8", env, timeout: 60000 },
    );
    expect(out.status).toBe(0);
    expect(JSON.parse(out.stdout)).toMatchObject({
      api_version: API_VERSION,
      ok: true,
    });
  });
});
