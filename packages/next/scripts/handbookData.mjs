// The handbook's generated data (handbook/DESIGN.md): figures read from the
// sources that stay current, never copied into the site by hand.
//
//   node scripts/handbookData.mjs [--no-bundles]
//
// It writes handbook/generated/data.json (not committed):
//
//   surface   api/surface.txt, the public API map (`npm run surface`)
//   layers    test/importBoundary.test.ts's layer table and rules, run over
//             today's import graph
//   bundles   scripts/checkBundle.mjs's chunks for a globe-only Viewer, and
//             the library build of vite.lib.config.ts, into a temporary
//             directory
//   runtime   files the engine fetches at run time, measured in the setup
//             store when this machine has it
//   pipeline  the frame graph's passes and targets as src/scene declares them,
//             and the layouts' sizes, checked against handbook/src/pipeline.ts
//   bench     bench/results (`node bench/run.mjs`, or BENCH_RESULTS_DIR) and
//             handbook/baselines
//
// It also copies the page's font into handbook/generated/, from the setup
// store, fetching it there first against a pinned hash, so the built page
// loads nothing from the network.
//
// `--no-bundles` keeps the bundle section of the last run, for quick
// iteration on the site (each build takes a few seconds).
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";
import { gzipSync } from "node:zlib";
import ts from "typescript";
import { verifiedDownload } from "./verifiedDownload.mjs";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const kib = (bytes) => Math.round((bytes / 1024) * 10) / 10;

/** The public API map: per entry point, its names, kinds and tiers. */
export function readSurface(root = packageRoot) {
  const lines = readFileSync(join(root, "api/surface.txt"), "utf8")
    .split("\n")
    .filter((line) => line.length > 0);
  if (lines[0] !== "entry\tname\tkind\ttier") {
    throw new Error(`api/surface.txt: unexpected header "${lines[0]}"`);
  }
  const entries = new Map();
  const tiers = {};
  for (const line of lines.slice(1)) {
    const [entry, name, kind, tier] = line.split("\t");
    if (!entries.has(entry)) {
      entries.set(entry, { entry, total: 0, kinds: {}, names: [] });
    }
    const e = entries.get(entry);
    e.total++;
    e.kinds[kind] = (e.kinds[kind] ?? 0) + 1;
    e.names.push({ name, kind, tier });
    tiers[tier] = (tiers[tier] ?? 0) + 1;
  }
  return {
    total: lines.length - 1,
    tiers,
    entries: [...entries.values()],
  };
}

/**
 * 1.x's public names, read from its source: every file `packages/engine`
 * and `packages/widgets` export, except those whose doc comment says
 * `@private`. A file in `Core/Deprecated` re-exports `packages/core`, where
 * its doc comment is. A file with no doc comment on its export isn't in the
 * reference docs, so it isn't counted.
 */
export function readOneX(root = packageRoot) {
  const packages = dirname(root);
  const json = (path) => JSON.parse(readFileSync(path, "utf8"));
  const files = {};
  const skip = new Set(["ThirdParty", "Workers", "Shaders", "Assets"]);
  const isPublic = (text, name) => {
    const declared = new RegExp(
      `(/\\*\\*(?:(?!\\*/)[\\s\\S])*?\\*/)(?:\\s|//[^\\n]*\\n)*(?:export\\s+)?(?:(?:async\\s+)?function\\s+${name}\\b|class\\s+${name}\\b|(?:const|let|var)\\s+${name}\\b)`,
    ).exec(text);
    const aliased = new RegExp(
      `/\\*\\*(?:(?!\\*/)[\\s\\S])*?@alias ${name}\\b(?:(?!\\*/)[\\s\\S])*?\\*/`,
    ).exec(text);
    const doc = declared?.[1] ?? aliased?.[0];
    return doc !== undefined && !/@private\b/.test(doc);
  };
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) {
          walk(path, join(rel, entry.name));
        }
      } else if (entry.name.endsWith(".js") && !entry.name.startsWith("_")) {
        const name = entry.name.slice(0, -3);
        const core = join(packages, "core/Source", entry.name);
        const source =
          rel === join("Core", "Deprecated") && existsSync(core) ? core : path;
        const text = readFileSync(source, "utf8");
        const exported = /export default (\w+);/.exec(text)?.[1];
        if (exported && isPublic(text, exported)) {
          files[name] = source;
        }
      }
    }
  };
  walk(join(packages, "engine/Source"), "");
  walk(join(packages, "widgets/Source"), "");
  const names = Object.keys(files).sort();
  return {
    version: json(join(dirname(packages), "package.json")).version,
    total: names.length,
    names,
    files,
  };
}

