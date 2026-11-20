// Run identity (CS-390): what every run records about itself, the baseline
// guard, the machine's alias, and old runs reading as baseline runs.
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  baselineProblem,
  closingLines,
  defaultMachine,
  gitIn,
  gpuVendor,
  identityLine,
  isRunFile,
  machineAlias,
  makeRunId,
  parseRunId,
  resolveIdentity,
  runFields,
  treeFacts,
} from "../bench/suite/identity.mjs";
import { runPurpose, summarizeRun } from "../bench/suite/report.mjs";
import { storedRuns } from "../bench/suite/reuse.mjs";

const cli = fileURLToPath(new URL("../bench/suite/cli.mjs", import.meta.url));

describe("run ids", () => {
  const date = new Date("2026-11-14T09:12:03.512Z");

  it("end with the machine's alias", () => {
    expect(makeRunId(date, "mac-apple")).toBe(
      "2026-11-14T09-12-03-512Z-mac-apple",
    );
  });

  it("read in both forms: the older <stamp> and <stamp>-<machine>", () => {
    const old = parseRunId("2026-11-14T09-12-03-512Z.json");
    expect(old?.machine).toBeUndefined();
    expect(old?.date.toISOString()).toBe(date.toISOString());
    const now = parseRunId("2026-11-14T09-12-03-512Z-win-nvidia.json");
    expect(now?.machine).toBe("win-nvidia");
    expect(now?.id).toBe("2026-11-14T09-12-03-512Z-win-nvidia");
    expect(now?.date.toISOString()).toBe(date.toISOString());
  });

  it("tell a run's file from the store's other files", () => {
    expect(isRunFile("2026-11-14T09-12-03-512Z.json")).toBe(true);
    expect(isRunFile("2026-11-14T09-12-03-512Z-mac.json")).toBe(true);
    for (const other of [
      "2026-11-14T09-12-03-512Z-mac.summary.json",
      "2026-11-14T09-12-03-512Z.summary.json",
      "2026-11-14T09-12-03-512Z-mac.html",
      "triage.json",
      "annotations.json",
      "../2026-11-14T09-12-03-512Z.json",
      "2026-11-14T09-12-03-512Z-Mac.json",
    ]) {
      expect(isRunFile(other), other).toBe(false);
    }
  });
});

