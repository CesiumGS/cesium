// The tracker's checks: hitld's check over the tracker's files (in
// human-in-the-lead's format since CS-521), and scripts/staleNames.mjs over
// every other document, for the names the move to work items replaced.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { bareSectionRefs, staleNames } from "../scripts/staleNames.mjs";

const repoRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
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
  return dir;
}

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
  // The tracker is in human-in-the-lead's format: its own check is the one
  // that counts (hitld, pinned in devDependencies).
  it("pass hitld work check", () => {
    const hitld = join(
      dirname(
        createRequire(import.meta.url).resolve(
          "human-in-the-lead/package.json",
        ),
      ),
      "core/bin/hitld.mjs",
    );
    let out: string;
    try {
      out = execFileSync(process.execPath, [hitld, "work", "check"], {
        cwd: repoRoot,
        encoding: "utf8",
      });
    } catch (e) {
      out = String((e as { stdout?: string }).stdout ?? e);
    }
    const result = JSON.parse(out) as {
      ok: boolean;
      files: number;
      problems: string[];
    };
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.files).toBeGreaterThan(500);
  });

  it("leave no old-style names or section references in the repository", () => {
    const hits = [...staleNames(repoRoot), ...bareSectionRefs(repoRoot)];
    expect(hits.map((h) => `${h.path}:${h.line}: ${h.name}`)).toEqual([]);
  });
});
