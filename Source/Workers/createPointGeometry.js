/*global define*/
define([
        '../Core/PointGeometry',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        PointGeometry,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createPointGeometry(parameters, transferableObjects) {
        var pointGeometry = parameters.geometry;
        var geometry = PointGeometry.createGeometry(pointGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createPointGeometry);
});
