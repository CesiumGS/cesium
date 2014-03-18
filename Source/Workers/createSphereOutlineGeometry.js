/*global define*/
define([
        '../Core/SphereOutlineGeometry',
        '../Scene/PrimitivePipeline'
    ], function(
        SphereOutlineGeometry,
        PrimitivePipeline) {
    "use strict";

    function createSphereOutlineGeometry(parameters, transferableObjects) {
        var sphereGeometry = parameters.geometry;
        var geometry = SphereOutlineGeometry.createGeometry(sphereGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createSphereOutlineGeometry;
});
