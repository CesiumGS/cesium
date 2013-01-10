/*global define*/
define([
        '../Core/ExtentTessellator',
        './createTaskProcessorWorker'
    ], function(
        ExtentTessellator,
        createTaskProcessorWorker) {
    "use strict";

    function createVerticesFromExtent(parameters, transferableObjects) {
        var vertices = new Float32Array(parameters.width * parameters.height * 5);
        transferableObjects.push(vertices.buffer);

        parameters.vertices = vertices;
        parameters.generateTextureCoordinates = true;
        parameters.interleaveTextureCoordinates = true;

        ExtentTessellator.computeVertices(parameters);

        return vertices.buffer;
    }

    return createTaskProcessorWorker(createVerticesFromExtent);
});