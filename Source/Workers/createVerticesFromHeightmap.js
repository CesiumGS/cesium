/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Core/HeightmapTessellator',
        '../Core/Occluder',
        './createTaskProcessorWorker'
    ], function(
        BoundingSphere,
        Cartesian3,
        Ellipsoid,
        Extent,
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

        var statistics = HeightmapTessellator.computeVertices(parameters);
        var boundingSphere3D = BoundingSphere.fromVertices(vertices, parameters.relativeToCenter, numberOfAttributes);

        var extent = parameters.extent;
        var ellipsoid = parameters.ellipsoid;

        // We should really take the heights into account when computing the occludee point.
        // And we should compute the occludee point using something less over-conservative than
        // the ellipsoid-min-radius bounding sphere.  But these two wrongs cancel each other out
        // enough that I've never seen artifacts from it.  Fixing this up (and perhaps culling
        // more tiles as a result) is on the roadmap.
        var occludeePointInScaledSpace = Occluder.computeOccludeePointFromExtent(extent, ellipsoid);
        if (typeof occludeePointInScaledSpace !== 'undefined') {
            Cartesian3.multiplyComponents(occludeePointInScaledSpace, ellipsoid.getOneOverRadii(), occludeePointInScaledSpace);
        }

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
