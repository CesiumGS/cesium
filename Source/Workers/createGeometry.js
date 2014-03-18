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

    var geometryCreatorCache = {};

    function createTask(taskWorkerName, taskWorker, task, transferableObjects, deferred, results) {
        return function(taskWorker) {
            geometryCreatorCache[taskWorkerName] = taskWorker;

            var geometry = taskWorker(task.geometry);
            PrimitivePipeline.transferGeometry(geometry, transferableObjects);
            results.push({
                geometry : geometry,
                index : task.index
            });
            deferred.resolve();
        };
    }

    function createGeometry(parameters, transferableObjects) {
        var tasks = parameters.tasks;

        var deferred = when.defer();
        var results = [];
        var promises = [];

        for (var i = 0; i < tasks.length; i++) {
            var task = tasks[i];
            var taskWorkerName = task.workerName;
            var taskWorker = geometryCreatorCache[taskWorkerName];
            if (defined(taskWorker)) {
                var geometry = taskWorker(task.geometry);
                PrimitivePipeline.transferGeometry(geometry, transferableObjects);
                results.push({
                    geometry : geometry,
                    index : task.index
                });
            } else {
                var innerDefer = when.defer();
                require(['./' + taskWorkerName], createTask(taskWorkerName, taskWorker, task, transferableObjects, innerDefer, results));
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
