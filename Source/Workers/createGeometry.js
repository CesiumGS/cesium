/* This file is automatically rebuilt by the Cesium build process. */
define(['./when-9f8cafad', './PrimitivePipeline-1622a6cf', './createTaskProcessorWorker', './Transforms-0a60c469', './Cartesian2-ea36f114', './Check-c23b5bd5', './Math-cf2f57e0', './RuntimeError-40167735', './ComponentDatatype-ec57da04', './WebGLConstants-daaa9be0', './GeometryAttribute-abbafb10', './GeometryAttributes-fcb70320', './GeometryPipeline-8ffde617', './AttributeCompression-953fe0fc', './EncodedCartesian3-daa43175', './IndexDatatype-d65a2d74', './IntersectionTests-b2d4b64d', './Plane-ed60195c', './WebMercatorProjection-c11d982d'], function (when, PrimitivePipeline, createTaskProcessorWorker, Transforms, Cartesian2, Check, _Math, RuntimeError, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, GeometryPipeline, AttributeCompression, EncodedCartesian3, IndexDatatype, IntersectionTests, Plane, WebMercatorProjection) { 'use strict';

  /* global require */

  var moduleCache = {};

  function getModule(moduleName) {
    var module = moduleCache[moduleName];
    if (!when.defined(module)) {
      if (typeof exports === "object") {
        // Use CommonJS-style require.
        moduleCache[module] = module = require("Workers/" + moduleName);
      } else {
        // Use AMD-style require.
        // in web workers, require is synchronous
        require(["Workers/" + moduleName], function (f) {
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

      if (when.defined(moduleName)) {
        var createFunction = getModule(moduleName);
        resultsOrPromises[i] = createFunction(geometry, task.offset);
      } else {
        //Already created geometry
        resultsOrPromises[i] = geometry;
      }
    }

    return when.when.all(resultsOrPromises, function (results) {
      return PrimitivePipeline.PrimitivePipeline.packCreateGeometryResults(
        results,
        transferableObjects
      );
    });
  }
  var createGeometry$1 = createTaskProcessorWorker(createGeometry);

  return createGeometry$1;

});
