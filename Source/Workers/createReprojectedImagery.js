define([
        '../Core/AsynchronousReprojectionWorker',
        './createTaskProcessorWorker'
    ], function(
        AsynchronousReprojectionWorker,
        createTaskProcessorWorker) {
    'use strict';

    function createVerticesFromHeightmap(parameters, transferableObjects) {
        return AsynchronousReprojectionWorker.runTask(parameters, transferableObjects);
    }

    return createTaskProcessorWorker(createVerticesFromHeightmap);
});
