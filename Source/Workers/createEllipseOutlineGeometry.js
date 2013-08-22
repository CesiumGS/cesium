/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/EllipseOutlineGeometry',
        '../Core/Ellipsoid',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        Cartesian3,
        EllipseOutlineGeometry,
        Ellipsoid,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createEllipseOutlineGeometry(parameters, transferableObjects) {
        var ellipseGeometry = parameters.geometry;
        ellipseGeometry._center = Cartesian3.clone(ellipseGeometry._center);
        ellipseGeometry._ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid);

        var geometry = EllipseOutlineGeometry.createGeometry(ellipseGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createEllipseOutlineGeometry);
});
