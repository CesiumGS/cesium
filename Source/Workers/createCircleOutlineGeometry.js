/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/CircleOutlineGeometry',
        '../Core/Ellipsoid'
    ], function(
        Cartesian3,
        CircleOutlineGeometry,
        Ellipsoid) {
    "use strict";

    function createCircleOutlineGeometry(circleGeometry) {
        circleGeometry._ellipseGeometry._center = Cartesian3.clone(circleGeometry._ellipseGeometry._center);
        circleGeometry._ellipseGeometry._ellipsoid = Ellipsoid.clone(circleGeometry._ellipseGeometry._ellipsoid);
        return CircleOutlineGeometry.createGeometry(circleGeometry);
    }

    return createCircleOutlineGeometry;
});
