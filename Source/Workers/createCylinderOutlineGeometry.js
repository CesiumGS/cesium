/*global define*/
define([
        '../Core/CylinderOutlineGeometry',
        '../Scene/PrimitivePipeline'
    ], function(
        CylinderOutlineGeometry,
        PrimitivePipeline) {
    "use strict";

    function createCylinderOutlineGeometry(parameters, transferableObjects) {
        var cylinderGeometry = parameters.geometry;
        var geometry = CylinderOutlineGeometry.createGeometry(cylinderGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createCylinderOutlineGeometry;
});
