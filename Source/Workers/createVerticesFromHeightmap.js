define([
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/HeightmapEncoding',
        '../Core/HeightmapTessellator',
        '../Core/Rectangle',
        '../Core/RuntimeError',
        '../ThirdParty/LercDecode',
        './createTaskProcessorWorker'
    ], function(
        defined,
        Ellipsoid,
        HeightmapEncoding,
        HeightmapTessellator,
        Rectangle,
        RuntimeError,
        Lerc,
        createTaskProcessorWorker) {
    'use strict';

    function createVerticesFromHeightmap(parameters, transferableObjects) {
        // LERC encoded buffers must be decoded, then we can process them like normal
        if (parameters.encoding === HeightmapEncoding.LERC) {
            var result;
            try {
                result = Lerc.decode(parameters.heightmap);
            } catch (error) {
                throw new RuntimeError(error);
            }

            var lercStatistics = result.statistics[0];
            if (lercStatistics.minValue === Number.MAX_VALUE) {
                throw new RuntimeError('Invalid tile data');
            }

            parameters.heightmap = result.pixels[0];
            parameters.width = result.width;
            parameters.height = result.height;
        }

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
            encoding : statistics.encoding,
            westIndicesSouthToNorth : statistics.westIndicesSouthToNorth,
            southIndicesEastToWest : statistics.southIndicesEastToWest,
            eastIndicesNorthToSouth : statistics.eastIndicesNorthToSouth,
            northIndicesWestToEast : statistics.northIndicesWestToEast
        };
    }

    return createTaskProcessorWorker(createVerticesFromHeightmap);
});
