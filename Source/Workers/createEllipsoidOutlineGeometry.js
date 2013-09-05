/*global define*/
define([
        '../Core/EllipsoidOutlineGeometry',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        EllipsoidOutlineGeometry,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createEllipsoidOutlineGeometry(parameters, transferableObjects) {
        var ellipsoidGeometry = parameters.geometry;
        var geometry = EllipsoidOutlineGeometry.createGeometry(ellipsoidGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createEllipsoidOutlineGeometry);
});
