/*
 * Installs the local packed packages in a temporary Vite app and runs its
 * production build to check the downstream package entry points.
 */

import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../../..");

async function findArchive(prefix) {
  const entries = (await readdir(repositoryRoot))
    .filter((entry) => entry.startsWith(prefix) && entry.endsWith(".tgz"))
    .map((entry) => path.join(repositoryRoot, entry));

  if (entries.length !== 1) {
    throw new Error(
      `Expected one ${prefix}*.tgz in ${repositoryRoot}, found ${entries.length}.`,
    );
  }

  return entries[0];
}

const rootPackage = JSON.parse(
  await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
);
const enginePackage = JSON.parse(
  await readFile(
    path.join(repositoryRoot, "packages/engine/package.json"),
    "utf8",
  ),
);
const widgetsPackage = JSON.parse(
  await readFile(
    path.join(repositoryRoot, "packages/widgets/package.json"),
    "utf8",
  ),
);
const sandcastlePackage = JSON.parse(
  await readFile(
    path.join(repositoryRoot, "packages/sandcastle/package.json"),
    "utf8",
  ),
);

const rootArchive = await findArchive(`cesium-${rootPackage.version}`);
const engineArchive = await findArchive(
  `cesium-engine-${enginePackage.version}`,
);
const widgetsArchive = await findArchive(
  `cesium-widgets-${widgetsPackage.version}`,
);
const appRoot = await mkdtemp(path.join(os.tmpdir(), "cesium-vite-smoke-"));

try {
  await writeFile(
    path.join(appRoot, "package.json"),
    JSON.stringify(
      {
        name: "cesium-vite-smoke-test",
        private: true,
        type: "module",
        scripts: { build: "vite build" },
        dependencies: {
          cesium: pathToFileURL(rootArchive).href,
          "@cesium/engine": pathToFileURL(engineArchive).href,
          "@cesium/widgets": pathToFileURL(widgetsArchive).href,
        },
        devDependencies: {
          vite: sandcastlePackage.devDependencies.vite,
        },
      },
      null,
      2,
    ),
  );
  await writeFile(
    path.join(appRoot, "index.html"),
    `<!doctype html>
<html lang="en">
  <body>
    <script type="module" src="/main.js"></script>
  </body>
</html>
`,
  );
  await writeFile(
    path.join(appRoot, "main.js"),
    `import { Cartesian3 } from "cesium";

document.body.textContent = Cartesian3.ZERO.toString();
`,
  );

  execFileSync(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
    {
      cwd: appRoot,
      stdio: "inherit",
    },
  );
  execFileSync("npm", ["run", "build"], {
    cwd: appRoot,
    stdio: "inherit",
  });
} finally {
  await rm(appRoot, { recursive: true, force: true });
}
