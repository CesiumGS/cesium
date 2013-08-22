/*global define*/
define([
        '../Core/SphereOutlineGeometry',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        SphereOutlineGeometry,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createSphereOutlineGeometry(parameters, transferableObjects) {
        var sphereGeometry = parameters.geometry;
        var geometry = SphereOutlineGeometry.createGeometry(sphereGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createSphereOutlineGeometry);
});
