/*global define*/
define([
        '../Core/WallGeometry',
        '../Core/Ellipsoid',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        WallGeometry,
        Ellipsoid,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createWallGeometry(parameters, transferableObjects) {
        var wallGeometry = parameters.geometry;
        wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);

        var geometry = WallGeometry.createGeometry(wallGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createWallGeometry);
});
