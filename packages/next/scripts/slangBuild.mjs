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
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { SLANG_VERSION, slangcPath } from "./slangTools.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = join(root, "src");
export const GENERATED = join(root, "src", "shaders", "generated");
/** The TypeScript layouts, from `layouts.slang`'s reflection. */
export const LAYOUTS_TS = join(root, "src", "render", "generated", "layouts.ts");
/** The surface boundary's description, from reflection (`boundaryTs`). */
export const BOUNDARY_TS = join(root, "src", "shaders", "generated", "boundary.ts");
/**
 * Where `import name;` looks: the folders holding modules (the shaders',
 * the atmosphere's), then the source tree.
 */
const INCLUDES = [join(root, "src", "shaders"), join(root, "src", "atmosphere"), SOURCES];

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
  // cesium.slang isn't imported by the engine, but the boundary's
  // description reads it (`boundaryTs`).
  if (name === "cesium") {
    affected.add(join(root, "src", "shaders", "boundary.slang"));
  }
  return [...affected].filter((s) => existsSync(s) && definesEntryPoints(s));
}

/** The header every generated file starts with. */
function header(source) {
  const from = relative(root, source).split(sep).join("/");
  return `// Generated from ${from} by slangc ${SLANG_VERSION}
// (scripts/slangBuild.mjs). Do not edit: change the .slang and regenerate.
`;
}

/** slangc's output, as the checked-in files hold it: LF (slangc writes CRLF on Windows). */
const slangOutput = (path) => readFileSync(path, "utf8").replaceAll("\r\n", "\n");

/**
 * Compiles one entry source into `outDir`: `<name>.wgsl` and
 * `<name>.json`. Throws with slangc's messages on an error.
 */
