/*global define*/
define([
        '../Core/ExtentGeometry',
        '../Core/Ellipsoid',
        '../Core/Extent',
        './createTaskProcessorWorker',
        './transferGeometry'
    ], function(
        ExtentGeometry,
        Ellipsoid,
        Extent,
        createTaskProcessorWorker,
        transferGeometry) {
    "use strict";

    function createExtentGeometry(parameters, transferableObjects) {
        var extentGeometry = parameters.geometry;
        extentGeometry.ellipsoid = Ellipsoid.clone(extentGeometry.ellipsoid);
        extentGeometry.extent = Extent.clone(extentGeometry.extent);

        var geometry = ExtentGeometry.createGeometry(extentGeometry);
        transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createExtentGeometry);
});
