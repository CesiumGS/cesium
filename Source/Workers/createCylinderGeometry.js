/*global define*/
define([
        '../Core/CylinderGeometry',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        CylinderGeometry,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createCylinderGeometry(parameters, transferableObjects) {
        var cylinderGeometry = parameters.geometry;
        var geometry = CylinderGeometry.createGeometry(cylinderGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createCylinderGeometry);
});
