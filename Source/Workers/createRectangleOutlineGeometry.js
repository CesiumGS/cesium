/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/Rectangle',
        '../Core/RectangleOutlineGeometry'
    ], function(
        Ellipsoid,
        Rectangle,
        RectangleOutlineGeometry) {
    "use strict";

    function createRectangleOutlineGeometry(rectangleGeometry) {
        rectangleGeometry._ellipsoid = Ellipsoid.clone(rectangleGeometry._ellipsoid);
        rectangleGeometry._rectangle = Rectangle.clone(rectangleGeometry._rectangle);
        return RectangleOutlineGeometry.createGeometry(rectangleGeometry);
    }

    return createRectangleOutlineGeometry;
});
