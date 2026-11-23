// The release pipeline's scripts (CS-613): the two version lines
// (scripts/release/lines.mjs), the combined release notes
// (scripts/release/notes.mjs), the changeset rule's check
// (scripts/release/changesetCheck.mjs), the staging order
// (scripts/release/stage.mjs), and the repository's Changesets config.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyPaired,
  compareVersions,
  distTag,
  isLower,
  lineProblems,
  pairedVersion,
  readConfig,
  renameNewestHeading,
  repositoryPackages,
  stableNames,
  withLines,
} from "../scripts/release/lines.mjs";
import {
  onlyDependencyUpdates,
  releaseNotes,
  sectionFor,
} from "../scripts/release/notes.mjs";
import {
  changeParts,
  checkChangesets,
  checkParts,
  isChangeset,
  namedPackages,
  parseNameStatus,
} from "../scripts/release/changesetCheck.mjs";
import {
  changedPaths,
  gitTree,
  manifestChanges,
  pushIsRelease,
  quoted,
  releaseRecordProblems,
  withCommandsStopped,
  type Tree,
} from "../scripts/release/record.mjs";
import {
  createdSince,
  earlierRuns,
  listAll,
} from "../scripts/release/earlierRuns.mjs";
import { publishOrder } from "../scripts/release/stage.mjs";
import {
  earlierStagingProblem,
  environmentProblems,
  gateProblem,
  runnerProblem,
  scratchFolder,
  sha256,
  stageArgs,
  stageTarballs,
  tarballProblems,
} from "../scripts/release/stageTarballs.mjs";
import {
  planProblem,
  writeReleaseRecord,
} from "../scripts/release/version.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("pairedVersion (CS-891)", () => {
  it("pairs a stable version with 0.(100 × major + minor).patch", () => {
    expect(pairedVersion("2.0.0")).toBe("0.200.0");
    expect(pairedVersion("2.1.3")).toBe("0.201.3");
    expect(pairedVersion("2.99.0")).toBe("0.299.0");
    expect(pairedVersion("3.0.0")).toBe("0.300.0");
  });
  it("keeps the prerelease suffix and drops build metadata", () => {
    expect(pairedVersion("2.0.0-alpha.1")).toBe("0.200.0-alpha.1");
    expect(pairedVersion("2.3.4-rc.2")).toBe("0.203.4-rc.2");
    expect(pairedVersion("2.0.0+abc")).toBe("0.200.0");
  });
  it("refuses a minor of 100, a 0.x version and what isn't a version", () => {
    expect(() => pairedVersion("2.100.0")).toThrow(/minor of 100/);
    expect(() => pairedVersion("0.200.0")).toThrow(/0\.x line/);
    expect(() => pairedVersion("2.0")).toThrow(/isn't a version/);
    expect(() => pairedVersion("v2.0.0")).toThrow(/isn't a version/);
  });
});

describe("distTag and isLower", () => {
  it("tags a prerelease next and a release latest", () => {
    expect(distTag("2.0.0-alpha.1")).toBe("next");
    expect(distTag("2.0.0")).toBe("latest");
  });
  it("orders versions by their numbers, a prerelease below its release", () => {
    expect(isLower("1.147.0", "2.0.0")).toBe(true);
    expect(isLower("2.0.0", "1.147.0")).toBe(false);
    expect(isLower("2.0.0", "2.0.0")).toBe(false);
    expect(isLower("2.0.0-rc.1", "2.0.0")).toBe(true);
    expect(isLower("2.0.0", "2.0.0-rc.1")).toBe(false);
    expect(isLower("2.0.10", "2.0.9")).toBe(false);
  });
  it("compares prerelease identifiers as semver does, numbers as numbers", () => {
    expect(isLower("2.0.0-alpha.9", "2.0.0-alpha.10")).toBe(true);
    expect(isLower("2.0.0-alpha.10", "2.0.0-alpha.9")).toBe(false);
    expect(isLower("2.0.0-alpha", "2.0.0-alpha.1")).toBe(true);
    expect(isLower("2.0.0-alpha.1", "2.0.0-beta")).toBe(true);
    expect(isLower("2.0.0-1", "2.0.0-alpha")).toBe(true);
    expect(isLower("2.0.0-rc.1", "2.0.0-beta.11")).toBe(false);
    expect(compareVersions("2.0.0-alpha.1+abc", "2.0.0-alpha.1")).toBe(0);
  });
});

/** A package for the line checks. */
function pkg(
  name: string,
  version: string,
  dependencies: Record<string, string> = {},
): {
  dir: string;
  manifest: {
    name: string;
    version: string;
    dependencies: Record<string, string>;
  };
} {
  return { dir: "", manifest: { name, version, dependencies } };
}

describe("lineProblems", () => {
  const stable = ["@x/core", "@x/umbrella"];
  it("passes one stable version and the paired experimental one", () => {
    const packages = withLines(
      [
        pkg("@x/core", "2.0.0-alpha.1"),
        pkg("@x/umbrella", "2.0.0-alpha.1", { "@x/core": "2.0.0-alpha.1" }),
        pkg("@x/lab", "0.200.0-alpha.1", {
          "@x/core": "2.0.0-alpha.1",
          left: "^1.0.0",
        }),
      ],
      stable,
    );
    expect(lineProblems(packages, stable)).toEqual([]);
  });
  it("finds stable packages at two versions", () => {
    const packages = withLines(
      [pkg("@x/core", "2.0.0"), pkg("@x/umbrella", "2.0.1")],
      stable,
    );
    expect(lineProblems(packages, stable)).toEqual([
      expect.stringMatching(
        /aren't at one version: @x\/core@2\.0\.0, @x\/umbrella@2\.0\.1/,
      ),
    ]);
  });
  it("finds an experimental package off its pair, a range on a sibling, and a stable package on the experimental line", () => {
    const packages = withLines(
      [
        pkg("@x/core", "2.1.0", { "@x/lab": "0.201.0" }),
        pkg("@x/umbrella", "2.1.0", { "@x/core": "^2.1.0" }),
        pkg("@x/lab", "0.1.0", { "@x/core": "2.1.0" }),
      ],
      stable,
    );
    expect(lineProblems(packages, stable)).toEqual([
      "@x/core (stable) depends on @x/lab, which is experimental",
      "@x/umbrella's dependencies names @x/core@^2.1.0, not the exact 2.1.0",
      "@x/lab (experimental) is at 0.1.0, not 0.201.0",
    ]);
  });
  it("finds the root's dependency on a sibling at another version", () => {
    const packages = withLines(
      [pkg("@x/core", "2.1.0"), pkg("@x/umbrella", "2.1.0")],
      stable,
    );
    expect(
      lineProblems(packages, stable, {
        devDependencies: { "@x/umbrella": "2.0.0", vite: "^8.0.0" },
      }),
    ).toEqual([
      "the root package.json's devDependencies names @x/umbrella@2.0.0, not the exact 2.1.0",
    ]);
    expect(
      lineProblems(packages, stable, {
        devDependencies: { "@x/umbrella": "2.1.0" },
      }),
    ).toEqual([]);
  });
  it("finds a fixed-group name that isn't a package", () => {
    const packages = withLines(
      [pkg("@x/core", "2.0.0")],
      ["@x/core", "@x/gone"],
    );
    expect(lineProblems(packages, ["@x/core", "@x/gone"])).toEqual([
      "the fixed group names @x/gone, which isn't a package under packages/",
    ]);
  });
});

describe("applyPaired", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("writes the paired version, exact sibling versions and the changelog's heading", () => {
    dir = mkdtempSync(join(tmpdir(), "cesium-lines-"));
    const write = (folder: string, manifest: object, changelog?: string) => {
      mkdirSync(join(dir!, folder));
      writeFileSync(
        join(dir!, folder, "package.json"),
        JSON.stringify(manifest),
      );
      if (changelog) {
        writeFileSync(join(dir!, folder, "CHANGELOG.md"), changelog);
      }
      return {
        dir: join(dir!, folder),
        manifest: JSON.parse(JSON.stringify(manifest)),
      };
    };
    const packages = withLines(
      [
        write("core", { name: "@x/core", version: "2.0.0-alpha.1" }),
        // What Changesets leaves: its own patch bump, under its own heading.
        write(
          "lab",
          {
            name: "@x/lab",
            version: "0.0.1-alpha.1",
            dependencies: { "@x/core": "2.0.0-alpha.1", other: "^3.0.0" },
          },
          "# @x/lab\n\n## 0.0.1-alpha.1\n\n### Patch Changes\n\n- A sentence.\n\n## 0.0.0\n",
        ),
      ],
      ["@x/core"],
    );
    expect(applyPaired(packages)).toEqual(["@x/lab"]);
    const lab = JSON.parse(
      readFileSync(join(dir, "lab", "package.json"), "utf8"),
    );
    expect(lab.version).toBe("0.200.0-alpha.1");
    expect(lab.dependencies).toEqual({
      "@x/core": "2.0.0-alpha.1",
      other: "^3.0.0",
    });
    expect(readFileSync(join(dir, "lab", "CHANGELOG.md"), "utf8")).toBe(
      "# @x/lab\n\n## 0.200.0-alpha.1\n\n### Patch Changes\n\n- A sentence.\n\n## 0.0.0\n",
    );
    expect(lineProblems(packages, ["@x/core"])).toEqual([]);
  });
  it("renames only the newest heading, and only when it is Changesets' number", () => {
    expect(
      renameNewestHeading("# a\n\n## 0.0.1\n\n## 0.0.0\n", "0.0.1", "0.200.0"),
    ).toBe("# a\n\n## 0.200.0\n\n## 0.0.0\n");
    expect(renameNewestHeading("# a\n\n## 0.199.0\n", "0.0.1", "0.200.0")).toBe(
      "# a\n\n## 0.199.0\n",
    );
  });
});

