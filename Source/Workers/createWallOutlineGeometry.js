/*global define*/
define(['../Core/WallOutlineGeometry',
        '../Core/Ellipsoid'
    ], function(
        WallOutlineGeometry,
        Ellipsoid) {
    "use strict";

    function createWallOutlineGeometry(wallGeometry) {
        wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);
        return WallOutlineGeometry.createGeometry(wallGeometry);
    }

    return createWallOutlineGeometry;
});
