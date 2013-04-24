/*global define*/
define([
        'require',
        './buildModuleUrl',
        './defaultValue',
        './isCrossOriginUrl',
        '../ThirdParty/when',
        '../ThirdParty/Uri'
    ], function(
        require,
        buildModuleUrl,
        defaultValue,
        isCrossOriginUrl,
        when,
        Uri) {
    "use strict";

    function completeTask(processor, event) {
        --processor._activeTasks;

        var data = event.data;
        var id = data.id;
        var result = data.result;

        var deferreds = processor._deferreds;
        var deferred = deferreds[id];

        deferred.resolve(result);

        delete deferreds[id];
    }

    var _bootstrapperUrl;
    function getBootstrapperUrl() {
        if (typeof _bootstrapperUrl !== 'undefined') {
            return _bootstrapperUrl;
        }

        _bootstrapperUrl = buildModuleUrl('Workers/cesiumWorkerBootstrapper.js');

        if (isCrossOriginUrl(_bootstrapperUrl)) {
            //to load cross-origin, create a shim worker from a blob URL
            var script = 'importScripts("' + _bootstrapperUrl + '");';

            var blob;
            try {
                blob = new Blob([script], {
                    type : 'application/javascript'
                });
            } catch (e) {
                var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
                var blobBuilder = new BlobBuilder();
                blobBuilder.append(script);
                blob = blobBuilder.getBlob('application/javascript');
            }

            var URL = window.URL || window.webkitURL;
            _bootstrapperUrl = URL.createObjectURL(blob);
        }

        return _bootstrapperUrl;
    }

    function createWorker(processor) {
        var bootstrapperUrl = getBootstrapperUrl();
        var worker = new Worker(bootstrapperUrl);
        worker.postMessage = defaultValue(worker.webkitPostMessage, worker.postMessage);

        //bootstrap
        var bootstrapMessage = {
            loaderConfig : {},
            workerModule : 'Workers/' + processor._workerName
        };

        if (typeof require.toUrl !== 'undefined') {
            var resolvedBootstrapperUrl = new Uri(buildModuleUrl('Workers/cesiumWorkerBootstrapper.js')).resolve(new Uri(document.location.href));
            var baseUrl = new Uri('..').resolve(resolvedBootstrapperUrl).toString();
            bootstrapMessage.loaderConfig.baseUrl = baseUrl;
        } else {
            var workersUrl = new Uri(buildModuleUrl('Workers')).resolve(new Uri(document.location.href)).toString();
            bootstrapMessage.loaderConfig.paths = {
                'Workers' : workersUrl
            };
        }

        worker.postMessage(bootstrapMessage);

        worker.onmessage = function(event) {
            completeTask(processor, event);
        };

        processor._worker = worker;
    }

    /**
     * A wrapper around a web worker that allows scheduling tasks for a given worker,
     * returning results asynchronously via a promise.
     *
     * The Worker is not constructed until a task is scheduled.
     *
     * @alias TaskProcessor
     * @constructor
     *
     * @param {String} workerName The name of the worker.  This is expected to be a script
     *                            in the Workers folder.
     * @param {Number} [maximumActiveTasks=5] The maximum number of active tasks.  Once exceeded,
     *                                        scheduleTask will not queue any more tasks, allowing
     *                                        work to be rescheduled in future frames.
     */
    var TaskProcessor = function(workerName, maximumActiveTasks) {
        this._workerName = workerName;
        this._maximumActiveTasks = defaultValue(maximumActiveTasks, 5);
        this._activeTasks = 0;
        this._deferreds = {};
        this._nextID = 0;
    };

    /**
     * Schedule a task to be processed by the web worker asynchronously.  If there are currently more
     * tasks active than the maximum set by the constructor, will immediately return undefined.
     * Otherwise, returns a promise that will resolve to the result posted back by the worker when
     * finished.
     *
     * @param {*} parameters Any input data that will be posted to the worker.
     * @param {Array} [transferableObjects] An array of objects contained in parameters that should be
     *                                      transferred to the worker instead of copied.
     * @returns {Promise} Either a promise that will resolve to the result when available, or undefined
     *                    if there are too many active tasks,
     *
     * @example
     * var taskProcessor = new TaskProcessor('myWorkerName');
     * var promise = taskProcessor.scheduleTask({
     *     someParameter : true,
     *     another : 'hello'
     * });
     * if (typeof promise === 'undefined') {
     *     // too many active tasks - try again later
     * } else {
     *     when(promise, function(result) {
     *         // use the result of the task
     *     });
     * }
     */
    TaskProcessor.prototype.scheduleTask = function(parameters, transferableObjects) {
        if (typeof this._worker === 'undefined') {
            createWorker(this);
        }

        if (this._activeTasks >= this._maximumActiveTasks) {
            return undefined;
        }

        ++this._activeTasks;

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