/**
 * This package's history, from git: commits touching it, how many name a
 * coding agent as co-author, and the calendar span. Nothing about spend.
 */
export function readHistory(root = packageRoot) {
  const log = execFileSync(
    "git",
    ["log", "--format=%as%x09%b%x00", "--", "."],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  )
    .split("\0")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const dates = log.map((entry) => entry.slice(0, 10)).sort();
  return {
    commits: log.length,
    withAgent: log.filter((entry) => /Co-Authored-By: Claude/.test(entry))
      .length,
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
  };
}

/**
 * Images the handbook's single file refers to and doesn't hold: anything an
 * image attribute, style or built asset path names, other than a data URI.
 */
export function findUnembeddedImages(html) {
  const image = String.raw`[^"'()\s]+\.(?:webp|png|jpe?g|gif|svg|avif)`;
  const patterns = [
    new RegExp(String.raw`\bsrc(?:Set)?["']?\s*[=:]\s*["'](${image})`, "gi"),
    new RegExp(String.raw`url\(\s*["']?(${image})`, "gi"),
    new RegExp(String.raw`["'](\.{0,2}/?assets/${image})["']`, "gi"),
  ];
  const found = new Set();
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      if (!match[1].startsWith("data:")) {
        found.add(match[1]);
      }
    }
  }
  return [...found];
}

/**
 * What the Dyno tab shows of the public catalog: its shape and one scene.
 * Dataset entries stay out: the page needs no asset IDs or licence notes.
 */
export function readCatalog(root = packageRoot) {
  const catalog = JSON.parse(
    readFileSync(join(root, "bench/suite/catalog/public.json"), "utf8"),
  );
  const drop = (entry) =>
    Object.fromEntries(
      Object.entries(entry).filter(([key]) => key !== "$comment"),
    );
  return {
    scenes: catalog.scenes.length,
    scenarios: catalog.scenarios.map((c) => ({ id: c.id, title: c.title })),
    tiers: catalog.tiers.map(({ id, title, scenarios, reps }) => ({
      id,
      title,
      scenarios: scenarios.length,
      reps,
    })),
    setups: catalog.setups.map(drop),
    render: drop(catalog.render),
    example: drop(catalog.scenes.find((c) => c.id === "osm-philadelphia")),
    exampleScenario: drop(catalog.scenarios.find((c) => c.id === "cold-orbit")),
  };
}

/** The declarations the layer table is made of, by name, in the test. */
const TEST_DECLARATIONS = [
  "TIME_FILES",
  "layerOf",
  "FRAMES_CORE_VALUES",
  "ALLOWED",
  "listTs",
  "edgesOfText",
];

/**
 * The boundary test's own table and import reader, taken from the test file
 * rather than copied, so a change to the rule changes the site. Fails naming
 * any declaration the test no longer has.
 */
export function readBoundaryRules(root = packageRoot) {
  const file = join(root, "test/importBoundary.test.ts");
  const text = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found = new Map();
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      found.set(statement.name.text, statement.getText(source));
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          found.set(declaration.name.text, statement.getText(source));
        }
      }
    }
  }
  const missing = TEST_DECLARATIONS.filter((name) => !found.has(name));
  if (missing.length > 0) {
    throw new Error(
      `test/importBoundary.test.ts no longer declares ${missing.join(", ")}; update scripts/handbookData.mjs`,
    );
  }
  const { outputText } = ts.transpileModule(
    TEST_DECLARATIONS.map((name) => found.get(name)).join("\n"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.None,
      },
    },
  );
  const scope = {
    ts,
    root,
    readdirSync,
    readFileSync,
    join,
    dirname,
    relative,
  };
  return runInNewContext(
    `${outputText}\n({ layerOf, ALLOWED, FRAMES_CORE_VALUES: [...FRAMES_CORE_VALUES], listTs, edgesOfText })`,
    scope,
  );
}

