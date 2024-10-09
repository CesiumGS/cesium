import ContextCache from "./ContextCache.js";
import path from "path";

function formatTimeSinceInSeconds(start) {
    return Math.ceil((performance.now() - start) / 100) / 10;
}

function serveResult (result, fileName, res, next) {
    let bundle, error;
    try {
      for (const out of result.outputFiles) {
        if (path.basename(out.path) === fileName) {
          bundle = out.text;
        }
      }
    } catch(e) {
      error = e;
    }
  
    if (!bundle) {
      next(new Error(`Failed to generate bundle: ${fileName}`, {
        cause: error
      }));
      return;
    }
  
    res.append("Cache-Control", "max-age=0");
    res.append("Content-Type", "application/javascript");
    res.send(bundle);
  };

function createRoute(app, name, route, context, dependantCaches) {
    const cache = new ContextCache(context);
    app.get(route, async function (req, res, next) {
      const fileName = path.basename(req.originalUrl);

      // Multiple files may be requested at this path, calling this function in quick succession.
      // Await the previous build before re-building again.
      try {
        await cache.promise;
      } catch {
        // Error is reported upstream
      }
  
      if (!cache.isBuilt()) {
        try {
          const start = performance.now();
          if (dependantCaches) {
            await Promise.all(
              dependantCaches.map((dependantCache) => {
                if (!dependantCache.isBuilt()) {
                  return dependantCache.rebuild();
                }
              })
            );
          }
          await cache.rebuild();
          console.log(
            `Built ${name} in ${formatTimeSinceInSeconds(start)} seconds.`
          );
        } catch (e) {
          next(e);
        }
      }
  
      return serveResult(cache.result, fileName, res, next);
    });
  
    return cache;
  }

export default createRoute;