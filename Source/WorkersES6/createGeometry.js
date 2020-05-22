/* global require */
import defined from "../Core/defined.js";
import PrimitivePipeline from "../Scene/PrimitivePipeline.js";
import when from "../ThirdParty/when.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

var moduleCache = {};

var reqWithContext = require.context("./", false, /create.+Geometry/);

function getModule(moduleName) {
  var module = moduleCache[moduleName];
  if (!defined(module)) {
    if (typeof exports === "object") {
      // Use CommonJS-style require.
      moduleCache[module] = module = reqWithContext("./" + moduleName);
    } else {
      // Use AMD-style require.
      // in web workers, require is synchronous
      reqWithContext(["./Workers/" + moduleName], function (f) {
        module = f;
        moduleCache[module] = f;
      });
    }
  }
  return module;
}

function createGeometry(parameters, transferableObjects) {
  var subTasks = parameters.subTasks;
  var length = subTasks.length;
  var resultsOrPromises = new Array(length);

  for (var i = 0; i < length; i++) {
    var task = subTasks[i];
    var geometry = task.geometry;
    var moduleName = task.moduleName;

    if (defined(moduleName)) {
      var createFunction = getModule(moduleName);
      resultsOrPromises[i] = createFunction(geometry, task.offset);
    } else {
      //Already created geometry
      resultsOrPromises[i] = geometry;
    }
  }

  return when.all(resultsOrPromises, function (results) {
    return PrimitivePipeline.packCreateGeometryResults(
      results,
      transferableObjects
    );
  });
}
export default createTaskProcessorWorker(createGeometry);
