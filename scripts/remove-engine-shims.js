// @ts-check
/**
 * Migration step 2: fixes all imports that relied on engine forwarding shims,
 * then deletes the shim files.
 *
 * Two import patterns are handled:
 *   A) Relative imports inside packages/engine that resolve to a shim file
 *      → replaced with named imports from '@cesium/core'
 *   B) Named imports from '@cesium/engine' where the symbol is now in core
 *      → the core symbols move to '@cesium/core'; engine-only symbols stay
 *
 * Usage (from repo root):
 *   node scripts/remove-engine-shims.js [--dry-run]
 */

import { readFile, writeFile, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globby } from "globby";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

if (dryRun) {
  console.log("Dry run — no files will be written.\n");
}

/** @typedef {{ name: string, isPrivate: boolean }} ShimEntry */

/**
 * Find all forwarding shims in packages/engine/Source.
 * Returns a map from absolute path → ShimEntry.
 * @returns {Promise<Map<string, ShimEntry>>}
 */
async function buildShimMap() {
  const files = await globby("packages/engine/Source/**/*.js", {
    cwd: projectRoot,
  });
  /** @type {Map<string, ShimEntry>} */
  const shimMap = new Map();
  for (const rel of files) {
    const abs = path.join(projectRoot, rel);
    const src = await readFile(abs, "utf-8");
    if (src.includes('from "@cesium/core/Source/')) {
      shimMap.set(abs, {
        name: path.basename(rel, ".js"),
        isPrivate: src.includes("@private"),
      });
    }
  }
  console.log(`Found ${shimMap.size} shim files.\n`);
  return shimMap;
}

/**
 * Convert the specifiers of a shim-pointing default/named import into
 * @cesium/core specifier strings.  Returns null for namespace imports.
 *
 * @param {string} specifiers  raw specifier text, e.g. 'Foo' or '{ X, Y as Z }'
 * @param {string} coreExportName  the name exported by @cesium/core
 * @returns {string[] | null}
 */
function toCoreSpecifiers(specifiers, coreExportName) {
  specifiers = specifiers.trim();
  if (/^\*\s+as\s+\w+/.test(specifiers)) {
    return null;
  }

  const result = [];
  const braceIdx = specifiers.indexOf("{");
  const defaultPart =
    braceIdx >= 0
      ? specifiers.slice(0, braceIdx).replace(/,\s*$/, "").trim()
      : specifiers;

  if (defaultPart) {
    result.push(
      defaultPart === coreExportName
        ? coreExportName
        : `${coreExportName} as ${defaultPart}`,
    );
  }

  if (braceIdx >= 0) {
    const inner = specifiers.slice(braceIdx + 1, specifiers.lastIndexOf("}"));
    for (const s of inner.split(",")) {
      const t = s.trim();
      if (t) {
        result.push(t);
      }
    }
  }

  return result;
}

// Single-line relative import.
const RELATIVE_IMPORT_RE =
  /^(\s*)import\s+(.+?)\s+from\s+['"](\.[^'"]+)['"]\s*;?[ \t]*$/;
