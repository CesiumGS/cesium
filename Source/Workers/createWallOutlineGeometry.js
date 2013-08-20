/*global define*/
define([
        '../Core/WallOutlineGeometry',
        '../Core/Ellipsoid',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        WallOutlineGeometry,
        Ellipsoid,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createWallOutlineGeometry(parameters, transferableObjects) {
        var wallGeometry = parameters.geometry;
        wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);

        var geometry = WallOutlineGeometry.createGeometry(wallGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createWallOutlineGeometry);
});
