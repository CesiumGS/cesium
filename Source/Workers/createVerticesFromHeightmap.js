/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/HeightmapTessellator',
        './createTaskProcessorWorker'
    ], function(
        BoundingSphere,
        HeightmapTessellator,
        createTaskProcessorWorker) {
    "use strict";

    function createVerticesFromHeightmap(parameters, transferableObjects) {
        var numberOfAttributes = 6;

        var arrayWidth = parameters.width;
        var arrayHeight = parameters.height;

        if (parameters.skirtHeight > 0.0) {
            arrayWidth += 2;
            arrayHeight += 2;
        }

        var vertices = new Float32Array(arrayWidth * arrayHeight * numberOfAttributes);
        transferableObjects.push(vertices.buffer);

        parameters.vertices = vertices;
        parameters.includeHeightsInVertexData = true;
        parameters.generateTextureCoordinates = true;
        parameters.interleaveTextureCoordinates = true;

        var statistics = HeightmapTessellator.computeVertices(parameters);
        var boundingSphere = BoundingSphere.fromVertices(vertices, parameters.relativeToCenter, numberOfAttributes);

        return {
            vertices : vertices.buffer,
            statistics : statistics,
            numberOfAttributes : numberOfAttributes,
            boundingSphere3D : boundingSphere
        };
    }

    return createTaskProcessorWorker(createVerticesFromHeightmap);
});
