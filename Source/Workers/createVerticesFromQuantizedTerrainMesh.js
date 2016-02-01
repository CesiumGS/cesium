/*global define*/
define([
        '../Core/AttributeCompression',
        '../Core/AxisAlignedBoundingBox',
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
        '../Core/TerrainEncoding',
        '../Core/Transforms',
        './createTaskProcessorWorker'
    ], function(
        AttributeCompression,
        AxisAlignedBoundingBox,
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
        TerrainEncoding,
        Transforms,
        createTaskProcessorWorker) {
    "use strict";

    var maxShort = 32767;

    var cartesian3Scratch = new Cartesian3();
    var scratchMinimum = new Cartesian3();
    var scratchMaximum = new Cartesian3();
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

        var minimum = scratchMinimum;
        minimum.x = Number.POSITIVE_INFINITY;
        minimum.y = Number.POSITIVE_INFINITY;
        minimum.z = Number.POSITIVE_INFINITY;

        var maximum = scratchMaximum;
        maximum.x = Number.NEGATIVE_INFINITY;
        maximum.y = Number.NEGATIVE_INFINITY;
        maximum.z = Number.NEGATIVE_INFINITY;

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

            Cartesian3.minimumByComponent(cartesian3Scratch, minimum, minimum);
            Cartesian3.maximumByComponent(cartesian3Scratch, maximum, maximum);
        }

        var occludeePointInScaledSpace;
        var orientedBoundingBox;
        var boundingSphere;

        if (exaggeration !== 1.0) {
            // Bounding volumes and horizon culling point need to be recomputed since the tile payload assumes no exaggeration.
            boundingSphere = BoundingSphere.fromPoints(positions);
            orientedBoundingBox = OrientedBoundingBox.fromRectangle(rectangle, minimumHeight, maximumHeight, ellipsoid);

            var occluder = new EllipsoidalOccluder(ellipsoid);
            occludeePointInScaledSpace = occluder.computeHorizonCullingPointFromPoints(center, positions);
        }

        var hMin = minimumHeight;
        hMin = Math.min(hMin, findMinMaxSkirts(parameters.westIndices, parameters.westSkirtHeight, heights, uvs, rectangle, ellipsoid, toENU, minimum, maximum));
        hMin = Math.min(hMin, findMinMaxSkirts(parameters.southIndices, parameters.southSkirtHeight, heights, uvs, rectangle, ellipsoid, toENU, minimum, maximum));
        hMin = Math.min(hMin, findMinMaxSkirts(parameters.eastIndices, parameters.eastSkirtHeight, heights, uvs, rectangle, ellipsoid, toENU, minimum, maximum));
        hMin = Math.min(hMin, findMinMaxSkirts(parameters.northIndices, parameters.northSkirtHeight, heights, uvs, rectangle, ellipsoid, toENU, minimum, maximum));
        
        var aaBox = new AxisAlignedBoundingBox(minimum, maximum, center);
        var encoding = new TerrainEncoding(aaBox, hMin, maximumHeight, fromENU, hasVertexNormals);
        var vertexStride = encoding.getStride();
        var size = quantizedVertexCount * vertexStride + edgeVertexCount * vertexStride;
        var vertexBuffer = new Float32Array(size);

        var bufferIndex = 0;
        for (var j = 0; j < quantizedVertexCount; ++j) {
            if (hasVertexNormals) {
                var n = j * 2.0;
                toPack.x = octEncodedNormals[n];
                toPack.y = octEncodedNormals[n + 1];

                if (exaggeration !== 1.0) {
                    var normal = AttributeCompression.octDecode(toPack.x, toPack.y, scratchNormal);
                    var fromENUNormal = Transforms.eastNorthUpToFixedFrame(cartesian3Scratch, ellipsoid, scratchFromENU);
                    var toENUNormal = Matrix4.inverseTransformation(fromENUNormal, scratchToENU);

                    Matrix4.multiplyByPointAsVector(toENUNormal, normal, normal);
                    normal.z *= exaggeration;
                    Cartesian3.normalize(normal, normal);

                    Matrix4.multiplyByPointAsVector(fromENUNormal, normal, normal);
                    Cartesian3.normalize(normal, normal);

                    AttributeCompression.octEncode(normal, toPack);
                }
            }

            bufferIndex = encoding.encode(vertexBuffer, bufferIndex, positions[j], uvs[j], heights[j], toPack);
        }

        var edgeTriangleCount = Math.max(0, (edgeVertexCount - 4) * 2);
        var indexBufferLength = parameters.indices.length + edgeTriangleCount * 3;
        var indexBuffer = IndexDatatype.createTypedArray(quantizedVertexCount + edgeVertexCount, indexBufferLength);
        indexBuffer.set(parameters.indices, 0);

        // Add skirts.
        var vertexBufferIndex = quantizedVertexCount * vertexStride;
        var indexBufferIndex = parameters.indices.length;
        indexBufferIndex = addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, parameters.westIndices, encoding, heights, uvs, octEncodedNormals, ellipsoid, rectangle, parameters.westSkirtHeight, true, exaggeration);
        vertexBufferIndex += parameters.westIndices.length * vertexStride;
        indexBufferIndex = addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, parameters.southIndices, encoding, heights, uvs, octEncodedNormals, ellipsoid, rectangle, parameters.southSkirtHeight, false, exaggeration);
        vertexBufferIndex += parameters.southIndices.length * vertexStride;
        indexBufferIndex = addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, parameters.eastIndices, encoding, heights, uvs, octEncodedNormals, ellipsoid, rectangle, parameters.eastSkirtHeight, false, exaggeration);
        vertexBufferIndex += parameters.eastIndices.length * vertexStride;
        addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, parameters.northIndices, encoding, heights, uvs, octEncodedNormals, ellipsoid, rectangle, parameters.northSkirtHeight, true, exaggeration);

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
            occludeePointInScaledSpace : occludeePointInScaledSpace,
            encoding : encoding,
            skirtIndex : parameters.indices.length
        };
    }

    function findMinMaxSkirts(edgeIndices, edgeHeight, heights, uvs, rectangle, ellipsoid, toENU, minimum, maximum) {
        var hMin = Number.POSITIVE_INFINITY;

        var north = rectangle.north;
        var south = rectangle.south;
        var east = rectangle.east;
        var west = rectangle.west;

        if (east < west) {
            east += CesiumMath.TWO_PI;
        }

        var length = edgeIndices.length;
        for (var i = 0; i < length; ++i) {
            var index = edgeIndices[i];
            var h = heights[index];
            var uv = uvs[index];

            cartographicScratch.longitude = CesiumMath.lerp(west, east, uv.x);
            cartographicScratch.latitude = CesiumMath.lerp(south, north, uv.y);
            cartographicScratch.height = h - edgeHeight;

            var position = ellipsoid.cartographicToCartesian(cartographicScratch, cartesian3Scratch);
            Matrix4.multiplyByPoint(toENU, position, position);

            Cartesian3.minimumByComponent(position, minimum, minimum);
            Cartesian3.maximumByComponent(position, maximum, maximum);

            hMin = Math.min(hMin, cartographicScratch.height);
        }
        return hMin;
    }

    function addSkirt(vertexBuffer, vertexBufferIndex, indexBuffer, indexBufferIndex, edgeVertices, encoding, heights, uvs, octEncodedNormals, ellipsoid, rectangle, skirtLength, isWestOrNorthEdge, exaggeration) {
        var start, end, increment;
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

        var hasVertexNormals = defined(octEncodedNormals);
        var vertexStride = encoding.getStride();
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
            var h = heights[index];
            var uv = uvs[index];

            cartographicScratch.longitude = CesiumMath.lerp(west, east, uv.x);
            cartographicScratch.latitude = CesiumMath.lerp(south, north, uv.y);
            cartographicScratch.height = h - skirtLength;

            var position = ellipsoid.cartographicToCartesian(cartographicScratch, cartesian3Scratch);

            if (hasVertexNormals) {
                var n = index * 2.0;
                toPack.x = octEncodedNormals[n];
                toPack.y = octEncodedNormals[n + 1];

                if (exaggeration !== 1.0) {
                    var normal = AttributeCompression.octDecode(toPack.x, toPack.y, scratchNormal);
                    var fromENUNormal = Transforms.eastNorthUpToFixedFrame(cartesian3Scratch, ellipsoid, scratchFromENU);
                    var toENUNormal = Matrix4.inverseTransformation(fromENUNormal, scratchToENU);

                    Matrix4.multiplyByPointAsVector(toENUNormal, normal, normal);
                    normal.z *= exaggeration;
                    Cartesian3.normalize(normal, normal);

                    Matrix4.multiplyByPointAsVector(fromENUNormal, normal, normal);
                    Cartesian3.normalize(normal, normal);

                    AttributeCompression.octEncode(normal, toPack);
                }
            }

            vertexBufferIndex = encoding.encode(vertexBuffer, vertexBufferIndex, position, uv, cartographicScratch.height, toPack);

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
