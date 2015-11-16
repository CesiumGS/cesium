/*global define*/
define([
        '../Core/AttributeCompression',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/EllipsoidalOccluder',
        '../Core/IndexDatatype',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/OrientedBoundingBox',
        '../Core/Transforms',
        './createTaskProcessorWorker'
    ], function(
        AttributeCompression,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        defined,
        Ellipsoid,
        EllipsoidalOccluder,
        IndexDatatype,
        CesiumMath,
        Matrix3,
        Matrix4,
        OrientedBoundingBox,
        Transforms,
        createTaskProcessorWorker) {
    "use strict";

    var Encoding = {
        BITS8 : 0,
        BITS12 : 1,
        BITS16 : 2,
        NONE : 3
    };

    var maxShort = 32767;

    var cartesian3Scratch = new Cartesian3();
    var cartographicScratch = new Cartographic();
    var toPack = new Cartesian2();
    var scratchNormal = new Cartesian3();
    var scratchToENU = new Matrix4();
    var scratchFromENU = new Matrix4();

    function createVerticesFromQuantizedTerrainMesh(parameters, transferableObjects) {
        var quantizedVertices = parameters.quantizedVertices;
        var quantizedVertexCount = quantizedVertices.length / 3;
        var octEncodedNormals = parameters.octEncodedNormals;
        var edgeVertexCount = parameters.westIndices.length + parameters.eastIndices.length +
                              parameters.southIndices.length + parameters.northIndices.length;

        var rectangle = parameters.rectangle;
        var west = rectangle.west;
        var south = rectangle.south;
        var east = rectangle.east;
        var north = rectangle.north;

        var ellipsoid = Ellipsoid.clone(parameters.ellipsoid);

        var exaggeration = parameters.exaggeration;
        var minimumHeight = parameters.minimumHeight * exaggeration;
        var maximumHeight = parameters.maximumHeight * exaggeration;

        var center = parameters.relativeToCenter;
        var fromENU = Transforms.eastNorthUpToFixedFrame(center, ellipsoid);
        var toENU = Matrix4.inverseTransformation(fromENU, new Matrix4());

        var uBuffer = quantizedVertices.subarray(0, quantizedVertexCount);
        var vBuffer = quantizedVertices.subarray(quantizedVertexCount, 2 * quantizedVertexCount);
        var heightBuffer = quantizedVertices.subarray(quantizedVertexCount * 2, 3 * quantizedVertexCount);
        var hasVertexNormals = defined(octEncodedNormals);

        var uvs = new Array(quantizedVertexCount);
        var heights = new Array(quantizedVertexCount);
        var positions = new Array(quantizedVertexCount);

        var xMin = Number.POSITIVE_INFINITY;
        var yMin = Number.POSITIVE_INFINITY;
        var zMin = Number.POSITIVE_INFINITY;

        var xMax = Number.NEGATIVE_INFINITY;
        var yMax = Number.NEGATIVE_INFINITY;
        var zMax = Number.NEGATIVE_INFINITY;

        for (var i = 0; i < quantizedVertexCount; ++i) {
            var u = uBuffer[i] / maxShort;
            var v = vBuffer[i] / maxShort;
            var height = CesiumMath.lerp(minimumHeight, maximumHeight, heightBuffer[i] / maxShort);

            cartographicScratch.longitude = CesiumMath.lerp(west, east, u);
            cartographicScratch.latitude = CesiumMath.lerp(south, north, v);
            cartographicScratch.height = height;

            var position = ellipsoid.cartographicToCartesian(cartographicScratch);

            uvs[i] = new Cartesian2(u, v);
            heights[i] = height;
            positions[i] = position;

            Matrix4.multiplyByPoint(toENU, position, cartesian3Scratch);

            xMin = Math.min(xMin, cartesian3Scratch.x);
            yMin = Math.min(yMin, cartesian3Scratch.y);
            zMin = Math.min(zMin, cartesian3Scratch.z);

            xMax = Math.max(xMax, cartesian3Scratch.x);
            yMax = Math.max(yMax, cartesian3Scratch.y);
            zMax = Math.max(zMax, cartesian3Scratch.z);
        }

        var xDim = xMax - xMin;
        var yDim = yMax - yMin;
        var zDim = zMax - zMin;
        var hDim = maximumHeight - minimumHeight;
        var maxDim = Math.max(xDim, yDim, zDim, hDim);

        var encodeMode;
        var vertexStride;

         if (maxDim < Math.pow(2.0, 16.0) - 1.0) {
             encodeMode = Encoding.BITS16;
             //vertexStride = 5;
             vertexStride = hasVertexNormals ? 7 : 6;
         } /*else if (maxDim < Math.pow(2.0, 12.0) - 1.0) {
             encodeMode = Encodeing.BITS12;
             vertexStride = hasVertexNormals ? 5 : 4;
         } else if (maxDim < Math.pow(2.0, 8.0) - 1.0) {
             encodeMode = Encoding.BITS8;
             vertexStride = 4;
         } */ else {
             encodeMode = Encoding.NONE;
             vertexStride = hasVertexNormals ? 7 : 6;
        }

        var size = quantizedVertexCount * vertexStride + edgeVertexCount * vertexStride;
        var vertexBuffer = new Float32Array(size);

        for (var i = 0, bufferIndex = 0, n = 0; i < quantizedVertexCount; ++i, bufferIndex += vertexStride, n += 2) {
            var u = uvs[i].x;
            var v = uvs[i].y;
            var height = heights[i];

            if (hasVertexNormals) {
                toPack.x = octEncodedNormals[n];
                toPack.y = octEncodedNormals[n + 1];

                if (exaggeration !== 1.0) {
                    var normal = AttributeCompression.octDecode(toPack.x, toPack.y, scratchNormal);
                    var fromENU = Transforms.eastNorthUpToFixedFrame(cartesian3Scratch, ellipsoid, scratchFromENU);
                    var toENU = Matrix4.inverseTransformation(fromENU, scratchToENU);

                    Matrix4.multiplyByPointAsVector(toENU, normal, normal);
                    normal.z *= exaggeration;
                    Cartesian3.normalize(normal, normal);

                    Matrix4.multiplyByPointAsVector(fromENU, normal, normal);
                    Cartesian3.normalize(normal, normal);

                    AttributeCompression.octEncode(normal, toPack);
                }
            }

            if (encodeMode !== Encoding.NONE) {
                Matrix4.multiplyByPoint(toENU, positions[i], cartesian3Scratch);

                var x = (cartesian3Scratch.x - xMin) / xDim;
                var y = (cartesian3Scratch.y - yMin) / yDim;
                var z = (cartesian3Scratch.z - zMin) / zDim;
                var h = (height - minimumHeight) / hDim;

                // 16 bits
                var SHIFT_LEFT_16 = Math.pow(2.0, 16.0);
                var SHIFT_LEFT_8 = Math.pow(2.0, 8.0);

                var compressed0 = Math.floor(x * SHIFT_LEFT_16);
                var compressed1 = Math.floor(y * SHIFT_LEFT_16);

                var temp  = z * SHIFT_LEFT_8;
                var upperZ = Math.floor(temp);
                var lowerZ = Math.floor((temp - upperZ) * SHIFT_LEFT_8);

                compressed0 += upperZ * SHIFT_LEFT_16;
                compressed1 += lowerZ * SHIFT_LEFT_16;

                // write uncompressed until shader decompression

                Cartesian3.subtract(positions[i], center, cartesian3Scratch);

                vertexBuffer[bufferIndex]     = cartesian3Scratch.x;
                vertexBuffer[bufferIndex + 1] = cartesian3Scratch.y;
                vertexBuffer[bufferIndex + 2] = cartesian3Scratch.z;
                vertexBuffer[bufferIndex + 3] = height;
                vertexBuffer[bufferIndex + 4] = u;
                vertexBuffer[bufferIndex + 5] = v;
                if (hasVertexNormals) {
                    vertexBuffer[bufferIndex + 6] = AttributeCompression.octPackFloat(toPack);
                }
            } else {
                Cartesian3.subtract(positions[i], center, cartesian3Scratch);

                vertexBuffer[bufferIndex]     = cartesian3Scratch.x;
                vertexBuffer[bufferIndex + 1] = cartesian3Scratch.y;
                vertexBuffer[bufferIndex + 2] = cartesian3Scratch.z;
                vertexBuffer[bufferIndex + 3] = height;
                vertexBuffer[bufferIndex + 4] = u;
                vertexBuffer[bufferIndex + 5] = v;
                if (hasVertexNormals) {
                    vertexBuffer[bufferIndex + 6] = AttributeCompression.octPackFloat(toPack);
                }
            }
        }

        var occludeePointInScaledSpace;
        var orientedBoundingBox;
        var boundingSphere;

        var orientedBoundingBox = parameters.orientedBoundingBox;
        if (exaggeration !== 1.0)) {
            // Bounding volumes and horizon culling point need to be recomputed since the tile payload assumes no exaggeration.
            boundingSphere = BoundingSphere.fromVertices(vertexBuffer, center, vertexStride);
            orientedBoundingBox = OrientedBoundingBox.fromRectangle(rectangle, minimumHeight, maximumHeight, ellipsoid);

            var occluder = new EllipsoidalOccluder(ellipsoid);
            occludeePointInScaledSpace = occluder.computeHorizonCullingPointFromVertices(center, vertexBuffer, vertexStride);
        }

        var edgeTriangleCount = Math.max(0, (edgeVertexCount - 4) * 2);
        var indexBufferLength = parameters.indices.length + edgeTriangleCount * 3;
        var indexBuffer = IndexDatatype.createTypedArray(quantizedVertexCount + edgeVertexCount, indexBufferLength);
        indexBuffer.set(parameters.indices, 0);

        // Add skirts.
        var vertexBufferIndex = quantizedVertexCount * vertexStride;
        var indexBufferIndex = parameters.indices.length;
        indexBufferIndex = addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, parameters.westIndices, center, ellipsoid, rectangle, parameters.westSkirtHeight, true, hasVertexNormals);
        vertexBufferIndex += parameters.westIndices.length * vertexStride;
        indexBufferIndex = addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, parameters.southIndices, center, ellipsoid, rectangle, parameters.southSkirtHeight, false, hasVertexNormals);
        vertexBufferIndex += parameters.southIndices.length * vertexStride;
        indexBufferIndex = addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, parameters.eastIndices, center, ellipsoid, rectangle, parameters.eastSkirtHeight, false, hasVertexNormals);
        vertexBufferIndex += parameters.eastIndices.length * vertexStride;
        addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, parameters.northIndices, center, ellipsoid, rectangle, parameters.northSkirtHeight, true, hasVertexNormals);

        transferableObjects.push(vertexBuffer.buffer, indexBuffer.buffer);

        return {
            vertices : vertexBuffer.buffer,
            indices : indexBuffer.buffer,
            vertexStride : vertexStride,
            center : center,
            minimumHeight : minimumHeight,
            maximumHeight : maximumHeight,
            boundingSphere : boundingSphere,
            orientedBoundingBox : orientedBoundingBox,
            occludeePointInScaledSpace : occludeePointInScaledSpace
        };
    }

    function addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, edgeVertices, center, ellipsoid, rectangle, skirtLength, isWestOrNorthEdge, hasVertexNormals) {
        var start, end, increment;
        var vertexStride = 6;
        if (hasVertexNormals) {
            vertexStride += 1;
        }
        if (isWestOrNorthEdge) {
            start = edgeVertices.length - 1;
            end = -1;
            increment = -1;
        } else {
            start = 0;
            end = edgeVertices.length;
            increment = 1;
        }

        var previousIndex = -1;

        var vertexIndex = vertexBufferIndex / vertexStride;

        var north = rectangle.north;
        var south = rectangle.south;
        var east = rectangle.east;
        var west = rectangle.west;

        if (east < west) {
            east += CesiumMath.TWO_PI;
        }

        for (var i = start; i !== end; i += increment) {
            var index = edgeVertices[i];
            var offset = index * vertexStride;
            var h = vertexBuffer[offset + 3];
            var u = vertexBuffer[offset + 4];
            var v = vertexBuffer[offset + 5];

            cartographicScratch.longitude = CesiumMath.lerp(west, east, u);
            cartographicScratch.latitude = CesiumMath.lerp(south, north, v);
            cartographicScratch.height = h - skirtLength;

            var position = ellipsoid.cartographicToCartesian(cartographicScratch, cartesian3Scratch);
            Cartesian3.subtract(position, center, position);

            vertexBuffer[vertexBufferIndex++] = position.x;
            vertexBuffer[vertexBufferIndex++] = position.y;
            vertexBuffer[vertexBufferIndex++] = position.z;
            vertexBuffer[vertexBufferIndex++] = cartographicScratch.height;
            vertexBuffer[vertexBufferIndex++] = u;
            vertexBuffer[vertexBufferIndex++] = v;
            if (hasVertexNormals) {
                vertexBuffer[vertexBufferIndex++] = vertexBuffer[offset + 6];
            }

            if (previousIndex !== -1) {
                indexBuffer[indexBufferIndex++] = previousIndex;
                indexBuffer[indexBufferIndex++] = vertexIndex - 1;
                indexBuffer[indexBufferIndex++] = index;

                indexBuffer[indexBufferIndex++] = vertexIndex - 1;
                indexBuffer[indexBufferIndex++] = vertexIndex;
                indexBuffer[indexBufferIndex++] = index;
            }

            previousIndex = index;
            ++vertexIndex;
        }

        return indexBufferIndex;
    }

    return createTaskProcessorWorker(createVerticesFromQuantizedTerrainMesh);
});
