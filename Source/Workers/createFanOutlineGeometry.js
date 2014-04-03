/*global define*/
define([
        '../Core/FanOutlineGeometry',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        FanOutlineGeometry,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createFanOutlineGeometry(parameters, transferableObjects) {
        var fanGeometry = parameters.geometry;
        var geometry = FanOutlineGeometry.createGeometry(fanGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createFanOutlineGeometry);
});
