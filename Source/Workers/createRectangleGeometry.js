/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/Rectangle',
        '../Core/RectangleGeometry'
    ], function(
        Ellipsoid,
        Rectangle,
        RectangleGeometry) {
    "use strict";

    function createRectangleGeometry(rectangleGeometry) {
        rectangleGeometry._ellipsoid = Ellipsoid.clone(rectangleGeometry._ellipsoid);
        rectangleGeometry._rectangle = Rectangle.clone(rectangleGeometry._rectangle);
        return RectangleGeometry.createGeometry(rectangleGeometry);
    }

    return createRectangleGeometry;
});
