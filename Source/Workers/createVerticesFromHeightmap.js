/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Ellipsoid',
        '../Core/EllipsoidalOccluder',
        '../Core/HeightmapTessellator',
        '../Core/Math',
        '../Core/OrientedBoundingBox',
        '../Core/Rectangle',
        './createTaskProcessorWorker'
    ], function(
        BoundingSphere,
        Ellipsoid,
        EllipsoidalOccluder,
        HeightmapTessellator,
        CesiumMath,
        OrientedBoundingBox,
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

        var numberOfAttributes = statistics.encoding.getStride();

        var boundingSphere3D = BoundingSphere.fromVertices(vertices, parameters.relativeToCenter, numberOfAttributes);
        var orientedBoundingBox;
        if (parameters.rectangle.width < CesiumMath.PI_OVER_TWO + CesiumMath.EPSILON5) {
            // Here, rectangle.width < pi/2, and rectangle.height < pi
            // (though it would still work with rectangle.width up to pi)
            orientedBoundingBox = OrientedBoundingBox.fromRectangle(parameters.rectangle, statistics.minimumHeight, statistics.maximumHeight, parameters.ellipsoid);
        }

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
            orientedBoundingBox : orientedBoundingBox,
            occludeePointInScaledSpace : occludeePointInScaledSpace,
            encoding : statistics.encoding
        };
    }

    return createTaskProcessorWorker(createVerticesFromHeightmap);
});