describe("the repository's Changesets config", () => {
  const config = readConfig() as {
    fixed: string[][];
    ignore: string[];
    baseBranch: string;
    privatePackages: { version: boolean; tag: boolean };
  };
  const { stable, packages } = repositoryPackages();
  it("has the stable packages as one fixed group, each a package under packages/", () => {
    expect(stableNames(config)).toEqual(stable);
    const names = packages.map((p) => p.manifest.name);
    expect(stable.filter((name) => !names.includes(name))).toEqual([]);
  });
  it("keeps both lines consistent at the version the packages have now, the root's dependency included", () => {
    const { rootManifest } = repositoryPackages();
    expect(lineProblems(packages, stable, rootManifest)).toEqual([]);
  });
  it("ignores every private workspace outside packages/, so Changesets never versions one", () => {
    const workspaces = ["apps", "tools"].flatMap((root) =>
      readdirSync(join(repo, root), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map(
          (e) =>
            JSON.parse(
              readFileSync(join(repo, root, e.name, "package.json"), "utf8"),
            ).name as string,
        ),
    );
    expect([...config.ignore].sort()).toEqual(workspaces.sort());
  });
  it("versions the packages while they are private, and compares against the 2.0 branch", () => {
    expect(config.privatePackages).toEqual({ version: true, tag: false });
    const policy = JSON.parse(
      readFileSync(join(repo, ".human-in-the-lead", "policy.json"), "utf8"),
    ) as { merge?: { main_branch?: string }; main_branch?: string };
    const main = JSON.stringify(policy).match(
      /"main_branch":\s*"([^"]+)"/,
    )?.[1];
    expect(config.baseBranch).toBe(main);
  });
  it("stages siblings before their dependents and the umbrella last", () => {
    const order = publishOrder(packages).map((p) => p.manifest.name);
    expect(order[0]).toBe("@cesium/core");
    expect(order.at(-1)).toBe("@cesium/next");
    for (const p of packages) {
      for (const dep of Object.keys(
        (p.manifest.dependencies as Record<string, string>) ?? {},
      )) {
        if (order.includes(dep)) {
          expect(order.indexOf(dep)).toBeLessThan(
            order.indexOf(p.manifest.name),
          );
        }
      }
    }
    expect(stageArgs("x-core-2.0.0.tgz", "next", true)).toEqual([
      "stage",
      "publish",
      "./x-core-2.0.0.tgz",
      "--tag",
      "next",
      "--access",
      "public",
      "--ignore-scripts",
      "--dry-run",
    ]);
  });
});

describe("releaseNotes", () => {
  const core = [
    "# @x/core",
    "",
    "## 2.1.0",
    "",
    "### Minor Changes",
    "",
    "- abc1234: Views gain a thing users want.",
    "",
    "### Patch Changes",
    "",
    "- def5678: A fix users notice.",
    "",
    "## 2.0.0",
    "",
    "### Major Changes",
    "",
    "- The first release.",
    "",
  ].join("\n");
  const time = [
    "# @x/time",
    "",
    "## 2.1.0",
    "",
    "### Patch Changes",
    "",
    "- Updated dependencies [abc1234]",
    "  - @x/core@2.1.0",
    "",
  ].join("\n");
  const lab =
    "# @x/lab\n\n## 0.201.0\n\n### Minor Changes\n\n- The lab gains a mode.\n";
  it("finds one version's section, and none for a version it lacks", () => {
    expect(sectionFor(core, "2.1.0")).toBe(
      "### Minor Changes\n\n- abc1234: Views gain a thing users want.\n\n### Patch Changes\n\n- def5678: A fix users notice.",
    );
    expect(sectionFor(core, "2.0.0")).toBe(
      "### Major Changes\n\n- The first release.",
    );
    expect(sectionFor(core, "2.2.0")).toBeUndefined();
  });
  it("tells a section of sibling updates from one with changes", () => {
    expect(onlyDependencyUpdates(sectionFor(time, "2.1.0")!)).toBe(true);
    expect(onlyDependencyUpdates(sectionFor(core, "2.1.0")!)).toBe(false);
  });
  it("gathers every package's section into one page", () => {
    expect(
      releaseNotes({
        version: "2.1.0",
        packages: [
          { name: "@x/core", changelog: core },
          { name: "@x/time", changelog: time },
          { name: "@x/lab", changelog: lab, version: "0.201.0" },
          { name: "@x/new", changelog: undefined },
        ],
      }),
    ).toBe(
      [
        "# 2.1.0",
        "",
        "## `@x/core`",
        "",
        "#### Minor Changes",
        "",
        "- abc1234: Views gain a thing users want.",
        "",
        "#### Patch Changes",
        "",
        "- def5678: A fix users notice.",
        "",
        "## `@x/lab` 0.201.0",
        "",
        "#### Minor Changes",
        "",
        "- The lab gains a mode.",
        "",
        "Released with no changes of their own: `@x/time`.",
        "",
        "No changelog section for this release: `@x/new`.",
        "",
      ].join("\n"),
    );
  });
  it("says so when no package has changes of its own", () => {
    expect(
      releaseNotes({
        version: "2.1.0",
        packages: [{ name: "@x/time", changelog: time }],
      }),
    ).toBe(
      "# 2.1.0\n\nNo package has changes of its own in this release.\n\nReleased with no changes of their own: `@x/time`.\n",
    );
  });
});

/** A tree for the changeset rule and the release record's check. */
function tree(
  packages: Record<string, Record<string, unknown>>,
  changesets: Record<string, string> = {},
  rootManifest: Record<string, unknown> = { name: "ws", private: true },
): Tree {
  return {
    changesets,
    packages: Object.entries(packages).map(([folder, manifest]) => ({
      folder,
      manifest,
    })),
    rootManifest,
    config: { fixed: [["@x/core", "@x/time"]] },
  };
}

/** `git diff -z --name-status` text from `status\tpath` lines. */
function z(lines: string): string {
  return lines
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => line.replace("\t", "\0"))
    .join("\0")
    .concat("\0");
}

