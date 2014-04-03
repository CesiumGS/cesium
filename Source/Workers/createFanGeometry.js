/*global define*/
define([
        '../Core/FanGeometry',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
            FanGeometry,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createFanGeometry(parameters, transferableObjects) {
        var fanGeometry = parameters.geometry;
        var geometry = FanGeometry.createGeometry(fanGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createFanGeometry);
});
