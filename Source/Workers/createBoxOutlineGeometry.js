/*global define*/
define([
        '../Core/BoxOutlineGeometry',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        BoxOutlineGeometry,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createBoxOutlineGeometry(parameters, transferableObjects) {
        var boxGeometry = parameters.geometry;
        var geometry = BoxOutlineGeometry.createGeometry(boxGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createBoxOutlineGeometry);
});
