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
    'use strict';

    function createEllipseOutlineGeometry(ellipseGeometry, offset) {
        if (defined(offset)) {
            ellipseGeometry = EllipseOutlineGeometry.unpack(ellipseGeometry, offset);
        }
        ellipseGeometry._center = Cartesian3.clone(ellipseGeometry._center);
        ellipseGeometry._ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid);
        return EllipseOutlineGeometry.createGeometry(ellipseGeometry);
    }

    return createEllipseOutlineGeometry;
});
