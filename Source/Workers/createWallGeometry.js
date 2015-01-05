/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/WallGeometry'
    ], function(
        defined,
        Ellipsoid,
        WallGeometry) {
    "use strict";

    function createWallGeometry(wallGeometry, offset) {
        if (defined(offset)) {
            wallGeometry = WallGeometry.unpack(wallGeometry, offset);
        }
        wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);
        return WallGeometry.createGeometry(wallGeometry);
    }

    return createWallGeometry;
});
