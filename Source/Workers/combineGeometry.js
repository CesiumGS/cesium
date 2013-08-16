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

        var result = PrimitivePipeline.combineGeometry(parameters);

        var geometries = result.geometries;
        var length = geometries.length;
        for (var i = 0; i < length; ++i) {
            var geometry = geometries[i];
            var attributes = geometry.attributes;
            for (var name in attributes) {
                if (attributes.hasOwnProperty(name) &&
                        defined(attributes[name]) &&
                        defined(attributes[name].values) &&
                        transferableObjects.indexOf(attributes[name].values.buffer) < 0) {
                    transferableObjects.push(attributes[name].values.buffer);
                }
            }

            if (defined(geometry.indices)) {
                transferableObjects.push(geometry.indices.buffer);
            }
        }

        var perInstanceAttributes = result.vaAttributes;
        length = perInstanceAttributes.length;
        for (i = 0; i < length; ++i) {
            var vaAttributes = perInstanceAttributes[i];
            var vaLength = vaAttributes.length;
            for (var j = 0; j < vaLength; ++j) {
                transferableObjects.push(vaAttributes[j].values.buffer);
            }
        }

        return result;
    }

    return createTaskProcessorWorker(combineGeometry);
});
