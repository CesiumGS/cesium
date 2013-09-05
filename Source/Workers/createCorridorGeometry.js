/*global define*/
define([
        '../Core/CorridorGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        CorridorGeometry,
        Ellipsoid,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createCorridorGeometry(parameters, transferableObjects) {
        var corridorGeometry = parameters.geometry;
        corridorGeometry._ellipsoid = Ellipsoid.clone(corridorGeometry._ellipsoid);

        var geometry = CorridorGeometry.createGeometry(corridorGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createCorridorGeometry);
});
