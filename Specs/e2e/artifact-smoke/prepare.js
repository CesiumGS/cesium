/*
 * Stages the built directories, packed packages, and release ZIP for the
 * browser test. Build and pack the artifacts before running this script.
 */

import {
  cp,
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../../..");
const manifestPath = path.join(
  repositoryRoot,
  "Build/Specs/e2e/artifact-smoke/manifest.json",
);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function findArchive(prefix, suffix) {
  const entries = (await readdir(repositoryRoot))
    .filter((entry) => entry.startsWith(prefix) && entry.endsWith(suffix))
    .map((entry) => path.join(repositoryRoot, entry));

  if (entries.length !== 1) {
    throw new Error(
      `Expected one ${prefix}*${suffix} in ${repositoryRoot}, found ${entries.length}.`,
    );
  }

  return entries[0];
}

function extractTarball(archive, destination) {
  execFileSync("tar", ["-xzf", archive, "-C", destination]);
}

function extractZip(archive, destination) {
  execFileSync("unzip", ["-q", archive, "-d", destination]);
}

async function copyDirectoryContents(source, destination) {
  for (const entry of await readdir(source)) {
    await cp(path.join(source, entry), path.join(destination, entry), {
      recursive: true,
    });
  }
}

async function copyFixtures(destination) {
  const fixtures = [
    ["Specs/Data/Images/Green4x4_ETC1S.ktx2", "fixtures/Green4x4_ETC1S.ktx2"],
    [
      "Specs/Data/Models/glTF-2.0/unitSquare/unitSquare11x11_draco.glb",
      "fixtures/unitSquare11x11_draco.glb",
    ],
    [
      "Specs/Data/Cesium3DTiles/PointCloud/PointCloudDraco",
      "fixtures/PointCloudDraco",
    ],
    [
      "Specs/Data/Cesium3DTiles/GaussianSplats/sh_unit_cube",
      "fixtures/GaussianSplats/sh_unit_cube",
    ],
  ];

  await Promise.all(
    fixtures.map(([source, target]) =>
      cp(path.join(repositoryRoot, source), path.join(destination, target), {
        recursive: true,
      }),
    ),
  );
}

async function createDeployment(name, copyDeployment) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), `cesium-artifact-smoke-${name}-`),
  );
  await mkdir(path.join(root, "deployment"), { recursive: true });
  await mkdir(path.join(root, "fixtures"), { recursive: true });
  await copyDeployment(path.join(root, "deployment"));
  await copyFixtures(root);
  return root;
}

async function prepare() {
  const rootPackage = await readJson(path.join(repositoryRoot, "package.json"));
  const enginePackage = await readJson(
    path.join(repositoryRoot, "packages/engine/package.json"),
  );
  const zipVersion = rootPackage.version.endsWith(".0")
    ? rootPackage.version.slice(0, -2)
    : rootPackage.version;

  const rootArchive = await findArchive(
    `cesium-${rootPackage.version}`,
    ".tgz",
  );
  const engineArchive = await findArchive(
    `cesium-engine-${enginePackage.version}`,
    ".tgz",
  );
  const zipArchive = path.join(repositoryRoot, `Cesium-${zipVersion}.zip`);

  const artifacts = [];

  const cesiumBuildRoot = await createDeployment("cesium", (destination) =>
    cp(
      path.join(repositoryRoot, "Build/Cesium"),
      path.join(destination, "Cesium"),
      {
        recursive: true,
      },
    ),
  );
  artifacts.push({
    name: "Build/Cesium",
    root: cesiumBuildRoot,
    distribution: "combined",
    entry: "/deployment/Cesium/Cesium.js",
    base: "/deployment/Cesium/",
  });

  const unminifiedBuildRoot = await createDeployment(
    "cesium-unminified",
    (destination) =>
      cp(
        path.join(repositoryRoot, "Build/CesiumUnminified"),
        path.join(destination, "CesiumUnminified"),
        { recursive: true },
      ),
  );
  artifacts.push({
    name: "Build/CesiumUnminified",
    root: unminifiedBuildRoot,
    distribution: "combined",
    entry: "/deployment/CesiumUnminified/Cesium.js",
    base: "/deployment/CesiumUnminified/",
  });

  const rootPackageRoot = await createDeployment(
    "package",
    async (destination) => {
      const extractionRoot = await mkdtemp(
        path.join(os.tmpdir(), "cesium-package-"),
      );
      try {
        extractTarball(rootArchive, extractionRoot);
        await copyDirectoryContents(
          path.join(extractionRoot, "package"),
          destination,
        );
      } finally {
        await rm(extractionRoot, { recursive: true, force: true });
      }
    },
  );
  artifacts.push({
    name: "packed cesium",
    root: rootPackageRoot,
    distribution: "combined",
    entry: "/deployment/Build/Cesium/Cesium.js",
    base: "/deployment/Build/Cesium/",
  });

  const enginePackageRoot = await createDeployment(
    "engine-package",
    async (destination) => {
      const extractionRoot = await mkdtemp(
        path.join(os.tmpdir(), "cesium-engine-package-"),
      );
      try {
        extractTarball(engineArchive, extractionRoot);
        await copyDirectoryContents(
          path.join(extractionRoot, "package"),
          destination,
        );
      } finally {
        await rm(extractionRoot, { recursive: true, force: true });
      }
    },
  );
  artifacts.push({
    name: "packed @cesium/engine",
    root: enginePackageRoot,
    distribution: "esm",
    entry: "/deployment/Build/Minified/index.js",
    base: "/deployment/Build/",
  });

  const zipRoot = await createDeployment("zip", async (destination) => {
    const extractionRoot = await mkdtemp(
      path.join(os.tmpdir(), "cesium-release-zip-"),
    );
    try {
      extractZip(zipArchive, extractionRoot);
      await copyDirectoryContents(extractionRoot, destination);
    } finally {
      await rm(extractionRoot, { recursive: true, force: true });
    }
  });
  artifacts.push({
    name: "release ZIP",
    root: zipRoot,
    distribution: "combined",
    entry: "/deployment/Build/Cesium/Cesium.js",
    base: "/deployment/Build/Cesium/",
  });

  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify({ artifacts }, null, 2));
  console.log(`Wrote ${manifestPath}`);
}

await prepare();
