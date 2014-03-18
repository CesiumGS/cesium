/*global define*/
define([
        '../Core/BoxGeometry',
        '../Scene/PrimitivePipeline'
    ], function(
        BoxGeometry,
        PrimitivePipeline) {
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

    return createBoxGeometry;
});
