/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/CircleOutlineGeometry',
        '../Core/Ellipsoid',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        Cartesian3,
        CircleOutlineGeometry,
        Ellipsoid,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createCircleOutlineGeometry(parameters, transferableObjects) {
        var circleGeometry = parameters.geometry;
        circleGeometry._ellipseGeometry._center = Cartesian3.clone(circleGeometry._ellipseGeometry._center);
        circleGeometry._ellipseGeometry._ellipsoid = Ellipsoid.clone(circleGeometry._ellipseGeometry._ellipsoid);

        var geometry = CircleOutlineGeometry.createGeometry(circleGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createCircleOutlineGeometry);
});
