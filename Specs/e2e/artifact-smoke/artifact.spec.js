/*
 * Loads each built artifact in a browser. The server uses staged roots so a
 * missing worker or WASM file cannot be resolved from the source checkout.
 */

import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer, stopServer } from "./server.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../../..");
const manifestPath = path.join(
  repositoryRoot,
  "Build/Specs/e2e/artifact-smoke/manifest.json",
);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function createTestUrl(pageServer, assetServer, artifact) {
  const assetOrigin = assetServer.url;
  const fixture = (filePath) => `${assetOrigin}/fixtures/${filePath}`;
  const query = new URLSearchParams({
    entry: `${assetOrigin}${artifact.entry}`,
    base: `${assetOrigin}${artifact.base}`,
    ktx2Fixture: fixture("Green4x4_ETC1S.ktx2"),
    dracoModelFixture: fixture("unitSquare11x11_draco.glb"),
    dracoPointCloudFixture: fixture("PointCloudDraco/tileset.json"),
    gaussianSplatsFixture: fixture("GaussianSplats/sh_unit_cube/tileset.json"),
    distribution: artifact.distribution,
  });
  return `${pageServer.url}/?${query}`;
}

async function runSmokeTest(page, artifact, crossOrigin) {
  const pageServer = await startServer(artifact.root, {
    urlHost: "localhost",
  });
  const assetServer = crossOrigin
    ? await startServer(artifact.root)
    : pageServer;
  const failedRequests = [];
  const workerUrls = [];
  page.on("requestfailed", (request) => {
    failedRequests.push({
      error: request.failure()?.errorText,
      url: request.url(),
    });
  });
  page.on("worker", (worker) => {
    workerUrls.push(worker.url());
  });

  try {
    const response = await page.goto(
      createTestUrl(pageServer, assetServer, artifact),
      { waitUntil: "domcontentloaded" },
    );
    expect(response?.status()).toBe(200);
    await page.waitForFunction(() => window.artifactSmokeResult?.ready);

    const result = await page.evaluate(() => window.artifactSmokeResult);
    const requests =
      assetServer === pageServer
        ? pageServer.requests
        : [...pageServer.requests, ...assetServer.requests];

    expect(
      result.imported,
      JSON.stringify({ result, requests, failedRequests, workerUrls }),
    ).toBe(true);
    expect(
      result.featureCompleted,
      JSON.stringify({ result, requests, failedRequests, workerUrls }),
    ).toBe(true);
    expect(result.featureDetails).toEqual({
      dracoGeometry: { ready: true },
      dracoPointCloud: { tilesLoaded: true },
      gaussianSplats: { tilesLoaded: true },
      ktx2: {
        byteLength: expect.any(Number),
        height: 4,
        width: 4,
      },
      meshopt: { byteLength: 192 },
    });
    expect(result.errors).toEqual([]);
    expect(failedRequests).toEqual([]);

    for (const item of requests) {
      expect(item.path).not.toMatch(/\/(?:Source|packages)\//);
      expect(item.status, item.path).toBeLessThan(400);

      if (item.path.endsWith(".wasm")) {
        expect(item.status, item.path).toBe(200);
        expect(item.contentType, item.path).toMatch(/^application\/wasm/);
      } else if (item.path.endsWith(".js")) {
        expect(item.status, item.path).toBe(200);
        expect(item.contentType, item.path).toMatch(
          /^(?:application|text)\/javascript/,
        );
      }
    }

    for (const wasmFile of [
      "basis_transcoder.wasm",
      "draco_decoder.wasm",
      "wasm_splats_bg.wasm",
    ]) {
      expect(
        requests.some(({ path: requestPath }) =>
          requestPath.includes(wasmFile),
        ),
        JSON.stringify({ wasmFile, requests }),
      ).toBe(true);
    }
    expect(workerUrls.length).toBeGreaterThan(0);

    if (artifact.distribution === "combined") {
      expect(workerUrls.some((url) => url.startsWith("blob:"))).toBe(true);
    } else if (crossOrigin) {
      expect(workerUrls.some((url) => url.startsWith("blob:"))).toBe(true);
      expect(
        requests.some(({ path: requestPath }) =>
          requestPath.endsWith("/Workers/transcodeKTX2.js"),
        ),
      ).toBe(true);
    } else {
      expect(
        workerUrls.some((url) => url.endsWith("/Workers/transcodeKTX2.js")),
      ).toBe(true);
    }
  } finally {
    if (assetServer !== pageServer) {
      await stopServer(assetServer.server);
    }
    await stopServer(pageServer.server);
  }
}

for (const artifact of manifest.artifacts) {
  test(`loads ${artifact.name} as a deployed artifact`, async ({ page }) => {
    await runSmokeTest(page, artifact, false);
  });
}

test("loads a combined artifact with cross-origin assets", async ({ page }) => {
  const artifact = manifest.artifacts.find(
    ({ distribution }) => distribution === "combined",
  );
  await runSmokeTest(page, artifact, true);
});

test("loads the ESM artifact with cross-origin assets", async ({ page }) => {
  const artifact = manifest.artifacts.find(
    ({ distribution }) => distribution === "esm",
  );
  await runSmokeTest(page, artifact, true);
});
