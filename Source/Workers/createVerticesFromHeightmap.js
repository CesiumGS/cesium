/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Ellipsoid',
        '../Core/EllipsoidalOccluder',
        '../Core/Extent',
        '../Core/HeightmapTessellator',
        '../Core/Occluder',
        './createTaskProcessorWorker'
    ], function(
        BoundingSphere,
        Cartesian3,
        Ellipsoid,
        EllipsoidalOccluder,
        Extent,
        HeightmapTessellator,
        Occluder,
        createTaskProcessorWorker) {
    "use strict";

    var subsampledExtentScratch = new Cartesian3();

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

        var ellipsoid = parameters.ellipsoid;

        // For horizon culling, use an ellipsoid that is 1000.0 meters smaller than WGS84 in each direction,
        // and don't take heights into account.  This is clearly wrong, but is close enough to avoid
        // major artifacts.  Fixing it is on the roadmap.  A really good solution probably involves
        // some metadata computed during terrain preprocessing.
        var newRadii = ellipsoid.getRadii().subtract(new Cartesian3(1000.0, 1000.0, 1000.0));
        var occluder = new EllipsoidalOccluder(new Ellipsoid(newRadii.x, newRadii.y, newRadii.z));
        var subsampledExtent = parameters.extent.subsample(ellipsoid, subsampledExtentScratch);
        var occludeePointInScaledSpace = occluder.computeHorizonCullingPoint(boundingSphere3D.center, subsampledExtent);

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
