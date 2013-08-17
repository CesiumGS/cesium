/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/EllipseOutlineGeometry',
        '../Core/Ellipsoid',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        Cartesian3,
        EllipseOutlineGeometry,
        Ellipsoid,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createEllipseOutlineGeometry(parameters, transferableObjects) {
        var ellipseGeometry = parameters.geometry;
        ellipseGeometry._center = Cartesian3.clone(ellipseGeometry._center);
        ellipseGeometry._ellipsoid = Ellipsoid.clone(ellipseGeometry._ellipsoid);

        var geometry = EllipseOutlineGeometry.createGeometry(ellipseGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createEllipseOutlineGeometry);
});
