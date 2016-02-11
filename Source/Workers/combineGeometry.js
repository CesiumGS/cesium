/*global define*/
define([
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        PrimitivePipeline,
        createTaskProcessorWorker) {
    'use strict';

    function combineGeometry(packedParameters, transferableObjects) {
        var parameters = PrimitivePipeline.unpackCombineGeometryParameters(packedParameters);
        var results = PrimitivePipeline.combineGeometry(parameters);
        return PrimitivePipeline.packCombineGeometryResults(results, transferableObjects);
    }

    return createTaskProcessorWorker(combineGeometry);
});
