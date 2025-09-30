import { access, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { exit } from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { rimraf } from "rimraf";
import { parse } from "yaml";
import { globby } from "globby";
import * as pagefind from "pagefind";

import createGalleryRecord from "./createGalleryRecord.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultRootDirectory = join(__dirname, "..");
const defaultPublicDirectory = "./public";
const defaultGalleryFiles = ["gallery"];
const defaultThumbnailPath = "images/placeholder-thumbnail.jpg";
const requiredMetadataKeys = ["title", "description"];
const galleryItemConfig = /sandcastle\.(yml|yaml)/;

async function createPagefindIndex() {
  try {
    const { index } = await pagefind.createIndex({
      verbose: true,
      logfile: join(__dirname, "pagefind-debug.log"),
    });

    if (!index) {
      throw new Error("Missing index output.");
    }

    return index;
  } catch (error) {
    throw new Error(`Could not create search index. ${error.message}`);
  }
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * @typedef {Record<string, string | string[]> | null} GalleryFilter
 */

/**
 * @typedef {Object} BuildGalleryOptions
 * @property {string} [rootDirectory = ".."] The root directory to which all other paths are relative.
 * @property {string} [publicDirectory = "./public"] The static directory where the gallery list and search index will be written.
 * @property {string[]} [galleryFiles] The glob pattern(s) to find gallery yaml files.
 * @property {string} [sourceUrl=""] The source code repository URL corresponding to the root directory of the gallery files.
 * @property {string} [defaultThumbnail = "images/placeholder-thumbnail.jpg"] The default thumbnail image to use if not is specified in the gallery yaml file.
 * @property {Pagefind.SearchOptions} [searchOptions={}] The search options to use when initializing Pagefind.
 * @property {GalleryFilter} [defaultFilters=null] The default filter option to use, e.g., { "label" : "Showcases"}.
 * @property {Record<string, any>} [metadata={}] A map of metadata to pass through to pagefind, and their default if unspecified.
 * @property {boolean} [includeDevelopment = true] Whether to include sandcastles marked as development.
 */

/**
 * @param {BuildGalleryOptions} [options] The build options.
 * @returns
 */
export async function buildGalleryList(options = {}) {
  const rootDirectory = options.rootDirectory ?? defaultRootDirectory;
  const publicDirectory = options.publicDirectory ?? defaultPublicDirectory;
  const galleryFilesPattern = options.galleryFiles ?? defaultGalleryFiles;
  const sourceUrl = options.sourceUrl ?? "";
  const defaultThumbnail = options.defaultThumbnail ?? defaultThumbnailPath;
  const searchOptions = options.searchOptions ?? {};
  const defaultFilters = options.defaultFilters ?? null;
  const metadataKeys = options.metadata ?? {};
  const includeDevelopment = options.includeDevelopment ?? true;

  const pagefindIndex = await createPagefindIndex();

  /**
   * @typedef GalleryListItem
   * @property {string} url
   * @property {string} id
   * @property {string} title
   * @property {string} thumbnail
   * @property {number} lineCount
   * @property {string} description
   * @property {string[]} labels
   */

  /**
   * @typedef GalleryList
   * @property {GalleryListItem[]} entries
   * @property {Record<string, string>} legacyIds
   * @property {Pagefind.SearchOptions} searchOptions
   * @property {GalleryFilter} defaultFilters
   */

  /**
   * @type {GalleryList}
   */
  const output = {
    entries: [],
    legacyIds: {},
    searchOptions,
    defaultFilters,
  };

  const errors = [];
  const check = (condition, messageIfTrue) => {
    if (condition) {
      errors.push(new Error(messageIfTrue));
    }
    return condition;
  };

  const galleryFiles = await globby(
    galleryFilesPattern.map((pattern) => join(rootDirectory, pattern, "**/*")),
  );
  const yamlFiles = galleryFiles.filter((path) =>
    basename(path).match(galleryItemConfig),
  );

  for (const filePath of yamlFiles) {
    let metadata;

    try {
      const file = await readFile(filePath, "utf-8");
      metadata = parse(file);
    } catch (error) {
      errors.push(
        new Error(`Could not read file "${filePath}: ${error.message}"`),
      );
      continue;
    }

    const expectedKeys = [
      ...requiredMetadataKeys,
      "thumbnail",
      ...Object.keys(metadataKeys),
    ];

    if (!metadata) {
      errors.push(
        new Error(
          `File "${filePath}" is missing keys "${expectedKeys.join(`", "`)}"`,
        ),
      );
      continue;
    }

    // Check that all keys in a yaml file are values we expect
    for (const key of Object.keys(metadata)) {
      if (!expectedKeys.includes(key)) {
        errors.push(
          new Error(`File "${filePath}" has unexpected key "${key}"`),
        );
      }
    }

    const galleryDirectory = dirname(filePath);
    const slug = basename(galleryDirectory);
    const relativePath = relative(rootDirectory, galleryDirectory);
    const galleryBase = join(rootDirectory, relativePath);

    const { title, description, legacyId, thumbnail, labels, development } =
      metadata;

    // Validate metadata

    if (
      check(!/^[a-zA-Z0-9-.]+$/.test(slug), `"${slug}" is not a valid slug`) ||
      check(!title, `${slug} - Missing title`) ||
      check(!description, `${slug} - Missing description`)
    ) {
      continue;
    }

    const indexHtml = join(galleryBase, "index.html");
    const hasIndexHtml = await exists(indexHtml);
    if (!hasIndexHtml) {
      errors.push(new Error(`Missing "${indexHtml}"`));
    }

    const indexJs = join(galleryBase, "main.js");
    const hasIndexJs = await exists(indexJs);
    if (!hasIndexJs) {
      errors.push(new Error(`Missing "${indexJs}"`));
    }

    const thumbnailImage = thumbnail
      ? join(relativePath, thumbnail)
      : defaultThumbnail;
    const hasThumbnail =
      !thumbnail || (await exists(join(rootDirectory, thumbnailImage)));
    if (!hasThumbnail) {
      errors.push(new Error(`Missing "${thumbnailImage}"`));
    }

    if (
      !hasIndexHtml ||
      !hasIndexJs ||
      !hasThumbnail ||
      (development && !includeDevelopment)
    ) {
      continue;
    }

    if (development && !labels.includes("Development")) {
      labels.push("Development");
    }

    if (legacyId) {
      output.legacyIds[legacyId] = slug;
    }

    try {
      const jsFile = await readFile(indexJs, "utf-8");
      const lineCount = jsFile.split("\n").length;
      const editSourceUrl = join(sourceUrl, relativePath);

      output.entries.push({
        url: relativePath,
        id: slug,
        title: title,
        thumbnail: thumbnailImage,
        sourceUrl: editSourceUrl,
        lineCount: lineCount,
        description: description,
        labels: labels,
      });

      await pagefindIndex.addHTMLFile(
        createGalleryRecord({
          id: slug,
          code: jsFile,
          title,
          description,
          image: thumbnailImage,
          labels,
        }),
      );
    } catch (error) {
      errors.push(
        new Error(
          `Could not build gallery record for "${filePath}": ${error.message}`,
        ),
      );
      continue;
    }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, "Could not build gallery list");
  }

  // Sort alphabetically so the default sort order when loaded is alphabetical,
  // regardless of if titles match the directory names
  output.entries.sort((a, b) => a.title.localeCompare(b.title));

  const outputDirectory = join(rootDirectory, publicDirectory, "gallery");
  await rimraf(outputDirectory);
  await mkdir(outputDirectory, { recursive: true });

  await writeFile(join(outputDirectory, "list.json"), JSON.stringify(output));

  await pagefindIndex.writeFiles({
    outputPath: join(outputDirectory, "pagefind"),
  });

  // Copy all static gallery files
  const staticGalleryFiles = galleryFiles.filter(
    (path) => !basename(path).match(galleryItemConfig),
  );
  try {
    for (const file of staticGalleryFiles) {
      const destination = join(
        rootDirectory,
        publicDirectory,
        relative(rootDirectory, file),
      );
      await cp(file, destination, { recursive: true });
    }
  } catch (error) {
    console.error(`Error copying gallery files: ${error.message}`);
  }

  return output;
}

// If running the script directly using node
if (import.meta.url.endsWith(`${pathToFileURL(process.argv[1])}`)) {
  const argv = yargs(hideBin(process.argv)).parse();

  const configPath = argv.config ?? join(__dirname, "../sandcastle.config.js");
  let buildGalleryOptions;

  try {
    const config = await import(pathToFileURL(configPath).href);
    const { root, publicDir, gallery, sourceUrl } = config.default;

    // Paths are specified relative to the config file
    const configDir = dirname(configPath);
    const configRoot = root ? join(configDir, root) : configDir;
    const {
      files,
      includeDevelopment,
      defaultThumbnail,
      searchOptions,
      defaultFilters,
      metadata,
    } = gallery ?? {};

    buildGalleryOptions = {
      rootDirectory: configRoot,
      publicDirectory: publicDir,
      galleryFiles: files,
      sourceUrl,
      defaultThumbnail,
      searchOptions,
      defaultFilters,
      metadata,
      includeDevelopment,
    };
  } catch (error) {
    console.error(`Could not read config file: ${error.message}`, {
      cause: error,
    });
    exit(1);
  }

  let output;
  try {
    output = await buildGalleryList(buildGalleryOptions);
    console.log("Successfully built gallery list.");
  } catch (error) {
    console.error(error);
    exit(1);
  }

  if (output) {
    console.log(`Processed ${output.entries.length} gallery examples.`);
  }
}
