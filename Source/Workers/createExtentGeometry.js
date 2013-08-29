/*global define*/
define([
        '../Core/ExtentGeometry',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        ExtentGeometry,
        Ellipsoid,
        Extent,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createExtentGeometry(parameters, transferableObjects) {
        var extentGeometry = parameters.geometry;
        extentGeometry._ellipsoid = Ellipsoid.clone(extentGeometry._ellipsoid);
        extentGeometry._extent = Extent.clone(extentGeometry._extent);

        var geometry = ExtentGeometry.createGeometry(extentGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createExtentGeometry);
});
