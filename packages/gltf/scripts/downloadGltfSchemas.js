// @ts-check

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * @typedef {object} SchemaSource
 * @property {string} repository
 * @property {string} commit
 * @property {string} schemaDirectory
 */

const schemasDirectory = join(import.meta.dirname, "../Build/Schemas");

/** @type {{core: Record<string, SchemaSource>, extensions: Record<string, SchemaSource | {core: string[]}>}} */
const sources = JSON.parse(
  readFileSync(join(import.meta.dirname, "gltfSchemaSources.json"), "utf8"),
);

/** @type {Map<string, Promise<string[]>>} */
const repositoryFiles = new Map();

rmSync(schemasDirectory, { recursive: true, force: true });

for (const [version, source] of Object.entries(sources.core)) {
  await downloadSchemas(source, join(schemasDirectory, version), version);
}
for (const [name, source] of Object.entries(sources.extensions)) {
  if ("schemaDirectory" in source) {
    await downloadSchemas(
      source,
      join(schemasDirectory, "Extensions", name),
      name,
    );
  }
}

/**
 * Downloads every `*.schema.json` file under a source's schema directory,
 * keeping its path relative to that directory.
 *
 * @param {SchemaSource} source
 * @param {string} outputDirectory
 * @param {string} label
 */
async function downloadSchemas(source, outputDirectory, label) {
  const { repository, commit, schemaDirectory } = source;
  const prefix = `${schemaDirectory}/`;
  const schemaPaths = (await listFiles(repository, commit))
    .filter((path) => path.startsWith(prefix) && path.endsWith(".schema.json"))
    .map((path) => path.slice(prefix.length));
  if (schemaPaths.length === 0) {
    throw new Error(
      `No schemas found for ${label} in ${repository}@${commit}/${schemaDirectory}`,
    );
  }

  await Promise.all(
    schemaPaths.map(async (schemaPath) => {
      const text = await fetchText(
        `https://raw.githubusercontent.com/${repository}/${commit}/${prefix}${schemaPath}`,
      );
      const outputPath = join(outputDirectory, schemaPath);
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, text);
    }),
  );
  console.log(`${label}: ${schemaPaths.length} schemas`);
}

/**
 * Lists the paths of all files in a repository at a commit, fetching each
 * repository and commit only once.
 *
 * @param {string} repository
 * @param {string} commit
 * @returns {Promise<string[]>}
 */
function listFiles(repository, commit) {
  const key = `${repository}@${commit}`;
  let files = repositoryFiles.get(key);
  if (files === undefined) {
    files = fetchText(
      `https://api.github.com/repos/${repository}/git/trees/${commit}?recursive=1`,
    ).then((text) => {
      const tree = JSON.parse(text);
      if (tree.truncated) {
        throw new Error(`File list for ${key} is truncated`);
      }
      return tree.tree
        .filter((/** @type {{type: string}} */ entry) => entry.type === "blob")
        .map((/** @type {{path: string}} */ entry) => entry.path);
    });
    repositoryFiles.set(key, files);
  }
  return files;
}

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.text();
}
