// PROJ's Node staging (projNode.ts), with no PROJ data: the sweep of ended
// processes' staging directories reads nothing it shouldn't and never waits
// on a hostile entry; the exit handler never throws; and a grid whose bytes
// don't match its catalog entry is refused, leaving nothing in staging
// (Review Focus 2, Node's half).
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GridEntry } from "../src/engineering/gridCatalog.ts";
import { checkGrid } from "../src/engineering/projCheck.ts";
import {
  exitCleanup,
  stageNodeGrid,
  sweepStaging,
} from "../src/engineering/projNode.ts";
import { sha256Hex } from "../src/io/sha256.ts";

const windows = process.platform === "win32";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "frames-staging-test-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** A pid no process has: one that has just ended. */
const endedPid = () => spawnSync(process.execPath, ["-e", ""]).pid!;

/** A staging-like directory in `root` whose `owner` says `owner`. */
function stagingDir(name: string, owner?: string): string {
  const dir = join(root, name);
  mkdirSync(dir);
  writeFileSync(join(dir, "payload"), "x");
  if (owner !== undefined) {
    writeFileSync(join(dir, "owner"), owner);
  }
  return dir;
}

describe("sweepStaging", () => {
  it("removes an ended process's directory, and keeps a running one's and others", async () => {
    const stale = stagingDir("cesium-proj-stale", String(endedPid()));
    const running = stagingDir("cesium-proj-running", String(process.ppid));
    const mine = stagingDir("cesium-proj-mine", String(process.pid));
    const unowned = stagingDir("cesium-proj-unowned");
    const notPid = stagingDir("cesium-proj-text", "not a pid");
    const otherPrefix = stagingDir("other-stale", String(endedPid()));
    await sweepStaging(root);
    expect(existsSync(stale)).toBe(false);
    for (const kept of [running, mine, unowned, notPid, otherPrefix]) {
      expect(existsSync(kept), kept).toBe(true);
    }
  });

  it("skips an owner larger than a pid", async () => {
    const big = stagingDir(
      "cesium-proj-big",
      String(endedPid()).padStart(100, "0"),
    );
    await sweepStaging(root);
    expect(existsSync(big)).toBe(true);
  });

  it.skipIf(windows)(
    "skips a symlinked owner and a symlinked directory, touching neither target",
    { timeout: 5000 },
    async () => {
      const dead = String(endedPid());
      // An owner that is a symlink to a file naming an ended process.
      const target = join(root, "target-owner");
      writeFileSync(target, dead);
      const linkedOwner = stagingDir("cesium-proj-linked-owner");
      symlinkSync(target, join(linkedOwner, "owner"));
      // A "staging directory" that is a symlink to a real one.
      const real = join(root, "real-dir");
      mkdirSync(real);
      writeFileSync(join(real, "owner"), dead);
      writeFileSync(join(real, "keep"), "x");
      symlinkSync(real, join(root, "cesium-proj-linked-dir"));
      await sweepStaging(root);
      expect(existsSync(linkedOwner)).toBe(true);
      expect(readFileSync(target, "utf8")).toBe(dead);
      expect(existsSync(join(root, "cesium-proj-linked-dir"))).toBe(true);
      expect(readdirSync(real).sort()).toEqual(["keep", "owner"]);
    },
  );

  it.skipIf(windows)(
    "skips a FIFO owner without waiting on it",
    { timeout: 5000 },
    async () => {
      const fifo = stagingDir("cesium-proj-fifo");
      const made = spawnSync("mkfifo", [join(fifo, "owner")]);
      expect(made.status, String(made.stderr)).toBe(0);
      // A FIFO owner that a reader blocks on would hang here past the timeout.
      await sweepStaging(root);
      expect(existsSync(fifo)).toBe(true);
    },
  );

  it("gives up silently on a tmp it can't read", async () => {
    await expect(
      sweepStaging(join(root, "no-such-directory")),
    ).resolves.toBeUndefined();
  });
});

describe("exitCleanup", () => {
  it("removes the staging directory", () => {
    const dir = stagingDir("cesium-proj-exit");
    const calls: unknown[][] = [];
    exitCleanup(dir, (...args) => {
      calls.push(args);
      rmSync(...args);
    })();
    expect(calls).toEqual([[dir, { recursive: true, force: true }]]);
    expect(existsSync(dir)).toBe(false);
  });

  it("swallows a throwing rmSync (Windows can't delete the mapped binding)", () => {
    const handler = exitCleanup(join(root, "x"), () => {
      throw Object.assign(new Error("EBUSY: resource busy or locked"), {
        code: "EBUSY",
      });
    });
    expect(handler).not.toThrow();
  });
});

describe("stageNodeGrid (Review Focus 2, Node)", () => {
  const GRID = new Uint8Array(200).fill(7);
  let source: string;
  let staging: string;
  let entry: GridEntry;

  beforeEach(async () => {
    source = join(root, "grids");
    staging = join(root, "staging");
    mkdirSync(source);
    mkdirSync(staging);
    entry = {
      name: "g.tif",
      url: "https://cdn.proj.org/g.tif",
      sha256: await sha256Hex(GRID),
      bytes: GRID.length,
      agency: "Stub Agency",
      removed: false,
    };
  });

  const stageIt = () =>
    stageNodeGrid(staging, `${source}/`, "g.tif", (bytes) =>
      checkGrid(entry, bytes),
    );

  it.each([
    [
      "truncated",
      GRID.slice(0, 150),
      async (bad: Uint8Array) =>
        `PROJ: g.tif is 150 bytes, not the catalog's 200 (SHA-256 expected ${entry.sha256}, got ${await sha256Hex(bad)})`,
    ],
    [
      "the wrong hash",
      Uint8Array.from(GRID, (b, i) => (i === 100 ? b ^ 0xff : b)),
      async (bad: Uint8Array) =>
        `PROJ: g.tif SHA-256 mismatch (expected ${entry.sha256}, got ${await sha256Hex(bad)})`,
    ],
  ])(
    "refuses %s bytes, naming both hashes, and leaves nothing in staging",
    async (_, bad, message) => {
      writeFileSync(join(source, "g.tif"), bad);
      await expect(stageIt()).rejects.toThrow(await message(bad));
      // Neither the grid nor its .partial copy is left.
      expect(readdirSync(staging)).toEqual([]);
      // With the right bytes, a retry stages it.
      writeFileSync(join(source, "g.tif"), GRID);
      expect(await stageIt()).toBe(join(staging, "g.tif"));
      expect(readdirSync(staging)).toEqual(["g.tif"]);
      expect(new Uint8Array(readFileSync(join(staging, "g.tif")))).toEqual(
        GRID,
      );
    },
  );

  it("says setup is needed when the source has no such grid", async () => {
    await expect(stageIt()).rejects.toThrow(
      /^PROJ: there is no .*g\.tif; run `npm run setup`$/,
    );
    expect(readdirSync(staging)).toEqual([]);
  });
});
