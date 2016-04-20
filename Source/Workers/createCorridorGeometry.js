/*global define*/
define([
        '../Core/CorridorGeometry',
        '../Core/defined',
        '../Core/Ellipsoid'
    ], function(
        CorridorGeometry,
        defined,
        Ellipsoid) {
    'use strict';

    function createCorridorGeometry(corridorGeometry, offset) {
        if (defined(offset)) {
            corridorGeometry = CorridorGeometry.unpack(corridorGeometry, offset);
        }
        corridorGeometry._ellipsoid = Ellipsoid.clone(corridorGeometry._ellipsoid);
        return CorridorGeometry.createGeometry(corridorGeometry);
    }

    return createCorridorGeometry;
});
