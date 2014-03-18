/*global define*/
define([
        '../Core/EllipsoidOutlineGeometry',
        '../Scene/PrimitivePipeline'
    ], function(
        EllipsoidOutlineGeometry,
        PrimitivePipeline) {
    "use strict";

    function createEllipsoidOutlineGeometry(parameters, transferableObjects) {
        var ellipsoidGeometry = parameters.geometry;
        var geometry = EllipsoidOutlineGeometry.createGeometry(ellipsoidGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createEllipsoidOutlineGeometry;
});
