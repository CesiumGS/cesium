/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/Rectangle',
        '../Core/RectangleOutlineGeometry'
    ], function(
        defined,
        Ellipsoid,
        Rectangle,
        RectangleOutlineGeometry) {
    "use strict";

    function createRectangleOutlineGeometry(rectangleGeometry) {
        if (defined(rectangleGeometry.buffer)) {
            rectangleGeometry = RectangleOutlineGeometry.unpack(rectangleGeometry);
        }
        rectangleGeometry._ellipsoid = Ellipsoid.clone(rectangleGeometry._ellipsoid);
        rectangleGeometry._rectangle = Rectangle.clone(rectangleGeometry._rectangle);
        return RectangleOutlineGeometry.createGeometry(rectangleGeometry);
    }

    return createRectangleOutlineGeometry;
});
