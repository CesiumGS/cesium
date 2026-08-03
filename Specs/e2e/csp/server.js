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

const workerPolicy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'";
const deniedWorkerPolicy = "default-src 'self'; script-src 'self'";

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

  app.use((request, response, next) => {
    const isWorker = request.path.endsWith(".js");
    const isAllowedWorker =
      request.path.startsWith(workerPath) ||
      request.path.startsWith(strictSpzWorkerPath);
    const isDeniedWorker = request.path.startsWith(deniedWorkerPath);
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

  app.use(workerPath, express.static(workerDirectory));
  app.use(deniedWorkerPath, express.static(workerDirectory));
  app.use(strictSpzWorkerPath, express.static(path.join(directory, "workers")));
  app.use(assetPath, express.static(assetDirectory));
  app.use(thirdPartyPath, express.static(thirdPartyDirectory));

  app.get("/csp/control", (_request, response) => {
    response.set("Content-Security-Policy", controlDocumentPolicy);
    response.type("html").send(createPage());
  });

  app.get("/csp/worker-only", (_request, response) => {
    response.set("Content-Security-Policy", documentPolicy);
    response.type("html").send(createPage());
  });

  app.use(express.static(repositoryRoot));

  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`,
        workerResponses,
      });
    });
    server.on("error", reject);
  });
}
