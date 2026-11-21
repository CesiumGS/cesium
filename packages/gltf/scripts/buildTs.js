// @ts-check

import { execSync } from "node:child_process";
import { join } from "node:path";
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";

const packageDirectory = join(import.meta.dirname, "..");
const rootDirectory = join(packageDirectory, "../..");

execSync("npx tsc -p packages/gltf/tsconfig.declarations.json", {
  cwd: rootDirectory,
  stdio: "inherit",
});

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

execSync("npx tsc -p packages/gltf/tsconfig.types.json", {
  cwd: rootDirectory,
  stdio: "inherit",
});
