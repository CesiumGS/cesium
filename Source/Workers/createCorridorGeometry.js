/*global define*/
define([
        '../Core/CorridorGeometry',
        '../Core/defined',
        '../Core/Ellipsoid'
    ], function(
        CorridorGeometry,
        defined,
        Ellipsoid) {
    "use strict";

    function createCorridorGeometry(corridorGeometry) {
        if (defined(corridorGeometry.buffer)) {
            corridorGeometry = CorridorGeometry.unpack(corridorGeometry);
        }
        corridorGeometry._ellipsoid = Ellipsoid.clone(corridorGeometry._ellipsoid);
        return CorridorGeometry.createGeometry(corridorGeometry);
    }

    return createCorridorGeometry;
});
