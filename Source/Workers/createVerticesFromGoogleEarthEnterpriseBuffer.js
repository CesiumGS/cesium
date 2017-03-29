/*global define*/
define([
    '../Core/AxisAlignedBoundingBox',
    '../Core/BoundingSphere',
    '../Core/Cartesian2',
    '../Core/Cartesian3',
    '../Core/Cartographic',
    '../Core/defined',
    '../Core/Ellipsoid',
    '../Core/EllipsoidalOccluder',
    '../Core/Math',
    '../Core/Matrix4',
    '../Core/OrientedBoundingBox',
    '../Core/Rectangle',
    '../Core/TerrainEncoding',
    '../Core/Transforms',
    './createTaskProcessorWorker'
], function(
    AxisAlignedBoundingBox,
    BoundingSphere,
    Cartesian2,
    Cartesian3,
    Cartographic,
    defined,
    Ellipsoid,
    EllipsoidalOccluder,
    CesiumMath,
    Matrix4,
    OrientedBoundingBox,
    Rectangle,
    TerrainEncoding,
    Transforms,
    createTaskProcessorWorker) {
    'use strict';

    var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
    var sizeOfInt32 = Int32Array.BYTES_PER_ELEMENT;
    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
    var sizeOfFloat = Float32Array.BYTES_PER_ELEMENT;
    var sizeOfDouble = Float64Array.BYTES_PER_ELEMENT;

    function createVerticesFromGoogleEarthEnterpriseBuffer(parameters, transferableObjects) {
        parameters.ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
        parameters.rectangle = Rectangle.clone(parameters.rectangle);

        var statistics = processBuffer(parameters.buffer, parameters.relativeToCenter, parameters.ellipsoid,
            parameters.rectangle, parameters.nativeRectangle, parameters.exaggeration);
        var vertices = statistics.vertices;
        transferableObjects.push(vertices.buffer);
        var indices = statistics.indices;
        transferableObjects.push(indices.buffer);

        return {
            vertices : vertices.buffer,
            indices : indices.buffer,
            numberOfAttributes : statistics.encoding.getStride(),
            minimumHeight : statistics.minimumHeight,
            maximumHeight : statistics.maximumHeight,
            boundingSphere3D : statistics.boundingSphere3D,
            orientedBoundingBox : statistics.orientedBoundingBox,
            occludeePointInScaledSpace : statistics.occludeePointInScaledSpace,
            encoding : statistics.encoding
        };
    }

    var negativeElevationFactor = -Math.pow(2, 32);
    var negativeElevationThreshold = CesiumMath.EPSILON12;
    var scratchCartographic = new Cartographic();
    var scratchCartesian = new Cartesian3();
    var minimumScratch = new Cartesian3();
    var maximumScratch = new Cartesian3();
    var matrix4Scratch = new Matrix4();
    function processBuffer(buffer, relativeToCenter, ellipsoid, rectangle, nativeRectangle, exaggeration) {
        debugger;
        var geographicWest;
        var geographicSouth;
        var geographicEast;
        var geographicNorth;

        if (!defined(rectangle)) {
            geographicWest = CesiumMath.toRadians(nativeRectangle.west);
            geographicSouth = CesiumMath.toRadians(nativeRectangle.south);
            geographicEast = CesiumMath.toRadians(nativeRectangle.east);
            geographicNorth = CesiumMath.toRadians(nativeRectangle.north);
        } else {
            geographicWest = rectangle.west;
            geographicSouth = rectangle.south;
            geographicEast = rectangle.east;
            geographicNorth = rectangle.north;
        }

        var fromENU = Transforms.eastNorthUpToFixedFrame(relativeToCenter, ellipsoid);
        var toENU = Matrix4.inverseTransformation(fromENU, matrix4Scratch);

        var dv = new DataView(buffer);

        var minHeight = Number.POSITIVE_INFINITY;
        var maxHeight = Number.NEGATIVE_INFINITY;

        var minimum = minimumScratch;
        minimum.x = Number.POSITIVE_INFINITY;
        minimum.y = Number.POSITIVE_INFINITY;
        minimum.z = Number.POSITIVE_INFINITY;

        var maximum = maximumScratch;
        maximum.x = Number.NEGATIVE_INFINITY;
        maximum.y = Number.NEGATIVE_INFINITY;
        maximum.z = Number.NEGATIVE_INFINITY;

        // Compute sizes
        var offset = 0;
        var size = 0;
        var indicesSize = 0;
        for (var quad = 0; quad < 4; ++quad) {
            var quadSize = dv.getUint32(offset, true);

            var o = offset;
            o += sizeOfUint32 + 4*sizeOfDouble; // size + originX + originY + stepX + stepY

            var c = dv.getInt32(o, true); // Read point count
            o += sizeOfInt32;
            size += c;

            c = dv.getInt32(o, true); // Read index count
            indicesSize += c*3;

            offset += quadSize + sizeOfUint32; // Jump to next quad
        }

        // Create arrays
        var positions = new Array(size);
        var uvs = new Array(size);
        var heights = new Array(size);
        var indices = new Array(indicesSize);

        // Each tile is split into 4 parts
        var pointOffset = 0;
        var indicesOffset = 0;
        offset = 0;
        for (quad = 0; quad < 4; ++quad) {
            //var quadSize = dv.getUint32(offset, true);
            offset += sizeOfUint32;

            var originX = CesiumMath.toRadians(dv.getFloat64(offset, true) * 180.0);
            offset += sizeOfDouble;

            var originY = CesiumMath.toRadians(dv.getFloat64(offset, true) * 180.0);
            offset += sizeOfDouble;

            var stepX = CesiumMath.toRadians(dv.getFloat64(offset, true) * 180.0);
            offset += sizeOfDouble;

            var stepY = CesiumMath.toRadians(dv.getFloat64(offset, true) * 180.0);
            offset += sizeOfDouble;

            var numPoints = dv.getInt32(offset, true);
            offset += sizeOfInt32;

            var numFaces = dv.getInt32(offset, true);
            offset += sizeOfInt32;

            //var level = dv.getInt32(offset, true);
            offset += sizeOfInt32;

            var index = pointOffset;
            for (var i = 0; i < numPoints; ++i, ++index) {
                var longitude = originX + dv.getUint8(offset++) * stepX;
                scratchCartographic.longitude = longitude;
                var latitude = originY + dv.getUint8(offset++) * stepY;
                scratchCartographic.latitude = latitude;
                // Height is stored in units of (1/EarthRadius) or (1/6371010.0)
                var height = dv.getFloat32(offset, true) * 6371010.0;
                offset += sizeOfFloat;

                // In order to support old clients, negative altitude values are stored as
                // height/-2^32. Old clients see the value as really close to 0 but new clients multiply
                // by -2^32 to get the real negative altitude value.
                if (height < negativeElevationThreshold) {
                    height *= negativeElevationFactor;
                }
                height *= exaggeration;

                scratchCartographic.height = height;

                minHeight = Math.min(height, minHeight);
                maxHeight = Math.max(height, maxHeight);
                heights[index] = height;

                var pos = ellipsoid.cartographicToCartesian(scratchCartographic);
                positions[index] = pos;

                Matrix4.multiplyByPoint(toENU, pos, scratchCartesian);

                Cartesian3.minimumByComponent(scratchCartesian, minimum, minimum);
                Cartesian3.maximumByComponent(scratchCartesian, maximum, maximum);

                var u = (longitude - geographicWest) / (geographicEast - geographicWest);
                u = CesiumMath.clamp(u, 0.0, 1.0);
                var v = (latitude - geographicSouth) / (geographicNorth - geographicSouth);
                v = CesiumMath.clamp(v, 0.0, 1.0);

                uvs[index] = new Cartesian2(u, v);
            }

            index = indicesOffset;
            var facesElementCount = numFaces * 3;
            for (i = 0; i < facesElementCount; ++i, ++index) {
                indices[index] = pointOffset + dv.getUint16(offset, true);
                offset += sizeOfUint16;
            }

            pointOffset += numPoints;
            indicesOffset += facesElementCount;
        }

        var boundingSphere3D = BoundingSphere.fromPoints(positions);
        var orientedBoundingBox;
        if (defined(rectangle) && rectangle.width < CesiumMath.PI_OVER_TWO + CesiumMath.EPSILON5) {
            // Here, rectangle.width < pi/2, and rectangle.height < pi
            // (though it would still work with rectangle.width up to pi)
            orientedBoundingBox = OrientedBoundingBox.fromRectangle(rectangle, minHeight, maxHeight, ellipsoid);
        }

        var occluder = new EllipsoidalOccluder(ellipsoid);
        var occludeePointInScaledSpace = occluder.computeHorizonCullingPoint(relativeToCenter, positions);

        var aaBox = new AxisAlignedBoundingBox(minimum, maximum, relativeToCenter);
        var encoding = new TerrainEncoding(aaBox, minHeight, maxHeight, fromENU, false, false);
        var vertices = new Float32Array(size * encoding.getStride());

        var bufferIndex = 0;
        for (var j = 0; j < size; ++j) {
            bufferIndex = encoding.encode(vertices, bufferIndex, positions[j], uvs[j], heights[j]);
        }

        return {
            vertices : vertices,
            indices : Uint16Array.from(indices),
            maximumHeight : maxHeight,
            minimumHeight : minHeight,
            encoding : encoding,
            boundingSphere3D : boundingSphere3D,
            orientedBoundingBox : orientedBoundingBox,
            occludeePointInScaledSpace : occludeePointInScaledSpace
        };
    }

    return createTaskProcessorWorker(createVerticesFromGoogleEarthEnterpriseBuffer);
});