/** Layers, their sizes, the rules, and the imports that exist today. */
export function readLayers(root = packageRoot) {
  const rules = readBoundaryRules(root);
  const files = [...rules.listTs("src"), ...rules.listTs("widgets")];
  const layers = new Map();
  const edges = new Map();
  const dynamicImports = [];
  for (const file of files) {
    const text = readFileSync(join(root, file), "utf8");
    const from = rules.layerOf(file);
    if (!layers.has(from)) {
      layers.set(from, { id: from, files: 0, lines: 0 });
    }
    const layer = layers.get(from);
    layer.files++;
    layer.lines += text.split("\n").length;
    for (const edge of rules.edgesOfText(file, text)) {
      const to = rules.layerOf(edge.to);
      if (edge.dynamic) {
        dynamicImports.push({
          from: file,
          to: edge.to,
          fromLayer: from,
          toLayer: to,
        });
      }
      if (from === to) {
        continue;
      }
      const key = `${from}>${to}`;
      if (!edges.has(key)) {
        edges.set(key, { from, to, value: 0, typeOnly: 0, dynamic: 0 });
      }
      const e = edges.get(key);
      if (edge.dynamic) {
        e.dynamic++;
      } else if (edge.typeOnly) {
        e.typeOnly++;
      } else {
        e.value++;
      }
    }
  }
  return {
    layers: [...layers.values()],
    allowed: JSON.parse(JSON.stringify(rules.ALLOWED)),
    framesCoreValues: rules.FRAMES_CORE_VALUES,
    edges: [...edges.values()],
    dynamicImports,
  };
}

/** `node scripts/checkBundle.mjs`'s report, parsed from its stdout. */
export function parseCheckBundle(stdout) {
  const main = /main chunk (\S+): ([\d.]+) KB \(([\d.]+) KB gzipped\)/.exec(
    stdout,
  );
  if (!main) {
    throw new Error(
      "scripts/checkBundle.mjs: no main chunk line in its output",
    );
  }
  const chunks = (pattern) =>
    [...stdout.matchAll(pattern)].map((m) => ({
      name: chunkName(m[1]),
      kb: Number(m[2]),
    }));
  return {
    main: { kb: Number(main[2]), gzipKb: Number(main[3]) },
    eager: chunks(/imported with it: (\S+): ([\d.]+) KB/g),
    lazy: chunks(/lazy chunk (\S+): ([\d.]+) KB/g),
    clean: /no X, Y or s series and no DAF reader/.test(stdout),
  };
}

