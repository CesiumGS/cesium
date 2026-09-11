/*
 * Serves CSP test pages for the ESM and combined CesiumJS builds.
 * It applies document and worker policies, serves cross-origin assets, and
 * records worker responses for test assertions.
 */

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(directory, "../../..");

const workerPath = "/packages/engine/Build/Unminified/Workers/";
const deniedWorkerPath = "/packages/engine/Build/UnminifiedDenied/Workers/";
const strictSpzWorkerPath = "/Specs/e2e/csp/workers/";
const workerDirectory = path.resolve(
  repositoryRoot,
  "packages/engine/Build/Workers",
);

const assetPath = "/packages/engine/Build/Unminified/Assets/";
const assetDirectory = path.resolve(
  repositoryRoot,
  "packages/engine/Source/Assets",
);

const thirdPartyPath = "/packages/engine/Build/Unminified/ThirdParty/";
const thirdPartyDirectory = path.resolve(
  repositoryRoot,
  "packages/engine/Source/ThirdParty",
);

// Keep these policies aligned with the examples in the CSP guide.
const documentPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
].join("; ");

const controlDocumentPolicy = documentPolicy.replace(
  "script-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
);

const deniedStyleDocumentPolicy = documentPolicy.replace(
  "style-src 'self' 'unsafe-inline'",
  "style-src 'self'",
);

const combinedDocumentPolicy = [
  "default-src 'self'",
  "script-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
].join("; ");

const deniedCombinedDocumentPolicy = combinedDocumentPolicy.replace(
  " 'unsafe-eval'",
  "",
);

const workerPolicy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'";
const deniedWorkerPolicy = "default-src 'self'; script-src 'self'";

function createCrossOriginDocumentPolicy(assetOrigin, allowWorkerOrigin) {
  const workerOrigin = allowWorkerOrigin ? ` ${assetOrigin}` : "";
  return [
    "default-src 'self'",
    `script-src 'self' ${assetOrigin} 'wasm-unsafe-eval'`,
    `worker-src 'self' blob:${workerOrigin}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${assetOrigin}`,
  ].join("; ");
}

function createPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Cesium CSP worker isolation</title>
  </head>
  <body>
    <script type="module" src="/Specs/e2e/csp/testPage.js"></script>
  </body>
</html>`;
}

export async function startServer() {
  const app = express();
  const workerResponses = [];
  let assetOrigin;

  app.use((request, response, next) => {
    const isWorker = request.path.endsWith(".js");
    const isAllowedWorker =
      request.path.startsWith(workerPath) ||
      request.path.startsWith(strictSpzWorkerPath);
    const isDeniedWorker = request.path.startsWith(deniedWorkerPath);
    const isAsset =
      isAllowedWorker ||
      isDeniedWorker ||
      request.path.startsWith(assetPath) ||
      request.path.startsWith(thirdPartyPath);

    // Cross-origin tests use localhost for the page and 127.0.0.1 for assets.
    if (isAsset) {
      const origin = request.get("Origin");
      if (origin) {
        response.set("Access-Control-Allow-Origin", origin);
        response.vary("Origin");
      }
    }

    // Record worker responses so tests can inspect their status and policy.
    if (isWorker && (isAllowedWorker || isDeniedWorker)) {
      const policy = isDeniedWorker ? deniedWorkerPolicy : workerPolicy;
      response.set("Content-Security-Policy", policy);
      const workerResponse = {
        path: request.path,
        policy,
        status: undefined,
      };
      workerResponses.push(workerResponse);
      response.on("finish", () => {
        workerResponse.status = response.statusCode;
      });
    }

    next();
  });

  // Serve the same worker bundle under allowed and denied worker policies.
  app.use(workerPath, express.static(workerDirectory));
  app.use(deniedWorkerPath, express.static(workerDirectory));
  app.use(strictSpzWorkerPath, express.static(path.join(directory, "workers")));
  app.use(assetPath, express.static(assetDirectory));
  app.use(thirdPartyPath, express.static(thirdPartyDirectory));

  // Each route applies one document policy from the test matrix.
  app.get("/csp/control", (_request, response) => {
    response.set("Content-Security-Policy", controlDocumentPolicy);
    response.type("html").send(createPage());
  });

  app.get("/csp/worker-only", (request, response) => {
    const policy =
      request.query.stylePolicy === "denied"
        ? deniedStyleDocumentPolicy
        : documentPolicy;
    response.set("Content-Security-Policy", policy);
    response.type("html").send(createPage());
  });

  app.get("/csp/cross-origin", (request, response) => {
    response.set(
      "Content-Security-Policy",
      createCrossOriginDocumentPolicy(
        assetOrigin,
        request.query.workerOrigin !== "denied",
      ),
    );
    response.type("html").send(createPage());
  });

  app.get("/csp/combined", (request, response) => {
    const policy =
      request.query.scriptPolicy === "denied"
        ? deniedCombinedDocumentPolicy
        : combinedDocumentPolicy;
    response.set("Content-Security-Policy", policy);
    response.type("html").send(createPage());
  });

  app.use(express.static(repositoryRoot));

  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const url = `http://127.0.0.1:${address.port}`;
      assetOrigin = url;

      resolve({
        server,
        url,
        pageUrl: `http://localhost:${address.port}`,
        assetOrigin,
        assetBaseUrl: `${url}/packages/engine/Build/Unminified/`,
        workerResponses,
      });
    });
    server.on("error", reject);
  });
}
