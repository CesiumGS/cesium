/*global define*/
define([
        '../Core/HeightmapTessellator',
        './createTaskProcessorWorker'
    ], function(
        HeightmapTessellator,
        createTaskProcessorWorker) {
    "use strict";

    function createVerticesFromHeightmap(parameters, transferableObjects) {
        var arrayWidth = parameters.width;
        var arrayHeight = parameters.height;

        if (parameters.skirtHeight > 0.0) {
            arrayWidth += 2;
            arrayHeight += 2;
        }

        var vertices = new Float32Array(arrayWidth * arrayHeight * 6);
        transferableObjects.push(vertices.buffer);

        parameters.vertices = vertices;
        parameters.includeHeightsInVertexData = true;
        parameters.generateTextureCoordinates = true;
        parameters.interleaveTextureCoordinates = true;

        var statistics = HeightmapTessellator.computeVertices(parameters);

        return {
            vertices : vertices,
            statistics : statistics
        };
    }

    return createTaskProcessorWorker(createVerticesFromHeightmap);
});
