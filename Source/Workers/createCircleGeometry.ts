define([
        '../Core/Cartesian3',
        '../Core/CircleGeometry',
        '../Core/defined',
        '../Core/Ellipsoid'
    ], function(
        Cartesian3,
        CircleGeometry,
        defined,
        Ellipsoid) {
    'use strict';

    function createCircleGeometry(circleGeometry, offset) {
        if (defined(offset)) {
            circleGeometry = CircleGeometry.unpack(circleGeometry, offset);
        }
        circleGeometry._ellipseGeometry._center = Cartesian3.clone(circleGeometry._ellipseGeometry._center);
        circleGeometry._ellipseGeometry._ellipsoid = Ellipsoid.clone(circleGeometry._ellipseGeometry._ellipsoid);
        return CircleGeometry.createGeometry(circleGeometry);
    }

    return createCircleGeometry;
});
