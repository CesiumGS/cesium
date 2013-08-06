/*global define*/
define([
        '../Core/EllipsoidGeometry',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        EllipsoidGeometry,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createEllipsoidGeometry(parameters, transferableObjects) {
        var ellipsoidGeometry = parameters.geometry;
        var geometry = EllipsoidGeometry.createGeometry(ellipsoidGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createEllipsoidGeometry);
});
