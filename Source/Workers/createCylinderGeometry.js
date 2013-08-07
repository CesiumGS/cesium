/*global define*/
define([
        '../Core/CylinderGeometry',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        CylinderGeometry,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createCylinderGeometry(parameters, transferableObjects) {
        var cylinderGeometry = parameters.geometry;
        var geometry = CylinderGeometry.createGeometry(cylinderGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createCylinderGeometry);
});
