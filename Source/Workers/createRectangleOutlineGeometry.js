/*global define*/
define(['../Core/RectangleOutlineGeometry',
        '../Core/Ellipsoid',
        '../Core/Rectangle'
    ], function(
        RectangleOutlineGeometry,
        Ellipsoid,
        Rectangle) {
    "use strict";

    function createRectangleOutlineGeometry(rectangleGeometry) {
        rectangleGeometry._ellipsoid = Ellipsoid.clone(rectangleGeometry._ellipsoid);
        rectangleGeometry._rectangle = Rectangle.clone(rectangleGeometry._rectangle);
        return RectangleOutlineGeometry.createGeometry(rectangleGeometry);
    }

    return createRectangleOutlineGeometry;
});
