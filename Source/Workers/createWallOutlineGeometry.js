/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/WallOutlineGeometry'
    ], function(
        Ellipsoid,
        WallOutlineGeometry) {
    "use strict";

    function createWallOutlineGeometry(wallGeometry) {
        wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);
        return WallOutlineGeometry.createGeometry(wallGeometry);
    }

    return createWallOutlineGeometry;
});
