/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Ellipsoid',
        '../Core/EllipsoidalOccluder',
        '../Core/Extent',
        '../Core/FeatureDetection',
        '../Core/HeightmapTessellator',
        './createTaskProcessorWorker'
    ], function(
        BoundingSphere,
        Ellipsoid,
        EllipsoidalOccluder,
        Extent,
        FeatureDetection,
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

        if (FeatureDetection.supportsTransferringArrayBuffers()) {
            transferableObjects.push(vertices.buffer);
        }

        parameters.ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
        parameters.extent = Extent.clone(parameters.extent);

        parameters.vertices = vertices;

        var statistics = HeightmapTessellator.computeVertices(parameters);
        var boundingSphere3D = BoundingSphere.fromVertices(vertices, parameters.relativeToCenter, numberOfAttributes);

        var ellipsoid = parameters.ellipsoid;
        var occluder = new EllipsoidalOccluder(ellipsoid);
        var occludeePointInScaledSpace = occluder.computeHorizonCullingPointFromVertices(parameters.relativeToCenter, vertices, numberOfAttributes, parameters.relativeToCenter);

        return {
            vertices : vertices.buffer,
            numberOfAttributes : numberOfAttributes,
            minimumHeight : statistics.minimumHeight,
            maximumHeight : statistics.maximumHeight,
            gridWidth : arrayWidth,
            gridHeight : arrayHeight,
            boundingSphere3D : boundingSphere3D,
            occludeePointInScaledSpace : occludeePointInScaledSpace
        };
    }

    return createTaskProcessorWorker(createVerticesFromHeightmap);
});
