/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/EllipseGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline'
    ], function(
        Cartesian3,
        EllipseGeometry,
        Ellipsoid,
        PrimitivePipeline) {
    "use strict";

    function createEllipseGeometry(parameters, transferableObjects) {
        var ellipseGeometry = parameters.geometry;
        ellipseGeometry._center = Cartesian3.clone(ellipseGeometry._center);
        ellipseGeometry._ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid);

        var geometry = EllipseGeometry.createGeometry(ellipseGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createEllipseGeometry;
});