describe("the changeset rule's check", () => {
  const packages = {
    core: { name: "@x/core", version: "2.0.0" },
    time: {
      name: "@x/time",
      version: "2.0.0",
      dependencies: { "@x/core": "2.0.0" },
    },
  };
  const owls = '---\n"@x/core": minor\n---\n\nViews gain a thing users want.\n';
  const both =
    '---\n"@x/core": minor\n"@x/time": patch\n---\n\nViews gain a thing.\n';
  const empty = "---\n---\n";
  const base = tree(packages);
  const check = (diff: string, head: Tree = base, from: Tree = base) =>
    checkChangesets(parseNameStatus(z(diff)), from, head);

  it("names a changeset's packages, and none for an empty one", () => {
    expect(namedPackages(owls)).toEqual(["@x/core"]);
    expect(
      namedPackages(
        "---\n'@x/core': patch\n\"@x/time\": major\n---\n\nText.\n",
      ),
    ).toEqual(["@x/core", "@x/time"]);
    expect(namedPackages(empty)).toEqual([]);
    expect(() => namedPackages("no front matter\n")).toThrow(/front matter/);
  });
  it("counts only .changeset/<name>.md, not its README or the pre-mode folder", () => {
    expect(isChangeset(".changeset/brave-owls.md")).toBe(true);
    expect(isChangeset(".changeset/README.md")).toBe(false);
    expect(isChangeset(".changeset/pre/brave-owls.md")).toBe(false);
    expect(isChangeset(".changeset/config.json")).toBe(false);
  });
  it("reads NUL-separated paths whole, a name with é included", () => {
    expect(
      parseNameStatus(
        "M\0packages/core/src/café.ts\0A\0.changeset/brave-owls.md\0",
      ),
    ).toEqual([
      { status: "M", path: "packages/core/src/café.ts" },
      { status: "A", path: ".changeset/brave-owls.md" },
    ]);
    const result = check("M\tpackages/core/src/café.ts\n");
    expect(result).toMatchObject({ ok: false, touched: ["@x/core"] });
  });
  it("passes a change that touches no published package", () => {
    expect(check("M\ttest/a.test.ts\nM\tbench/x.mjs\n")).toMatchObject({
      ok: true,
      touched: [],
    });
  });
  it("fails a change to a package with no changeset, naming the package", () => {
    const result = check(
      "M\tpackages/core/src/a.ts\nA\tpackages/time/src/b.ts\nM\t.changeset/README.md\n",
    );
    expect(result.ok).toBe(false);
    expect(result.touched).toEqual(["@x/core", "@x/time"]);
    expect(result.problem).toMatch(
      /touches @x\/core, @x\/time and adds no changeset/,
    );
  });
  it("passes a changeset that names every package the change touches", () => {
    const result = check(
      "M\tpackages/core/src/a.ts\nM\tpackages/time/src/b.ts\nA\t.changeset/both.md\n",
      tree(packages, { ".changeset/both.md": both }),
    );
    expect(result).toMatchObject({
      ok: true,
      named: ["@x/core", "@x/time"],
      unnamed: [],
    });
  });
  it("fails a changeset that leaves a touched package unnamed, an empty one included", () => {
    const one = check(
      "M\tpackages/core/src/a.ts\nM\tpackages/time/src/b.ts\nA\t.changeset/owls.md\n",
      tree(packages, { ".changeset/owls.md": owls }),
    );
    expect(one).toMatchObject({ ok: false, unnamed: ["@x/time"] });
    expect(one.problem).toMatch(/touches @x\/time, and no changeset/);
    const none = check(
      "M\tpackages/core/src/a.ts\nA\t.changeset/quiet.md\n",
      tree(packages, { ".changeset/quiet.md": empty }),
    );
    expect(none).toMatchObject({ ok: false, unnamed: ["@x/core"] });
  });
  it("counts a deleted package folder as touched, by its name at the base", () => {
    const head = tree({ core: packages.core });
    const result = check("D\tpackages/time/package.json\n", head);
    expect(result).toMatchObject({ ok: false, touched: ["@x/time"] });
  });
  it("fails a changeset without front matter", () => {
    const result = check(
      "M\tpackages/core/src/a.ts\nA\t.changeset/broken.md\n",
      tree(packages, { ".changeset/broken.md": "no front matter\n" }),
    );
    expect(result.ok).toBe(false);
    expect(result.problem).toMatch(
      /broken\.md": a changeset starts with front matter/,
    );
  });

  // The bypass the first version let through: delete any one changeset,
  // touch only manifests and changelogs, and pass as a "release record".
  const pending = { ".changeset/owls.md": owls, ".changeset/fox.md": both };
  const before = tree(packages, pending);
  it("fails a change that consumes a changeset and changes a package's exports and dependencies", () => {
    const head = tree(
      {
        core: {
          ...packages.core,
          exports: { ".": "./dist/evil.js" },
          dependencies: { "left-pad": "^1.0.0" },
        },
        time: packages.time,
      },
      { ".changeset/fox.md": both },
    );
    const result = check(
      "D\t.changeset/owls.md\nM\tpackages/core/package.json\nM\tpackages/core/CHANGELOG.md\n",
      head,
      before,
    );
    expect(result).toMatchObject({ ok: false, release: false });
    expect(result.recordProblems).toEqual(
      expect.arrayContaining([
        'it leaves ".changeset/fox.md" unconsumed',
        expect.stringMatching(
          /@x\/core's package\.json changes exports, dependencies;/,
        ),
        expect.stringMatching(/@x\/core goes from 2\.0\.0 to 2\.0\.0/),
      ]),
    );
    expect(result.problem).toMatch(/isn't a release record/);
  });
  it("fails a partial consumption, even with every version moved", () => {
    const head = tree(
      {
        core: { name: "@x/core", version: "2.1.0" },
        time: {
          name: "@x/time",
          version: "2.1.0",
          dependencies: { "@x/core": "2.1.0" },
        },
      },
      { ".changeset/fox.md": both },
    );
    const result = check(
      "D\t.changeset/owls.md\nM\tpackages/core/package.json\nM\tpackages/time/package.json\n",
      head,
      before,
    );
    expect(result).toMatchObject({ ok: false, release: false });
    expect(result.recordProblems).toEqual([
      'it leaves ".changeset/fox.md" unconsumed',
    ]);
  });
  it("passes a full consumption with every version where the lines put it", () => {
    const head = tree({
      core: { name: "@x/core", version: "2.1.0" },
      time: {
        name: "@x/time",
        version: "2.1.0",
        dependencies: { "@x/core": "2.1.0" },
      },
    });
    const result = check(
      "D\t.changeset/owls.md\nD\t.changeset/fox.md\nM\tpackages/core/package.json\nA\tpackages/core/CHANGELOG.md\nM\tpackages/time/package.json\nM\tpnpm-lock.yaml\n",
      head,
      before,
    );
    expect(result).toMatchObject({ ok: true, release: true });
    // A source change can't ride along with one.
    const sneaky = check(
      "D\t.changeset/owls.md\nD\t.changeset/fox.md\nM\tpackages/core/package.json\nM\tpackages/time/package.json\nM\tpackages/core/src/a.ts\n",
      head,
      before,
    );
    expect(sneaky).toMatchObject({ ok: false, release: false });
  });
  it("tells what changeset version writes in a manifest from anything else", () => {
    const siblings = new Map([["@x/core", "1.1.0"]]);
    expect(
      manifestChanges(
        { version: "1.0.0", dependencies: { "@x/core": "1.0.0", a: "1" } },
        { version: "1.1.0", dependencies: { "@x/core": "1.1.0", a: "1" } },
        siblings,
      ),
    ).toEqual([]);
    expect(
      manifestChanges(
        { version: "1.0.0", dependencies: { a: "1" }, files: ["dist"] },
        { version: "1.0.0", dependencies: { a: "2" }, files: ["dist", "src"] },
        siblings,
        { version: false },
      ),
    ).toEqual(["dependencies.a", "files"]);
    // A sibling's range moves only to that sibling's exact new version, in
    // every dependency field, devDependencies included.
    expect(
      manifestChanges(
        { devDependencies: { "@x/core": "1.0.0" } },
        { devDependencies: { "@x/core": "^1.0.0" } },
        siblings,
        { version: false },
      ),
    ).toEqual(["devDependencies.@x/core"]);
  });
});

/** Runs git in `cwd`, with a throwaway identity. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "user.name=test", "-c", "user.email=test@example.invalid", ...args],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
}

/**
 * A small workspace in the repository's shape, as a git repository: an
 * umbrella and a core package in one fixed group, an experimental
 * package, the root's exact dev dependency on the umbrella, and the
 * pending changesets given. Changesets runs in it from this repository's
 * node_modules.
 */
function workspace(
  stable: string,
  changesets: Record<string, string>,
): { root: string; base: string } {
  const root = mkdtempSync(join(tmpdir(), "cesium-record-"));
  const write = (path: string, value: unknown) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(
      join(root, path),
      typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`,
    );
  };
  write(".gitignore", "node_modules\n");
  write("package.json", {
    name: "ws",
    private: true,
    workspaces: ["packages/*"],
    devDependencies: { "@x/next": stable },
  });
  write("package-lock.json", {
    name: "ws",
    lockfileVersion: 3,
    requires: true,
    packages: {},
  });
  write("packages/core/package.json", {
    name: "@x/core",
    version: stable,
    private: true,
  });
  write("packages/cesium/package.json", {
    name: "@x/next",
    version: stable,
    private: true,
    dependencies: { "@x/core": stable },
  });
  write("packages/lab/package.json", {
    name: "@x/lab",
    version: pairedVersion(stable),
    private: true,
    dependencies: { "@x/core": stable },
  });
  write(".changeset/config.json", {
    changelog: "@changesets/cli/changelog",
    commit: false,
    access: "public",
    baseBranch: "main",
    fixed: [["@x/next", "@x/core"]],
    linked: [],
    ignore: [],
    privatePackages: { version: true, tag: false },
    updateInternalDependencies: "patch",
  });
  write(".changeset/README.md", "# Changesets\n");
  for (const [name, text] of Object.entries(changesets)) {
    write(`.changeset/${name}`, text);
  }
  symlinkSync(join(repo, "node_modules"), join(root, "node_modules"), "dir");
  git(root, "init", "-q", "-b", "main");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "base");
  return { root, base: git(root, "rev-parse", "HEAD").trim() };
}

describe("a release record as release:version writes it", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });
  const changesets = {
    "brave-owls.md": '---\n"@x/core": minor\n---\n\nViews gain a thing.\n',
    "lab-fox.md": '---\n"@x/lab": patch\n---\n\nThe lab gains a mode.\n',
  };

  it("passes the record check, the changeset rule and the release workflow's push check", () => {
    const { root, base } = workspace("2.0.0", changesets);
    roots.push(root);
    expect(
      writeReleaseRecord(root, { lockfile: false, log: () => {} }),
    ).toEqual({ before: "2.0.0", after: "2.1.0" });
    const manifest = (folder: string) =>
      JSON.parse(
        readFileSync(join(root, "packages", folder, "package.json"), "utf8"),
      );
    expect(manifest("cesium").version).toBe("2.1.0");
    expect(manifest("lab").version).toBe("0.201.0");
    // Changesets itself moves the root's exact dev dependency.
    expect(
      JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
        .devDependencies,
    ).toEqual({ "@x/next": "2.1.0" });
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "the record");
    const head = git(root, "rev-parse", "HEAD").trim();
    const changed = changedPaths(base, head, root);
    expect(
      releaseRecordProblems(changed, gitTree(base, root), gitTree(head, root)),
    ).toEqual([]);
    expect(
      checkChangesets(changed, gitTree(base, root), gitTree(head, root)),
    ).toMatchObject({ ok: true, release: true });
    const log: string[] = [];
    expect(
      pushIsRelease(base, head, { cwd: root, log: (l) => log.push(l) }),
    ).toEqual({ release: true, version: "2.1.0", sha: head });

    // Not a release: a malformed before, a push of no commits, a version
    // already tagged, and a version npm already has.
    const no = (before: string, published = () => false) =>
      pushIsRelease(before, head, { cwd: root, log: () => {}, published })
        .release;
    expect(no("--output=x")).toBe(false);
    // A new branch's first push (no before, or all zeros): it can't tell
    // what the push adds, so it fails unless the head's version is out.
    for (const before of ["", "0".repeat(40)]) {
      expect(() => no(before)).toThrow(
        /has no before commit \(a new branch\), so this can't tell whether it holds a release record, and the head's version 2\.1\.0 has no tag/,
      );
      expect(no(before, () => true)).toBe(false);
    }
    // A before missing from the clone: it can't tell, so it fails unless
    // the head's version is already out.
    expect(() => no("1".repeat(40))).toThrow(
      /isn't in the clone .*can't tell whether the push holds a release record/,
    );
    expect(no("1".repeat(40), () => true)).toBe(false);
    expect(no(head)).toBe(false);
    expect(no(base, () => true)).toBe(false);
    git(root, "tag", "v2.1.0");
    expect(no(base)).toBe(false);
  });
  it("moves pnpm's lockfile with the versions, in a pnpm workspace (CS-1091)", () => {
    const { root } = workspace("2.0.0", changesets);
    roots.push(root);
    // The workspace as this repository has it since CS-1091: pnpm's
    // workspace file and lockfile, no package-lock.json, and the pnpm the
    // repository pins (so corepack, where it runs pnpm, needs no download).
    rmSync(join(root, "package-lock.json"));
    writeFileSync(
      join(root, "pnpm-workspace.yaml"),
      'packages:\n  - "packages/*"\nlinkWorkspacePackages: true\n',
    );
    const rootManifest = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    );
    rootManifest.packageManager = JSON.parse(
      readFileSync(join(repo, "package.json"), "utf8"),
    ).packageManager;
    writeFileSync(
      join(root, "package.json"),
      `${JSON.stringify(rootManifest, null, 2)}\n`,
    );
    const pnpm = (cwd: string) =>
      execFileSync("pnpm", ["install", "--lockfile-only", "--ignore-scripts"], {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    pnpm(root);
    const specifiers = () =>
      [
        ...readFileSync(join(root, "pnpm-lock.yaml"), "utf8").matchAll(
          /'@x\/(core|next)':\n {8}specifier: (\S+)/g,
        ),
      ].map(([, name, version]) => `${name} ${version}`);
    expect(specifiers()).toContain("core 2.0.0");
    expect(writeReleaseRecord(root, { log: () => {} })).toEqual({
      before: "2.0.0",
      after: "2.1.0",
    });
    // Every workspace specifier moved with the versions, through pnpm, and
    // npm wrote no lockfile of its own.
    expect(specifiers().length).toBeGreaterThan(0);
    expect(specifiers().every((s) => s.endsWith(" 2.1.0"))).toBe(true);
    expect(existsSync(join(root, "package-lock.json"))).toBe(false);
    // Two pnpm runs and two changeset runs: past 30 s under a full suite.
  }, 120_000);
  it("fails a record with one changeset put back (a partial consumption)", () => {
    const { root, base } = workspace("2.0.0", changesets);
    roots.push(root);
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    git(root, "checkout", base, "--", ".changeset/lab-fox.md");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "a partial record");
    const head = git(root, "rev-parse", "HEAD").trim();
    expect(
      releaseRecordProblems(
        changedPaths(base, head, root),
        gitTree(base, root),
        gitTree(head, root),
      ),
    ).toEqual(['it leaves ".changeset/lab-fox.md" unconsumed']);
  });
  it("fails the bypass: one changeset deleted and a package's exports changed", () => {
    const { root, base } = workspace("2.0.0", changesets);
    roots.push(root);
    rmSync(join(root, ".changeset", "lab-fox.md"));
    const path = join(root, "packages", "core", "package.json");
    const core = JSON.parse(readFileSync(path, "utf8"));
    writeFileSync(
      path,
      JSON.stringify({ ...core, exports: { ".": "./dist/x.js" } }, null, 2),
    );
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "the bypass");
    const head = git(root, "rev-parse", "HEAD").trim();
    const result = checkChangesets(
      changedPaths(base, head, root),
      gitTree(base, root),
      gitTree(head, root),
    );
    expect(result).toMatchObject({ ok: false, release: false });
    expect(
      pushIsRelease(base, head, { cwd: root, log: () => {} }).release,
    ).toBe(false);
  });
  it("refuses, with the tree untouched, a minor of 100 and a release that leaves the stable version", () => {
    const status = (root: string) =>
      git(root, "status", "--porcelain", "--untracked-files=all");
    const high = workspace("2.99.0", {
      "brave-owls.md": changesets["brave-owls.md"],
    });
    roots.push(high.root);
    expect(() =>
      writeReleaseRecord(high.root, { lockfile: false, log: () => {} }),
    ).toThrow(/2\.100\.0, which can't pair/);
    expect(status(high.root)).toBe("");
    const lab = workspace("2.0.0", { "lab-fox.md": changesets["lab-fox.md"] });
    roots.push(lab.root);
    expect(() =>
      writeReleaseRecord(lab.root, { lockfile: false, log: () => {} }),
    ).toThrow(/would stay at 2\.0\.0/);
    expect(status(lab.root)).toBe("");
    expect(planProblem({ before: "2.0.0", after: "2.0.1" })).toBeUndefined();
  });
  it("reads a path with é from git unquoted", () => {
    const { root, base } = workspace("2.0.0", changesets);
    roots.push(root);
    mkdirSync(join(root, "packages", "core", "src"));
    writeFileSync(join(root, "packages", "core", "src", "café.ts"), "");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "é");
    const head = git(root, "rev-parse", "HEAD").trim();
    expect(changedPaths(base, head, root)).toEqual([
      { status: "A", path: "packages/core/src/café.ts" },
    ]);
    expect(
      checkChangesets(
        changedPaths(base, head, root),
        gitTree(base, root),
        gitTree(head, root),
      ),
    ).toMatchObject({ ok: false, touched: ["@x/core"] });
  });
});

/** Writes `text` at `path` in `root`. */
function put(root: string, path: string, text: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

/** Commits everything in `root`; returns the commit. */
function commitAll(root: string, message: string): string {
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", message);
  return git(root, "rev-parse", "HEAD").trim();
}

describe("a push of several commits (a bundle from another machine)", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });
  const pending = {
    "brave-owls.md": '---\n"@x/core": minor\n---\n\nViews gain a thing.\n',
  };
  const coreChangeset = '---\n"@x/core": patch\n---\n\nViews draw faster.\n';
  const quiet = { log: () => {} };

  it("finds the record in the middle of three commits and names its commit", () => {
    const { root, base } = workspace("2.0.0", pending);
    roots.push(root);
    put(root, "notes.md", "outside the packages\n");
    commitAll(root, "a note");
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const record = commitAll(root, "the record");
    put(root, "packages/core/src/view.ts", "export {};\n");
    put(root, ".changeset/quick-cats.md", coreChangeset);
    const head = commitAll(root, "a change, with its changeset");
    const log: string[] = [];
    expect(
      pushIsRelease(base, head, { cwd: root, log: (l) => log.push(l) }),
    ).toEqual({ release: true, version: "2.1.0", sha: record });
    expect(log.at(-1)).toMatch(/at [0-9a-f]{40} \(commit 2 of the push's 3\)/);
    // The changeset rule judges the record alone and the rest as changes.
    const parts = checkParts(base, head, root);
    expect(parts.map((p) => [p.record, p.result.ok])).toEqual([
      [false, true],
      [true, true],
      [false, true],
    ]);
    expect(parts[1]).toMatchObject({ to: record, commits: 1 });
  });
  it("refuses two records in one push, naming both", () => {
    const { root, base } = workspace("2.0.0", pending);
    roots.push(root);
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const first = commitAll(root, "the first record");
    put(root, "packages/core/src/view.ts", "export {};\n");
    put(root, ".changeset/quick-cats.md", coreChangeset);
    commitAll(root, "a change, with its changeset");
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const second = commitAll(root, "the second record");
    expect(() => pushIsRelease(base, second, { cwd: root, ...quiet })).toThrow(
      new RegExp(
        `holds 2 release records, ${first} \\(2\\.1\\.0\\) and ${second} \\(2\\.1\\.1\\)`,
      ),
    );
  });
  it("is not a release when no commit is a record", () => {
    const { root, base } = workspace("2.0.0", pending);
    roots.push(root);
    put(root, "notes.md", "outside the packages\n");
    commitAll(root, "a note");
    put(root, "packages/core/src/view.ts", "export {};\n");
    put(root, ".changeset/quick-cats.md", coreChangeset);
    const head = commitAll(root, "a change, with its changeset");
    const log: string[] = [];
    expect(
      pushIsRelease(base, head, { cwd: root, log: (l) => log.push(l) }),
    ).toEqual({ release: false, version: "2.0.0", sha: "" });
    expect(log.at(-1)).toMatch(/none of the push's 2 commit\(s\) is one/);
  });
  it("fails, rather than ends green, for a commit that moves the version up without being a record", () => {
    const { root, base } = workspace("2.0.0", pending);
    roots.push(root);
    // A record that landed after a new changeset: it leaves that one.
    put(root, ".changeset/quick-cats.md", coreChangeset);
    commitAll(root, "a changeset");
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    git(root, "checkout", "HEAD", "--", ".changeset/quick-cats.md");
    const head = commitAll(root, "a stale record");
    expect(() => pushIsRelease(base, head, { cwd: root, ...quiet })).toThrow(
      /moves the umbrella's version up to 2\.1\.0 but isn't a release record: it leaves "\.changeset\/quick-cats\.md" unconsumed/,
    );
  });
  it("judges a batch's runs of commits together, and fails a run without its changeset", () => {
    const { root, base } = workspace("2.0.0", pending);
    roots.push(root);
    // A branch's commits land one by one, the changeset in the last.
    put(root, "packages/core/src/view.ts", "export {};\n");
    commitAll(root, "a change");
    put(root, ".changeset/quick-cats.md", coreChangeset);
    commitAll(root, "its changeset; done");
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const record = commitAll(root, "the record");
    put(root, "packages/core/src/draw.ts", "export {};\n");
    const head = commitAll(root, "a change without a changeset");
    expect(changeParts(base, head, root).map((p) => p.commits)).toEqual([
      2, 1, 1,
    ]);
    const parts = checkParts(base, head, root);
    expect(parts.map((p) => p.result.ok)).toEqual([true, true, false]);
    expect(parts[1]).toMatchObject({ record: true, to: record });
    expect(parts[2]!.result.problem).toMatch(
      /touches @x\/core and adds no changeset/,
    );
  });
  it("finds a record under a merge made by git pull (a foxtrot merge)", () => {
    const { root, base } = workspace("2.0.0", pending);
    roots.push(root);
    // Origin moved on: its tip is the push's before commit.
    put(root, "notes.md", "on origin\n");
    const before = commitAll(root, "origin's commit");
    // The local line wrote the record from the older base, then pulled.
    git(root, "checkout", "-q", "-b", "local", base);
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const record = commitAll(root, "the record");
    git(root, "merge", "-q", "--no-edit", before);
    const head = git(root, "rev-parse", "HEAD").trim();
    // The merge's first parent is the local line, so that line never
    // reaches the before commit.
    expect(git(root, "rev-parse", `${head}^1`).trim()).toBe(record);
    expect(git(root, "rev-parse", `${head}^2`).trim()).toBe(before);
    expect(pushIsRelease(before, head, { cwd: root, ...quiet })).toEqual({
      release: true,
      version: "2.1.0",
      sha: record,
    });
  });
  it("finds a record after a force push, among the commits the head adds", () => {
    const { root, base } = workspace("2.0.0", pending);
    roots.push(root);
    put(root, "notes.md", "dropped by the force push\n");
    const before = commitAll(root, "a commit the force push drops");
    git(root, "checkout", "-q", "-b", "rewritten", base);
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const record = commitAll(root, "the record");
    put(root, "notes.md", "rewritten\n");
    const head = commitAll(root, "a later commit");
    const log: string[] = [];
    expect(
      pushIsRelease(before, head, { cwd: root, log: (l) => log.push(l) }),
    ).toEqual({ release: true, version: "2.1.0", sha: record });
    expect(log[0]).toMatch(
      /isn't an ancestor .*judging the commits the head adds/,
    );
  });
  it("counts a record once when a merge brings in the branch that holds it", () => {
    const { root, base } = workspace("2.0.0", pending);
    roots.push(root);
    git(root, "checkout", "-q", "-b", "release", base);
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const record = commitAll(root, "the record");
    git(root, "checkout", "-q", "main");
    git(root, "merge", "-q", "--no-ff", "--no-edit", "release");
    const head = git(root, "rev-parse", "HEAD").trim();
    expect(pushIsRelease(base, head, { cwd: root, ...quiet })).toEqual({
      release: true,
      version: "2.1.0",
      sha: record,
    });
  });
  it("doesn't stage a record the head reverts, in the push or after it", () => {
    const { root, base } = workspace("2.0.0", pending);
    roots.push(root);
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const record = commitAll(root, "the record");
    git(root, "revert", "--no-edit", record);
    const head = git(root, "rev-parse", "HEAD").trim();
    const log: string[] = [];
    expect(
      pushIsRelease(base, head, { cwd: root, log: (l) => log.push(l) }),
    ).toEqual({ release: false, version: "2.0.0", sha: "" });
    expect(log.at(-1)).toMatch(
      /a release record for 2\.1\.0, but the head is at 2\.0\.0, below it: a later commit reverts it/,
    );
    // The record landed alone, and a later push reverts it.
    expect(pushIsRelease(record, head, { cwd: root, ...quiet }).release).toBe(
      false,
    );
  });
  it("fails, rather than ends green, when the version went up and no record is found", () => {
    const { root, base } = workspace("2.0.0", pending);
    roots.push(root);
    // The record and its revert, then a force push to a merge that
    // carries the record's version from a side the old tip already holds.
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const record = commitAll(root, "the record");
    git(root, "revert", "--no-edit", record);
    const before = git(root, "rev-parse", "HEAD").trim();
    git(root, "checkout", "-q", "-b", "other", base);
    put(root, "notes.md", "a note\n");
    commitAll(root, "a note");
    git(root, "merge", "-q", "--no-edit", record);
    const head = git(root, "rev-parse", "HEAD").trim();
    expect(() => pushIsRelease(before, head, { cwd: root, ...quiet })).toThrow(
      /none of the push's 2 commit\(s\) is one, yet the umbrella's version goes from 2\.0\.0 to 2\.1\.0, with no v2\.1\.0 tag and not on npm/,
    );
    // Green once that version is out.
    expect(
      pushIsRelease(before, head, {
        cwd: root,
        ...quiet,
        published: () => true,
      }).release,
    ).toBe(false);
  });
  it("skips a stale record a merged side branch carries, alone and beside a real one", () => {
    const { root, base } = workspace("2.0.0", pending);
    roots.push(root);
    // R (2.1.0) is written locally, and a side branch forks from it.
    git(root, "checkout", "-q", "-b", "local", base);
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const stale = commitAll(root, "the record, before the rebase");
    git(root, "checkout", "-q", "-b", "side", stale);
    put(root, "notes.md", "on the side branch\n");
    commitAll(root, "a side change");
    // The push is rejected, so `pull --rebase` rewrites R to R′, which
    // lands on main and releases.
    git(root, "checkout", "-q", "main");
    // `-x` notes the original in the message, so R′ is another commit
    // even in the same second.
    git(root, "cherry-pick", "-x", stale);
    const rewritten = git(root, "rev-parse", "HEAD").trim();
    expect(rewritten).not.toBe(stale);
    // Main reaches 2.1.1 with a real record.
    put(root, ".changeset/quick-cats.md", coreChangeset);
    commitAll(root, "a changeset");
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const record = commitAll(root, "the 2.1.1 record");
    // Later, the side branch, still carrying R, merges.
    git(root, "merge", "-q", "--no-edit", "-X", "ours", "side");
    const head = git(root, "rev-parse", "HEAD").trim();
    expect(
      gitTree(head, root).packages.map((p) => p.manifest.version),
    ).toContain("2.1.1");
    // Alone: the merge comes after the 2.1.1 record has landed.
    const log: string[] = [];
    expect(
      pushIsRelease(record, head, { cwd: root, log: (l) => log.push(l) }),
    ).toEqual({ release: false, version: "2.1.1", sha: "" });
    expect(log).toContainEqual(
      expect.stringMatching(
        new RegExp(
          `${stale}: a release record for 2\\.1\\.0, at or below the before commit's 2\\.1\\.1, and not built on the before commit; a stale copy from a merged side branch, skipped`,
        ),
      ),
    );
    // The closing list names it too, with a reason, never an empty one.
    expect(log).toContainEqual(
      `record: ${stale}: a release record for 2.1.0, skipped as stale (above)`,
    );
    expect(log.filter((l) => /: $/.test(l))).toEqual([]);
    // Beside a real record in the same push: R is at R′'s 2.1.0, the
    // before commit's version, so only the 2.1.1 record counts.
    expect(pushIsRelease(rewritten, head, { cwd: root, ...quiet })).toEqual({
      release: true,
      version: "2.1.1",
      sha: record,
    });
    // Once R′'s 2.1.0 is tagged, R and R′ are out even above the before
    // commit's version.
    git(root, "tag", "v2.1.0", rewritten);
    expect(pushIsRelease(base, head, { cwd: root, ...quiet })).toEqual({
      release: true,
      version: "2.1.1",
      sha: record,
    });
    // A force push keeps today's check, and says to leave a released
    // record as it is, not to revert it.
    git(root, "checkout", "-q", "-b", "dropped", base);
    put(root, "notes.md", "dropped by the force push\n");
    const dropped = commitAll(root, "a commit the force push drops");
    let message = "";
    try {
      pushIsRelease(dropped, head, { cwd: root, ...quiet });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/holds 3 release records/);
    expect(message).toMatch(
      new RegExp(
        `${rewritten} \\(2\\.1\\.0\\) and ${stale} \\(2\\.1\\.0\\) are already tagged or on npm: leave them as they are`,
      ),
    );
    expect(message).toMatch(/none can release: revert the other, then/);
    expect(message).not.toMatch(/revert both/);
  });
  it("stages a new record at a failed record's version, pushed with that record's revert", () => {
    const { root } = workspace("2.0.0", pending);
    roots.push(root);
    // S lands alone, and its run fails: nothing is tagged or on npm.
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const failed = commitAll(root, "the record S, whose run failed");
    // One push: S's revert, then a new record R2 at S's version.
    git(root, "revert", "--no-edit", failed);
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const record = commitAll(root, "the record R2");
    expect(
      gitTree(record, root).packages.map((p) => p.manifest.version),
    ).toContain("2.1.0");
    const log: string[] = [];
    expect(
      pushIsRelease(failed, record, { cwd: root, log: (l) => log.push(l) }),
    ).toEqual({ release: true, version: "2.1.0", sha: record });
    expect(log.filter((l) => /stale/.test(l))).toEqual([]);
  });
  it("stages a new record pushed with a landed record's revert, and a later commit", () => {
    const { root } = workspace("2.0.0", pending);
    roots.push(root);
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const first = commitAll(root, "the record R1");
    // One push: R1's revert, a new record R2, and a later change.
    git(root, "revert", "--no-edit", first);
    writeReleaseRecord(root, { lockfile: false, log: () => {} });
    const record = commitAll(root, "the record R2");
    put(root, "notes.md", "after the record\n");
    const head = commitAll(root, "a later note");
    expect(pushIsRelease(first, head, { cwd: root, ...quiet })).toEqual({
      release: true,
      version: "2.1.0",
      sha: record,
    });
    // Once 2.1.0 is out, the same push is green and stages nothing.
    git(root, "tag", "v2.1.0", first);
    expect(pushIsRelease(first, head, { cwd: root, ...quiet }).release).toBe(
      false,
    );
  });
  it("splits a push's runs at merge commits, so one branch can't pass on another's changeset", () => {
    const { root, base } = workspace("2.0.0", pending);
    roots.push(root);
    // One branch changes @x/core with no changeset; another adds one.
    git(root, "checkout", "-q", "-b", "change", base);
    put(root, "packages/core/src/view.ts", "export {};\n");
    commitAll(root, "a change, no changeset");
    git(root, "checkout", "-q", "-b", "changeset", base);
    put(root, ".changeset/quick-cats.md", coreChangeset);
    commitAll(root, "a changeset alone");
    git(root, "checkout", "-q", "main");
    git(root, "merge", "-q", "--no-ff", "--no-edit", "change");
    git(root, "merge", "-q", "--no-ff", "--no-edit", "changeset");
    const head = git(root, "rev-parse", "HEAD").trim();
    // Judged as one run, the two branches pass together.
    expect(checkParts(base, head, root).map((p) => p.result.ok)).toEqual([
      true,
    ]);
    const parts = checkParts(base, head, root, { splitMerges: true });
    expect(parts.map((p) => [p.merge, p.result.ok])).toEqual([
      [true, false],
      [true, true],
    ]);
    expect(parts[0]!.result.problem).toMatch(
      /touches @x\/core and adds no changeset/,
    );
  });
});

