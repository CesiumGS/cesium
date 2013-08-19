/*global define*/
define([
        '../Core/SimplePolylineGeometry',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        SimplePolylineGeometry,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createSimplePolylineGeometry(parameters, transferableObjects) {
        var polylineGeometry = parameters.geometry;
        var geometry = SimplePolylineGeometry.createGeometry(polylineGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createSimplePolylineGeometry);
});
