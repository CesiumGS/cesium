/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/EllipseGeometry',
        '../Core/Ellipsoid',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        Cartesian3,
        EllipseGeometry,
        Ellipsoid,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createEllipseGeometry(parameters, transferableObjects) {
        var ellipseGeometry = parameters.geometry;
        ellipseGeometry.center = Cartesian3.clone(ellipseGeometry.center);
        ellipseGeometry.ellipsoid = Ellipsoid.clone(ellipseGeometry.ellipsoid);

        var geometry = EllipseGeometry.createGeometry(ellipseGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createEllipseGeometry);
});
