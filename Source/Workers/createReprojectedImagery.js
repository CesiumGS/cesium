define([
        '../Core/AsynchronousReprojectionWorker',
        './createTaskProcessorWorker'
    ], function(
        AsynchronousReprojectionWorker,
        createTaskProcessorWorker) {
    'use strict';

    var asynchronousReprojectionWorker = new AsynchronousReprojectionWorker();

    function createVerticesFromHeightmap(parameters, transferableObjects) {
        return asynchronousReprojectionWorker.runTask(parameters, transferableObjects);
    }

    return createTaskProcessorWorker(createVerticesFromHeightmap);
});
