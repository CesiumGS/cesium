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

    function createWallGeometry(wallGeometry) {
        if (defined(wallGeometry.buffer)) {
            wallGeometry = WallGeometry.unpack(wallGeometry);
        }
        wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);
        return WallGeometry.createGeometry(wallGeometry);
    }

    return createWallGeometry;
});
