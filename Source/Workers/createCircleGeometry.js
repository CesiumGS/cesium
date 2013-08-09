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
        circleGeometry._ellipseGeometry._center = Cartesian3.clone(circleGeometry._ellipseGeometry._center);
        circleGeometry._ellipseGeometry._ellipsoid = Ellipsoid.clone(circleGeometry._ellipseGeometry._ellipsoid);

        var geometry = CircleGeometry.createGeometry(circleGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createCircleGeometry);
});
