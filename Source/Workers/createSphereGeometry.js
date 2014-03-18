/*global define*/
define([
        '../Core/SphereGeometry',
        '../Scene/PrimitivePipeline'
    ], function(
        SphereGeometry,
        PrimitivePipeline) {
    "use strict";

    function createSphereGeometry(parameters, transferableObjects) {
        var sphereGeometry = parameters.geometry;
        var geometry = SphereGeometry.createGeometry(sphereGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createSphereGeometry;
});
