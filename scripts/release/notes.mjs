// The GitHub release's notes (CS-613): every package keeps Changesets'
// default CHANGELOG.md, and this gathers each package's section for one
// version into one page. A package whose section only says its siblings
// were updated, as a `fixed` group's members' sections do when the change
// was elsewhere, is named in one closing line instead of a section.
//
//   node scripts/release/notes.mjs [--version <v>] > notes.md
//
// The version defaults to the umbrella's (packages/cesium). The page goes
// to standard output.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repositoryPackages } from "./lines.mjs";

/**
 * The body of `changelog`'s `## <version>` section (the lines up to the
 * next `## ` heading, trimmed), or undefined when it has none.
 */
export function sectionFor(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start < 0) {
    return undefined;
  }
  let end = lines.findIndex((line, i) => i > start && /^## /.test(line));
  if (end < 0) {
    end = lines.length;
  }
  return lines.slice(start + 1, end).join("\n").trim();
}

/**
 * Whether a section says nothing but that its siblings were updated:
 * Changesets' "Updated dependencies" list, under its bump heading.
 */
export function onlyDependencyUpdates(section) {
  const kept = section
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line !== "" &&
        !/^### (Major|Minor|Patch) Changes$/.test(line) &&
        !/^- Updated dependencies(?: \[[^\]]*\])?$/.test(line) &&
        !/^- (?:@[\w.-]+\/)?[\w.-]+@\S+$/.test(line),
    );
  return kept.length === 0;
}

/** Each heading in a section one level down, so it nests under a package. */
function demote(section) {
  return section.replace(/^(#{3,5}) /gm, "#$1 ");
}

/**
 * The release's notes, as Markdown: a section per package with something
 * of its own to say, in the order given, then one line naming the rest. A
 * package's `version` is the heading its changelog has for this release
 * (the experimental line's paired number); it defaults to the release's.
 * @param {{ version: string, packages: { name: string, changelog: string | undefined, version?: string }[] }} release
 */
export function releaseNotes({ version, packages }) {
  const sections = [];
  const unchanged = [];
  const missing = [];
  for (const { name, changelog, version: own = version } of packages) {
    const section = changelog === undefined ? undefined : sectionFor(changelog, own);
    const label = own === version ? `\`${name}\`` : `\`${name}\` ${own}`;
    if (section === undefined) {
      missing.push(label);
    } else if (section === "" || onlyDependencyUpdates(section)) {
      unchanged.push(label);
    } else {
      sections.push(`## ${label}\n\n${demote(section)}`);
    }
  }
  const parts = [`# ${version}`];
  if (sections.length === 0) {
    parts.push("No package has changes of its own in this release.");
  }
  parts.push(...sections);
  if (unchanged.length > 0) {
    parts.push(
      `Released with no changes of their own: ${unchanged.join(", ")}.`,
    );
  }
  if (missing.length > 0) {
    parts.push(
      `No changelog section for this release: ${missing.join(", ")}.`,
    );
  }
  return `${parts.join("\n\n")}\n`;
}

/** Stable packages first, the umbrella first of all, then the experimental line. */
function order(packages) {
  const rank = (p) =>
    p.manifest.name === "@cesium/next" || p.manifest.name === "cesium"
      ? 0
      : p.line === "stable"
        ? 1
        : 2;
  return [...packages].sort(
    (a, b) => rank(a) - rank(b) || a.manifest.name.localeCompare(b.manifest.name),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const option = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const { packages } = repositoryPackages();
  const umbrella = packages.find((p) => p.dir.endsWith(join("packages", "cesium")));
  const version = option("--version") ?? umbrella?.manifest.version;
  if (!version) {
    console.error("notes: no version given and no umbrella package to read it from");
    process.exit(1);
  }
  const page = releaseNotes({
    version,
    packages: order(packages).map((p) => {
      const file = join(p.dir, "CHANGELOG.md");
      // The experimental line's sections are headed with its own number.
      return {
        name: p.manifest.name,
        changelog: existsSync(file) ? readFileSync(file, "utf8") : undefined,
        version: p.manifest.version,
      };
    }),
  });
  process.stdout.write(page);
}
