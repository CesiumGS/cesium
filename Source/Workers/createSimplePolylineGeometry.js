/*global define*/
define([
        '../Core/SimplePolylineGeometry',
        '../Scene/PrimitivePipeline'
    ], function(
        SimplePolylineGeometry,
        PrimitivePipeline) {
    "use strict";

    function createSimplePolylineGeometry(parameters, transferableObjects) {
        var polylineGeometry = parameters.geometry;
        var geometry = SimplePolylineGeometry.createGeometry(polylineGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createSimplePolylineGeometry;
});
