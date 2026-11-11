// SMLib in WebAssembly (plan §13.33, scripts/smlib/README.md): NVIDIA's
// usd-brep at one pinned commit, built with one pinned Emscripten into a
// store outside the repo (~/.cesium-bench/smlib/<commit>), never committed.
// What is committed is how to build it: the serial TBB stand-in
// (scripts/smlib/tbb/), the JavaScript-facing bindings
// (scripts/smlib/bindings.cpp) and this script.
//
//   node scripts/smlibTools.mjs           fetch, build, print the folder
//   node scripts/smlibTools.mjs --check   ... then load it in Node and measure
//   npm run setup                         the same, as part of setup
//
// SMLIB_DIR overrides the store's build (a folder holding smlib.mjs).
import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { availableParallelism, homedir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { brotliCompressSync, gzipSync } from "node:zlib";

/** NVIDIA-Omniverse/usd-brep "Release 1.0.1" (2026-10-22). */
export const SMLIB_COMMIT = "3fd5b9548d19aa8c12c29bc9637a96d42a06f8a5";
export const EMSDK_VERSION = "7.0.0";

const REPOSITORY = "https://github.com/NVIDIA-Omniverse/usd-brep.git";
const EMSDK_REPOSITORY = "https://github.com/emscripten-core/emsdk.git";
const SPARSE = [
  "/source/SMLib/",
  "/source/SM_API/",
  "/LICENSE",
  "/THIRD_PARTY_NOTICES.md",
];

const here = dirname(fileURLToPath(import.meta.url));
const inputs = join(here, "smlib");
const store = join(homedir(), ".cesium-bench");
const smlibStore = join(store, "smlib", SMLIB_COMMIT.slice(0, 8));
const emsdkRoot = join(store, "emsdk", EMSDK_VERSION);
const windows = process.platform === "win32";

const COMPILE_FLAGS = [
  "-std=c++17",
  "-O3",
  "-fexceptions",
  "-w",
  "-DNDEBUG",
  "-DNOMINMAX",
  "-DSM_NO_DEBUG_CODE",
  "-DSM_NO_GFX_OUTPUT_CODE",
  "-DSM_GRAPHICS_CALLBACKS=1",
];

// No threads, so no cross-origin isolation; no filesystem. SMLib needs a
// stack well above the default 64 KB, which corrupts the heap (Spike A).
const LINK_FLAGS = [
  "-O3",
  "-fexceptions",
  "-sMODULARIZE=1",
  "-sEXPORT_ES6=1",
  "-sEXPORT_NAME=createSmlib",
  "-sENVIRONMENT=web,worker,node",
  "-sALLOW_MEMORY_GROWTH=1",
  "-sSTACK_SIZE=4MB",
  "-sFILESYSTEM=0",
  "-sEXPORTED_FUNCTIONS=_malloc,_free",
  "-sEXPORTED_RUNTIME_METHODS=HEAPF64,HEAPF32,HEAPU32",
];

const git = (args, cwd) =>
  execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] })
    .toString()
    .trim();

/** The usd-brep checkout at SMLIB_COMMIT (SMLib and SM_API only). */
export function ensureSmlibSource(log = console.log) {
  const root = join(smlibStore, "usd-brep");
  if (existsSync(join(root, ".git"))) {
    try {
      if (git(["rev-parse", "HEAD"], root) === SMLIB_COMMIT) {
        return root;
      }
    } catch {
      // A partial checkout: fetch again below.
    }
  }
  log(`usd-brep ${SMLIB_COMMIT.slice(0, 8)}: fetching SMLib and SM_API…`);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  git(["init", "-q"], root);
  git(["remote", "add", "origin", REPOSITORY], root);
  git(["sparse-checkout", "set", "--no-cone", ...SPARSE], root);
  git(
    [
      "fetch",
      "-q",
      "--depth",
      "1",
      "--filter=blob:none",
      "origin",
      SMLIB_COMMIT,
    ],
    root,
  );
  git(["checkout", "-q", "FETCH_HEAD"], root);
  return root;
}

const emxx = () =>
  join(emsdkRoot, "upstream", "emscripten", windows ? "em++.exe" : "em++");

/** The pinned emsdk, installed and activated in the store. */
export function ensureEmsdk(log = console.log) {
  if (existsSync(emxx()) && existsSync(join(emsdkRoot, ".emscripten"))) {
    return emsdkRoot;
  }
  log(`emsdk ${EMSDK_VERSION}: installing (about 750 MB to download)…`);
  if (!existsSync(join(emsdkRoot, ".git"))) {
    rmSync(emsdkRoot, { recursive: true, force: true });
    mkdirSync(dirname(emsdkRoot), { recursive: true });
    git([
      "clone",
      "-q",
      "--depth",
      "1",
      "--branch",
      EMSDK_VERSION,
      EMSDK_REPOSITORY,
      emsdkRoot,
    ]);
  }
  const emsdk = join(emsdkRoot, windows ? "emsdk.bat" : "emsdk");
  const run = (args) =>
    execFileSync(emsdk, args, {
      cwd: emsdkRoot,
      stdio: "inherit",
      shell: windows,
    });
  run(["install", EMSDK_VERSION]);
  run(["activate", EMSDK_VERSION]);
  rmSync(join(emsdkRoot, "downloads"), { recursive: true, force: true });
  if (!existsSync(emxx())) {
    throw new Error(`emsdk ${EMSDK_VERSION}: no em++ after installing`);
  }
  return emsdkRoot;
}

