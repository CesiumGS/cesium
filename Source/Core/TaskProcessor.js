/*global define*/
define([
        'require',
        './defaultValue',
        '../ThirdParty/when'
    ], function(
        require,
        defaultValue,
        when) {
    "use strict";

    function completeTask(processor, event) {
        var data = event.data;
        var id = data.id;
        var result = data.result;

        var deferreds = processor._deferreds;
        var deferred = deferreds[id];
        deferred.resolve(result);
        delete deferreds[id];
    }

    var TaskProcessor = function(workerName) {
        var uri = require.toUrl('Workers/' + workerName + '.js');
        var worker = new Worker(uri);

        this._worker = worker;
        this._deferreds = {};
        this._nextID = 0;

        var processor = this;
        worker.onmessage = function(event) {
            completeTask(processor, event);
        };

        worker.postMessage = defaultValue(worker.webkitPostMessage, worker.postMessage);
    };

    TaskProcessor.prototype.scheduleTask = function(parameters, transferableObjects) {
        var id = this._nextID++;
        var deferred = when.defer();
        this._deferreds[id] = deferred;

        this._worker.postMessage({
            id : id,
            parameters : parameters
        }, transferableObjects);

        return deferred.promise;
    };

    return TaskProcessor;
});