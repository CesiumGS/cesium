define([
        '../Core/defined',
        '../Scene/PrimitivePipeline',
        '../ThirdParty/when',
        './createTaskProcessorWorker',
        'require'
    ], function(
        defined,
        PrimitivePipeline,
        when,
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

        return when.all(resultsOrPromises, function(results) {
            return PrimitivePipeline.packCreateGeometryResults(results, transferableObjects);
        });
    }

    return createTaskProcessorWorker(createGeometry);
});
