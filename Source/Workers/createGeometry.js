/*global define*/
define([
        'require',
        './createTaskProcessorWorker',
        '../Core/defined',
        '../Scene/PrimitivePipeline',
        '../ThirdParty/when'
    ], function(
        require,
        createTaskProcessorWorker,
        defined,
        PrimitivePipeline,
        when) {
    "use strict";

    var moduleCache = {};

    function createTask(moduleName, deferred, geometry, createFunction) {
        return function(createFunction) {
            moduleCache[moduleName] = createFunction;
            deferred.resolve(createFunction(geometry));
        };
    }

    function createGeometry(parameters, transferableObjects) {
        var subTasks = parameters.subTasks;
        var promises = [];
        var deferred = when.defer();

        for (var i = 0; i < subTasks.length; i++) {
            var task = subTasks[i];
            var moduleName = task.moduleName;
            var innedDeferred = when.defer();
            if (defined(moduleName)) {
                var createFunction = moduleCache[moduleName];
                if (defined(createFunction)) {
                    promises.push(innedDeferred.promise);
                    innedDeferred.resolve(createFunction(task.geometry));
                } else {
                    require(['./' + moduleName], createTask(moduleName, innedDeferred, task.geometry, createFunction));
                    promises.push(innedDeferred.promise);
                }
            } else {
                //Already created geometry
                promises.push(innedDeferred.promise);
                innedDeferred.resolve(task.geometry);
            }
        }

        when.all(promises, function(results) {
            deferred.resolve(PrimitivePipeline.packCreateGeometryResults(results, transferableObjects));
        });

        return deferred.promise;
    }

    return createTaskProcessorWorker(createGeometry);
});
