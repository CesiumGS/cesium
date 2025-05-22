import { readFileSync, existsSync, writeFileSync } from "fs";
import { parse } from "yaml";
import { globbySync } from "globby";
import { basename, dirname, join } from "path";
import { exit } from "process";

// TODO: probably need to find a way to integrate this into the vite process to make sure it's
// built during build
// May also want to move this out of the sandcastle project so we don't have to duplicate
// files for the local build, need to think about deploying too...

const galleryDirectory = "./public/gallery";

const yamlFiles = globbySync([
  `${galleryDirectory}/*/sandcastle.yaml`,
  `!${galleryDirectory}/list.json`,
]);

console.log("files", yamlFiles);

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

let writeFile = true;
const check = (condition, messageIfTrue) => {
  if (condition) {
    console.error(messageIfTrue);
    writeFile = false;
  }
  return condition;
};

for (const filePath of yamlFiles) {
  const file = readFileSync(filePath, { encoding: "utf-8" });
  const metadata = parse(file);
  console.log("path", filePath);
  console.log(metadata);
  if (!metadata) {
    console.error(filePath, "is empty!");
    continue;
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

  // const galleryFiles = globbySync(galleryBase);
  // console.log("gallery files", galleryFiles);

  if (!existsSync(`${galleryBase}/index.html`)) {
    console.error(id, "- Missing index.html");
    writeFile = false;
  }
  if (!existsSync(`${galleryBase}/main.js`)) {
    console.error(id, "- Missing main.js");
    writeFile = false;
  }
  if (thumbnail && !existsSync(join(galleryBase, thumbnail))) {
    console.error(id, "- Missing thumbnail", thumbnail);
    writeFile = false;
  }

  output.entries.push({
    id: id,
    title: title,
    thumbnail: thumbnail,
    description: description,
    isNew: false,
  });
  const legacyId = metadata["legacy-id"];
  if (legacyId) {
    output.legacyIdMap[legacyId] = id;
  }
}

if (writeFile) {
  console.log(output);
  writeFileSync(
    join(galleryDirectory, "list.json"),
    JSON.stringify(output, null, 2),
  );
} else {
  console.error("Something is wrong with the gallery, see above");
  exit(1);
}
