/*global define*/
define([
        '../Core/CorridorOutlineGeometry',
        '../Core/Ellipsoid'
    ], function(
        CorridorOutlineGeometry,
        Ellipsoid) {
    "use strict";

    function createCorridorOutlineGeometry(corridorOutlineGeometry) {
        corridorOutlineGeometry._ellipsoid = Ellipsoid.clone(corridorOutlineGeometry._ellipsoid);
        return CorridorOutlineGeometry.createGeometry(corridorOutlineGeometry);
    }

    return createCorridorOutlineGeometry;
});