describe("the machine's alias", () => {
  it("is the operating system and the GPU vendor", () => {
    expect(defaultMachine({ platform: "darwin", vendor: "apple" })).toBe(
      "mac-apple",
    );
    expect(defaultMachine({ platform: "win32", vendor: "nvidia" })).toBe(
      "win-nvidia",
    );
    expect(defaultMachine({ platform: "linux", vendor: "amd" })).toBe(
      "linux-amd",
    );
    expect(defaultMachine({ platform: "win32" })).toBe("win");
    expect(defaultMachine({ platform: "plan9", vendor: "intel" })).toBe(
      "other-intel",
    );
    // Only the fixed vocabulary: a model name never becomes an alias.
    expect(
      defaultMachine({ platform: "win32", vendor: "Example GPU 9000" }),
    ).toBe("win");
  });

  it("never uses the host name or the user name", () => {
    const names: Array<[string, string]> = [
      ["DESKTOP-4F9K2QX", "jdoe"],
      ["austins-macbook-pro.local", "austin"],
    ];
    for (const platform of ["darwin", "win32", "linux"]) {
      const aliases = names.map(([host, user]) =>
        machineAlias({ env: {}, platform, host, user, vendor: () => "nvidia" }),
      );
      // The same on every host: nothing about the host is in it.
      expect(new Set(aliases.map((a) => a.replace(/-1$/, ""))).size).toBe(1);
      for (const [i, [host, user]] of names.entries()) {
        const parts = [host, host.split(".")[0] ?? host, user];
        expect(parts).not.toContain(aliases[i]);
        for (const part of parts) {
          if (part.length > 4) {
            expect(aliases[i]).not.toContain(part.toLowerCase());
          }
        }
      }
    }
  });

  it("changes itself rather than equal the host name or the user name", () => {
    const named = (host: string, user: string) =>
      machineAlias({
        env: {},
        platform: "win32",
        host,
        user,
        vendor: () => "nvidia",
      });
    expect(named("WIN-NVIDIA", "jdoe")).toBe("win-nvidia-1");
    expect(named("desktop", "win-nvidia")).toBe("win-nvidia-1");
    expect(named("win", "jdoe")).toBe("win-nvidia");
  });

  it("reads no serial number or model from the GPU listing", () => {
    const listing =
      "GPU 0: Example GPU 9000 (UUID: GPU-00000000-0000-0000-0000-000000000000)";
    const vendor = gpuVendor({
      platform: "win32",
      arch: "x64",
      exec: (file) => (file === "nvidia-smi" ? listing : undefined),
    });
    expect(vendor).toBe("nvidia");
    expect(
      gpuVendor({ platform: "darwin", arch: "arm64", exec: () => undefined }),
    ).toBe("apple");
    expect(
      gpuVendor({
        platform: "win32",
        arch: "x64",
        exec: (file) =>
          file === "powershell"
            ? "Example Radeon Graphics;Example Intel Graphics"
            : undefined,
      }),
    ).toBe("amd");
    expect(
      gpuVendor({ platform: "linux", arch: "x64", exec: () => undefined }),
    ).toBeUndefined();
  });

  it("takes BENCH_MACHINE, but refuses the host name and the user name", () => {
    const base = {
      platform: "win32",
      host: "Laptop-A.local",
      user: "jdoe",
      vendor: () => "nvidia",
    };
    expect(machineAlias({ ...base, env: { BENCH_MACHINE: "Win" } })).toBe(
      "win",
    );
    expect(machineAlias({ ...base, env: { BENCH_MACHINE: "desk-b" } })).toBe(
      "desk-b",
    );
    expect(() =>
      machineAlias({ ...base, env: { BENCH_MACHINE: "laptop-a" } }),
    ).toThrow(/host name/);
    expect(() =>
      machineAlias({ ...base, env: { BENCH_MACHINE: "JDoe" } }),
    ).toThrow(/user name/);
    expect(() =>
      machineAlias({ ...base, env: { BENCH_MACHINE: "has space" } }),
    ).toThrow(/lowercase/);
    expect(() =>
      machineAlias({ ...base, env: { BENCH_MACHINE: "x".repeat(33) } }),
    ).toThrow(/at most 32/);
  });
});

describe("the baseline guard", () => {
  const ok = {
    kind: "bench",
    dirty: false,
    branch: "main",
    integration: "main",
  };

  it("accepts a clean tree on the integration branch", () => {
    expect(baselineProblem(ok)).toBeUndefined();
    expect(baselineProblem({ ...ok, kind: "images" })).toBeUndefined();
  });

  it("refuses a dirty tree, a feature branch and a detached commit", () => {
    expect(baselineProblem({ ...ok, dirty: true })).toMatch(/clean tree/);
    expect(baselineProblem({ ...ok, branch: "claude/x" })).toMatch(
      /feature branch claude\/x/,
    );
    expect(
      baselineProblem({ ...ok, branch: "abc123", detached: true }),
    ).toMatch(/detached/);
  });

  it("is for bench and images runs only", () => {
    expect(baselineProblem({ ...ok, kind: "coldstart" })).toMatch(
      /not coldstart runs/,
    );
  });
});