describe("workflow commands in the release scripts' logs", () => {
  it("stops workflow commands around the run in GitHub Actions, with a fresh token", () => {
    const lines: string[] = [];
    const write = (line: string) => lines.push(line);
    expect(
      withCommandsStopped(
        () => {
          write("::error::a path's newline\n");
          return 7;
        },
        { GITHUB_ACTIONS: "true" },
        write,
      ),
    ).toBe(7);
    const token = /^::stop-commands::([0-9a-f-]{36})\n$/.exec(lines[0]!)?.[1];
    expect(token).toBeDefined();
    expect(lines.at(-1)).toBe(`::${token}::\n`);
    // A second run takes another token; outside Actions, nothing is added.
    const again: string[] = [];
    withCommandsStopped(
      () => {},
      { GITHUB_ACTIONS: "true" },
      (l) => again.push(l),
    );
    expect(again[0]).not.toContain(token!);
    const local: string[] = [];
    withCommandsStopped(
      () => {},
      {},
      (l) => local.push(l),
    );
    expect(local).toEqual([]);
  });
});

describe("the release scripts' output in GitHub Actions", () => {
  // Each run fails before it reads the network: the empty tree has no
  // umbrella, and a base that isn't a ref has no merge base.
  const run = (script: string, args: string[]) => {
    const env: NodeJS.ProcessEnv = { ...process.env, GITHUB_ACTIONS: "true" };
    delete env.GITHUB_OUTPUT;
    try {
      execFileSync("node", [join(repo, "scripts/release", script), ...args], {
        cwd: repo,
        env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return { status: 0, stdout: "", stderr: "" };
    } catch (error) {
      const e = error as { status: number; stdout: string; stderr: string };
      return { status: e.status, stdout: e.stdout, stderr: e.stderr };
    }
  };
  const emptyTree = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
  it.each([
    [
      "record.mjs",
      ["--before", "1".repeat(40), "--head", emptyTree],
      /record: the umbrella's version/,
    ],
    [
      "changesetCheck.mjs",
      ["--base", "refs/heads/no-such-branch-here"],
      /changesetCheck: .*merge-base/,
    ],
  ])(
    "%s writes its error to stdout, between the markers",
    (script, args, error) => {
      const { status, stdout, stderr } = run(script, args);
      expect(status).toBe(1);
      expect(stderr).toBe("");
      const lines = stdout.trimEnd().split("\n");
      const token = /^::stop-commands::([0-9a-f-]{36})$/.exec(lines[0]!)?.[1];
      expect(token).toBeDefined();
      expect(lines.at(-1)).toBe(`::${token}::`);
      expect(lines.slice(1, -1).join("\n")).toMatch(error);
    },
  );
  it("quotes paths in messages, so a newline can't start a line", () => {
    expect(quoted([".changeset/a.md", "packages/x/\n::error::y"])).toBe(
      '".changeset/a.md", "packages/x/\\n::error::y"',
    );
  });
});

describe("the earlier runs that packed a version", () => {
  const repository = "CesiumGS/cesium";
  const branch = "cesium-2.0-webgpu-poc";
  type Run = {
    id: number;
    workflow: string;
    head_repository: { full_name: string };
    head_branch: string;
    event: string;
    status: string;
    created_at: string;
    artifacts: { name: string; workflow_run: { id: number } | null }[];
    jobs: { name: string; status: string; conclusion: string | null }[];
  };
  const runOf = (id: number, fields: Partial<Run> = {}): Run => ({
    id,
    workflow: "release.yml",
    head_repository: { full_name: repository },
    head_branch: branch,
    event: "push",
    status: "completed",
    created_at: "2026-11-20T12:00:00Z",
    artifacts: [],
    jobs: [{ name: "publish", status: "completed", conclusion: "skipped" }],
    ...fields,
  });
  // The clock the tests read: the window starts 35 days before it.
  const now = Date.parse("2026-11-22T09:00:00Z");
  // A fake REST API: runs filtered by workflow file, branch, event and
  // creation date as GitHub filters them, every list paginated. `total`
  // replaces the runs list's `total_count` (a stale or a capped one), and
  // `cap` stops the list there, as GitHub's 1,000-result cap does.
  const api = (
    runs: Run[],
    options: {
      failOn?: RegExp;
      total?: (count: number) => number;
      cap?: number;
    } = {},
  ) => {
    const paths: string[] = [];
    const get = async (path: string) => {
      paths.push(path);
      if (options.failOn?.test(path)) {
        throw new Error(`GET ${path}: HTTP 502`);
      }
      const url = new URL(path, "https://api.invalid/");
      const per = Number(url.searchParams.get("per_page"));
      const page = Number(url.searchParams.get("page"));
      const slice = <T>(list: T[]) => list.slice((page - 1) * per, page * per);
      let m = /\/actions\/workflows\/([^/]+)\/runs$/.exec(url.pathname);
      if (m) {
        const since = /^>=(\d{4}-\d{2}-\d{2})$/.exec(
          url.searchParams.get("created") ?? "",
        );
        const list = runs
          .filter(
            (r) =>
              r.workflow === decodeURIComponent(m![1]!) &&
              r.head_branch === url.searchParams.get("branch") &&
              r.event === url.searchParams.get("event") &&
              (!since || r.created_at >= since[1]!),
          )
          .slice(0, options.cap ?? Infinity);
        return {
          total_count: options.total?.(list.length) ?? list.length,
          workflow_runs: slice(list),
        };
      }
      m = /\/actions\/runs\/(\d+)\/(artifacts|jobs)$/.exec(url.pathname);
      const run = runs.find((r) => r.id === Number(m?.[1]));
      if (m && run && m[2] === "artifacts") {
        const name = url.searchParams.get("name");
        const list = run.artifacts.filter((a) => a.name === name);
        return { total_count: list.length, artifacts: slice(list) };
      }
      if (m && run) {
        return { total_count: run.jobs.length, jobs: slice(run.jobs) };
      }
      throw new Error(`GET ${path}: HTTP 404`);
    };
    return { get, paths };
  };
  const packed = (id: number | null) => [
    { name: "npm-tarballs-2.1.0", workflow_run: id === null ? null : { id } },
  ];
  const read = (runs: Run[], runId = 999) =>
    earlierRuns({
      get: api(runs).get,
      repository,
      version: "2.1.0",
      runId,
      now,
    });

  it("ignores another workflow's artifact and a fork's run, so neither blocks a genuine publish", async () => {
    const staged = [
      { name: "publish", status: "completed", conclusion: "success" },
    ];
    const runs = [
      runOf(1, { workflow: "evil.yml", artifacts: packed(1), jobs: staged }),
      runOf(2, {
        head_repository: { full_name: "someone/fork" },
        artifacts: packed(2),
        jobs: staged,
      }),
      runOf(3, {
        artifacts: [{ name: "npm-tarballs-2.1.0-x", workflow_run: { id: 3 } }],
        jobs: staged,
      }),
      runOf(999, { artifacts: packed(999), status: "in_progress" }),
    ];
    expect(await read(runs)).toEqual([]);
    expect(earlierStagingProblem(await read(runs))).toBeUndefined();
  });
  it("finds a genuine earlier run on a second page, with an artifact whose workflow_run is null", async () => {
    const runs = Array.from({ length: 150 }, (_, i) => runOf(i + 1));
    runs[120] = runOf(121, {
      artifacts: packed(null),
      jobs: [{ name: "publish", status: "completed", conclusion: "success" }],
    });
    const { get, paths } = api(runs);
    const earlier = await earlierRuns({
      get,
      repository,
      version: "2.1.0",
      runId: 999,
      now,
    });
    expect(earlier).toEqual([
      { run: 121, status: "completed", conclusion: "success" },
    ]);
    // 35 days before 2026-11-22 is 2026-10-18, URL-encoded.
    expect(
      paths.filter((p) => p.includes("/workflows/release.yml/runs")),
    ).toEqual([
      `repos/${repository}/actions/workflows/release.yml/runs?branch=${branch}&event=push&created=%3E%3D2026-10-18&exclude_pull_requests=true&per_page=100&page=1`,
      `repos/${repository}/actions/workflows/release.yml/runs?branch=${branch}&event=push&created=%3E%3D2026-10-18&exclude_pull_requests=true&per_page=100&page=2`,
    ]);
    expect(earlierStagingProblem(earlier)).toMatch(/run 121 \(staged\)/);
  });
  it("counts a run still packing, reads every attempt's jobs, and URL-encodes the version", async () => {
    const runs = [
      runOf(5, {
        status: "in_progress",
        artifacts: [{ name: "npm-tarballs-2.1.0+b", workflow_run: { id: 5 } }],
        jobs: [],
      }),
    ];
    const { get, paths } = api(runs);
    const earlier = await earlierRuns({
      get,
      repository,
      version: "2.1.0+b",
      runId: 999,
      now,
    });
    expect(earlier).toEqual([
      { run: 5, status: "in_progress", conclusion: null },
    ]);
    expect(paths).toContain(
      `repos/${repository}/actions/runs/5/artifacts?name=npm-tarballs-2.1.0%2Bb&per_page=100&page=1`,
    );
    expect(paths).toContain(
      `repos/${repository}/actions/runs/5/jobs?filter=all&per_page=100&page=1`,
    );
    expect(earlierStagingProblem(earlier)).toMatch(/run 5 \(in_progress\)/);
  });
  const options = { repository, version: "2.1.0", runId: 999, now };
  it("reads every page when total_count is stale", async () => {
    const runs = Array.from({ length: 250 }, (_, i) => runOf(i + 1));
    runs[220] = runOf(221, {
      artifacts: packed(221),
      jobs: [{ name: "publish", status: "completed", conclusion: "success" }],
    });
    // A stale total_count, from before most runs were made.
    const stale = api(runs, { total: () => 100 });
    expect(await earlierRuns({ ...options, get: stale.get })).toEqual([
      { run: 221, status: "completed", conclusion: "success" },
    ]);
  });
  it("refuses a list that reaches GitHub's 1,000-result cap", async () => {
    // GitHub lists 1,000 of 1,050 runs, with total_count capped to match:
    // the 50 it leaves out could hold the run that staged this version.
    const many = Array.from({ length: 1050 }, (_, i) => runOf(i + 1));
    const capped = api(many, { cap: 1000 });
    await expect(earlierRuns({ ...options, get: capped.get })).rejects.toThrow(
      /reaches GitHub's cap of 1000 results/,
    );
    expect(
      capped.paths.filter((p) => p.includes("/workflows/release.yml/runs")),
    ).toHaveLength(10);
  });
  it("lists only runs from the last 35 days", async () => {
    const runs = [
      runOf(1, {
        created_at: "2026-10-01T12:00:00Z",
        artifacts: packed(1),
        jobs: [{ name: "publish", status: "completed", conclusion: "success" }],
      }),
      runOf(2, {
        created_at: "2026-10-18T00:30:00Z",
        artifacts: packed(2),
        jobs: [{ name: "publish", status: "waiting", conclusion: null }],
      }),
    ];
    const { get, paths } = api(runs);
    expect(
      await earlierRuns({ get, repository, version: "2.1.0", runId: 999, now }),
    ).toEqual([{ run: 2, status: "waiting", conclusion: null }]);
    // No GET for the old run's artifacts.
    expect(paths.some((p) => p.includes("/runs/1/"))).toBe(false);
    expect(createdSince(now)).toBe(">=2026-10-18");
  });
  it("fails closed on a page it can't read", async () => {
    const runs = Array.from({ length: 150 }, (_, i) => runOf(i + 1));
    const { get } = api(runs, { failOn: /page=2/ });
    await expect(
      earlierRuns({ get, repository, version: "2.1.0", runId: 999, now }),
    ).rejects.toThrow(/HTTP 502/);
    await expect(
      listAll(
        async () => ({ message: "Bad credentials" }),
        "repos/x/y/actions/runs/1/jobs",
        "jobs",
      ),
    ).rejects.toThrow(/has no jobs list/);
  });
});

describe("staging the checked tarballs", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  /** A folder with two tarballs and their release.json; returns its SHA-256. */
  const release = (version = "2.0.0-alpha.1", isPrivate = false) => {
    dir = mkdtempSync(join(tmpdir(), "cesium-stage-"));
    const packages = ["@x/core", "@x/next"].map((name) => {
      const folder = join(dir!, "src", name.replace("/", "-"));
      mkdirSync(join(folder, "package"), { recursive: true });
      writeFileSync(
        join(folder, "package", "package.json"),
        JSON.stringify({ name, version, private: isPrivate }),
      );
      const file = `${name.replace("@", "").replace("/", "-")}-${version}.tgz`;
      execFileSync("tar", ["-czf", join(dir!, file), "-C", folder, "package"]);
      return {
        name,
        version,
        file,
        sha256: sha256(readFileSync(join(dir!, file))),
      };
    });
    const text = `${JSON.stringify({ version, tag: distTag(version), packages })}\n`;
    writeFileSync(join(dir, "release.json"), text);
    return sha256(Buffer.from(text));
  };
  const runner = {
    GITHUB_ACTIONS: "true",
    ACTIONS_ID_TOKEN_REQUEST_URL: "https://token.invalid/",
  };
  const open = { ...runner, CESIUM_RELEASE_GATE: "reviewed" };
  /** The npm environment as the REST API returns it, guarded. */
  const guarded = {
    name: "npm",
    protection_rules: [
      { id: 1, type: "branch_policy" },
      {
        id: 2,
        type: "required_reviewers",
        prevent_self_review: false,
        reviewers: [{ type: "User", reviewer: { login: "owner" } }],
      },
    ],
    deployment_branch_policy: {
      protected_branches: false,
      custom_branch_policies: true,
    },
  };
  /** Its deployment branch policies: the 2.0 branch alone. */
  const policies = {
    total_count: 1,
    branch_policies: [
      { id: 3, node_id: "x", name: "cesium-2.0-webgpu-poc", type: "branch" },
    ],
  };
  const ok = {
    env: open,
    environment: guarded,
    branchPolicies: policies,
    earlier: [],
    log: () => {},
  };

  it("reads and writes tarballs only strictly inside a scratch folder", () => {
    const temp = realpathSync(tmpdir());
    expect(scratchFolder(join(tmpdir(), "x"), {})).toBe(join(temp, "x"));
    // RUNNER_TEMP counts in GitHub Actions only.
    expect(
      scratchFolder("/ci/tmp/npm", {
        GITHUB_ACTIONS: "true",
        RUNNER_TEMP: "/ci/tmp",
      }),
    ).toBe("/ci/tmp/npm");
    expect(() =>
      scratchFolder("/ci/tmp/npm", { RUNNER_TEMP: "/ci/tmp" }),
    ).toThrow(/isn't a folder inside a scratch folder/);
    // Never the temporary folder itself.
    expect(() => scratchFolder(tmpdir(), {})).toThrow(
      /isn't a folder inside a scratch folder/,
    );
    expect(() => scratchFolder(repo, {})).toThrow(
      /isn't a folder inside a scratch folder/,
    );
    expect(() => scratchFolder(join(tmpdir(), "..", "etc"), {})).toThrow(
      /isn't a folder inside a scratch folder/,
    );
  });
  it("follows a symbolic link planted in the temporary folder before comparing", () => {
    const temp = mkdtempSync(join(tmpdir(), "cesium-stage-"));
    dir = temp;
    const outside = mkdtempSync(join(repo, ".scratch-link-"));
    try {
      symlinkSync(outside, join(temp, "npm"), "dir");
      expect(() => scratchFolder(join(temp, "npm", "out"), {})).toThrow(
        /isn't a folder inside a scratch folder/,
      );
      expect(scratchFolder(join(temp, "real", "out"), {})).toBe(
        join(realpathSync(temp), "real", "out"),
      );
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
  it("stages only in GitHub Actions with an OIDC token, never from a machine", () => {
    expect(runnerProblem(runner)).toBeUndefined();
    expect(runnerProblem({})).toMatch(/never from a machine/);
    expect(runnerProblem({ GITHUB_ACTIONS: "true" })).toMatch(
      /never from a machine/,
    );
    const sum = release();
    const npm = vi.fn();
    expect(() =>
      stageTarballs(dir!, sum, {
        ...ok,
        env: { CESIUM_RELEASE_GATE: "reviewed" },
        npm,
      }),
    ).toThrow(/nothing staged: it stages only in release\.yml's publish job/);
    expect(npm).not.toHaveBeenCalled();
    // A dry run is the local path.
    expect(
      stageTarballs(dir!, sum, { env: {}, npm, log: () => {}, dryRun: true }),
    ).toHaveLength(2);
    expect(npm.mock.calls[0]![0]).toContain("--dry-run");
  });
  it("keeps the gate shut until the npm environment has a reviewer and a branch policy", () => {
    expect(environmentProblems(guarded, policies)).toEqual([]);
    // GitHub's environment names ignore case.
    expect(environmentProblems({ ...guarded, name: "NPM" }, policies)).toEqual(
      [],
    );
    // "Protected branches" lets any protected branch deploy, main included.
    expect(
      environmentProblems(
        {
          ...guarded,
          deployment_branch_policy: {
            protected_branches: true,
            custom_branch_policies: false,
          },
        },
        policies,
      ),
    ).toEqual([expect.stringMatching(/uses "protected branches"/)]);
    // Custom policies are read, and must be the 2.0 branch alone.
    expect(environmentProblems(guarded, undefined)).toEqual([
      expect.stringMatching(/branch policies couldn't be read \(no JSON\)/),
    ]);
    const branches = (...list: { name: string; type?: string }[]) =>
      environmentProblems(guarded, {
        total_count: list.length,
        branch_policies: list,
      });
    expect(branches()).toEqual([
      expect.stringMatching(/policies are none, not the branch/),
    ]);
    expect(branches({ name: "*", type: "branch" })).toEqual([
      expect.stringMatching(/policies are branch "\*", not/),
    ]);
    expect(
      branches({ name: "cesium-2.0-webgpu-poc", type: "tag" }),
    ).toHaveLength(1);
    expect(
      branches(
        { name: "cesium-2.0-webgpu-poc", type: "branch" },
        { name: "main", type: "branch" },
      ),
    ).toHaveLength(1);
    expect(environmentProblems(undefined)).toEqual([
      expect.stringMatching(/couldn't be read \(no JSON\)/),
    ]);
    expect(environmentProblems({ message: "Not Found" })).toEqual([
      expect.stringMatching(/couldn't be read \(got "Not Found"\)/),
    ]);
    // GitHub's environment, created on first use: no rules at all.
    expect(
      environmentProblems({
        name: "npm",
        protection_rules: [],
        deployment_branch_policy: null,
      }),
    ).toEqual([
      "the environment `npm` has no required reviewer",
      "the environment `npm` lets any branch deploy; limit it to cesium-2.0-webgpu-poc",
    ]);
    const sum = release();
    const npm = vi.fn();
    // The variable alone, as a repository variable would supply it.
    expect(() =>
      stageTarballs(dir!, sum, { ...ok, environment: undefined, npm }),
    ).toThrow(/the release gate is shut: the GitHub environment `npm`/);
    expect(npm).not.toHaveBeenCalled();
  });
  it("keeps the gate shut until the owner sets the npm environment's variable", () => {
    expect(gateProblem({})).toMatch(
      /CESIUM_RELEASE_GATE is not set.*step 1 of "What the owner sets up/,
    );
    expect(gateProblem({ CESIUM_RELEASE_GATE: "yes" })).toMatch(
      /"yes", not "reviewed"/,
    );
    expect(gateProblem(open)).toBeUndefined();
    const sum = release();
    const npm = vi.fn();
    expect(() => stageTarballs(dir!, sum, { ...ok, env: runner, npm })).toThrow(
      /the release gate is shut: CESIUM_RELEASE_GATE is not set/,
    );
    expect(npm).not.toHaveBeenCalled();
  });
  it("stages the tarballs in release.json's order once every sum matches", () => {
    const sum = release();
    const npm = vi.fn();
    expect(stageTarballs(dir!, sum, { ...ok, npm })).toEqual([
      "@x/core@2.0.0-alpha.1",
      "@x/next@2.0.0-alpha.1",
    ]);
    expect(npm.mock.calls.map(([args]) => args[2])).toEqual([
      "./x-core-2.0.0-alpha.1.tgz",
      "./x-next-2.0.0-alpha.1.tgz",
    ]);
    expect(npm.mock.calls[0]![0]).toContain("next");
  });
  it("refuses a release.json or a tarball whose sum isn't the one reported", () => {
    const sum = release();
    const npm = vi.fn();
    expect(() => stageTarballs(dir!, "0".repeat(64), { ...ok, npm })).toThrow(
      /release\.json's SHA-256 is/,
    );
    writeFileSync(join(dir!, "x-next-2.0.0-alpha.1.tgz"), "swapped");
    expect(() => stageTarballs(dir!, sum, { ...ok, npm })).toThrow(
      /x-next-2\.0\.0-alpha\.1\.tgz's SHA-256 is/,
    );
    expect(npm).not.toHaveBeenCalled();
  });
  it("refuses a private package, a wrong tag and a tarball that holds another package", () => {
    release("2.0.0", true);
    const manifest = JSON.parse(
      readFileSync(join(dir!, "release.json"), "utf8"),
    );
    const bytes = (file: string) => readFileSync(join(dir!, file));
    const inner = (file: string) =>
      file.includes("core")
        ? { name: "@x/core", version: "2.0.0", private: true }
        : { name: "@x/other", version: "2.0.0" };
    expect(tarballProblems({ ...manifest, tag: "next" }, bytes, inner)).toEqual(
      [
        "release.json's tag is next, not latest for 2.0.0",
        "@x/core is private; npm won't stage it, and making it public is the owner's step",
        "x-next-2.0.0.tgz holds @x/other@2.0.0, not @x/next@2.0.0",
      ],
    );
  });
  it("refuses before staging when an earlier run staged this version or is staging it", () => {
    expect(earlierStagingProblem([])).toBeUndefined();
    expect(
      earlierStagingProblem([
        { run: 11, status: "completed", conclusion: "failure" },
        { run: 12, status: "completed", conclusion: "cancelled" },
      ]),
    ).toBeUndefined();
    expect(
      earlierStagingProblem([
        { run: 11, status: "completed", conclusion: "success" },
        { run: 12, status: "waiting", conclusion: null },
      ]),
    ).toMatch(
      /^run 11 \(staged\), 12 \(waiting\) of release\.yml already staged/,
    );
    expect(earlierStagingProblem(undefined)).toMatch(/couldn't be read/);
    const sum = release();
    const npm = vi.fn();
    expect(() =>
      stageTarballs(dir!, sum, {
        ...ok,
        earlier: [{ run: 11, status: "completed", conclusion: "success" }],
        npm,
      }),
    ).toThrow(/nothing staged: run 11 \(staged\)/);
    expect(() =>
      stageTarballs(dir!, sum, { ...ok, earlier: undefined, npm }),
    ).toThrow(/nothing staged: the earlier runs .* couldn't be read/);
    expect(npm).not.toHaveBeenCalled();
    // npm's own refusal of a version already staged, on the first package.
    expect(() =>
      stageTarballs(dir!, sum, {
        ...ok,
        npm: () => {
          throw new Error("E409");
        },
      }),
    ).toThrow(/Nothing was staged before it.*staged or published already/);
  });
  it("names what it staged when a later package fails, for the owner to reject", () => {
    const sum = release();
    let calls = 0;
    const npm = () => {
      calls += 1;
      if (calls === 2) {
        throw new Error("E403");
      }
    };
    expect(() => stageTarballs(dir!, sum, { ...ok, npm })).toThrow(
      /staging @x\/next@2\.0\.0-alpha\.1 failed \(E403\)\. Already staged: @x\/core@2\.0\.0-alpha\.1; reject each on npm/,
    );
  });
});
