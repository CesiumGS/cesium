/*global define*/
define([
        '../Core/SphereOutlineGeometry',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        SphereOutlineGeometry,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createSphereOutlineGeometry(parameters, transferableObjects) {
        var sphereGeometry = parameters.geometry;
        var geometry = SphereOutlineGeometry.createGeometry(sphereGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createSphereOutlineGeometry);
});