/** A built file's name without its directory or content hash. */
function chunkName(fileName) {
  return fileName
    .replace(/^.*\//, "")
    .replace(/-[\w-]{8}(\.\w+)$/, "$1")
    .replace(/\.m?js$/, "");
}

/** The five entry points of the library build: what each pulls in, sized. */
async function buildLibrary(root) {
  const { build } = await import("vite");
  const outDir = mkdtempSync(join(tmpdir(), "cesium-next-handbook-"));
  try {
    const result = await build({
      root,
      configFile: join(root, "vite.lib.config.ts"),
      logLevel: "error",
      build: { outDir, emptyOutDir: true },
    });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap(
      (r) => r.output,
    );
    const chunks = new Map(
      outputs.filter((o) => o.type === "chunk").map((c) => [c.fileName, c]),
    );
    const reach = (starts, follow) => {
      const seen = new Set();
      for (const queue = [...starts]; queue.length > 0;) {
        const chunk = chunks.get(queue.pop());
        if (chunk && !seen.has(chunk)) {
          seen.add(chunk);
          queue.push(...follow(chunk));
        }
      }
      return seen;
    };
    const entries = [...chunks.values()]
      .filter((c) => c.isEntry)
      .map((entry) => {
        const eager = reach([entry.fileName], (c) => c.imports);
        const lazy = reach(
          [...eager].flatMap((c) => c.dynamicImports),
          (c) => [...c.imports, ...c.dynamicImports],
        );
        for (const c of eager) {
          lazy.delete(c);
        }
        const code = [...eager].map((c) => c.code).join("\n");
        return {
          entry: entry.name.replace(/^cesium-next-?/, "").replace(/^$/, "core"),
          ownKb: kib(Buffer.byteLength(entry.code)),
          loadKb: kib(Buffer.byteLength(code)),
          loadGzipKb: kib(gzipSync(code).length),
          sharedChunks: eager.size - 1,
          lazyKb: kib(
            [...lazy].reduce((n, c) => n + Buffer.byteLength(c.code), 0),
          ),
          lazy: [...lazy]
            .map((c) => ({
              name: chunkName(c.fileName),
              kb: kib(Buffer.byteLength(c.code)),
            }))
            .sort((a, b) => b.kb - a.kb),
        };
      });
    const assets = outputs
      .filter((o) => o.type === "asset" && /\.(wasm|mjs)$/.test(o.fileName))
      .map((o) => ({
        name: chunkName(o.fileName).replace(/\.wasm$/, " (wasm)"),
        kb: kib(
          typeof o.source === "string"
            ? Buffer.byteLength(o.source)
            : o.source.length,
        ),
      }))
      .sort((a, b) => b.kb - a.kb);
    // What an app importing several entries loads: their shared chunks once.
    const named = (id) =>
      [...chunks.values()].find(
        (c) =>
          c.isEntry &&
          c.name.replace(/^cesium-next-?/, "").replace(/^$/, "core") === id,
      );
    const combinations = [
      ["core", "time"],
      ["core", "measure"],
    ].map((ids) => {
      const eager = reach(
        ids.map((id) => named(id).fileName),
        (c) => c.imports,
      );
      const code = [...eager].map((c) => c.code).join("\n");
      return {
        id: ids.join("+"),
        loadKb: kib(Buffer.byteLength(code)),
        loadGzipKb: kib(gzipSync(code).length),
      };
    });
    return { entries, assets, combinations };
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

/** Both bundle measurements. */
async function readBundles(root) {
  const stdout = execFileSync(
    process.execPath,
    [join(root, "scripts/checkBundle.mjs")],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  return {
    globeOnly: parseCheckBundle(stdout),
    library: await buildLibrary(root),
  };
}

/** Files fetched at run time, measured in this machine's setup store. */
function readRuntimeAssets() {
  const store = join(homedir(), ".cesium-bench");
  const frames = process.env.FRAMES_DATA_DIR ?? join(store, "frames");
  const slangRoot = process.env.SLANG_WASM_DIR ?? join(store, "slang-wasm");
  const slangVersions = existsSync(slangRoot)
    ? readdirSync(slangRoot).filter((d) => /^\d/.test(d))
    : [];
  const slang = slangVersions.at(-1);
  const groups = [
    {
      what: `Slang compiler${slang ? ` ${slang}` : ""}`,
      dir: slang ? join(slangRoot, slang) : undefined,
      names: ["slang-wasm.wasm", "slang-wasm.js"],
    },
    {
      what: "PROJ 9.7.1",
      dir: join(frames, "proj"),
      names: ["proj_capi.wasm", "proj.db"],
    },
    {
      what: "Ephemeris packs, 2000 to 2050, and Earth orientation",
      dir: frames,
      names: [
        "planets-de440-2000-2050.pack",
        "moon-pa-de440-2000-2050.pack",
        "EOP-All.csv",
      ],
    },
  ];
  return groups.map(({ what, dir, names }) => ({
    what,
    files: names.map((name) => {
      const path = dir && join(dir, name);
      const there = path && existsSync(path);
      return {
        name,
        kb: there ? kib(statSync(path).size) : null,
        // WebAssembly is what a page waits for, so its transfer size matters.
        ...(there && name.endsWith(".wasm")
          ? { gzipKb: kib(gzipSync(readFileSync(path)).length) }
          : {}),
      };
    }),
  }));
}

/** Rows of one run's result for a suite, or undefined. */
const rowsOf = (run, suite) => {
  const rows = run.results?.[suite];
  return Array.isArray(rows) ? rows : undefined;
};

/** Whether a result row reports a pass or fail, and which. */
const verdicts = (rows) => {
  let pass = 0;
  let fail = 0;
  for (const row of rows) {
    if (row?.pass === true) {
      pass++;
    } else if (row?.pass === false) {
      fail++;
    }
  }
  return { pass, fail };
};

/** The latest selection parity run: how far Stepwise agrees with 1.x. */
const selectionParity = (a) => {
  const rows = (a.latest.selection ?? []).filter(
    (row) => typeof row.jaccard === "number",
  );
  return rows.length === 0
    ? {}
    : {
        selection: {
          lastDate: a.suites.selection.lastDate,
          comparisons: rows.length,
          tilesets: new Set(rows.map((row) => row.tileset)).size,
          exact: rows.filter((row) => row.jaccard === 1).length,
          worst: Math.min(...rows.map((row) => row.jaccard)),
        },
      };
};

/**
 * bench/results: per adapter, each suite's latest run, plus the numeric
 * tables the benchmarks tab charts. Run errors stay out: they can quote
 * local paths.
 */
export function readBenchResults(root = packageRoot) {
  const dir = process.env.BENCH_RESULTS_DIR ?? join(root, "bench/results");
  const runs = [];
  for (const name of existsSync(dir) ? readdirSync(dir).sort() : []) {
    if (!name.endsWith(".json")) {
      continue;
    }
    try {
      const run = JSON.parse(readFileSync(join(dir, name), "utf8"));
      if (run?.date && run.results) {
        runs.push(run);
      }
    } catch {
      console.warn(`bench/results/${name}: not readable JSON, skipped`);
    }
  }
  const adapters = new Map();
  for (const run of runs) {
    const adapter =
      run.environment?.adapter?.description ??
      run.environment?.adapter?.architecture ??
      "unknown adapter";
    if (!adapters.has(adapter)) {
      adapters.set(adapter, {
        adapter,
        runs: 0,
        firstDate: run.date,
        lastDate: run.date,
        suites: {},
        latest: {},
      });
    }
    const a = adapters.get(adapter);
    a.runs++;
    if (run.date < a.firstDate) {
      a.firstDate = run.date;
    }
    if (run.date > a.lastDate) {
      a.lastDate = run.date;
    }
    for (const suite of Object.keys(run.results)) {
      const rows = rowsOf(run, suite);
      if (!rows) {
        continue;
      }
      const seen = a.suites[suite];
      if (!seen || run.date >= seen.lastDate) {
        a.suites[suite] = {
          runs: (seen?.runs ?? 0) + 1,
          lastDate: run.date,
          rows: rows.length,
          ...verdicts(rows),
        };
        a.latest[suite] = rows;
      } else {
        seen.runs++;
      }
    }
  }
  const pick = (row, keys) =>
    Object.fromEntries(keys.filter((k) => k in row).map((k) => [k, row[k]]));
  const adapterList = [...adapters.values()].map((a) => ({
    adapter: a.adapter,
    runs: a.runs,
    firstDate: a.firstDate,
    lastDate: a.lastDate,
    suites: a.suites,
    baseline: (a.latest.baseline ?? []).map((row) =>
      pick(row, [
        "suite",
        "engine",
        "draws",
        "cpu/frame ms",
        "frame incl. GPU ms",
        "API calls/frame",
        "first frame ms",
        "gpu ms",
        "main-thread ms",
        "latency ms",
        "scene copies",
      ]),
    ),
    alloc: (a.latest.alloc ?? []).map((row) =>
      pick(row, ["draws", "bytesPerFrame", "engineBytesPerFrame", "frames"]),
    ),
    instances: a.latest.instances ?? [],
    hitch: (a.latest.hitch ?? []).map((row) =>
      pick(row, ["step", "frames", "over34", "worst", "p99"]),
    ),
    ...selectionParity(a),
  }));
  const baselineDir = join(root, "handbook/baselines");
  const baselines = existsSync(baselineDir)
    ? readdirSync(baselineDir)
        .filter((name) => name.endsWith(".json"))
        .map((name) => {
          const run = JSON.parse(readFileSync(join(baselineDir, name), "utf8"));
          return { name, date: run.date ?? null, note: run.note ?? null };
        })
    : [];
  return { runs: runs.length, adapters: adapterList, baselines };
}

/** The `.ts` files under `dir`, recursively. */
function tsFiles(root, dir) {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    return e.isDirectory()
      ? tsFiles(root, path)
      : e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")
        ? [path]
        : [];
  });
}

/**
 * The frame graph as the source declares it: each `graph.addPass`, in order,
 * with what it reads and writes, and each `createTexture` or `importTexture`
 * with its format. Found by walking the syntax of every file that adds a
 * pass, so a file split doesn't lose it. Fails naming what it can't read.
 */
export function readFrameGraph(root = packageRoot) {
  const textures = new Map();
  const passes = [];
  for (const path of tsFiles(root, "src")) {
    const text = readFileSync(join(root, path), "utf8");
    if (!text.includes(".addPass(")) {
      continue;
    }
    const source = ts.createSourceFile(
      path,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    const handles = new Map();
    const objects = new Map();
    const property = (object, name) =>
      object.properties.find((p) => p.name?.getText() === name)?.initializer;
    const collect = (node) => {
      if (ts.isVariableDeclaration(node) && node.initializer) {
        let init = node.initializer;
        if (ts.isAsExpression(init)) {
          init = init.expression;
        }
        if (ts.isObjectLiteralExpression(init)) {
          objects.set(node.name.getText(), init);
        }
        if (
          ts.isCallExpression(init) &&
          ts.isPropertyAccessExpression(init.expression) &&
          ["createTexture", "importTexture"].includes(
            init.expression.name.text,
          ) &&
          init.expression.expression.getText() === "graph"
        ) {
          const [name, descriptor] = init.arguments;
          const object = ts.isObjectLiteralExpression(descriptor)
            ? descriptor
            : objects.get(descriptor?.getText());
          const format = object && property(object, "format");
          const samples = object && property(object, "sampleCount");
          const texture = {
            name: name.text,
            imported: init.expression.name.text === "importTexture",
            ...(format
              ? {
                  format: ts.isStringLiteralLike(
                    ts.isAsExpression(format) ? format.expression : format,
                  )
                    ? (ts.isAsExpression(format) ? format.expression : format)
                        .text
                    : undefined,
                }
              : {}),
            multisampled: samples !== undefined,
          };
          handles.set(node.name.getText(), texture);
          textures.set(texture.name, texture);
        }
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "addPass"
      ) {
        const [name, setup] = node.arguments;
        const named = (key) =>
          (property(setup, key)?.elements ?? []).map((e) => {
            const handle = handles.get(e.getText());
            if (!handle) {
              throw new Error(
                `${path}: pass "${name.text}" names ${e.getText()}, not a graph texture; update readFrameGraph`,
              );
            }
            return handle.name;
          });
        passes.push({
          name: name.text,
          reads: named("reads"),
          writes: named("writes"),
          sideEffect: property(setup, "sideEffect") !== undefined,
        });
      }
      ts.forEachChild(node, collect);
    };
    collect(source);
  }
  if (passes.length === 0) {
    throw new Error("no graph.addPass found under src; update readFrameGraph");
  }
  return { passes, textures: [...textures.values()] };
}

/** A constant's value in a file, read from its text. Fails if it has gone. */
function readConstant(root, file, pattern, what) {
  const match = pattern.exec(readFileSync(join(root, file), "utf8"));
  if (!match) {
    throw new Error(`${file}: no ${what}; update scripts/handbookData.mjs`);
  }
  return match[1];
}

/** Sizes and fixed limits the pipeline's figures state. */
export function readPipelineFigures(root = packageRoot) {
  const layouts = readFileSync(
    join(root, "src/render/generated/layouts.ts"),
    "utf8",
  );
  const size = (name) => {
    const match = new RegExp(`${name}Layout = \\{\\s*size: (\\d+)`).exec(
      layouts,
    );
    if (!match) {
      throw new Error(
        `layouts.ts: no ${name}Layout; update readPipelineFigures`,
      );
    }
    return Number(match[1]);
  };
  const constant = (file, name) =>
    Number(
      readConstant(root, file, new RegExp(`const ${name} = (\\d+)`), name),
    );
  return {
    drawRecordBytes: size("DrawRecord"),
    transformBytes: size("Transform"),
    instanceBytes: size("Instance"),
    drawItemBytes: size("DrawItem"),
    materialBytes: size("Material"),
    anchorEyeBytes: size("AnchorEye"),
    viewBytes: size("View"),
    indirectBytes: constant("src/render/layout.ts", "INDIRECT_SIZE"),
    maxAnchors: constant("src/render/layout.ts", "MAX_ANCHORS"),
    shadowCascades: constant("src/scene/shadows.ts", "SHADOW_CASCADES"),
    shadowSize: constant("src/scene/shadows.ts", "SHADOW_SIZE"),
    clusters: readConstant(
      root,
      "src/scene/lights.ts",
      /CLUSTERS = \[([^\]]+)\]/,
      "CLUSTERS",
    )
      .split(",")
      .map((n) => Number(n)),
    sampleCount: Number(
      readConstant(
        root,
        "src/scene/RenderContext.ts",
        /sampleCount: (\d+)/,
        "sampleCount",
      ),
    ),
  };
}

/**
 * Where handbook/src/pipeline.ts no longer matches the code: passes without
 * a note, notes for passes that have gone, tests or code names that have
 * gone. The page shows an unnoted pass as such, so these warn, not fail.
 */
export function pipelineDrift(graph, notes, root = packageRoot) {
  const drift = [];
  const names = new Set(graph.passes.map((p) => p.name));
  for (const pass of names) {
    if (!notes.PASSES[pass]) {
      drift.push(`pass "${pass}" has no note in handbook/src/pipeline.ts`);
    }
  }
  for (const pass of Object.keys(notes.PASSES)) {
    if (!names.has(pass)) {
      drift.push(
        `note for pass "${pass}", which the frame graph no longer has`,
      );
    }
  }
  for (const seam of notes.SEAMS) {
    for (const { file, title } of seam.guards) {
      const text = existsSync(join(root, file))
        ? readFileSync(join(root, file), "utf8")
        : "";
      if (!text.includes(title)) {
        drift.push(`${seam.id}: no test "${title}" in ${file}`);
      }
    }
    for (const { name, file } of seam.code) {
      const text = existsSync(join(root, file))
        ? readFileSync(join(root, file), "utf8")
        : "";
      if (!text.includes(name)) {
        drift.push(`${seam.id}: no ${name} in ${file}`);
      }
    }
    for (const pass of seam.passes) {
      if (!names.has(pass)) {
        drift.push(`${seam.id}: names pass "${pass}", which has gone`);
      }
    }
  }
  for (const decision of notes.DECISIONS) {
    for (const pass of decision.passes) {
      if (!names.has(pass)) {
        drift.push(`${decision.id}: names pass "${pass}", which has gone`);
      }
    }
  }
  return drift;
}

/** Counts for the overview. */
function readCounts(root) {
  const count = (dir, pattern) => {
    let n = 0;
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "generated") {
          n += count(path, pattern);
        }
      } else if (pattern.test(entry.name)) {
        n++;
      }
    }
    return n;
  };
  return {
    testFiles: count("test", /\.test\.tsx?$/),
    slangFiles: count("src", /\.slang$/),
    examples: readdirSync(join(root, "examples"), {
      withFileTypes: true,
    }).filter((e) => e.isDirectory()).length,
  };
}

