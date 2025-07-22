import { readFileSync, existsSync, writeFileSync } from "fs";
import { parse } from "yaml";
import { globbySync } from "globby";
import { basename, dirname, join } from "path";
import { exit } from "process";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as pagefind from "pagefind";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildGalleryList(
  galleryDirectory,
  includeDevelopment = true,
) {
  const yamlFiles = globbySync([
    `${galleryDirectory}/*/sandcastle.(yml|yaml)`,
    `!${galleryDirectory}/list.json`,
  ]);

  /**
   * @typedef GalleryListItem
   * @property {string} id
   * @property {string} title
   * @property {string} thumbnail
   * @property {string} description
   * @property {string[]} labels
   * @property {boolean} isNew
   */

  /**
   * @type {{entries: GalleryListItem[], legacyIdMap: Object<string, string>}}
   */
  const output = {
    entries: [],
    legacyIdMap: {},
  };

  const { index } = await pagefind.createIndex({
    verbose: true,
    logfile: join(__dirname, "pagefind-debug.log"),
  });
  if (!index) {
    console.log("Unable to create index");
    return { output, hasErrors: true };
  }

  let hasErrors = false;
  const check = (condition, messageIfTrue) => {
    if (condition) {
      console.error(messageIfTrue);
      hasErrors = true;
    }
    return condition;
  };

  for (const filePath of yamlFiles) {
    const file = readFileSync(filePath, { encoding: "utf-8" });
    let metadata;

    try {
      metadata = parse(file);
    } catch (error) {
      console.error("Error parsing", filePath);
      continue;
    }
    if (!metadata) {
      console.error(filePath, "is empty!");
      continue;
    }

    const expectedKeys = [
      "legacyId",
      "title",
      "description",
      "thumbnail",
      "labels",
      "development",
    ];
    // Check that all keys in a yaml file are values we expect
    for (const key of Object.keys(metadata)) {
      if (!expectedKeys.includes(key)) {
        console.error(filePath, "has an extra key:", key);
      }
    }

    const slug = basename(dirname(filePath));
    const { legacyId, title, description, thumbnail, labels, development } =
      metadata;

    // Validate metadata

    if (
      check(!/^[a-zA-Z0-9-]+$/.test(slug), `"${slug}" is not a valid slug`) ||
      check(!title, `${slug} - Missing title`) ||
      check(!description, `${slug} - Missing description`) ||
      check(
        !labels || labels.length === 0,
        `${slug} - Must have at least 1 label`,
      )
    ) {
      continue;
    }

    const galleryBase = `${galleryDirectory}/${slug}`;

    if (!existsSync(`${galleryBase}/index.html`)) {
      console.error(slug, "- Missing index.html");
      hasErrors = true;
    }
    if (!existsSync(`${galleryBase}/main.js`)) {
      console.error(slug, "- Missing main.js");
      hasErrors = true;
    }
    if (thumbnail && !existsSync(join(galleryBase, thumbnail))) {
      console.error(slug, "- Missing thumbnail", thumbnail);
      hasErrors = true;
    }

    if (development && !includeDevelopment) {
      continue;
    }

    if (development && !labels.includes("Development")) {
      labels.push("Development");
    }

    output.entries.push({
      id: slug,
      title: title,
      thumbnail: thumbnail,
      description: description,
      labels: labels,
      isNew: false,
    });
    if (legacyId) {
      output.legacyIdMap[legacyId] = slug;
    }

    const jsFile = readFileSync(`${galleryBase}/main.js`, "utf-8");
    await index.addCustomRecord({
      url: `?id=${slug}`,
      content: jsFile,
      language: "en",
      meta: {
        id: slug,
        title,
        description,
        labels: labels.join(","),
      },
      filters: {
        tags: labels,
      },
    });
  }

  if (!hasErrors) {
    console.log("Gallery list built");
    // sort alphabetically so the default sort order when loaded is alphabetical
    // regardless if titles match the directory names
    output.entries.sort((a, b) => a.title.localeCompare(b.title));
    writeFileSync(join(galleryDirectory, "list.json"), JSON.stringify(output));

    await index.writeFiles({
      outputPath: join(galleryDirectory, "pagefind"),
    });
  } else {
    console.error("Something is wrong with the gallery, see above");
  }
  return { output, hasErrors };
}

// if running the script directly using node
/* global process */
if (import.meta.url.endsWith(`${pathToFileURL(process.argv[1])}`)) {
  const defaultGalleryDirectory = join(__dirname, "../gallery");
  buildGalleryList(defaultGalleryDirectory)
    .then(({ output, hasErrors }) => {
      console.log("processed", output.entries.length, "sandcastles");
      if (hasErrors) {
        exit(1);
      }
    })
    .catch((error) => {
      console.error("Issue processing gallery");
      console.error(error);
      exit(1);
    });
}
