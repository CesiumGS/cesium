/*global define*/
define([
        '../Core/CorridorOutlineGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline'
    ], function(
        CorridorOutlineGeometry,
        Ellipsoid,
        PrimitivePipeline) {
    "use strict";

    function createCorridorOutlineGeometry(parameters, transferableObjects) {
        var corridorOutlineGeometry = parameters.geometry;
        corridorOutlineGeometry._ellipsoid = Ellipsoid.clone(corridorOutlineGeometry._ellipsoid);

        var geometry = CorridorOutlineGeometry.createGeometry(corridorOutlineGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createCorridorOutlineGeometry;
});
