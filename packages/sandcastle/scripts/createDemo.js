import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exit } from "node:process";
const __dirname = dirname(fileURLToPath(import.meta.url));

const toTitleCase = (str) =>
  str.replaceAll(/(?:^|[-]+)([a-z])/g, (match) =>
    match.toUpperCase().replace("-", " "),
  );

const slug = process.argv[2];

if (!/[a-z-]/.test(slug)) {
  console.error("Invalid slug");
  exit(1);
}

const galleryPath = join(__dirname, "../gallery");
const demoPath = join(galleryPath, slug);
if (existsSync(join(demoPath, "sandcastle.yaml"))) {
  console.error("A demo already exists for that slug");
  exit(1);
}

const htmlTemplate = `<style>
  @import url(../templates/bucket.css);
</style>
<div id="cesiumContainer" class="fullSize"></div>
<div id="loadingOverlay"><h1>Loading...</h1></div>
<div id="toolbar"></div>
`;
const jsTemplate = `import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer");
`;

const yamlTemplate = `title: ${toTitleCase(slug)}
description: Example description
labels:
  - Getting Started
# TODO: Uncomment this once an image has been created
#thumbnail: thumbnail.jpg
`;

mkdirSync(demoPath);
writeFileSync(join(demoPath, "index.html"), htmlTemplate);
writeFileSync(join(demoPath, "main.js"), jsTemplate);
writeFileSync(join(demoPath, "sandcastle.yaml"), yamlTemplate);

console.log("New demo created at", demoPath);
