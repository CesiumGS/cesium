/*global define*/
define(['../Core/WallGeometry',
        '../Core/Ellipsoid'
    ], function(
        WallGeometry,
        Ellipsoid) {
    "use strict";

    function createWallGeometry(wallGeometry) {
        wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);
        return WallGeometry.createGeometry(wallGeometry);
    }

    return createWallGeometry;
});
