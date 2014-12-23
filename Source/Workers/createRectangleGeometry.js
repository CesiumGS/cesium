/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/Rectangle',
        '../Core/RectangleGeometry'
    ], function(
        defined,
        Ellipsoid,
        Rectangle,
        RectangleGeometry) {
    "use strict";

    function createRectangleGeometry(rectangleGeometry) {
        if (defined(rectangleGeometry.buffer)) {
            rectangleGeometry = RectangleGeometry.unpack(rectangleGeometry);
        }
        rectangleGeometry._ellipsoid = Ellipsoid.clone(rectangleGeometry._ellipsoid);
        rectangleGeometry._rectangle = Rectangle.clone(rectangleGeometry._rectangle);
        return RectangleGeometry.createGeometry(rectangleGeometry);
    }

    return createRectangleGeometry;
});
