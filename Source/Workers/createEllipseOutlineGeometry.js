/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/EllipseOutlineGeometry',
        '../Core/Ellipsoid'
    ], function(
        Cartesian3,
        defined,
        EllipseOutlineGeometry,
        Ellipsoid) {
    "use strict";

    function createEllipseOutlineGeometry(ellipseGeometry) {
        if (defined(ellipseGeometry.buffer)) {
            ellipseGeometry = EllipseOutlineGeometry.unpack(ellipseGeometry);
        }
        ellipseGeometry._center = Cartesian3.clone(ellipseGeometry._center);
        ellipseGeometry._ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid);
        return EllipseOutlineGeometry.createGeometry(ellipseGeometry);
    }

    return createEllipseOutlineGeometry;
});
