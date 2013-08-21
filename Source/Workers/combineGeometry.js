/*global define*/
define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/GeographicProjection',
        '../Core/Matrix4',
        '../Core/WebMercatorProjection',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        defined,
        Ellipsoid,
        GeographicProjection,
        Matrix4,
        WebMercatorProjection,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function combineGeometry(parameters, transferableObjects) {
        parameters.ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
        parameters.projection = (parameters.isGeographic) ? new GeographicProjection(parameters.ellipsoid) : new WebMercatorProjection(parameters.ellipsoid);
        parameters.modelMatrix = Matrix4.clone(parameters.modelMatrix);

        PrimitivePipeline.receiveInstances(parameters.instances);
        var result = PrimitivePipeline.combineGeometry(parameters);
        PrimitivePipeline.transferGeometries(result.geometries, transferableObjects);
        PrimitivePipeline.transferPerInstanceAttributes(result.vaAttributes, transferableObjects);

        return result;
    }

    return createTaskProcessorWorker(combineGeometry);
});
