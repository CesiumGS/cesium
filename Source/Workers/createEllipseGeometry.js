/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/EllipseGeometry',
        '../Core/Ellipsoid'
    ], function(
        Cartesian3,
        EllipseGeometry,
        Ellipsoid) {
    "use strict";

    function createEllipseGeometry(ellipseGeometry) {
        ellipseGeometry._center = Cartesian3.clone(ellipseGeometry._center);
        ellipseGeometry._ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid);
        return EllipseGeometry.createGeometry(ellipseGeometry);
    }

    return createEllipseGeometry;
});
