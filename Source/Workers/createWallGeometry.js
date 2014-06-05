/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/WallGeometry'
    ], function(
        Ellipsoid,
        WallGeometry) {
    "use strict";

    function createWallGeometry(wallGeometry) {
        wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);
        return WallGeometry.createGeometry(wallGeometry);
    }

    return createWallGeometry;
});
