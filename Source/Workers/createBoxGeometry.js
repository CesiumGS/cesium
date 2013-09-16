/*global define*/
define([
        '../Core/BoxGeometry',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        BoxGeometry,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createBoxGeometry(parameters, transferableObjects) {
        var boxGeometry = parameters.geometry;
        var geometry = BoxGeometry.createGeometry(boxGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createBoxGeometry);
});
