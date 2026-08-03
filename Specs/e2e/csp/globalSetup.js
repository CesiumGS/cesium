import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildEngine } from "../../../scripts/build.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../../..");

// The CSP server deliberately serves the built ESM entry point and worker
// bundles. Build them here so either CSP command works from a clean checkout
// and always exercises the source tree from the current test run.
export default async function globalSetup() {
  const originalWorkingDirectory = process.cwd();
  try {
    process.chdir(repositoryRoot);
    await buildEngine({
      minify: false,
      sourcemap: true,
    });
  } finally {
    process.chdir(originalWorkingDirectory);
  }
}
