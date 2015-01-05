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

    function createCorridorOutlineGeometry(corridorOutlineGeometry, offset) {
        if (defined(offset)) {
            corridorOutlineGeometry = CorridorOutlineGeometry.unpack(corridorOutlineGeometry, offset);
        }
        corridorOutlineGeometry._ellipsoid = Ellipsoid.clone(corridorOutlineGeometry._ellipsoid);
        return CorridorOutlineGeometry.createGeometry(corridorOutlineGeometry);
    }

    return createCorridorOutlineGeometry;
});
