// @ts-check

import { execSync } from "node:child_process";
import { globSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";
import { format, resolveConfig } from "prettier";

const packageDirectory = join(import.meta.dirname, "..");
const rootDirectory = join(packageDirectory, "../..");

execSync("npx tsc -p packages/gltf/tsconfig.declarations.json", {
  cwd: rootDirectory,
  stdio: "inherit",
});

// tsc keeps `@import` comment blocks in its output, and API Extractor would
// copy them into the rollup. See https://github.com/microsoft/TypeScript/issues/58921
const importCommentRegex =
  /^[ \t]*\/\*\*[\s*]*@import\b[\s\S]*?\*\/[ \t]*\r?\n/gm;
for (const declarationFile of globSync("Build/Types/**/*.d.ts", {
  cwd: packageDirectory,
})) {
  const declarationPath = join(packageDirectory, declarationFile);
  const declarations = readFileSync(declarationPath, "utf8");
  writeFileSync(declarationPath, declarations.replace(importCommentRegex, ""));
}

const extractorResult = Extractor.invoke(
  ExtractorConfig.loadFileAndPrepare(
    join(packageDirectory, "api-extractor.json"),
  ),
  { localBuild: true },
);
if (!extractorResult.succeeded) {
  throw new Error(
    `API Extractor failed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings`,
  );
}

// API Extractor strips the leading spaces from every line it copies.
const rollupPath = join(packageDirectory, "index.d.ts");
const prettierOptions = await resolveConfig(rollupPath);
writeFileSync(
  rollupPath,
  await format(readFileSync(rollupPath, "utf8"), {
    ...prettierOptions,
    filepath: rollupPath,
  }),
);

execSync("npx tsc -p packages/gltf/tsconfig.types.json", {
  cwd: rootDirectory,
  stdio: "inherit",
});
