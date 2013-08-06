/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/CircleGeometry',
        '../Core/Ellipsoid',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        Cartesian3,
        CircleGeometry,
        Ellipsoid,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createCircleGeometry(parameters, transferableObjects) {
        var circleGeometry = parameters.geometry;
        circleGeometry.ellipseGeometry.center = Cartesian3.clone(circleGeometry.ellipseGeometry.center);
        circleGeometry.ellipseGeometry.ellipsoid = Ellipsoid.clone(circleGeometry.ellipseGeometry.ellipsoid);

        var geometry = CircleGeometry.createGeometry(circleGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createCircleGeometry);
});