const hash = (...parts) => {
  const h = createHash("sha256");
  for (const part of parts) {
    h.update(part);
    h.update("\0");
  }
  return h.digest("hex").slice(0, 16);
};

const standIn = () =>
  readdirSync(join(inputs, "tbb"))
    .sort()
    .map((name) => name + readFileSync(join(inputs, "tbb", name), "utf8"))
    .join("\0");

const cppFiles = (dir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith(".cpp") && name !== "StdAfx.cpp")
    .sort()
    .map((name) => join(dir, name));

/** Runs `jobs` (functions returning promises) at most `limit` at a time. */
async function pool(jobs, limit) {
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      await jobs[next++]();
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
}

/**
 * The folder holding smlib.mjs and smlib.wasm, building them first if the
 * store lacks this build. Objects are cached by compile flags and stand-in,
 * the module by everything that goes into it.
 */
export async function ensureSmlib(log = console.log) {
  if (process.env.SMLIB_DIR) {
    return process.env.SMLIB_DIR;
  }
  const source = ensureSmlibSource(log);
  ensureEmsdk(log);
  const bindings = readFileSync(join(inputs, "bindings.cpp"), "utf8");
  const objectKey = hash(EMSDK_VERSION, COMPILE_FLAGS.join(" "), standIn());
  const buildKey = hash(objectKey, bindings, LINK_FLAGS.join(" "));
  const out = join(smlibStore, `build-${buildKey}`);
  if (existsSync(join(out, "smlib.wasm"))) {
    return out;
  }

  const objects = join(smlibStore, `obj-${objectKey}`);
  mkdirSync(objects, { recursive: true });
  // Each library's own include order, as its premake5.lua has it: both have
  // a StdAfx.h, and a quoted include finds the first.
  const smlibInc = join(source, "source", "SMLib", "inc");
  const smApiInc = join(source, "source", "SM_API", "inc");
  const smlibIncludes = [`-I${inputs}`, `-I${smlibInc}`];
  const smApiIncludes = [`-I${inputs}`, `-I${smApiInc}`, `-I${smlibInc}`];
  const units = [
    ...cppFiles(join(source, "source", "SMLib", "src")).map((f) => [
      f,
      `SMLib_${f.split(/[\\/]/).pop()}.o`,
      smlibIncludes,
    ]),
    ...cppFiles(join(source, "source", "SM_API", "src")).map((f) => [
      f,
      `SM_API_${f.split(/[\\/]/).pop()}.o`,
      smApiIncludes,
    ]),
  ];
  const run = promisify(execFile);
  const todo = units.filter(([, o]) => !existsSync(join(objects, o)));
  const started = performance.now();
  let done = 0;
  if (todo.length > 0) {
    log(
      `SMLib: compiling ${todo.length} of ${units.length} files with em++ ${EMSDK_VERSION}…`,
    );
  }
  await pool(
    todo.map(([file, object, includes]) => async () => {
      const partial = join(objects, `${object}.partial`);
      await run(
        emxx(),
        [...COMPILE_FLAGS, ...includes, "-c", file, "-o", partial],
        { maxBuffer: 64 * 1024 * 1024 },
      ).catch((error) => {
        throw new Error(`SMLib: ${file} failed\n${error.stderr ?? error}`);
      });
      // Renamed only once complete, so an interrupted build recompiles it.
      renameSync(partial, join(objects, object));
      done++;
      if (done % 25 === 0 || done === todo.length) {
        log(`  ${done} / ${todo.length}`);
      }
    }),
    Math.max(1, availableParallelism()),
  );

  log("SMLib: compiling the bindings and linking…");
  const staging = `${out}.partial`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  const bindingsObject = join(staging, "bindings.o");
  await run(emxx(), [
    ...COMPILE_FLAGS,
    ...smApiIncludes,
    "-c",
    join(inputs, "bindings.cpp"),
    "-o",
    bindingsObject,
  ]).catch((error) => {
    throw new Error(`SMLib: bindings.cpp failed\n${error.stderr ?? error}`);
  });
  // The object list goes in a response file: Windows caps a command line.
  const response = join(staging, "objects.rsp");
  writeFileSync(
    response,
    [...units.map(([, o]) => join(objects, o)), bindingsObject]
      .map((path) => `"${path.replaceAll("\\", "/")}"`)
      .join("\n"),
  );
  await run(
    emxx(),
    [`@${response}`, ...LINK_FLAGS, "-o", join(staging, "smlib.mjs")],
    { maxBuffer: 64 * 1024 * 1024 },
  ).catch((error) => {
    throw new Error(`SMLib: link failed\n${error.stderr ?? error}`);
  });
  rmSync(bindingsObject);
  rmSync(response);
  writeFileSync(
    join(staging, "build.json"),
    `${JSON.stringify(
      {
        commit: SMLIB_COMMIT,
        emsdk: EMSDK_VERSION,
        compile: COMPILE_FLAGS,
        link: LINK_FLAGS,
        seconds: Math.round((performance.now() - started) / 1000),
      },
      undefined,
      2,
    )}\n`,
  );
  rmSync(out, { recursive: true, force: true });
  renameSync(staging, out);
  log(`SMLib: built in ${Math.round((performance.now() - started) / 1000)} s`);
  return out;
}

