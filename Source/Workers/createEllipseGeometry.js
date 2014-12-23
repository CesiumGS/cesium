/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/EllipseGeometry',
        '../Core/Ellipsoid'
    ], function(
        Cartesian3,
        defined,
        EllipseGeometry,
        Ellipsoid) {
    "use strict";

    function createEllipseGeometry(ellipseGeometry) {
        if (defined(ellipseGeometry.buffer)) {
            ellipseGeometry = EllipseGeometry.unpack(ellipseGeometry);
        }
        ellipseGeometry._center = Cartesian3.clone(ellipseGeometry._center);
        ellipseGeometry._ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid);
        return EllipseGeometry.createGeometry(ellipseGeometry);
    }

    return createEllipseGeometry;
});
