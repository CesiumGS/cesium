#!/usr/bin/env bun
/**
 * Bun build script for CesiumJS TypeScript
 */

import { watch } from "fs";
import { readdir, readFile, writeFile, stat, mkdir } from "fs/promises";
import { join, resolve, basename, dirname } from "path";
import { Glob } from "bun";

const rootDir = resolve(import.meta.dir, "..");
const packagesDir = join(rootDir, "packages");
const buildDir = join(rootDir, "Build");

interface BuildOptions {
  watch: boolean;
  minify: boolean;
  sourcemap: boolean;
}

/**
 * Process GLSL shader files into JavaScript modules
 */
async function processShaders(minify: boolean = false): Promise<void> {
  console.log("Processing GLSL shaders...");

  const engineDir = join(packagesDir, "engine");
  const shadersDir = join(engineDir, "Source", "Shaders");

  const glob = new Glob("**/*.glsl");
  const glslFiles: string[] = [];

  for await (const file of glob.scan(shadersDir)) {
    glslFiles.push(join(shadersDir, file));
  }

  // Also check ThirdParty/Shaders
  const thirdPartyShadersDir = join(engineDir, "Source", "ThirdParty", "Shaders");
  try {
    for await (const file of glob.scan(thirdPartyShadersDir)) {
      glslFiles.push(join(thirdPartyShadersDir, file));
    }
  } catch {
    // ThirdParty/Shaders may not exist
  }

  let processedCount = 0;

  await Promise.all(
    glslFiles.map(async (glslFile) => {
      const baseName = basename(glslFile, ".glsl");
      const jsFile = join(dirname(glslFile), `${baseName}.js`);

      // Check if JS file needs to be regenerated
      try {
        const jsStat = await stat(jsFile);
        const glslStat = await stat(glslFile);
        if (jsStat.mtime > glslStat.mtime) {
          return; // JS file is up to date
        }
      } catch {
        // JS file doesn't exist, need to generate
      }

      let contents = await readFile(glslFile, "utf-8");
      contents = contents.replace(/\r\n/gm, "\n");

      // Extract copyright comments
      let copyrightComments = "";
      const extractedComments = contents.match(
        /\/\*\*(?:[^*\/]|\*(?!\/)|\n)*?@license(?:.|\n)*?\*\//gm
      );
      if (extractedComments) {
        copyrightComments = `${extractedComments.join("\n")}\n`;
      }

      // Minify if requested
      if (minify) {
        // Simple minification - remove comments and extra whitespace
        contents = contents
          .replace(/\/\/.*$/gm, "") // Remove single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
          .replace(/\s+$/gm, "")
          .replace(/^\s+/gm, "")
          .replace(/\n+/gm, "\n");
        contents += "\n";
      }

      // Escape for JavaScript string
      contents = contents.split('"').join('\\"').replace(/\n/gm, "\\n\\\n");

      const jsContent = `${copyrightComments}//This file is automatically rebuilt by the Cesium build process.\nexport default "${contents}";\n`;

      await writeFile(jsFile, jsContent);
      processedCount++;
    })
  );

  console.log(`  Processed ${processedCount} shader files (${glslFiles.length} total)`);

  // Generate CzmBuiltins.js from the built-in shaders
  await generateCzmBuiltins(shadersDir);
}

/**
 * Generate CzmBuiltins.js that aggregates all built-in shader functions, constants, and structs
 */
async function generateCzmBuiltins(shadersDir: string): Promise<void> {
  const builtinDir = join(shadersDir, "Builtin");
  const constantsDir = join(builtinDir, "Constants");
  const functionsDir = join(builtinDir, "Functions");
  const structsDir = join(builtinDir, "Structs");

  const collectBuiltins = async (dir: string): Promise<string[]> => {
    const builtins: string[] = [];
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (file.endsWith(".glsl")) {
          builtins.push(basename(file, ".glsl"));
        }
      }
    } catch {
      // Directory might not exist
    }
    return builtins.sort();
  };

  const constants = await collectBuiltins(constantsDir);
  const structs = await collectBuiltins(structsDir);
  const functions = await collectBuiltins(functionsDir);

  const imports: string[] = [];
  const builtinLookup: string[] = [];

  const addBuiltins = (builtins: string[], path: string) => {
    for (const builtin of builtins) {
      imports.push(`import czm_${builtin} from './${path}/${builtin}.js'`);
      builtinLookup.push(`czm_${builtin} : czm_${builtin}`);
    }
  };

  addBuiltins(constants, "Constants");
  addBuiltins(structs, "Structs");
  addBuiltins(functions, "Functions");

  const fileContents = `//This file is automatically rebuilt by the Cesium build process.
${imports.join("\n")}

export default {
    ${builtinLookup.join(",\n    ")}
};
`;

  await writeFile(join(builtinDir, "CzmBuiltins.js"), fileContents);
  console.log(`  Generated CzmBuiltins.js with ${constants.length} constants, ${structs.length} structs, ${functions.length} functions`);
}

