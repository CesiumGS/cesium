/*global define*/
define([
        '../Core/ExtentOutlineGeometry',
        '../Core/Ellipsoid',
        '../Core/Extent',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        ExtentOutlineGeometry,
        Ellipsoid,
        Extent,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createExtentOutlineGeometry(parameters, transferableObjects) {
        var extentGeometry = parameters.geometry;
        extentGeometry._ellipsoid = Ellipsoid.clone(extentGeometry._ellipsoid);
        extentGeometry._extent = Extent.clone(extentGeometry._extent);

        var geometry = ExtentOutlineGeometry.createGeometry(extentGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createExtentOutlineGeometry);
});
