/*global define*/
define([
        '../Core/WallGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline'
    ], function(
        WallGeometry,
        Ellipsoid,
        PrimitivePipeline) {
    "use strict";

    function createWallGeometry(parameters, transferableObjects) {
        var wallGeometry = parameters.geometry;
        wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);

        var geometry = WallGeometry.createGeometry(wallGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createWallGeometry;
});
