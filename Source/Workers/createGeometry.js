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
    "use strict";

    var moduleCache = {};

    function getModule(moduleName) {
        var module = moduleCache[moduleName];
        if (!defined(module)) {
            // in web workers, require is synchronous
            require(['./' + moduleName], function(f) {
                module = f;
                moduleCache[module] = f;
            });
        }
        return module;
    }

    function createGeometry(parameters, transferableObjects) {
        var results = [];
        var subTasks = parameters.subTasks;

        for (var i = 0; i < subTasks.length; i++) {
            var task = subTasks[i];
            var geometry = task.geometry;
            var moduleName = task.moduleName;

            if (defined(moduleName)) {
                var createFunction = getModule(moduleName);
                results.push(createFunction(geometry));
            } else {
                //Already created geometry
                results.push(geometry);
            }
        }

        return PrimitivePipeline.packCreateGeometryResults(results, transferableObjects);
    }

    return createTaskProcessorWorker(createGeometry);
});
