import defined from "../Core/defined.js";
import PrimitivePipeline from "../Scene/PrimitivePipeline.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

const moduleCache = {};

async function getModule(moduleName) {
  let module = moduleCache[moduleName];
  if (!defined(module)) {
    if (typeof exports === "object") {
      // Use CommonJS-style require.
      /* global require */
      moduleCache[module] = module = require(`Workers/${moduleName}`);
    } else {
      // Use ESM-style dynamic import
      const result = await import(`./${moduleName}.js`);
      module = result.default;
      moduleCache[module] = module;
    }
  }
  return module;
}

async function createGeometry(parameters, transferableObjects) {
  const subTasks = parameters.subTasks;
  const length = subTasks.length;
  const resultsOrPromises = new Array(length);

  for (let i = 0; i < length; i++) {
    const task = subTasks[i];
    const geometry = task.geometry;
    const moduleName = task.moduleName;

    if (defined(moduleName)) {
      resultsOrPromises[i] = getModule(moduleName).then((createFunction) =>
        createFunction(geometry, task.offset)
      );
    } else {
      // Already created geometry
      resultsOrPromises[i] = geometry;
    }
  }

  return Promise.all(resultsOrPromises).then(function (results) {
    return PrimitivePipeline.packCreateGeometryResults(
      results,
      transferableObjects
    );
  });
}
export default createTaskProcessorWorker(createGeometry);
