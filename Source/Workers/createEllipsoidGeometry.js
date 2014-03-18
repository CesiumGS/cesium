/*global define*/
define([
        '../Core/EllipsoidGeometry',
        '../Scene/PrimitivePipeline'
    ], function(
        EllipsoidGeometry,
        PrimitivePipeline) {
    "use strict";

    function createEllipsoidGeometry(parameters, transferableObjects) {
        var ellipsoidGeometry = parameters.geometry;
        var geometry = EllipsoidGeometry.createGeometry(ellipsoidGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createEllipsoidGeometry;
});
