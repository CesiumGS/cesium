/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/CircleOutlineGeometry',
        '../Core/defined',
        '../Core/Ellipsoid'
    ], function(
        Cartesian3,
        CircleOutlineGeometry,
        defined,
        Ellipsoid) {
    "use strict";

    function createCircleOutlineGeometry(circleGeometry) {
        if (defined(circleGeometry.buffer)) {
            circleGeometry = CircleOutlineGeometry.unpack(circleGeometry);
        }
        circleGeometry._ellipseGeometry._center = Cartesian3.clone(circleGeometry._ellipseGeometry._center);
        circleGeometry._ellipseGeometry._ellipsoid = Ellipsoid.clone(circleGeometry._ellipseGeometry._ellipsoid);
        return CircleOutlineGeometry.createGeometry(circleGeometry);
    }

    return createCircleOutlineGeometry;
});
