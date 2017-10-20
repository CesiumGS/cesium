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
    'use strict';

    function createEllipseGeometry(ellipseGeometry, offset) {
        if (defined(offset)) {
            ellipseGeometry = EllipseGeometry.unpack(ellipseGeometry, offset);
        }
        ellipseGeometry._center = Cartesian3.clone(ellipseGeometry._center);
        ellipseGeometry._ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid);
        return EllipseGeometry.createGeometry(ellipseGeometry);
    }

    return createEllipseGeometry;
});
