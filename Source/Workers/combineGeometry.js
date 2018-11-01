define([
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        PrimitivePipeline,
        createTaskProcessorWorker) {
    'use strict';

    function combineGeometry(packedParameters, transferableObjects) {
        return PrimitivePipeline.unpackCombineGeometryParameters(packedParameters)
            .then(function(parameters) {
                var results = PrimitivePipeline.combineGeometry(parameters);
                return PrimitivePipeline.packCombineGeometryResults(results, transferableObjects);
            });
    }

    return createTaskProcessorWorker(combineGeometry);
});
