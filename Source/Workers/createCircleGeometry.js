/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/CircleGeometry',
        '../Core/Ellipsoid'
    ], function(
        Cartesian3,
        CircleGeometry,
        Ellipsoid) {
    "use strict";

    function createCircleGeometry(circleGeometry) {
        circleGeometry._ellipseGeometry._center = Cartesian3.clone(circleGeometry._ellipseGeometry._center);
        circleGeometry._ellipseGeometry._ellipsoid = Ellipsoid.clone(circleGeometry._ellipseGeometry._ellipsoid);
        return CircleGeometry.createGeometry(circleGeometry);
    }

    return createCircleGeometry;
});