export function compile(slangc, source, outDir = GENERATED, includes = []) {
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
        ...[...includes, ...INCLUDES].flatMap((i) => ["-I", i]),
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
      header(source) + slangOutput(wgsl),
    );
    writeFileSync(join(outDir, `${name}.json`), slangOutput(json));
  } catch (e) {
    const message = String(e.stderr ?? e.message).trim();
    throw new Error(`${relative(root, source)}:\n${message}`, { cause: e });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

/**
 * The TypeScript layouts from `layouts.slang`'s reflection: for each shared
 * struct, in the buffer the engine binds it in, its size, alignment and
 * each field's byte offset. Formatted by Prettier, so the checked-in file
 * is stable under the repository's formatting.
 */
export async function layoutsTs(reflectionJson) {
  const reflection = JSON.parse(reflectionJson);
  const blocks = [];
  for (const parameter of reflection.parameters) {
    const type = parameter.type;
    const struct = type.resultType ?? type.elementType;
    if (struct?.kind !== "struct") {
      continue;
    }
    const size = struct.sizes?.find((x) => x.kind === "uniform");
    const fields = struct.fields.map(
      (f) => `  ${f.name}: ${f.binding.offset},`,
    );
    blocks.push(
      `/** \`${struct.name}\` as \`${parameter.name}\` holds it: byte offsets. */\n` +
        `export const ${struct.name}Layout = {\n  size: ${size.value},\n  align: ${size.alignment},\n${fields.join("\n")}\n} as const;`,
    );
  }
  const text = `// Generated from src/shaders/layouts.slang's reflection by
// scripts/slangBuild.mjs (slangc ${SLANG_VERSION}). Do not edit: change
// src/shaders/common.slang and regenerate. render/layout.ts reads these.

${blocks.join("\n\n")}
`;
  const prettier = await import("prettier");
  const options = (await prettier.resolveConfig(LAYOUTS_TS)) ?? {};
  return prettier.format(text, { ...options, filepath: LAYOUTS_TS });
}

/** A reflected type as WGSL writes it; a struct by its name. */
function wgslType(type) {
  const scalar = (t) =>
    ({ float32: "f32", uint32: "u32", int32: "i32", bool: "bool" })[t.scalarType];
  switch (type.kind) {
    case "scalar":
      return { type: scalar(type) };
    case "vector": {
      const s = scalar(type.elementType);
      return { type: s === "bool" ? `vec${type.elementCount}<bool>` : `vec${type.elementCount}${s[0]}` };
    }
    case "matrix":
      return { type: `mat${type.columnCount}x${type.rowCount}f` };
    case "struct":
      return { type: type.name, struct: true };
    default:
      throw new Error(`boundary: no WGSL spelling for a ${type.kind}`);
  }
}

/** Each struct bound in a reflection's buffers: its fields in order. */
function reflectedStructs(reflection) {
  const structs = {};
  for (const parameter of reflection.parameters) {
    const struct = parameter.type.resultType ?? parameter.type.elementType;
    if (struct?.kind === "struct") {
      structs[struct.name] = struct.fields.map((f) => ({ name: f.name, ...wgslType(f.type) }));
    }
  }
  return structs;
}

/**
 * The custom shader contract's reflection: cesium.slang (its named
 * values' structs empty, as `cesiumModule` writes them for a shader that
 * declares none) with its structs in buffers, compiled in a scratch folder.
 */
async function contractReflection(slangc) {
  const { cesiumModule } = await import("../src/scene/slangStages.ts");
  const temp = mkdtempSync(join(tmpdir(), "slang-contract-"));
  try {
    writeFileSync(
      join(temp, "cesium.slang"),
      cesiumModule(readFileSync(join(root, "src", "shaders", "cesium.slang"), "utf8"), {
        attributes: {},
        metadata: {},
      }),
    );
    const names = ["VertexInput", "VertexOutput", "FragmentInput", "MaterialOutput"];
    const entry = join(temp, "contract.slang");
    writeFileSync(
      entry,
      [
        "import cesium;",
        ...names.map((n, i) => `[[vk::binding(${i}, 0)]] StructuredBuffer<${n}> b${i};`),
        `[[vk::binding(${names.length}, 0)]] RWStructuredBuffer<float> out;`,
        '[shader("compute")] [numthreads(1, 1, 1)] void contract() {',
        `  out[0] = b0[0].time + b1[0].positionMC.x + b2[0].time + b3[0].alpha;`,
        "}",
        "",
      ].join("\n"),
    );
    const out = join(temp, "out");
    compile(slangc, entry, out, [temp]);
    return JSON.parse(readFileSync(join(out, "contract.json"), "utf8"));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

/**
 * The surface boundary's description (plan §3.4, step 5): the structs that
 * cross it, field by field in order with their WGSL types, from Slang's
 * reflection: the engine's (`boundary.slang`, surfaceBoundary.slang's) and
 * the custom shader contract's (cesium.slang). CustomShader.ts and
 * slangStages.ts generate the contract's glue and the Slang bridge from it.
 */
export async function boundaryTs(slangc, engineJson) {
  const engine = reflectedStructs(JSON.parse(engineJson));
  const contract = reflectedStructs(await contractReflection(slangc));
  const block = (name, doc, structs) =>
    `/** ${doc} */\nexport const ${name} = ${JSON.stringify(structs)} as const satisfies Record<string, readonly BoundaryField[]>;`;
  const text = `// Generated from the reflection of src/shaders/boundary.slang and
// src/shaders/cesium.slang by scripts/slangBuild.mjs (slangc ${SLANG_VERSION}).
// Do not edit: change surfaceBoundary.slang or cesium.slang and regenerate.

/** A field of a boundary struct: its WGSL type, or a struct's name. */
export interface BoundaryField {
  readonly name: string;
  readonly type: string;
  /** \`type\` names a struct (the contract's named values'). */
  readonly struct?: true;
}

${block("ENGINE_STRUCTS", "What the engine passes the stages and takes back (surfaceBoundary.slang).", engine)}

${block("CONTRACT_STRUCTS", "What custom shader stages take and change (cesium.slang).", { VertexInput: contract.VertexInput, VertexOutput: contract.VertexOutput, FragmentInput: contract.FragmentInput, MaterialOutput: contract.MaterialOutput })}
`;
  const prettier = await import("prettier");
  const options = (await prettier.resolveConfig(BOUNDARY_TS)) ?? {};
  return prettier.format(text, { ...options, filepath: BOUNDARY_TS });
}

async function main() {
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
      if (basename(source) === "layouts.slang") {
        mkdirSync(dirname(LAYOUTS_TS), { recursive: true });
        writeFileSync(
          LAYOUTS_TS,
          await layoutsTs(readFileSync(join(GENERATED, "layouts.json"), "utf8")),
        );
        console.log("  → src/render/generated/layouts.ts");
      }
      if (basename(source) === "boundary.slang") {
        writeFileSync(
          BOUNDARY_TS,
          await boundaryTs(slangc, readFileSync(join(GENERATED, "boundary.json"), "utf8")),
        );
        console.log("  → src/shaders/generated/boundary.ts");
      }
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
      if (basename(source) === "layouts.slang") {
        const fresh = await layoutsTs(readFileSync(join(temp, "layouts.json"), "utf8"));
        const kept = existsSync(LAYOUTS_TS) ? readFileSync(LAYOUTS_TS, "utf8") : undefined;
        if (fresh !== kept) {
          stale.push("src/render/generated/layouts.ts");
        }
      }
      if (basename(source) === "boundary.slang") {
        const fresh = await boundaryTs(slangc, readFileSync(join(temp, "boundary.json"), "utf8"));
        const kept = existsSync(BOUNDARY_TS) ? readFileSync(BOUNDARY_TS, "utf8") : undefined;
        if (fresh !== kept) {
          stale.push("src/shaders/generated/boundary.ts");
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
      if (!expected.has(file) && file !== "README.md" && file !== "boundary.ts") {
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
  await main();
}
