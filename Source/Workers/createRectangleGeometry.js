/*global define*/
define(['../Core/RectangleGeometry',
        '../Core/Ellipsoid',
        '../Core/Rectangle'
    ], function(
        RectangleGeometry,
        Ellipsoid,
        Rectangle) {
    "use strict";

    function createRectangleGeometry(rectangleGeometry) {
        rectangleGeometry._ellipsoid = Ellipsoid.clone(rectangleGeometry._ellipsoid);
        rectangleGeometry._rectangle = Rectangle.clone(rectangleGeometry._rectangle);
        return RectangleGeometry.createGeometry(rectangleGeometry);
    }

    return createRectangleGeometry;
});
