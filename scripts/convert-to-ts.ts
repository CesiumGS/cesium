#!/usr/bin/env bun
/**
 * Batch conversion script for converting CesiumJS JavaScript files to TypeScript
 * This handles common patterns found in the codebase.
 */

import { readdir, readFile, writeFile, stat } from "fs/promises";
import { join, basename, dirname, extname } from "path";

const rootDir = import.meta.dir;
const packagesDir = join(rootDir, "..", "packages");

interface ConversionStats {
  converted: number;
  skipped: number;
  errors: string[];
}

/**
 * Convert a JavaScript file to TypeScript
 */
async function convertFile(filePath: string): Promise<boolean> {
  const content = await readFile(filePath, "utf-8");
  const fileName = basename(filePath, ".js");
  const tsPath = filePath.replace(/\.js$/, ".ts");

  // Skip if already has a .ts version
  try {
    await stat(tsPath);
    console.log(`  Skipping ${fileName} - .ts version exists`);
    return false;
  } catch {
    // .ts doesn't exist, proceed with conversion
  }

  let tsContent = content;

  // 1. Update import extensions from .js to .ts (keep .js for now for compatibility)
  // TypeScript with bundler resolution handles this

  // 2. Convert constructor functions to classes
  tsContent = convertConstructorToClass(tsContent, fileName);

  // 3. Add type annotations to common patterns
  tsContent = addTypeAnnotations(tsContent);

  // 4. Remove debug pragmas (they're build-time only)
  tsContent = removeDebugPragmas(tsContent);

  // 5. Convert default exports
  tsContent = convertExports(tsContent, fileName);

  await writeFile(tsPath, tsContent, "utf-8");
  return true;
}

/**
 * Convert constructor function pattern to ES6 class
 */
function convertConstructorToClass(content: string, className: string): string {
  // Check if this file uses the constructor function pattern
  const constructorMatch = content.match(
    new RegExp(`^function\\s+${className}\\s*\\(([^)]*)\\)\\s*\\{`, "m")
  );

  if (!constructorMatch) {
    return content;
  }

  // This is a simplified conversion - complex cases need manual handling
  // For now, just add TypeScript-compatible syntax without full class conversion
  // since the codebase is quite complex with prototypes and static methods

  return content;
}

/**
 * Add type annotations based on JSDoc comments
 */
function addTypeAnnotations(content: string): string {
  let result = content;

  // Convert @type {number} patterns in JSDoc to TypeScript
  // This is a simplified approach - complex types need manual handling

  // Add return type annotations where possible
  result = result.replace(
    /@returns\s*\{([^}]+)\}/g,
    (match, type) => `@returns {${normalizeType(type)}}`
  );

  return result;
}

/**
 * Normalize JSDoc types to TypeScript types
 */
function normalizeType(type: string): string {
  return type
    .replace(/Number/g, "number")
    .replace(/String/g, "string")
    .replace(/Boolean/g, "boolean")
    .replace(/Object/g, "object")
    .replace(/Array/g, "Array")
    .replace(/\*/g, "any");
}

/**
 * Remove Cesium debug pragmas
 */
function removeDebugPragmas(content: string): string {
  // Remove //>>includeStart and //>>includeEnd blocks
  return content
    .replace(/\/\/>>includeStart\([^)]+\)[\s\S]*?\/\/>>includeEnd\([^)]+\)/g, "")
    .replace(/\/\/>>includeStart\([^)]+\)/g, "")
    .replace(/\/\/>>includeEnd\([^)]+\)/g, "");
}

/**
 * Convert exports to proper TypeScript exports
 */
function convertExports(content: string, className: string): string {
  let result = content;

  // Ensure named exports along with default exports
  if (result.includes(`export default ${className}`)) {
    // Already has default export
    if (!result.includes(`export { ${className} }`)) {
      result = result.replace(
        `export default ${className}`,
        `export { ${className} };\nexport default ${className}`
      );
    }
  }

  return result;
}

/**
 * Recursively find all JavaScript files in a directory
 */
async function findJsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, Build, ThirdParty, Workers, Shaders
      if (
        ["node_modules", "Build", "ThirdParty", "Workers", "Shaders"].includes(
          entry.name
        )
      ) {
        continue;
      }
      files.push(...(await findJsFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Main conversion function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const targetDir = args[0] || join(packagesDir, "engine", "Source");

  console.log(`Converting JavaScript files to TypeScript in: ${targetDir}\n`);

  const stats: ConversionStats = {
    converted: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const jsFiles = await findJsFiles(targetDir);
    console.log(`Found ${jsFiles.length} JavaScript files\n`);

    for (const file of jsFiles) {
      const relativePath = file.replace(targetDir, "");
      console.log(`Processing: ${relativePath}`);

      try {
        const converted = await convertFile(file);
        if (converted) {
          stats.converted++;
        } else {
          stats.skipped++;
        }
      } catch (error) {
        const errorMsg = `Error converting ${relativePath}: ${error}`;
        stats.errors.push(errorMsg);
        console.error(`  ${errorMsg}`);
      }
    }

    console.log("\n=== Conversion Summary ===");
    console.log(`Converted: ${stats.converted}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log("\nErrors:");
      stats.errors.forEach((e) => console.log(`  - ${e}`));
    }
  } catch (error) {
    console.error("Conversion failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
