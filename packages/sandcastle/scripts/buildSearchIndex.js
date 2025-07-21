import { readFileSync } from "fs";
import { globbySync } from "globby";
import * as pagefind from "pagefind";
import { basename, dirname, join } from "path";
import { exit } from "process";
import { fileURLToPath, pathToFileURL } from "url";
import { parse as parseYaml } from "yaml";

export async function buildSearchIndex(galleryDirectory, outputPath) {
  const yamlFiles = globbySync([
    `${galleryDirectory}/*/sandcastle.(yml|yaml)`,
    `!${galleryDirectory}/list.json`,
  ]);

  const { index } = await pagefind.createIndex({
    verbose: true,
    logfile: "pagefind-debug.log",
  });
  if (!index) {
    console.log("Unable to create index");
    return;
  }

  for (const filePath of yamlFiles) {
    const file = readFileSync(filePath, { encoding: "utf-8" });
    let metadata;

    try {
      metadata = parseYaml(file);
    } catch (error) {
      console.error("Error parsing", filePath);
      continue;
    }
    if (!metadata) {
      console.error(filePath, "is empty!");
      continue;
    }

    const slug = basename(dirname(filePath));
    const { title, description, labels = [] } = metadata;

    const galleryBase = `${galleryDirectory}/${slug}`;
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

  await index.writeFiles({
    outputPath,
  });
}

// if running the script directly using node
/* global process */
if (import.meta.url.endsWith(`${pathToFileURL(process.argv[1])}`)) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const defaultGalleryDirectory = join(__dirname, "../gallery");
  const outputPath = join(__dirname, "../gallery/pagefind");

  console.time();
  buildSearchIndex(defaultGalleryDirectory, outputPath)
    .then(async () => {
      await pagefind.close();
      console.timeEnd();
      console.log("completed");
    })
    .catch((error) => {
      console.error("Issue constructing pagefind indexes");
      console.error(error);
      exit(1);
    });
}
