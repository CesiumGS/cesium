import { expect, test } from "@playwright/test";
import { startServer } from "./server.js";

let cspServer;

// These tests intentionally exercise the ESM distribution with separately
// served, same-origin workers. The combined Cesium.js distribution uses
// embedded blob workers and requires a different document policy.
test.beforeAll(async () => {
  cspServer = await startServer();
});

test.afterAll(async () => {
  await new Promise((resolve, reject) => {
    cspServer.server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

async function loadResult(page, path, origin = cspServer.url) {
  const pageErrors = [];
  const workerUrls = [];
  const workerResponseStart = cspServer.workerResponses.length;
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("worker", (worker) => {
    workerUrls.push(worker.url());
  });

  const response = await page.goto(`${origin}${path}`);
  await page.waitForFunction(() => window.cspTestResult?.ready);

  return {
    ...(await page.evaluate(() => window.cspTestResult)),
    documentPolicy: response?.headers()["content-security-policy"],
    pageErrors,
    workerResponses: cspServer.workerResponses.slice(workerResponseStart),
    workerUrls,
  };
}

test("the control policy permits the current engine build", async ({
  page,
}) => {
  const result = await loadResult(page, "/csp/control");

  expect(result.imported).toBe(true);
  expect(result.violations).toEqual([]);
  expect(result.errors).toEqual([]);
  expect(result.pageErrors).toEqual([]);
});

test("loads the engine under a worker-only WASM policy", async ({ page }) => {
  const result = await loadResult(page, "/csp/worker-only");

  expect(result.imported).toBe(true);
  expect(result.violations).toEqual([]);
  expect(result.errors).toEqual([]);
  expect(result.pageErrors).toEqual([]);
});

test("allows inline styles used by CesiumWidget", async ({ page }) => {
  const result = await loadResult(page, "/csp/worker-only?feature=widget");

  expect(result.imported).toBe(true);
  expect(result.featureCompleted).toBe(true);
  expect(result.featureDetails.canvasCount).toBe(1);
  expect(result.violations).toEqual([]);
  expect(result.errors).toEqual([]);
  expect(result.pageErrors).toEqual([]);
});

test("reports inline style violations when the style exception is absent", async ({
  page,
}) => {
  const result = await loadResult(
    page,
    "/csp/worker-only?stylePolicy=denied&feature=widget",
  );

  expect(result.imported).toBe(true);
  expect(result.featureCompleted).toBe(true);
  expect(
    result.violations.some(({ effectiveDirective }) =>
      ["style-src-attr", "style-src-elem"].includes(effectiveDirective),
    ),
  ).toBe(true);
});

test("loads workers when Cesium assets are cross-origin", async ({ page }) => {
  const path =
    "/csp/cross-origin?feature=meshopt" +
    `&assetBaseUrl=${encodeURIComponent(cspServer.assetBaseUrl)}`;
  const result = await loadResult(page, path, cspServer.pageUrl);

  expect(result.imported).toBe(true);
  expect(result.featureCompleted).toBe(true);
  expect(result.documentPolicy).toContain(
    `worker-src 'self' blob: ${cspServer.assetOrigin}`,
  );
  expect(result.workerUrls.some((url) => url.startsWith("blob:"))).toBe(true);
  const workerResponse = result.workerResponses.find(({ path }) =>
    path.endsWith("/decodeMeshopt.js"),
  );
  expect(workerResponse).toBeDefined();
  expect(workerResponse.status).toBe(200);
  expect(result.violations).toEqual([]);
  expect(result.errors).toEqual([]);
  expect(result.pageErrors).toEqual([]);
});

test("blocks cross-origin workers when worker-src omits the asset origin", async ({
  page,
}) => {
  const path =
    "/csp/cross-origin?workerOrigin=denied&feature=meshopt" +
    `&assetBaseUrl=${encodeURIComponent(cspServer.assetBaseUrl)}`;
  const result = await loadResult(page, path, cspServer.pageUrl);

  expect(result.imported).toBe(true);
  expect(result.featureCompleted).toBe(false);
  expect(result.documentPolicy).toContain("worker-src 'self' blob:");
  expect(result.documentPolicy).not.toContain(
    `worker-src 'self' blob: ${cspServer.assetOrigin}`,
  );
  // The blocked import occurs inside the blob worker. Its CSP violation does
  // not fire on the parent document, but TaskProcessor reports the failure.
  expect(result.violations).toEqual([]);
  expect(result.errors).toContain("Error: Worker failed");
});

test("loads the combined build with its documented policy", async ({
  page,
}) => {
  const result = await loadResult(
    page,
    "/csp/combined?distribution=combined&feature=combined",
  );

  expect(result.documentPolicy).toBe(
    "default-src 'self'; " +
      "script-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval'; " +
      "worker-src 'self' blob:; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob:; connect-src 'self'",
  );
  expect(result.imported).toBe(true);
  expect(result.featureCompleted).toBe(true);
  expect(result.featureDetails.canvasCount).toBe(1);
  expect(result.workerUrls.some((url) => url.startsWith("blob:"))).toBe(true);
  expect(result.violations).toEqual([]);
  expect(result.errors).toEqual([]);
  expect(result.pageErrors).toEqual([]);
});

test("blocks the combined build without unsafe-eval", async ({ page }) => {
  const result = await loadResult(
    page,
    "/csp/combined?scriptPolicy=denied&distribution=combined&feature=combined",
  );

  expect(result.imported).toBe(false);
  expect(result.featureCompleted).toBe(false);
  expect(
    result.violations.some(
      ({ effectiveDirective }) => effectiveDirective === "script-src",
    ),
  ).toBe(true);
  expect([...result.errors, ...result.pageErrors].join("\n")).toMatch(
    /(?:EvalError|unsafe-eval|Content Security Policy|Refused to evaluate)/i,
  );
});

function expectSuccessfulWorkerFeature(result, workerName) {
  const workerFile = `/${workerName}.js`;
  expect(result.imported).toBe(true);
  expect(result.workerUrls.some((url) => url.endsWith(workerFile))).toBe(true);
  const workerResponse = result.workerResponses.find(({ path }) =>
    path.endsWith(workerFile),
  );
  expect(workerResponse).toBeDefined();
  expectWorkerWasmOnlyPolicy(workerResponse.policy);
  expect(workerResponse.status).toBe(200);
  expect(result.featureCompleted).toBe(true);
  expect(result.violations).toEqual([]);
  expect(result.errors).toEqual([]);
  expect(result.pageErrors).toEqual([]);
}

function expectWorkerWasmOnlyPolicy(policy) {
  expect(policy).toBe(
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'",
  );

  const scriptSources = policy
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith("script-src "))
    .split(/\s+/)
    .slice(1);
  expect(scriptSources).toContain("'wasm-unsafe-eval'");
  expect(scriptSources).not.toContain("'unsafe-eval'");
}

test("decodes SPZ with an injected strict-CSP worker module", async ({
  page,
}) => {
  const result = await loadResult(
    page,
    "/csp/worker-only?feature=spz&spzWorker=strict",
  );
  expectSuccessfulWorkerFeature(result, "strictSpzDecoder");
  expect(result.featureDetails).toEqual({
    numPoints: 1,
    shDegree: 0,
    strictCspChecks: {
      dynamicExecutionBlocked: true,
      wasmCompilationSucceeded: true,
    },
  });
});

test("blocks the bundled SPZ decoder without a worker unsafe-eval exception", async ({
  page,
}) => {
  const result = await loadResult(page, "/csp/worker-only?feature=spz");

  expect(result.imported).toBe(true);
  expect(result.workerUrls.some((url) => url.endsWith("/decodeSpz.js"))).toBe(
    true,
  );
  const workerResponse = result.workerResponses.find(({ path }) =>
    path.endsWith("/decodeSpz.js"),
  );
  expect(workerResponse).toBeDefined();
  expectWorkerWasmOnlyPolicy(workerResponse.policy);
  expect(workerResponse.status).toBe(200);
  expect(result.featureCompleted).toBe(false);
  expect(result.featureDetails).toBeUndefined();

  // @spz-loader/core currently uses new Function in its generated glue. The
  // worker and its input are known-good above, so this specifically records
  // the intended CSP failure instead of accepting an arbitrary decode error.
  expect(result.errors.join("\n")).toMatch(
    /(?:EvalError|unsafe-eval|Content Security Policy|Refused to evaluate)/i,
  );
});

test("decodes meshopt with only the worker WASM policy", async ({ page }) => {
  const result = await loadResult(page, "/csp/worker-only?feature=meshopt");
  expectSuccessfulWorkerFeature(result, "decodeMeshopt");
});

test("transcodes KTX2 with only the worker WASM policy", async ({ page }) => {
  const result = await loadResult(page, "/csp/worker-only?feature=ktx2");
  expect(result.errors).toEqual([]);
  expectSuccessfulWorkerFeature(result, "transcodeKTX2");
  expect(result.featureDetails.width).toBe(4);
  expect(result.featureDetails.height).toBe(4);
  expect(result.featureDetails.byteLength).toBeGreaterThan(0);
});

test("blocks meshopt when the worker lacks the WASM policy", async ({
  page,
}) => {
  const result = await loadResult(
    page,
    "/csp/worker-only?workerPolicy=denied&feature=meshopt",
  );

  expect(result.imported).toBe(true);
  expect(
    result.workerUrls.some((url) => url.endsWith("/decodeMeshopt.js")),
  ).toBe(true);
  const workerResponse = result.workerResponses.find(({ path }) =>
    path.endsWith("/decodeMeshopt.js"),
  );
  expect(workerResponse.policy).toBe("default-src 'self'; script-src 'self'");
  expect(workerResponse.status).toBe(200);
  expect(result.featureCompleted).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});

test("renders meshopt-compressed terrain with only the worker WASM policy", async ({
  page,
}) => {
  const result = await loadResult(page, "/csp/worker-only?feature=terrain");
  expectSuccessfulWorkerFeature(
    result,
    "createVerticesFromCesium3DTilesTerrain",
  );
  expect(result.featureDetails.tile).toEqual({ level: 0, x: 0, y: 0 });
  expect(result.featureDetails.vertexCountWithoutSkirts).toBe(248);
  expect(result.featureDetails.indexCountWithoutSkirts).toBe(1380);
  expect(result.featureDetails.pixel[0]).toBeGreaterThan(
    result.featureDetails.pixel[1],
  );
  expect(result.featureDetails.pixel[0]).toBeGreaterThan(
    result.featureDetails.pixel[2],
  );
  expect(result.featureDetails.pixel[3]).toBe(255);
});

test("blocks direct WASM compilation on the main thread", async ({ page }) => {
  const result = await loadResult(page, "/csp/worker-only?feature=main-wasm");

  expect(result.imported).toBe(true);
  expect(result.featureCompleted).toBe(true);
  expect(result.wasmBlocked).toBe(true);
  expect(result.workerUrls).toEqual([]);
});
