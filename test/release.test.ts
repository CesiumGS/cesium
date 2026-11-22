// The release pipeline's scripts (CS-613): the two version lines
// (scripts/release/lines.mjs), the combined release notes
// (scripts/release/notes.mjs), the changeset rule's check
// (scripts/release/changesetCheck.mjs), the staging order
// (scripts/release/stage.mjs), and the repository's Changesets config.
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyPaired,
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
  checkChangesets,
  isChangeset,
  namedPackages,
  parseNameStatus,
} from "../scripts/release/changesetCheck.mjs";
import { publishOrder, stageArgs } from "../scripts/release/stage.mjs";

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
  it("keeps both lines consistent at the version the packages have now", () => {
    expect(lineProblems(packages, stable)).toEqual([]);
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
    expect(stageArgs("next", true)).toEqual([
      "stage",
      "publish",
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

describe("the changeset rule's check", () => {
  const packages = [
    { folder: "core", name: "@x/core" },
    { folder: "time", name: "@x/time" },
  ];
  const files: Record<string, string> = {
    ".changeset/brave-owls.md":
      '---\n"@x/core": minor\n---\n\nViews gain a thing users want.\n',
    ".changeset/quiet-fox.md": "---\n---\n",
    ".changeset/broken.md": "no front matter\n",
  };
  const read = (path: string) => files[path]!;
  const lines = (text: string) => parseNameStatus(text);

  it("names a changeset's packages, and none for an empty one", () => {
    expect(namedPackages(files[".changeset/brave-owls.md"]!)).toEqual([
      "@x/core",
    ]);
    expect(
      namedPackages(
        "---\n'@x/core': patch\n\"@x/time\": major\n---\n\nText.\n",
      ),
    ).toEqual(["@x/core", "@x/time"]);
    expect(namedPackages(files[".changeset/quiet-fox.md"]!)).toEqual([]);
    expect(() => namedPackages(files[".changeset/broken.md"]!)).toThrow(
      /front matter/,
    );
  });
  it("counts only .changeset/<name>.md, not its README or the pre-mode folder", () => {
    expect(isChangeset(".changeset/brave-owls.md")).toBe(true);
    expect(isChangeset(".changeset/README.md")).toBe(false);
    expect(isChangeset(".changeset/pre/brave-owls.md")).toBe(false);
    expect(isChangeset(".changeset/config.json")).toBe(false);
  });
  it("passes a change that touches no published package", () => {
    const result = checkChangesets(
      lines("M\ttest/a.test.ts\nM\tbench/x.mjs\n"),
      packages,
      read,
    );
    expect(result).toMatchObject({ ok: true, touched: [] });
  });
  it("fails a change to a package with no changeset, naming the package", () => {
    const result = checkChangesets(
      lines(
        "M\tpackages/core/src/a.ts\nA\tpackages/time/src/b.ts\nM\t.changeset/README.md\n",
      ),
      packages,
      read,
    );
    expect(result.ok).toBe(false);
    expect(result.touched).toEqual(["@x/core", "@x/time"]);
    expect(result.problem).toMatch(
      /touches @x\/core, @x\/time and adds no changeset/,
    );
  });
  it("passes a change to a package with a changeset, and says which packages none names", () => {
    const result = checkChangesets(
      lines(
        "M\tpackages/core/src/a.ts\nM\tpackages/time/src/b.ts\nA\t.changeset/brave-owls.md\n",
      ),
      packages,
      read,
    );
    expect(result).toMatchObject({
      ok: true,
      named: ["@x/core"],
      unnamed: ["@x/time"],
    });
  });
  it("passes a change to a package with an empty changeset", () => {
    const result = checkChangesets(
      lines("M\tpackages/core/src/a.ts\nA\t.changeset/quiet-fox.md\n"),
      packages,
      read,
    );
    expect(result).toMatchObject({ ok: true, named: [] });
  });
  it("fails a changeset without front matter", () => {
    const result = checkChangesets(
      lines("M\tpackages/core/src/a.ts\nA\t.changeset/broken.md\n"),
      packages,
      read,
    );
    expect(result.ok).toBe(false);
    expect(result.problem).toMatch(
      /broken\.md: a changeset starts with front matter/,
    );
  });
  it("passes a release record: changesets consumed, only manifests and changelogs changed", () => {
    const record = checkChangesets(
      lines(
        "D\t.changeset/brave-owls.md\nA\t.changeset/pre/brave-owls.md\nM\tpackages/core/package.json\nA\tpackages/core/CHANGELOG.md\nM\tpackages/time/package.json\nM\tpackage-lock.json\n",
      ),
      packages,
      read,
    );
    expect(record).toMatchObject({ ok: true, release: true });
    // A source change can't ride along with one.
    const sneaky = checkChangesets(
      lines(
        "D\t.changeset/brave-owls.md\nM\tpackages/core/package.json\nM\tpackages/core/src/a.ts\n",
      ),
      packages,
      read,
    );
    expect(sneaky).toMatchObject({ ok: false, release: false });
  });
});
