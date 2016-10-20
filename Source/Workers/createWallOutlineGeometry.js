/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/WallOutlineGeometry'
    ], function(
        defined,
        Ellipsoid,
        WallOutlineGeometry) {
    'use strict';

    function createWallOutlineGeometry(wallGeometry, offset) {
        if (defined(offset)) {
            wallGeometry = WallOutlineGeometry.unpack(wallGeometry, offset);
        }
        wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);
        return WallOutlineGeometry.createGeometry(wallGeometry);
    }

    return createWallOutlineGeometry;
});
