/*global define*/
define([
        '../Core/SphereGeometry',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        SphereGeometry,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createSphereGeometry(parameters, transferableObjects) {
        var sphereGeometry = parameters.geometry;
        var geometry = SphereGeometry.createGeometry(sphereGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createSphereGeometry);
});
