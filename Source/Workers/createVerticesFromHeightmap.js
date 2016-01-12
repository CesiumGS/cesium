/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/HeightmapTessellator',
        '../Core/Rectangle',
        './createTaskProcessorWorker'
    ], function(
        Ellipsoid,
        HeightmapTessellator,
        Rectangle,
        createTaskProcessorWorker) {
    "use strict";

    function createVerticesFromHeightmap(parameters, transferableObjects) {
        var arrayWidth = parameters.width;
        var arrayHeight = parameters.height;

        if (parameters.skirtHeight > 0.0) {
            arrayWidth += 2;
            arrayHeight += 2;
        }

        parameters.ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
        parameters.rectangle = Rectangle.clone(parameters.rectangle);

        var statistics = HeightmapTessellator.computeVertices(parameters);
        var vertices = statistics.vertices;
        transferableObjects.push(vertices.buffer);

        return {
            vertices : vertices.buffer,
            numberOfAttributes : statistics.encoding.getStride(),
            minimumHeight : statistics.minimumHeight,
            maximumHeight : statistics.maximumHeight,
            gridWidth : arrayWidth,
            gridHeight : arrayHeight,
            boundingSphere3D : statistics.boundingSphere3D,
            orientedBoundingBox : statistics.orientedBoundingBox,
            occludeePointInScaledSpace : statistics.occludeePointInScaledSpace,
            encoding : statistics.encoding
        };
    }

    return createTaskProcessorWorker(createVerticesFromHeightmap);
});
