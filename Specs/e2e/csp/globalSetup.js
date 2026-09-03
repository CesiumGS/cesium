import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCesium,
  buildEngine,
  buildWidgets,
} from "../../../scripts/build.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../../..");

// The CSP server serves the built ESM entry point, worker bundles, and combined
// build. Build them here so both CSP commands work from a clean checkout and
// exercise the source tree from the current test run.
export default async function globalSetup() {
  const originalWorkingDirectory = process.cwd();
  try {
    process.chdir(repositoryRoot);
    await buildEngine({
      minify: false,
      sourcemap: true,
    });
    await buildWidgets({
      minify: false,
      sourcemap: true,
    });
    await buildCesium({
      minify: true,
      node: false,
      removePragmas: true,
      sourcemap: false,
    });
  } finally {
    process.chdir(originalWorkingDirectory);
  }
}
