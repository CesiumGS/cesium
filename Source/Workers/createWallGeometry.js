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
        wallGeometry.ellipsoid = Ellipsoid.clone(wallGeometry.ellipsoid);

        var geometry = WallGeometry.createGeometry(wallGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createWallGeometry);
});
