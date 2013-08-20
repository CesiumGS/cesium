/*global define*/
define([
        '../Core/ExtentOutlineGeometry',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        ExtentOutlineGeometry,
        Ellipsoid,
        Extent,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function createExtentOutlineGeometry(parameters, transferableObjects) {
        var extentGeometry = parameters.geometry;
        extentGeometry._ellipsoid = Ellipsoid.clone(extentGeometry._ellipsoid);
        extentGeometry._extent = Extent.clone(extentGeometry._extent);

        var geometry = ExtentOutlineGeometry.createGeometry(extentGeometry);
        PrimitivePipeline.transferGeometry(geometry, transferableObjects);

        return {
            geometry : geometry,
            index : parameters.index
        };
    }

    return createTaskProcessorWorker(createExtentOutlineGeometry);
});
