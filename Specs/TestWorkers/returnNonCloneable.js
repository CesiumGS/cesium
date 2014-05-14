/*global define*/
define([
        'Workers/createTaskProcessorWorker'
    ], function(
        createTaskProcessorWorker) {
    "use strict";

    return createTaskProcessorWorker(function(parameters, transferableObjects) {
        return function() {
            //functions are not cloneable
        };
    });
});
