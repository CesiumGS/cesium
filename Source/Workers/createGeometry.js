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

    function createTask(taskWorkerName, taskWorker, task, transferableObjects, deferred, results) {
        return function(taskWorker) {
            geometryCreatorCache[taskWorkerName] = taskWorker;
            results.push(taskWorker(task, transferableObjects));
            deferred.resolve();
        };
    }

    function createGeometry(parameters, transferableObjects) {
        var tasks = parameters.tasks;

        var deferred = when.defer();
        var results = [];
        var promises = [];

        for (var i = 0; i < tasks.length; i++) {
            var taskWorkerName = tasks[i].workerName;
            var taskWorker = geometryCreatorCache[taskWorkerName];
            if (defined(taskWorker)) {
                results.push(taskWorker(tasks[i], transferableObjects));
            } else {
                var innerDefer = when.defer();
                require(['./' + taskWorkerName], createTask(taskWorkerName, taskWorker, tasks[i], transferableObjects, innerDefer, results));
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
