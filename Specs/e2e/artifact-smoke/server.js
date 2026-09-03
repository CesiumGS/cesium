/*
 * Serves only prepared artifacts and test fixtures. Do not add a source-tree
 * fallback here: detecting missing deployed files is the purpose of this test.
 */

import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const testPagePath = path.join(directory, "testPage.js");

function staticOptions() {
  return {
    cacheControl: false,
    etag: false,
    lastModified: false,
    setHeaders(response, filePath) {
      response.set("Cache-Control", "no-store");
      if (filePath.endsWith(".wasm")) {
        response.type("application/wasm");
      } else if (filePath.endsWith(".js")) {
        response.type("application/javascript");
      } else if (filePath.endsWith(".json")) {
        response.type("application/json");
      } else if (filePath.endsWith(".glb")) {
        response.type("model/gltf-binary");
      } else if (filePath.endsWith(".pnts")) {
        response.type("application/octet-stream");
      } else if (filePath.endsWith(".kmz")) {
        response.type("application/vnd.google-earth.kmz");
      }
    },
  };
}

export async function startServer(
  root,
  { listenHost = "127.0.0.1", urlHost = listenHost } = {},
) {
  const app = express();
  const requests = [];
  const testPage = await fs.readFile(testPagePath, "utf8");
  const options = staticOptions();

  app.use((request, response, next) => {
    const record = {
      path: request.path,
      status: undefined,
      contentType: undefined,
    };
    requests.push(record);
    response.on("finish", () => {
      record.status = response.statusCode;
      record.contentType = response.get("content-type");
    });
    next();
  });

  app.get("/", (_request, response) => {
    response.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Cesium artifact smoke test</title>
  </head>
  <body>
    <script type="module" src="/testPage.js"></script>
  </body>
</html>`);
  });

  app.get("/testPage.js", (_request, response) => {
    response.type("application/javascript").send(testPage);
  });

  app.get("/favicon.ico", (_request, response) => {
    response.status(204).end();
  });

  app.use((request, response, next) => {
    if (
      request.path.startsWith("/deployment/") ||
      request.path.startsWith("/fixtures/")
    ) {
      response.set("Access-Control-Allow-Origin", "*");
      next();
      return;
    }

    response.status(404).send(`Not found: ${request.path}`);
  });

  app.use(
    "/deployment",
    express.static(path.join(root, "deployment"), options),
  );
  app.use("/fixtures", express.static(path.join(root, "fixtures"), options));

  return new Promise((resolve, reject) => {
    const server = app.listen(0, listenHost, () => {
      const address = server.address();
      resolve({
        server,
        url: `http://${urlHost}:${address.port}`,
        requests,
      });
    });
    server.on("error", reject);
  });
}

export async function stopServer(server) {
  server.closeAllConnections();
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
