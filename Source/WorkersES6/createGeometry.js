/* global importScripts, CesiumWorker, require */
import defined from "../Core/defined.js";
import PrimitivePipeline from "../Scene/PrimitivePipeline.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

const moduleCache = {};

function getModule(moduleName) {
  let module = moduleCache[moduleName];
  if (!defined(module)) {
    if (typeof exports === "object") {
      // Use CommonJS-style require.
      // TODO: ?
      moduleCache[module] = module = require(`Workers/${moduleName}`);
    } else {
      // Use importScripts to synchronously load the IIFE
      importScripts(`${moduleName}.js`);
      module = CesiumWorker.default;
      moduleCache[module] = CesiumWorker.default;
    }
  }
  return module;
}

function createGeometry(parameters, transferableObjects) {
  const subTasks = parameters.subTasks;
  const length = subTasks.length;
  const resultsOrPromises = new Array(length);

  for (let i = 0; i < length; i++) {
    const task = subTasks[i];
    const geometry = task.geometry;
    const moduleName = task.moduleName;

    if (defined(moduleName)) {
      const createFunction = getModule(moduleName);
      resultsOrPromises[i] = createFunction(geometry, task.offset);
    } else {
      //Already created geometry
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