/**
 * Loads the build in Node and repeats Spike A's measurements: size,
 * instantiation, warm tessellation of a box, cylinder and sphere, and a
 * first boolean (box minus cylinder).
 */
export async function checkSmlib(directory, log = console.log) {
  const wasm = readFileSync(join(directory, "smlib.wasm"));
  const glue = readFileSync(join(directory, "smlib.mjs"));
  const mib = (n) => `${(n / 1048576).toFixed(2)} MiB`;
  log(
    `size: ${mib(wasm.length)} raw, ${mib(gzipSync(wasm, { level: 9 }).length)} gzip, ${mib(brotliCompressSync(wasm).length)} brotli; glue ${(gzipSync(glue).length / 1024).toFixed(0)} KB gzip`,
  );

  const { default: createSmlib } = await import(
    pathToFileURL(join(directory, "smlib.mjs")).href
  );
  let t = performance.now();
  const m = await createSmlib();
  log(`instantiate: ${(performance.now() - t).toFixed(1)} ms`);
  if (!m._smlib_init()) {
    throw new Error(`smlib_init failed (${m._smlib_status()})`);
  }

  const tessellate = (brep) => {
    const mesh = m._smlib_tessellate(brep, 0, 25, 25, 0);
    if (!mesh) {
      throw new Error(`tessellate failed (${m._smlib_status()})`);
    }
    const triangles = m._smlib_mesh_index_count(mesh) / 3;
    const vertices = m._smlib_mesh_vertex_count(mesh);
    m._smlib_mesh_delete(mesh);
    return { triangles, vertices };
  };
  const time = (label, make) => {
    // Once cold, then the median of five warm runs.
    const runs = [];
    let result;
    for (let i = 0; i < 6; i++) {
      const brep = make();
      if (!brep) {
        throw new Error(`${label}: no brep (${m._smlib_status()})`);
      }
      t = performance.now();
      result = tessellate(brep);
      runs.push(performance.now() - t);
      m._smlib_brep_delete(brep);
    }
    const warm = runs.slice(1).sort((a, b) => a - b)[2];
    log(
      `${label}: ${result.triangles} triangles, ${result.vertices} vertices; cold ${runs[0].toFixed(1)} ms, warm ${warm.toFixed(1)} ms`,
    );
  };
  time("box", () => m._smlib_box(0, 0, 0, 1, 1, 1));
  time("cylinder", () => m._smlib_cylinder(0, 0, 0, 0.5, 1));
  time("sphere", () => m._smlib_sphere(0, 0, 0, 1));

  const box = m._smlib_box(0, 0, 0, 2, 2, 1);
  const hole = m._smlib_cylinder(1, 1, -0.5, 0.5, 2);
  t = performance.now();
  const cut = m._smlib_boolean(1, box, hole);
  const booleanMs = performance.now() - t;
  if (!cut) {
    m._smlib_brep_delete(box);
    m._smlib_brep_delete(hole);
    throw new Error(`box minus cylinder failed (${m._smlib_status()})`);
  }
  const solid = m._smlib_brep_is_manifold_solid(cut);
  const faces = m._smlib_brep_face_count(cut);
  const volume = m._smlib_brep_volume(cut, 1e-6);
  const exact = 4 - Math.PI * 0.25;
  const mesh = tessellate(cut);
  m._smlib_brep_delete(cut);
  log(
    `box minus cylinder: ${booleanMs.toFixed(1)} ms; ${faces} faces, manifold solid ${solid === 1}; volume ${volume.toFixed(6)} (exact ${exact.toFixed(6)}); ${mesh.triangles} triangles`,
  );
  if (solid !== 1 || Math.abs(volume - exact) > 1e-4) {
    throw new Error("box minus cylinder: not the expected solid");
  }
}

// Run directly: build, and with --check, load and measure.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const directory = await ensureSmlib();
  console.log(`smlib: ${directory}`);
  if (process.argv.includes("--check")) {
    await checkSmlib(directory);
  }
}
