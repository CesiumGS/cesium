/*global define*/
define([
        '../Core/CorridorOutlineGeometry',
        '../Core/defined',
        '../Core/Ellipsoid'
    ], function(
        CorridorOutlineGeometry,
        defined,
        Ellipsoid) {
    "use strict";

    function createCorridorOutlineGeometry(corridorOutlineGeometry) {
        if (defined(corridorOutlineGeometry.buffer)) {
            corridorOutlineGeometry = CorridorOutlineGeometry.unpack(corridorOutlineGeometry);
        }
        corridorOutlineGeometry._ellipsoid = Ellipsoid.clone(corridorOutlineGeometry._ellipsoid);
        return CorridorOutlineGeometry.createGeometry(corridorOutlineGeometry);
    }

    return createCorridorOutlineGeometry;
});
