#!/usr/bin/env bun
/**
 * Generate index.ts entry point for Cesium packages
 */

import { readdir, writeFile } from "fs/promises";
import { join, basename } from "path";

const rootDir = import.meta.dir;
const packagesDir = join(rootDir, "..", "packages");

async function findTsModules(dir: string, includeUtilities: boolean = true): Promise<string[]> {
  const modules: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      const moduleName = basename(entry.name, ".ts");
      // Include all modules if includeUtilities is true, otherwise only uppercase modules
      if (includeUtilities || moduleName[0] === moduleName[0].toUpperCase()) {
        modules.push(moduleName);
      }
    }
  }

  return modules.sort();
}

async function generateEngineIndex(): Promise<void> {
  const sourceDir = join(packagesDir, "engine", "Source");
  const indexPath = join(sourceDir, "index.ts");

  // Get modules from each subdirectory
  const coreModules = await findTsModules(join(sourceDir, "Core"));
  const dataSourcesModules = await findTsModules(join(sourceDir, "DataSources"));
  const rendererModules = await findTsModules(join(sourceDir, "Renderer"));
  const sceneModules = await findTsModules(join(sourceDir, "Scene"));
  const widgetModules = await findTsModules(join(sourceDir, "Widget"));

  let content = `/**
 * @cesium/engine - CesiumJS Engine
 * Auto-generated index file
 */

// Core exports
`;

  for (const mod of coreModules) {
    content += `export { default as ${mod} } from "./Core/${mod}.js";\n`;
  }

  content += `\n// DataSources exports\n`;
  for (const mod of dataSourcesModules) {
    content += `export { default as ${mod} } from "./DataSources/${mod}.js";\n`;
  }

  content += `\n// Renderer exports\n`;
  for (const mod of rendererModules) {
    content += `export { default as ${mod} } from "./Renderer/${mod}.js";\n`;
  }

  content += `\n// Scene exports\n`;
  for (const mod of sceneModules) {
    content += `export { default as ${mod} } from "./Scene/${mod}.js";\n`;
  }

  content += `\n// Widget exports\n`;
  for (const mod of widgetModules) {
    content += `export { default as ${mod} } from "./Widget/${mod}.js";\n`;
  }

  await writeFile(indexPath, content, "utf-8");
  console.log(`Generated ${indexPath}`);
  console.log(`  Core: ${coreModules.length} modules`);
  console.log(`  DataSources: ${dataSourcesModules.length} modules`);
  console.log(`  Renderer: ${rendererModules.length} modules`);
  console.log(`  Scene: ${sceneModules.length} modules`);
  console.log(`  Widget: ${widgetModules.length} modules`);
}

async function generateWidgetsIndex(): Promise<void> {
  const sourceDir = join(packagesDir, "widgets", "Source");
  const indexPath = join(sourceDir, "index.ts");

  // Get all widget subdirectories
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const widgetDirs = entries
    .filter(e => e.isDirectory() && !["ThirdParty"].includes(e.name))
    .map(e => e.name)
    .sort();

  let content = `/**
 * @cesium/widgets - CesiumJS Widgets
 * Auto-generated index file
 */

`;

  for (const dir of widgetDirs) {
    const modules = await findTsModules(join(sourceDir, dir));
    if (modules.length > 0) {
      content += `// ${dir} exports\n`;
      for (const mod of modules) {
        content += `export { default as ${mod} } from "./${dir}/${mod}.js";\n`;
      }
      content += `\n`;
    }
  }

  await writeFile(indexPath, content, "utf-8");
  console.log(`Generated ${indexPath}`);
}

async function main(): Promise<void> {
  console.log("Generating index.ts files...\n");

  await generateEngineIndex();
  console.log();
  await generateWidgetsIndex();

  console.log("\nDone!");
}

main().catch(console.error);
