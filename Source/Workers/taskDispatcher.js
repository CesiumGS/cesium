/*global define*/
define([
        'require',
        '../Core/defined'
    ], function(
        require,
        defined) {
    "use strict";

    var taskWorkerCache = {};

    /**
     * A worker that delegates tasks from a TaskProcessor to other workers by
     * inspecting the parameters for a "task" property, which is expected to be
     * the module ID of another worker.  This worker will load that worker, if not
     * already loaded, then pass the event to that worker.
     *
     * @exports taskDispatcher
     *
     * @see TaskProcessor
     * @see <a href='http://www.w3.org/TR/workers/'>Web Workers</a>
     * @see <a href='http://www.w3.org/TR/html5/common-dom-interfaces.html#transferable-objects'>Transferable objects</a>
     */
    var taskDispatcher = function(event) {
        var taskWorkerName = event.data.parameters.task;
        var taskWorker = taskWorkerCache[taskWorkerName];
        if (defined(taskWorker)) {
            taskWorker(event);
        } else {
            require(['./' + taskWorkerName], function(taskWorker) {
                taskWorkerCache[taskWorkerName] = taskWorker;
                taskWorker(event);
            });
        }
    };

    return taskDispatcher;
});
