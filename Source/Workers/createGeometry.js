/*global define*/
define([
        '../Core/defined',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker',
        'require'
    ], function(
        defined,
        PrimitivePipeline,
        createTaskProcessorWorker,
        require) {
    'use strict';

    var moduleCache = {};

    function getModule(moduleName) {
        var module = moduleCache[moduleName];
        if (!defined(module)) {
            if (typeof exports === 'object') {
                // Use CommonJS-style require.
                moduleCache[module] = module = require('Workers/' + moduleName);
            } else {
                // Use AMD-style require.
                // in web workers, require is synchronous
                require(['./' + moduleName], function(f) {
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
        var results = new Array(length);

        for (var i = 0; i < length; i++) {
            var task = subTasks[i];
            var geometry = task.geometry;
            var moduleName = task.moduleName;

            if (defined(moduleName)) {
                var createFunction = getModule(moduleName);
                results[i] = createFunction(geometry, task.offset);
            } else {
                //Already created geometry
                results[i] = geometry;
            }
        }

        return PrimitivePipeline.packCreateGeometryResults(results, transferableObjects);
    }

    return createTaskProcessorWorker(createGeometry);
});