async function buildEngine(options: BuildOptions): Promise<void> {
  const engineDir = join(packagesDir, "engine");
  const entryPoint = join(engineDir, "Source", "index.ts");
  const outDir = join(buildDir, "CesiumEngine");

  console.log("Building @cesium/engine...");

  // Ensure output directory exists
  await mkdir(outDir, { recursive: true });

  const result = await Bun.build({
    entrypoints: [entryPoint],
    outdir: outDir,
    target: "browser",
    format: "esm",
    splitting: true,
    sourcemap: options.sourcemap ? "external" : "none",
    minify: options.minify,
    external: [
      // External dependencies that should not be bundled
      "@cesium/wasm-splats",
      "@spz-loader/core",
      "@tweenjs/tween.js",
      "@zip.js/zip.js",
      "draco3d",
      "protobufjs",
      "pako",
      "dompurify",
      "urijs",
      "topojson-client",
      "jsep",
      "earcut",
      "rbush",
      "kdbush",
      "lerc",
      "meshoptimizer",
      "bitmap-sdf",
      "grapheme-splitter",
      "ktx-parse",
      "mersenne-twister",
      "autolinker",
      "nosleep.js",
    ],
    define: {
      "process.env.NODE_ENV": options.minify ? '"production"' : '"development"',
    },
    loader: {
      ".glsl": "text",
      ".css": "text",
      ".json": "json",
    },
  });

  if (!result.success) {
    console.error("Engine build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  console.log(`  Engine built successfully to ${outDir}`);
}

async function buildWidgets(options: BuildOptions): Promise<void> {
  const widgetsDir = join(packagesDir, "widgets");
  const entryPoint = join(widgetsDir, "Source", "index.ts");
  const outDir = join(buildDir, "CesiumWidgets");

  console.log("Building @cesium/widgets...");

  // Ensure output directory exists
  await mkdir(outDir, { recursive: true });

  const result = await Bun.build({
    entrypoints: [entryPoint],
    outdir: outDir,
    target: "browser",
    format: "esm",
    splitting: true,
    sourcemap: options.sourcemap ? "external" : "none",
    minify: options.minify,
    external: ["@cesium/engine", "nosleep.js"],
    define: {
      "process.env.NODE_ENV": options.minify ? '"production"' : '"development"',
    },
    loader: {
      ".css": "text",
      ".json": "json",
    },
  });

  if (!result.success) {
    console.error("Widgets build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  console.log(`  Widgets built successfully to ${outDir}`);
}

async function typeCheck(): Promise<void> {
  console.log("Running TypeScript type check...");
  const proc = Bun.spawn(["bun", "x", "tsc", "--noEmit"], {
    cwd: rootDir,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.error("Type check failed");
    process.exit(exitCode);
  }
  console.log("  Type check passed");
}

async function build(options: BuildOptions): Promise<void> {
  console.log("Starting CesiumJS build with Bun...\n");

  // Process shaders first
  await processShaders(options.minify);

  // Run type check
  await typeCheck();

  // Build packages
  await buildEngine(options);
  await buildWidgets(options);

  console.log("\nBuild completed successfully!");
}

async function watchMode(): Promise<void> {
  console.log("Starting watch mode...\n");

  // Initial build
  await build({ watch: true, minify: false, sourcemap: true });

  // Watch for changes
  const engineSrcDir = join(packagesDir, "engine", "Source");
  const widgetsSrcDir = join(packagesDir, "widgets", "Source");

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const rebuild = async () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(async () => {
      console.log("\nChange detected, rebuilding...");
      try {
        await build({ watch: true, minify: false, sourcemap: true });
      } catch (error) {
        console.error("Rebuild failed:", error);
      }
    }, 100);
  };

  console.log("Watching for changes...");
  watch(engineSrcDir, { recursive: true }, rebuild);
  watch(widgetsSrcDir, { recursive: true }, rebuild);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const isWatch = args.includes("--watch") || args.includes("-w");
const isMinify = args.includes("--minify") || args.includes("-m");
const noSourcemap = args.includes("--no-sourcemap");
const skipTypeCheck = args.includes("--skip-typecheck");

if (isWatch) {
  watchMode().catch(console.error);
} else {
  build({
    watch: false,
    minify: isMinify,
    sourcemap: !noSourcemap,
  }).catch((error) => {
    console.error("Build failed:", error);
    process.exit(1);
  });
}