// Named import from @cesium/engine.
const ENGINE_IMPORT_RE =
  /^(\s*)import\s*\{([^}]+)\}\s*from\s+['"]@cesium\/engine['"]\s*;?[ \t]*$/;
// Existing @cesium/core named import to absorb when merging.
const CORE_IMPORT_RE =
  /^(\s*)import\s*\{([^}]+)\}\s*from\s+['"]@cesium\/core['"]\s*;?[ \t]*$/;

/**
 * Rewrite one source file.  Returns the new content or null if nothing changed.
 *
 * @param {string} src
 * @param {string} filePath  absolute path (used to resolve relative imports)
 * @param {Map<string, ShimEntry>} shimMap
 * @param {Set<string>} coreSymbolNames  symbol names now owned by @cesium/core
 * @returns {string | null}
 */
function rewrite(src, filePath, shimMap, coreSymbolNames) {
  const dir = path.dirname(filePath);
  const lines = src.split("\n");

  /** @type {string[]} */
  const coreSpecifiers = [];
  /** @type {Set<number>} lines to delete */
  const removeLines = new Set();
  /** @type {Map<number, string>} lines to replace with a new string */
  const replaceLines = new Map();
  let firstCoreLineIdx = -1;

  const markCore = (/** @type {number} */ i) => {
    if (firstCoreLineIdx === -1) {
      firstCoreLineIdx = i;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Absorb any existing @cesium/core import so we can merge into it.
    const coreMatch = line.match(CORE_IMPORT_RE);
    if (coreMatch) {
      for (const s of coreMatch[2].split(",")) {
        const t = s.trim();
        if (t) {
          coreSpecifiers.push(t);
        }
      }
      removeLines.add(i);
      markCore(i);
      continue;
    }

    // Pattern A: relative import resolving to a shim.
    const relMatch = line.match(RELATIVE_IMPORT_RE);
    if (relMatch) {
      const [, , specifiers, source] = relMatch;
      const resolved = path.resolve(
        dir,
        source.endsWith(".js") ? source : `${source}.js`,
      );
      const entry = shimMap.get(resolved);
      if (entry) {
        const specs = toCoreSpecifiers(specifiers, entry.name);
        if (specs === null) {
          console.warn(
            `  ⚠ Cannot convert namespace import in ${filePath}:\n    ${line}`,
          );
        } else {
          coreSpecifiers.push(...specs);
          removeLines.add(i);
          markCore(i);
        }
        continue;
      }
    }

    // Pattern B: named import from @cesium/engine; split by ownership.
    const engMatch = line.match(ENGINE_IMPORT_RE);
    if (engMatch) {
      const [, indent, specsStr] = engMatch;
      const all = specsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const forCore = all.filter((s) =>
        coreSymbolNames.has(s.split(/\s+as\s+/)[0].trim()),
      );
      const forEngine = all.filter(
        (s) => !coreSymbolNames.has(s.split(/\s+as\s+/)[0].trim()),
      );

      if (forCore.length > 0) {
        coreSpecifiers.push(...forCore);
        markCore(i);
        if (forEngine.length > 0) {
          replaceLines.set(
            i,
            `${indent}import { ${forEngine.join(", ")} } from "@cesium/engine";`,
          );
        } else {
          removeLines.add(i);
        }
      }
    }
  }

  if (coreSpecifiers.length === 0) {
    return null;
  }

  const seen = new Set();
  const uniqueSpecs = coreSpecifiers.filter((s) => !seen.has(s) && seen.add(s));
  const coreImportLine = `import { ${uniqueSpecs.join(", ")} } from "@cesium/core";`;

  const result = [];
  let inserted = false;

  for (let i = 0; i < lines.length; i++) {
    if (replaceLines.has(i)) {
      if (!inserted && i === firstCoreLineIdx) {
        result.push(coreImportLine);
        inserted = true;
      }
      result.push(/** @type {string} */ (replaceLines.get(i)));
      continue;
    }
    if (removeLines.has(i)) {
      if (!inserted) {
        result.push(coreImportLine);
        inserted = true;
      }
      continue;
    }
    result.push(lines[i]);
  }

  return result.join("\n");
}

async function main() {
  const shimMap = await buildShimMap();
  const coreSymbolNames = new Set([...shimMap.values()].map((e) => e.name));

  const targets = await globby(
    [
      "packages/engine/Source/**/*.js",
      "packages/engine/Specs/**/*.js",
      "packages/widgets/Source/**/*.js",
      "packages/widgets/Specs/**/*.js",
      "Specs/**/*.js",
    ],
    { cwd: projectRoot },
  );

  let rewriteCount = 0;

  for (const rel of targets) {
    const abs = path.join(projectRoot, rel);
    if (shimMap.has(abs)) {
      continue; // shim files are deleted below
    }

    const src = await readFile(abs, "utf-8");
    const rewritten = rewrite(src, abs, shimMap, coreSymbolNames);
    if (!rewritten) {
      continue;
    }

    if (dryRun) {
      console.log(`  Would rewrite: ${rel}`);
    } else {
      await writeFile(abs, rewritten, "utf-8");
      await execFileAsync("node_modules/.bin/prettier", ["--write", abs], {
        cwd: projectRoot,
      });
      console.log(`  Rewrote: ${rel}`);
    }
    rewriteCount++;
  }

  let privateCount = 0;
  for (const [abs, { isPrivate }] of shimMap) {
    const rel = path.relative(projectRoot, abs);
    // Shims tagged @private were intentionally absent from engine's public API
    // but remain public in @cesium/core — no action needed on the core file.
    if (isPrivate) {
      privateCount++;
    }

    if (dryRun) {
      console.log(`  Would delete: ${rel}`);
    } else {
      await unlink(abs);
      console.log(`  Deleted: ${rel}`);
    }
  }

  if (privateCount > 0) {
    console.log(
      `\nNote: ${privateCount} deleted shims were @private in engine but remain public in @cesium/core — no change needed.`,
    );
  }

  console.log(
    `\nDone. ${rewriteCount} files rewritten, ${shimMap.size} shims ${dryRun ? "would be " : ""}deleted.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
