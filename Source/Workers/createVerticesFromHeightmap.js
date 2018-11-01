define([
        '../Core/Ellipsoid',
        '../Core/HeightmapTessellator',
        '../Core/Rectangle',
        '../Core/SerializedMapProjection',
        './createTaskProcessorWorker'
    ], function(
        Ellipsoid,
        HeightmapTessellator,
        Rectangle,
        SerializedMapProjection,
        createTaskProcessorWorker) {
    'use strict';

    function createVerticesFromHeightmap(parameters, transferableObjects) {
        var arrayWidth = parameters.width;
        var arrayHeight = parameters.height;

        if (parameters.skirtHeight > 0.0) {
            arrayWidth += 2;
            arrayHeight += 2;
        }

        parameters.ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
        parameters.rectangle = Rectangle.clone(parameters.rectangle);

        return SerializedMapProjection.deserialize(parameters.serializedMapProjection)
            .then(function(mapProjection) {
                var statistics = HeightmapTessellator.computeVertices(parameters, mapProjection);
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
            });
    }

    return createTaskProcessorWorker(createVerticesFromHeightmap);
});
