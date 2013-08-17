/*global define*/
define([
        '../Core/CylinderOutlineGeometry',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        CylinderOutlineGeometry,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createCylinderOutlineGeometry(parameters, transferableObjects) {
        var cylinderGeometry = parameters.geometry;
        var geometry = CylinderOutlineGeometry.createGeometry(cylinderGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createCylinderOutlineGeometry);
});
