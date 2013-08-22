/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/EllipseGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        Cartesian3,
        EllipseGeometry,
        Ellipsoid,
        PrimitivePipeline,
        createTaskProcessorWorker) {
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

    return createTaskProcessorWorker(createEllipseGeometry);
});