describe("a tree's identity", () => {
  let dir: string;
  let main: string;
  let linked: string;
  const run = (cwd: string, ...args: string[]) =>
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Example",
        "-c",
        "user.email=example@example.com",
        "-c",
        "commit.gpgsign=false",
        ...args,
      ],
      { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();

  beforeAll(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), "dyno-identity-")));
    main = join(dir, "checkout");
    mkdirSync(main);
    run(main, "init", "-q", "-b", "integration");
    writeFileSync(join(main, "a.txt"), "one\n");
    run(main, "add", "a.txt");
    run(main, "commit", "-q", "-m", "one");
    linked = join(dir, "feature-tree");
    run(main, "worktree", "add", "-q", "-b", "feature/x", linked);
    writeFileSync(join(linked, "b.txt"), "two\n");
    run(linked, "add", "b.txt");
    run(linked, "commit", "-q", "-m", "two");
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const identify = (cwd: string, opts: Record<string, unknown>) =>
    resolveIdentity({
      kind: "bench",
      opts,
      root: cwd,
      env: { BENCH_INTEGRATION_BRANCH: "integration" },
      machine: "mac-apple",
    });

  it("records every field from a linked worktree", () => {
    const facts = identify(linked, {
      item: "CS-390",
      study: "2026-11-19-example",
    });
    expect(facts).toMatchObject({
      purpose: "dev",
      item: "CS-390",
      study: "2026-11-19-example",
      branch: "feature/x",
      worktree: "feature-tree",
      machine: "mac-apple",
      servedFrom: "mac-apple",
      dirty: false,
    });
    expect(facts.base).toEqual({
      ref: "integration",
      sha: run(main, "rev-parse", "integration"),
    });
    const date = new Date("2026-11-19T10:00:00.000Z");
    const fields = runFields(facts, date);
    expect(fields).toEqual({
      id: "2026-11-19T10-00-00-000Z-mac-apple",
      purpose: "dev",
      item: "CS-390",
      study: "2026-11-19-example",
      worktree: "feature-tree",
      base: facts.base,
      machine: "mac-apple",
      servedFrom: "mac-apple",
    });
    // A worktree's name, never its path (a path carries the user name).
    expect(JSON.stringify(fields)).not.toContain(dir);
    expect(identityLine(facts)).toBe(
      "bench run · purpose dev · item CS-390 · study 2026-11-19-example · branch feature/x · worktree feature-tree · machine mac-apple",
    );
    expect(closingLines(facts, fields.id)).toEqual([
      "run:  2026-11-19T10-00-00-000Z-mac-apple",
      "dyno: #/runs/2026-11-19T10-00-00-000Z-mac-apple.json  (study 2026-11-19-example)",
    ]);
  });

  it("names the main checkout as such", () => {
    expect(identify(main, {}).worktree).toBe("main checkout");
    expect(basename(main)).toBe("checkout");
  });

  it("refuses --purpose baseline from a feature branch and from a dirty tree", () => {
    expect(() => identify(linked, { purpose: "baseline" })).toThrow(
      /feature branch feature\/x/,
    );
    expect(() => identify(main, { purpose: "baseline" })).not.toThrow();
    writeFileSync(join(main, "a.txt"), "changed\n");
    try {
      expect(() => identify(main, { purpose: "baseline" })).toThrow(
        /clean tree/,
      );
      expect(identify(main, {}).dirty).toBe(true);
    } finally {
      run(main, "checkout", "-q", "--", "a.txt");
    }
  });

  it("refuses a baseline of a kind that can't be one, and an unknown purpose", () => {
    expect(() =>
      resolveIdentity({
        kind: "coldstart",
        opts: { purpose: "baseline" },
        root: main,
        env: { BENCH_INTEGRATION_BRANCH: "integration" },
        machine: "mac",
      }),
    ).toThrow(/not coldstart runs/);
    expect(() => identify(main, { purpose: "nightly" })).toThrow(
      /baseline or dev/,
    );
  });

  it("warns about an item that isn't CS-<n>, and refuses a bare flag", () => {
    expect(identify(main, { item: "CS-390" }).warnings).toEqual([]);
    expect(identify(main, { item: "390" }).warnings[0]).toMatch(/CS-<n>/);
    expect(() => identify(main, { item: true })).toThrow(/--item/);
    expect(() => identify(main, { study: true })).toThrow(/--study/);
  });

  it("says when the base can't be found", () => {
    const facts = treeFacts(gitIn(main), main, "no-such-branch");
    expect(facts.base).toEqual({ ref: "no-such-branch" });
  });
});

