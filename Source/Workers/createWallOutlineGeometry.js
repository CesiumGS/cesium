/*global define*/
define([
        '../Core/WallOutlineGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline'
    ], function(
        WallOutlineGeometry,
        Ellipsoid,
        PrimitivePipeline) {
    "use strict";

    function createWallOutlineGeometry(parameters, transferableObjects) {
        var wallGeometry = parameters.geometry;
        wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);

        var geometry = WallOutlineGeometry.createGeometry(wallGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createWallOutlineGeometry;
});
