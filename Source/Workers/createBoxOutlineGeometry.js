/*global define*/
define([
        '../Core/BoxOutlineGeometry',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        BoxOutlineGeometry,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createBoxOutlineGeometry(parameters, transferableObjects) {
        var boxGeometry = parameters.geometry;
        var geometry = BoxOutlineGeometry.createGeometry(boxGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createBoxOutlineGeometry);
});
