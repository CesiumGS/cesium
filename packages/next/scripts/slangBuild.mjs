// Compiles the engine's Slang shaders to the WGSL the engine loads
// (CESIUM2_WEBGPU_PLAN.md §3.4, "Slang-first, for real", step 2).
//
//   node scripts/slangBuild.mjs           regenerate src/shaders/generated/
//   node scripts/slangBuild.mjs --check   fail if any is out of date (CI)
//   node scripts/slangBuild.mjs a.slang   regenerate one (the Vite plugin)
//
// Each `.slang` under src/ that defines entry points (`[shader("…")]`)
// becomes `src/shaders/generated/<name>.wgsl`, every entry point in it,
// with its reflection (`<name>.json`: bindings and struct layouts by
// source name, for the TypeScript side). Files without entry points are
// modules (`import common;`), found on the include path. The generated
// files are checked in, so the library build, tests and readers need no
// compiler; slangc (pinned, `npm run setup`, or SLANGC) is needed only to
// change a shader.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { SLANG_VERSION, slangcPath } from "./slangTools.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = join(root, "src");
export const GENERATED = join(root, "src", "shaders", "generated");
/** Where `import name;` looks: the shaders' folder, then the source tree. */
const INCLUDES = [join(root, "src", "shaders"), SOURCES];

/** Every `.slang` under src/ (the generated folder and cesium.slang aside). */
export function slangSources() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (path !== GENERATED) {
          walk(path);
        }
      } else if (name.endsWith(".slang") && name !== "cesium.slang") {
        // cesium.slang is the custom shader contract, compiled at run time.
        out.push(path);
      }
    }
  };
  walk(SOURCES);
  return out.sort();
}

/** Whether a source defines entry points (else it is a module). */
export function definesEntryPoints(path) {
  return /\[\s*shader\s*\(/.test(readFileSync(path, "utf8"));
}

/** The modules a source imports (`import name;`), by name. */
function imports(path) {
  return [...readFileSync(path, "utf8").matchAll(/^\s*import\s+([\w.]+)\s*;/gm)].map(
    (m) => m[1],
  );
}

/** Entry sources that use `changed` (itself, or through imports). */
export function dependents(changed, sources = slangSources()) {
  const name = basename(changed, ".slang");
  const uses = new Map(sources.map((s) => [s, imports(s)]));
  const affected = new Set([resolve(changed)]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [source, names] of uses) {
      if (affected.has(source)) {
        continue;
      }
      const usesAffected = names.some(
        (n) =>
          n === name ||
          [...affected].some((a) => basename(a, ".slang") === n),
      );
      if (usesAffected) {
        affected.add(source);
        grew = true;
      }
    }
  }
  return [...affected].filter((s) => existsSync(s) && definesEntryPoints(s));
}

/** The header every generated file starts with. */
function header(source) {
  return `// Generated from ${relative(root, source)} by slangc ${SLANG_VERSION}
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
`;
}

/**
 * Compiles one entry source into `outDir`: `<name>.wgsl` and
 * `<name>.json`. Throws with slangc's messages on an error.
 */
export function compile(slangc, source, outDir = GENERATED) {
  const name = basename(source, ".slang");
  const temp = mkdtempSync(join(tmpdir(), "slang-build-"));
  try {
    const wgsl = join(temp, `${name}.wgsl`);
    const json = join(temp, `${name}.json`);
    execFileSync(
      slangc,
      [
        source,
        "-target",
        "wgsl",
        ...INCLUDES.flatMap((i) => ["-I", i]),
        "-reflection-json",
        json,
        "-o",
        wgsl,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, `${name}.wgsl`),
      header(source) + readFileSync(wgsl, "utf8"),
    );
    writeFileSync(join(outDir, `${name}.json`), readFileSync(json, "utf8"));
  } catch (e) {
    const message = String(e.stderr ?? e.message).trim();
    throw new Error(`${relative(root, source)}:\n${message}`, { cause: e });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const named = args.filter((a) => !a.startsWith("--")).map((a) => resolve(a));
  const slangc = slangcPath();
  if (!slangc) {
    console.error(
      "No slangc: run `npm run setup --workspace @cesium/next` (or set SLANGC).",
    );
    process.exit(2);
  }
  const sources = named.length
    ? [...new Set(named.flatMap((n) => dependents(n)))]
    : slangSources().filter(definesEntryPoints);
  if (!check) {
    for (const source of sources) {
      compile(slangc, source);
      console.log(`${relative(root, source)} → src/shaders/generated/${basename(source, ".slang")}.wgsl`);
    }
    return;
  }
  // --check: regenerate elsewhere and compare with what is checked in.
  const temp = mkdtempSync(join(tmpdir(), "slang-check-"));
  const stale = [];
  try {
    for (const source of sources) {
      compile(slangc, source, temp);
      for (const ext of [".wgsl", ".json"]) {
        const file = `${basename(source, ".slang")}${ext}`;
        const fresh = readFileSync(join(temp, file), "utf8");
        const kept = existsSync(join(GENERATED, file))
          ? readFileSync(join(GENERATED, file), "utf8")
          : undefined;
        if (fresh !== kept) {
          stale.push(file);
        }
      }
    }
    // Generated files without a source any more.
    const expected = new Set(
      sources.flatMap((s) => {
        const n = basename(s, ".slang");
        return [`${n}.wgsl`, `${n}.json`];
      }),
    );
    for (const file of existsSync(GENERATED) ? readdirSync(GENERATED) : []) {
      if (!expected.has(file) && file !== "README.md") {
        stale.push(`${file} (no source)`);
      }
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  if (stale.length) {
    console.error(
      `Generated shaders out of date (run \`npm run shaders --workspace @cesium/next\`):\n  ${stale.join("\n  ")}`,
    );
    process.exit(1);
  }
  console.log(`${sources.length} generated shaders up to date (slangc ${SLANG_VERSION}).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
