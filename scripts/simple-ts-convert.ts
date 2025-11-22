#!/usr/bin/env bun
/**
 * Simple TypeScript conversion - keeps JS structure but adds TS compatibility
 */

import { readFile, writeFile, unlink, stat } from "fs/promises";
import { join, basename } from "path";
import { Glob } from "bun";

const rootDir = join(import.meta.dir, "..");
const packagesDir = join(rootDir, "packages");

async function convertFile(jsPath: string): Promise<boolean> {
  try {
    let content = await readFile(jsPath, "utf-8");
    const tsPath = jsPath.replace(/\.js$/, ".ts");

    // Skip shader files
    if (jsPath.includes("/Shaders/")) {
      return false;
    }

    // Add TypeScript compatibility without major restructuring
    let result = content;

    // Convert Object.freeze enums to const assertions
    result = result.replace(
      /const\s+(\w+)\s*=\s*Object\.freeze\(\{([^}]+)\}\);?/g,
      (_, name, body) => {
        return `const ${name} = Object.freeze({${body}} as const);\nexport type ${name} = typeof ${name}[keyof typeof ${name}];`;
      }
    );

    // Add any type to simple function parameters (not destructured)
    result = result.replace(
      /function\s+(\w+)\s*\(([^)]*)\)/g,
      (match, funcName, params) => {
        if (!params.trim()) return match;
        // Skip if already has types or contains destructuring
        if (params.includes(":") || params.includes("{") || params.includes("[")) {
          return match;
        }
        const typedParams = params.split(",").map((p: string) => {
          const param = p.trim();
          if (!param) return param;
          // Handle default values
          if (param.includes("=")) {
            const [name, defaultVal] = param.split("=").map((s: string) => s.trim());
            return `${name}: any = ${defaultVal}`;
          }
          return `${param}: any`;
        }).join(", ");
        return `function ${funcName}(${typedParams})`;
      }
    );

    // Add any type to simple arrow function parameters (not destructured, not empty)
    result = result.replace(
      /\(\s*([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*\)\s*=>/g,
      (match, params) => {
        if (!params.trim() || params.includes(":")) return match;
        const typedParams = params.split(",").map((p: string) => {
          const param = p.trim();
          if (!param) return param;
          return `${param}: any`;
        }).join(", ");
        return `(${typedParams}) =>`;
      }
    );

    // Ensure default export exists
    const fileName = basename(jsPath, ".js");
    if (!result.includes("export default") && !result.includes("export {")) {
      // Check if there's a main export (class, function, or const with same name)
      const mainPattern = new RegExp(`(?:function|const|class)\\s+${fileName}\\b`);
      if (mainPattern.test(result)) {
        result += `\nexport default ${fileName};\n`;
      }
    }

    await writeFile(tsPath, result, "utf-8");
    return true;
  } catch (error) {
    console.error(`Error converting ${jsPath}:`, error);
    return false;
  }
}

async function processDirectory(dir: string): Promise<number> {
  const glob = new Glob("**/*.js");
  let converted = 0;
  const files: string[] = [];

  for await (const file of glob.scan(dir)) {
    if (!file.includes("/Shaders/")) {
      files.push(join(dir, file));
    }
  }

  console.log(`  Found ${files.length} JavaScript files`);

  for (let i = 0; i < files.length; i++) {
    if (await convertFile(files[i])) {
      converted++;
    }
    if ((i + 1) % 100 === 0) {
      process.stdout.write(`\r  Progress: ${i + 1}/${files.length}`);
    }
  }
  console.log();

  return converted;
}

async function removeJsFiles(dir: string): Promise<number> {
  const glob = new Glob("**/*.js");
  let removed = 0;

  for await (const file of glob.scan(dir)) {
    if (file.includes("/Shaders/")) continue;

    const jsPath = join(dir, file);
    const tsPath = jsPath.replace(/\.js$/, ".ts");

    try {
      await stat(tsPath);
      await unlink(jsPath);
      removed++;
    } catch {
      // Keep JS if no TS exists
    }
  }

  return removed;
}

async function main(): Promise<void> {
  console.log("=== Simple TypeScript Conversion ===\n");

  const engineDir = join(packagesDir, "engine", "Source");
  const widgetsDir = join(packagesDir, "widgets", "Source");

  console.log("Converting @cesium/engine...");
  const engineConverted = await processDirectory(engineDir);
  console.log(`  Converted: ${engineConverted}`);

  console.log("\nConverting @cesium/widgets...");
  const widgetsConverted = await processDirectory(widgetsDir);
  console.log(`  Converted: ${widgetsConverted}`);

  console.log("\nRemoving JavaScript files...");
  const engineRemoved = await removeJsFiles(engineDir);
  const widgetsRemoved = await removeJsFiles(widgetsDir);
  console.log(`  Removed: ${engineRemoved + widgetsRemoved}`);

  console.log("\n=== Complete ===");
}

if (import.meta.main) {
  main().catch(console.error);
}
