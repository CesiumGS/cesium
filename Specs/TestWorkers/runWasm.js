define([
        'Workers/createTaskProcessorWorker'
    ], function(
        createTaskProcessorWorker) {
    'use strict';

    return createTaskProcessorWorker(function(parameters, transferableObjects) {
        var testModule = self.wasmModule;
        return testModule.main();
    });
});
