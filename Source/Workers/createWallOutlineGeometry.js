/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/WallOutlineGeometry'
    ], function(
        defined,
        Ellipsoid,
        WallOutlineGeometry) {
    "use strict";

    function createWallOutlineGeometry(wallGeometry) {
        if (defined(wallGeometry.buffer)) {
            wallGeometry = WallOutlineGeometry.unpack(wallGeometry);
        }
        wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);
        return WallOutlineGeometry.createGeometry(wallGeometry);
    }

    return createWallOutlineGeometry;
});