describe("the command line refuses before it does any work", () => {
  const lock = join(tmpdir(), `dyno-identity-lock-${process.pid}`);
  afterAll(() => rmSync(lock, { force: true }));

  // An integration branch that is no branch's name: no tree is on it.
  const refused = (...args: string[]) =>
    spawnSync(process.execPath, [cli, ...args], {
      encoding: "utf8",
      env: {
        ...process.env,
        BENCH_INTEGRATION_BRANCH: "no-such-integration-branch",
        BENCH_LOCK: lock,
      },
      timeout: 60000,
    });

  it.each(["run", "images", "coldstart"])(
    "%s --purpose baseline from a feature branch",
    (command) => {
      const out = refused(command, "--purpose", "baseline");
      expect(out.status).toBe(1);
      expect(out.stderr).toMatch(/--purpose baseline/);
      // Refused at once: the lock was never taken.
      expect(() => execFileSync("test", ["-e", lock])).toThrow();
    },
  );

  it("refuses an unknown purpose", () => {
    const out = refused("run", "--purpose", "nightly");
    expect(out.status).toBe(1);
    expect(out.stderr).toMatch(/baseline or dev/);
  });
});

describe("old runs read as baseline runs", () => {
  const legacy = {
    date: "2026-11-01T06:22:49.259Z",
    commit: "0123456789abcdef0123456789abcdef01234567",
    subject: "an old run",
    branch: "cesium-2.0-webgpu-poc",
    baseline: "1.146.0",
    candidate: "2.0",
    environment: {},
    runs: [],
  };

  it("have the purpose baseline and no other identity", () => {
    expect(runPurpose(legacy)).toBe("baseline");
    const summary = summarizeRun(legacy) as Record<string, unknown>;
    expect(summary.purpose).toBe("baseline");
    for (const key of [
      "id",
      "item",
      "study",
      "worktree",
      "base",
      "machine",
      "servedFrom",
    ]) {
      expect(summary).not.toHaveProperty(key);
    }
    // Everything else it summarized before is still there.
    expect(summary).toMatchObject({
      commit: legacy.commit,
      branch: legacy.branch,
      candidate: "2.0",
    });
  });

  it("keep the identity a new run recorded", () => {
    const fresh = {
      ...legacy,
      id: "2026-11-19T10-00-00-000Z-mac-apple",
      purpose: "dev",
      item: "CS-390",
      worktree: "feature-tree",
      base: { ref: "integration", sha: "abc" },
      machine: "mac-apple",
      servedFrom: "mac-apple",
    };
    expect(runPurpose(fresh)).toBe("dev");
    expect(summarizeRun(fresh)).toMatchObject({
      id: fresh.id,
      purpose: "dev",
      item: "CS-390",
      worktree: "feature-tree",
      base: fresh.base,
      machine: "mac-apple",
      servedFrom: "mac-apple",
    });
  });

  it("stay reusable beside runs named with a machine", () => {
    const dir = mkdtempSync(join(tmpdir(), "dyno-store-"));
    try {
      const body = (n: number) =>
        JSON.stringify({
          reuse: { machine: "m", method: "x" },
          configs: [{ id: "1.146.0", engineKey: "k" }],
          runs: [
            {
              config: "1.146.0",
              sceneKey: `s${n}`,
              metrics: { status: "ok", cpuP50: 1 },
              validity: { verdict: "valid" },
            },
          ],
        });
      writeFileSync(join(dir, "2026-11-10T10-00-00-000Z.json"), body(1));
      writeFileSync(
        join(dir, "2026-11-11T10-00-00-000Z-mac-apple.json"),
        body(2),
      );
      writeFileSync(
        join(dir, "2026-11-11T10-00-00-000Z-mac-apple.summary.json"),
        "{}",
      );
      writeFileSync(join(dir, "triage.json"), "{}");
      const found = storedRuns(dir, { machine: "m", method: "x", days: 3650 });
      expect(found.map((s: { file: string }) => s.file)).toEqual([
        "2026-11-11T10-00-00-000Z-mac-apple",
        "2026-11-10T10-00-00-000Z",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
