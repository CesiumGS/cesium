/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Core/GeographicProjection',
        '../Core/HeightmapTessellator',
        '../Core/Occluder',
        './createTaskProcessorWorker'
    ], function(
        BoundingSphere,
        Cartesian3,
        Ellipsoid,
        Extent,
        GeographicProjection,
        HeightmapTessellator,
        Occluder,
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

        parameters.ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
        parameters.extent = Extent.clone(parameters.extent);

        parameters.vertices = vertices;
        parameters.includeHeightsInVertexData = true;
        parameters.generateTextureCoordinates = true;
        parameters.interleaveTextureCoordinates = true;

        var statistics = HeightmapTessellator.computeVertices(parameters);
        var boundingSphere3D = BoundingSphere.fromVertices(vertices, parameters.relativeToCenter, numberOfAttributes);

        var extent = parameters.extent;
        var ellipsoid = parameters.ellipsoid;

        // TODO: we need to take the heights into account when computing the occludee point.
        var occludeePointInScaledSpace = Occluder.computeOccludeePointFromExtent(extent, ellipsoid);
        if (typeof occludeePointInScaledSpace !== 'undefined') {
            Cartesian3.multiplyComponents(occludeePointInScaledSpace, ellipsoid.getOneOverRadii(), occludeePointInScaledSpace);
        }

        return {
            vertices : vertices.buffer,
            numberOfAttributes : numberOfAttributes,
            minHeight : statistics.minHeight,
            maxHeight : statistics.maxHeight,
            gridWidth : arrayWidth,
            gridHeight : arrayHeight,
            boundingSphere3D : boundingSphere3D,
            occludeePointInScaledSpace : occludeePointInScaledSpace
        };
    }

    return createTaskProcessorWorker(createVerticesFromHeightmap);
});
