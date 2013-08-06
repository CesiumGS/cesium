/*global define*/
define([
        '../Core/BoxGeometry',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        BoxGeometry,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createBoxGeometry(parameters, transferableObjects) {
        var boxGeometry = parameters.geometry;
        var geometry = BoxGeometry.createGeometry(boxGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createBoxGeometry);
});
