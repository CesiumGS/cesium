/*global define*/
define([
        '../Core/CorridorGeometry',
        '../Core/Ellipsoid'
    ], function(
        CorridorGeometry,
        Ellipsoid) {
    "use strict";

    function createCorridorGeometry(corridorGeometry) {
        corridorGeometry._ellipsoid = Ellipsoid.clone(corridorGeometry._ellipsoid);
        return CorridorGeometry.createGeometry(corridorGeometry);
    }

    return createCorridorGeometry;
});
