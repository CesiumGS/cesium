/*global define*/
define([
        'require',
        './createTaskProcessorWorker',
        '../Core/defined',
        '../ThirdParty/when'
    ], function(
        require,
        createTaskProcessorWorker,
        defined,
        when) {
    "use strict";

    var geometryCreatorCache = {};

    function createTask(taskWorkerName, taskWorker, geometry, transferableObjects, deferred, results) {
        return function(taskWorker) {
            geometryCreatorCache[taskWorkerName] = taskWorker;
            results.push(taskWorker(geometry, transferableObjects));
            deferred.resolve();
        };
    }

    function createGeometry(parameters, transferableObjects) {
        var taskWorkerNames = parameters.task;
        var geometries = parameters.geometry;

        var deferred = when.defer();
        var results = [];
        var promises = [];

        for (var i = 0; i < geometries.length; i++) {
            var taskWorkerName = geometries[i].task;
            var taskWorker = geometryCreatorCache[taskWorkerName];
            if (defined(taskWorker)) {
                results.push(taskWorker(geometries[i], transferableObjects));
            } else {
                var innerDefer = when.defer();
                require(['./' + taskWorkerName], createTask(taskWorkerName, taskWorker, geometries[i], transferableObjects, innerDefer, results));
                promises.push(innerDefer.promise);
            }
        }
        when.all(promises, function() {
            deferred.resolve(results);
        });

        return deferred.promise;
    }

    return createTaskProcessorWorker(createGeometry);
});
