/*global define*/
define([
        'Core/RuntimeError',
        'Workers/createTaskProcessorWorker'
    ], function(
        RuntimeError,
        createTaskProcessorWorker) {
    "use strict";

    return createTaskProcessorWorker(function(parameters, transferableObjects) {
        throw new RuntimeError(parameters.message);
    });
});
