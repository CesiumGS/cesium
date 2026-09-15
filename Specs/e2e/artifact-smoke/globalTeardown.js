import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../../..");
const manifestPath = path.join(
  repositoryRoot,
  "Build/Specs/e2e/artifact-smoke/manifest.json",
);

export default async function globalTeardown() {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const roots = new Set(manifest.artifacts.map(({ root }) => root));
    await Promise.all(
      [...roots].map((root) => rm(root, { recursive: true, force: true })),
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
