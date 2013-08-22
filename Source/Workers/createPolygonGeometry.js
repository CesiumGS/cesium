/*global define*/
define([
        '../Core/PolygonGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        PolygonGeometry,
        Ellipsoid,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createPolygonGeometry(parameters, transferableObjects) {
        var polygonGeometry = parameters.geometry;
        polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);

        var geometry = PolygonGeometry.createGeometry(polygonGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createPolygonGeometry);
});
