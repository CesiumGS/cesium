/*global define*/
define([
        '../Core/EllipsoidOutlineGeometry',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        EllipsoidOutlineGeometry,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createEllipsoidOutlineGeometry(parameters, transferableObjects) {
        var ellipsoidGeometry = parameters.geometry;
        var geometry = EllipsoidOutlineGeometry.createGeometry(ellipsoidGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createEllipsoidOutlineGeometry);
});
