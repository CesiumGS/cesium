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
    'use strict';

    function createRectangleOutlineGeometry(rectangleGeometry, offset) {
        if (defined(offset)) {
            rectangleGeometry = RectangleOutlineGeometry.unpack(rectangleGeometry, offset);
        }
        rectangleGeometry._ellipsoid = Ellipsoid.clone(rectangleGeometry._ellipsoid);
        rectangleGeometry._rectangle = Rectangle.clone(rectangleGeometry._rectangle);
        return RectangleOutlineGeometry.createGeometry(rectangleGeometry);
    }

    return createRectangleOutlineGeometry;
});