/**
 * Inter 4.1, the typeface StrataKit expects, which its Root otherwise loads
 * from this URL when the page opens. SIL Open Font License 1.1.
 */
const INTER = {
  url: "https://rsms.me/inter/font-files/InterVariable.woff2?v=4.1",
  expected: {
    bytes: 352240,
    sha256: "693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3",
  },
};

/** Puts the font beside the generated data, fetching it once if need be. */
async function provideFont(outDir) {
  const stored = join(
    homedir(),
    ".cesium-bench",
    "fonts",
    "InterVariable-4.1.woff2",
  );
  if (!existsSync(stored)) {
    mkdirSync(dirname(stored), { recursive: true });
    await verifiedDownload(INTER.url, stored, INTER.expected);
  }
  copyFileSync(stored, join(outDir, "InterVariable.woff2"));
}

/** `KEY=value` lines of an env file, as [key, value], quotes removed. */
const envEntries = (path) =>
  existsSync(path)
    ? readFileSync(path, "utf8")
        .split("\n")
        .map((line) => /^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)$/.exec(line))
        .filter(Boolean)
        .map((m) => [m[1], m[2].trim().replace(/^(["'])(.*)\1$/, "$2")])
    : [];

/**
 * The package's env files: this checkout's and, from a worktree, the main
 * checkout's, which is where `.env.local` lives.
 */
function envFiles(root) {
  const common = git(
    root,
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  );
  const roots = new Set([root, join(dirname(common), "packages/next")]);
  return [...roots].flatMap((dir) =>
    existsSync(dir)
      ? readdirSync(dir)
          .filter((name) => /^\.env(\..+)?$/.test(name))
          .map((name) => join(dir, name))
      : [],
  );
}

/**
 * What must never be in a page that gets passed around: a value from an env
 * file, anything shaped like an ion token (a JWT), a path on this machine.
 * Each reason names where the value came from and never the value.
 */
export function findSecrets(
  html,
  { files = envFiles(packageRoot), home = homedir() } = {},
) {
  const found = [];
  for (const file of files) {
    for (const [key, value] of envEntries(file)) {
      if (value.length >= 8 && html.includes(value)) {
        found.push(`the value of ${key} from ${file.replace(/^.*\//, "")}`);
      }
    }
  }
  if (/eyJ[\w-]{10,}\.eyJ[\w-]{10,}\./.test(html)) {
    found.push("a string shaped like an access token (a JWT)");
  }
  if (html.includes(home)) {
    found.push("this machine's home directory");
  }
  return found;
}

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

export async function generate({ root = packageRoot, bundles = true } = {}) {
  const outDir = join(root, "handbook/generated");
  const outFile = join(outDir, "data.json");
  const previous = existsSync(outFile)
    ? JSON.parse(readFileSync(outFile, "utf8"))
    : undefined;
  // What the page describes, or is: uncommitted changes make the stamp say so.
  const dirty =
    git(
      root,
      "status",
      "--porcelain",
      "--",
      "src",
      "widgets",
      "api",
      "handbook",
    ).length > 0;
  const data = {
    meta: {
      generatedAt: new Date().toISOString(),
      commit: git(root, "rev-parse", "--short", "HEAD"),
      commitDate: git(root, "log", "-1", "--format=%cs"),
      dirty,
      version: JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
        .version,
    },
    surface: readSurface(root),
    oneX: (({ version, total, names }) => ({ version, total, names }))(
      readOneX(root),
    ),
    layers: readLayers(root),
    bundles: bundles ? await readBundles(root) : previous?.bundles,
    runtime: readRuntimeAssets(),
    pipeline: { ...readFrameGraph(root), figures: readPipelineFigures(root) },
    bench: readBenchResults(root),
    counts: readCounts(root),
    history: readHistory(root),
    catalog: readCatalog(root),
  };
  if (!data.bundles) {
    throw new Error("--no-bundles needs an earlier full run to keep from");
  }
  const notes = await import(
    pathToFileURL(join(root, "handbook/src/pipeline.ts")).href
  );
  for (const line of pipelineDrift(data.pipeline, notes, root)) {
    console.warn(`handbook: ${line}`);
  }
  mkdirSync(outDir, { recursive: true });
  await provideFont(outDir);
  writeFileSync(outFile, `${JSON.stringify(data, null, 1)}\n`);
  return data;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = await generate({
    bundles: !process.argv.includes("--no-bundles"),
  });
  console.log(
    `handbook data: ${data.surface.total} exports, ${data.layers.layers.length} layers, core ${data.bundles.library.entries.find((e) => e.entry === "core")?.loadKb} KB, ${data.bench.runs} bench runs`,
  );
}
