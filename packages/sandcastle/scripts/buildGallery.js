import { readFileSync, existsSync, writeFileSync } from "fs";
import { parse } from "yaml";
import { globbySync } from "globby";
import { basename, dirname, join } from "path";
import { exit } from "process";
import { fileURLToPath } from "node:url";

// TODO: probably need to find a way to integrate this into the vite process to make sure it's
// built during build
// May also want to move this out of the sandcastle project so we don't have to duplicate
// files for the local build, need to think about deploying too...

export function buildGalleryList(galleryDirectory) {
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
   * @property {boolean} isNew
   */

  /**
   * @type {{entries: GalleryListItem[], legacyIdMap: Object<string, string>}}
   */
  const output = {
    entries: [],
    legacyIdMap: {},
  };

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
      "id",
      "legacyId",
      "title",
      "description",
      "thumbnail",
      "labels",
    ];
    // Check that all keys in a yaml file are values we expect
    for (const key of Object.keys(metadata)) {
      if (!expectedKeys.includes(key)) {
        console.error(filePath, "has an extra key:", key);
      }
    }

    const { id, title, description, thumbnail } = metadata;

    // Validate metadata

    const slug = basename(dirname(filePath));
    if (
      check(!id, `${filePath} - Missing id`) ||
      check(id !== slug, `${id} - Id does not match slug: ${slug}`) ||
      check(!title, `${id} - Missing title`) ||
      check(!description, `${id} - Missing description`)
    ) {
      continue;
    }

    const galleryBase = `${galleryDirectory}/${metadata.id}`;

    if (!existsSync(`${galleryBase}/index.html`)) {
      console.error(id, "- Missing index.html");
      hasErrors = true;
    }
    if (!existsSync(`${galleryBase}/main.js`)) {
      console.error(id, "- Missing main.js");
      hasErrors = true;
    }
    if (thumbnail && !existsSync(join(galleryBase, thumbnail))) {
      console.error(id, "- Missing thumbnail", thumbnail);
      hasErrors = true;
    }

    output.entries.push({
      id: id,
      title: title,
      thumbnail: thumbnail,
      description: description,
      isNew: false,
    });
    const legacyId = metadata.legacyId;
    if (legacyId) {
      output.legacyIdMap[legacyId] = id;
    }
  }

  if (!hasErrors) {
    console.log("Gallery list built");
    writeFileSync(
      join(galleryDirectory, "list.json"),
      JSON.stringify(output, null, 2),
    );
  } else {
    console.error("Something is wrong with the gallery, see above");
  }
  return { output, hasErrors };
}

// if running the script directly using node
/* global process */
if (import.meta.url.endsWith(process.argv[1])) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const defaultGalleryDirectory = join(__dirname, "../gallery");
  const { output, hasErrors } = buildGalleryList(defaultGalleryDirectory);
  console.log("processed", output.entries.length, "sandcastles");
  if (hasErrors) {
    exit(1);
  }
}
