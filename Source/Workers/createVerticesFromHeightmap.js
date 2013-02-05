/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Ellipsoid',
        '../Core/Extent',
        '../Core/GeographicProjection',
        '../Core/HeightmapTessellator',
        './createTaskProcessorWorker'
    ], function(
        BoundingSphere,
        Cartesian3,
        Ellipsoid,
        Extent,
        GeographicProjection,
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

        parameters.ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
        parameters.extent = Extent.clone(parameters.extent);

        parameters.vertices = vertices;
        parameters.includeHeightsInVertexData = true;
        parameters.generateTextureCoordinates = true;
        parameters.interleaveTextureCoordinates = true;

        var statistics = HeightmapTessellator.computeVertices(parameters);
        var boundingSphere3D = BoundingSphere.fromVertices(vertices, parameters.relativeToCenter, numberOfAttributes);

        var boundingSphere2DGeographic = BoundingSphere.fromExtentWithHeights2D(parameters.extent, new GeographicProjection(), statistics.minHeight, statistics.maxHeight);
        boundingSphere2DGeographic.center = new Cartesian3(boundingSphere2DGeographic.center.z, boundingSphere2DGeographic.center.x, boundingSphere2DGeographic.center.y);

        return {
            vertices : vertices.buffer,
            statistics : statistics,
            numberOfAttributes : numberOfAttributes,
            boundingSphere3D : boundingSphere3D,
            boundingSphere2DGeographic : boundingSphere2DGeographic
        };
    }

    return createTaskProcessorWorker(createVerticesFromHeightmap);
});
