import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { basename, dirname, join } from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { stringify } from "yaml";
import slugify from "slugify";
import * as prettier from "prettier";
import * as babelPlugin from "prettier/plugins/babel";
import * as estreePlugin from "prettier/plugins/estree";
import * as htmlPlugin from "prettier/plugins/html";
import { globbySync } from "globby";

const __dirname = dirname(fileURLToPath(import.meta.url));

const inputDirectory = join(__dirname, "../../../Apps/Sandcastle/gallery");
const outputDirectory = join(__dirname, "../gallery");

async function convertSandcastle(path, developerOnly = false) {
  const htmlFile = readFileSync(path, "utf-8");
  const { document } = new JSDOM(htmlFile, {
    url: "https://example.com",
  }).window;

  const name = basename(path, ".html");
  let slug = slugify(name, {
    lower: true,
  }).replaceAll(/[\(\)]/g, "");

  const thumbnailPath = path.replace(".html", ".jpg");

  console.log(`processing ${developerOnly ? "dev" : ""}`, slug);

  let title = document.title;
  if (title === "Cesium Demo") {
    title = name;
  }
  const labelsMeta = document.querySelector(
    "meta[name=cesium-sandcastle-labels]",
  )?.content;
  const description = document.querySelector("meta[name=description]")?.content;

  const labels = labelsMeta.split(",").map((s) => s.trim());
  if (developerOnly && !labels.includes("Development")) {
    labels.push("Development");
  }

  const scriptElem = document.querySelector("#cesium_sandcastle_script");
  let script = scriptElem?.textContent?.match(
    /\/\/Sandcastle_Begin((?:.|\n)*)\/\/Sandcastle_End/m,
  )?.[1];

  if (script?.includes("Sandcastle")) {
    script = `import Sandcastle from "Sandcastle";\n${script}`;
  }
  script = `import * as Cesium from "cesium";\n${script}`;
  const formattedScript = await prettier.format(script, {
    parser: "babel",
    // @ts-expect-error the estree plugin has no type https://github.com/prettier/prettier/issues/16501
    plugins: [babelPlugin, estreePlugin],
  });

  document.body.removeChild(scriptElem);
  const html = document.body.innerHTML;
  const formattedHtml = await prettier.format(html, {
    parser: "html",
    plugins: [htmlPlugin],
  });

  if (developerOnly) {
    // force a dev suffix so names are deterministic so this script can be run multiple times
    slug += "-dev";
    title += " - Dev";
  }

  const metadata = {
    legacyId: (developerOnly ? "development/" : "") + basename(path),
    title,
    description,
    labels,
    thumbnail: existsSync(thumbnailPath) ? "thumbnail.jpg" : undefined,
    development: developerOnly ? true : undefined,
  };

  const dir = join(outputDirectory, slug);
  mkdirSync(dir, { recursive: true });
  const yaml = stringify(metadata, {
    lineWidth: 0,
  });
  writeFileSync(join(dir, "sandcastle.yaml"), yaml);
  if (script) {
    writeFileSync(join(dir, "main.js"), formattedScript);
  }
  if (html) {
    writeFileSync(join(dir, "index.html"), formattedHtml);
  }
  if (existsSync(thumbnailPath)) {
    copyFileSync(thumbnailPath, join(dir, "thumbnail.jpg"));
  }
}

async function main() {
  const htmlFiles = globbySync([`${inputDirectory}/*.html`]);

  for (const file of htmlFiles) {
    await convertSandcastle(file, false);
  }

  const developerHtmlFiles = globbySync([
    `${inputDirectory}/development/*.html`,
  ]);
  for (const file of developerHtmlFiles) {
    await convertSandcastle(file, true);
  }
}

main();
