/*global define*/
define([
        '../Core/PolygonOutlineGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline'
    ], function(
        PolygonOutlineGeometry,
        Ellipsoid,
        PrimitivePipeline) {
    "use strict";

    function createPolygonOutlineGeometry(parameters, transferableObjects) {
        var polygonGeometry = parameters.geometry;
        polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);

        var geometry = PolygonOutlineGeometry.createGeometry(polygonGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createPolygonOutlineGeometry;
});
