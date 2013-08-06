/*global define*/
define([
        '../Core/PolygonGeometry',
        '../Core/Ellipsoid',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        PolygonGeometry,
        Ellipsoid,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createPolygonGeometry(parameters, transferableObjects) {
        var polygonGeometry = parameters.geometry;
        polygonGeometry.ellipsoid = Ellipsoid.clone(polygonGeometry.ellipsoid);

        var geometry = PolygonGeometry.createGeometry(polygonGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createPolygonGeometry);
});
