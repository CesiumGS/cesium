import DeveloperError from "../Core/DeveloperError.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import PrimitivePipeline from "../Scene/PrimitivePipeline.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";
/* global require */

const moduleCache = {};

async function getModule(moduleName, modulePath) {
  let module = defaultValue(moduleCache[modulePath], moduleCache[moduleName]);

  if (defined(module)) {
    return module;
  }

  if (defined(modulePath)) {
    // ignore moduleName and use the path to import
    if (typeof exports === "object") {
      // Use CommonJS-style require.
      module = require(modulePath);
    } else {
      // Use ESM-style dynamic import
      const result = await import(modulePath);
      module = result.default;
    }

    moduleCache[modulePath] = module;
    return module;
  }

  if (typeof exports === "object") {
    // Use CommonJS-style require.
    module = require(`Workers/${moduleName}`);
  } else {
    // Use ESM-style dynamic import
    const result = defined(modulePath)
      ? await import(modulePath)
      : await import(`./${moduleName}.js`);
    module = result.default;
  }

  moduleCache[moduleName] = module;
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
    const modulePath = task.modulePath;

    if (defined(moduleName) && defined(modulePath)) {
      throw new DeveloperError("Must only set moduleName or modulePath");
    }

    if (defined(moduleName) || defined(modulePath)) {
      resultsOrPromises[i] = getModule(moduleName, modulePath).then(
        (createFunction) => createFunction(geometry, task.offset),
      );
    } else {
      // Already created geometry
      resultsOrPromises[i] = geometry;
    }
  }

  return Promise.all(resultsOrPromises).then(function (results) {
    return PrimitivePipeline.packCreateGeometryResults(
      results,
      transferableObjects,
    );
  });
}
export default createTaskProcessorWorker(createGeometry);
