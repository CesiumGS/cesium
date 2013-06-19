/*global define*/
define([
        './clone',
        './defaultValue',
        './BoundingSphere',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './IndexDatatype',
        './DeveloperError',
        './Ellipsoid',
        './Extent',
        './GeographicProjection',
        './GeometryAttribute',
        './Math',
        './Matrix2',
        './PrimitiveType',
        './VertexFormat'
    ], function(
        clone,
        defaultValue,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        IndexDatatype,
        DeveloperError,
        Ellipsoid,
        Extent,
        GeographicProjection,
        GeometryAttribute,
        CesiumMath,
        Matrix2,
        PrimitiveType,
        VertexFormat) {
    "use strict";

    function isValidLatLon(latitude, longitude) {
        if (latitude < -CesiumMath.PI_OVER_TWO || latitude > CesiumMath.PI_OVER_TWO) {
            return false;
        }
        if (longitude > CesiumMath.PI || longitude < -CesiumMath.PI) {
            return false;
        }
        return true;
    }

    var nw = new Cartesian3();
    var nwCartographic = new Cartographic();
    var centerCartographic = new Cartographic();
    var center = new Cartesian3();
    var rotationMatrix = new Matrix2();
    var proj = new GeographicProjection();
    var position = new Cartesian3();
    var normal = new Cartesian3();
    var surfaceNormal = new Cartesian3();
    var tangent = new Cartesian3();
    var binormal = new Cartesian3();
    var extrudedPosition = new Cartesian3();
    var extrudedNormal = new Cartesian3();
    var extrudedBinormal = new Cartesian3();
    var bottomBoundingSphere = new BoundingSphere();
    var topBoundingSphere = new BoundingSphere();

    var westNormal = new Cartesian3();
    var northNormal = new Cartesian3();
    var eastNormal = new Cartesian3();
    var southNormal = new Cartesian3();
    var northEastTop = new Cartesian3();
    var northEastBottom = new Cartesian3();
    var northWestTop = new Cartesian3();
    var northWestBottom = new Cartesian3();
    var southWestTop = new Cartesian3();
    var southWestBottom = new Cartesian3();
    var v1Scratch = new Cartesian3();
    var v2Scratch = new Cartesian3();

    var cos = Math.cos;
    var sin = Math.sin;
    var sqrt = Math.sqrt;

    var stLatitude, stLongitude;

    function computePosition(params, row, col, maxHeight, minHeight) {
        var extent = params.extent;
        var radiiSquared = params.radiiSquared;

        var latitude = nwCartographic.latitude - params.granYCos*row + col*params.granXSin;
        stLatitude = extent.north - params.granularityY*row;
        var cosLatitude = cos(latitude);
        var nZ = sin(latitude);
        var kZ = radiiSquared.z * nZ;

        var longitude = nwCartographic.longitude + row*params.granYSin + col*params.granXCos;
        stLongitude = extent.west + col*params.granularityX;

        var nX = cosLatitude * cos(longitude);
        var nY = cosLatitude * sin(longitude);

        var kX = radiiSquared.x * nX;
        var kY = radiiSquared.y * nY;

        var gamma = sqrt((kX * nX) + (kY * nY) + (kZ * nZ));

        var rSurfaceX = kX / gamma;
        var rSurfaceY = kY / gamma;
        var rSurfaceZ = kZ / gamma;

        if (typeof maxHeight !== 'undefined') {
            position.x = rSurfaceX + nX * maxHeight; // top
            position.y = rSurfaceY + nY * maxHeight;
            position.z = rSurfaceZ + nZ * maxHeight;
        }

        if (typeof minHeight !== 'undefined') {
            extrudedPosition.x = rSurfaceX + nX * minHeight; // bottom
            extrudedPosition.y = rSurfaceY + nY * minHeight;
            extrudedPosition.z = rSurfaceZ + nZ * minHeight;
        }
    }

    function addIndices(indices, indicesIndex, upperLeft, lowerLeft, upperRight, lowerRight) {
        indices[indicesIndex++] = upperLeft;
        indices[indicesIndex++] = lowerLeft;
        indices[indicesIndex++] = upperRight;
        indices[indicesIndex++] = upperRight;
        indices[indicesIndex++] = lowerLeft;
        indices[indicesIndex++] = lowerRight;
        return indices;
    }

    function constructExtent(options, vertexFormat, params){
        var extent = params.extent;
        var ellipsoid = params.ellipsoid;
        var size = params.size;
        var threeCount = size * 3;
        var height = params.height;
        var width = params.width;
        var surfaceHeight = params.surfaceHeight;

        var attrIndex = 0;
        var stIndex = 0;

        var positions = (vertexFormat.position) ? new Float64Array(threeCount) : undefined;
        var textureCoordinates = (vertexFormat.st) ? new Float32Array(size * 2) : undefined;
        var normals = (vertexFormat.normal) ? new Float32Array(threeCount) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(threeCount) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(threeCount) : undefined;

        for ( var row = 0; row < height; ++row) {
            for ( var col = 0; col < width; ++col) {
                computePosition(params, row, col, surfaceHeight);

                var attrIndex1 = attrIndex + 1;
                var attrIndex2 = attrIndex + 2;

                if (vertexFormat.position) {
                    positions[attrIndex] = position.x;
                    positions[attrIndex1] = position.y;
                    positions[attrIndex2] = position.z;
                }

                if (vertexFormat.st) {
                    textureCoordinates[stIndex] = (stLongitude - extent.west) * params.lonScalar;
                    textureCoordinates[stIndex+1] = (stLatitude - extent.south) * params.latScalar;
                }

                if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                    ellipsoid.geodeticSurfaceNormal(position, normal);

                    if (vertexFormat.normal) {
                        normals[attrIndex] = normal.x;
                        normals[attrIndex1] = normal.y;
                        normals[attrIndex2] = normal.z;
                    }

                    if (vertexFormat.tangent) {
                        Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent).normalize(tangent);

                        tangents[attrIndex] = tangent.x;
                        tangents[attrIndex1] = tangent.y;
                        tangents[attrIndex2] = tangent.z;
                    }

                    if (vertexFormat.binormal) {
                        Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent).normalize(tangent);
                        Cartesian3.cross(normal, tangent, binormal).normalize(binormal);

                        binormals[attrIndex] = binormal.x;
                        binormals[attrIndex1] = binormal.y;
                        binormals[attrIndex2] = binormal.z;
                    }
                }
                attrIndex += 3;
                stIndex += 2;
            }
        }

        var indicesSize = 6 * (width - 1) * (height - 1);
        var indices = IndexDatatype.createTypedArray(size, indicesSize);
        var index = 0;
        var indicesIndex = 0;
        for ( var i = 0; i < height - 1; ++i) {
            for ( var j = 0; j < width - 1; ++j) {
                var upperLeft = index;
                var lowerLeft = upperLeft + width;
                var lowerRight = lowerLeft + 1;
                var upperRight = upperLeft + 1;
                indices = addIndices(indices, indicesIndex, upperLeft, lowerLeft, upperRight, lowerRight);
                indicesIndex += 6;
                ++index;
            }
            ++index;
        }
        return {
                indices: indices,
                binormals: binormals,
                tangents: tangents,
                normals: normals,
                textureCoordinates: textureCoordinates,
                positions: positions,
                boundingSphere: BoundingSphere.fromExtent3D(options.extent, ellipsoid, surfaceHeight)
        };
    }

    function calculateAttributesWall(vertexFormat, ellipsoid, direction, setNormal) {
        setNormal.clone(normal);
        setNormal.clone(extrudedNormal);
        if (vertexFormat.tangent || vertexFormat.binormal) {
            ellipsoid.geodeticSurfaceNormal(position, surfaceNormal);
            if (direction === 'n' || direction === 's') {
                Cartesian3.cross(Cartesian3.UNIT_Z, surfaceNormal, tangent).normalize(tangent);
                if (vertexFormat.binormal) {
                    Cartesian3.cross(normal, tangent, binormal).normalize(binormal);
                    binormal.clone(extrudedBinormal);
                }
            } else {
                Cartesian3.cross(Cartesian3.UNIT_Z, surfaceNormal, tangent).normalize(tangent);
                if (vertexFormat.binormal) {
                    Cartesian3.cross(surfaceNormal, tangent, binormal).normalize(binormal);
                    binormal.clone(extrudedBinormal);
                }
                if (vertexFormat.tangent) {
                    Cartesian3.cross(binormal, normal, tangent).normalize(tangent);
                }
            }
        }
    }

    function calculateAttributesTopBottom(vertexFormat, ellipsoid) {
        ellipsoid.geodeticSurfaceNormal(position, normal);
        Cartesian3.negate(normal, extrudedNormal);
        if (vertexFormat.tangent || vertexFormat.binormal) {
            Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent).normalize(tangent);
            if (vertexFormat.binormal) {
                Cartesian3.cross(normal, tangent, binormal).normalize(binormal);
                binormal.negate(extrudedBinormal);
            }
        }
    }

    function addAttributes(attrIndex, vertexFormat, attributes, ellipsoid, offset, extrudedOffset, top, bottom, direction, setNormal) {
        if (!top) {
            extrudedOffset = offset;
        }

        var threeExtrudedOffset = extrudedOffset*3;
        var threeOffset = offset*3;

        var attrIndex1 = attrIndex + 1;
        var attrIndex2 = attrIndex + 2;

        if (vertexFormat.position) {
            if (bottom) {
                attributes.positions[attrIndex + threeExtrudedOffset ] = extrudedPosition.x;
                attributes.positions[attrIndex1 + threeExtrudedOffset] = extrudedPosition.y;
                attributes.positions[attrIndex2 + threeExtrudedOffset] = extrudedPosition.z;
            }

            if (top) {
                attributes.positions[attrIndex + threeOffset] = position.x;
                attributes.positions[attrIndex1 + threeOffset] = position.y;
                attributes.positions[attrIndex2 + threeOffset] = position.z;
            }
        }

        if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
            if (typeof direction !== 'undefined') {
                calculateAttributesWall(vertexFormat, ellipsoid, direction, setNormal);
            } else {
                calculateAttributesTopBottom(vertexFormat, ellipsoid);
            }

            if (top) {
                if (vertexFormat.normal) {
                    attributes.normals[attrIndex + threeOffset] = normal.x;
                    attributes.normals[attrIndex1 + threeOffset] = normal.y;
                    attributes.normals[attrIndex2 + threeOffset] = normal.z;
                }

                if (vertexFormat.tangent) {
                    attributes.tangents[attrIndex + threeOffset] = tangent.x;
                    attributes.tangents[attrIndex1 + threeOffset] = tangent.y;
                    attributes.tangents[attrIndex2 + threeOffset] = tangent.z;
                }

                if (vertexFormat.binormal) {
                    attributes.binormals[attrIndex + threeOffset] = binormal.x;
                    attributes.binormals[attrIndex1 + threeOffset] = binormal.y;
                    attributes.binormals[attrIndex2 + threeOffset] = binormal.z;
                }
            }

            if (bottom) {
                if (vertexFormat.normal) {
                    attributes.normals[attrIndex + threeExtrudedOffset] = extrudedNormal.x;
                    attributes.normals[attrIndex1 + threeExtrudedOffset] = extrudedNormal.y;
                    attributes.normals[attrIndex2 + threeExtrudedOffset] = extrudedNormal.z;
                }

                if (vertexFormat.tangent) {
                    attributes.tangents[attrIndex + threeExtrudedOffset] = tangent.x;
                    attributes.tangents[attrIndex1 + threeExtrudedOffset] = tangent.y;
                    attributes.tangents[attrIndex2 + threeExtrudedOffset] = tangent.z;
                }

                if (vertexFormat.binormal) {
                    attributes.binormals[attrIndex + threeExtrudedOffset] = extrudedBinormal.x;
                    attributes.binormals[attrIndex1 + threeExtrudedOffset] = extrudedBinormal.y;
                    attributes.binormals[attrIndex2 + threeExtrudedOffset] = extrudedBinormal.z;
                }
            }
        }
    }

    function addTextureCoordinates(vertexFormat, stIndex, attributes, offset, extrudedOffset, closeTop, closeBottom, params) {
        if (vertexFormat.st) {
            var twoOffset = offset*2;
            var twoExtrudedOffset = extrudedOffset*2;
            var extent = params.extent;
            var stLon = (stLongitude - extent.west) * params.lonScalar;
            var stLat = (stLatitude - extent.south) * params.latScalar;
            if (!closeTop) {
                extrudedOffset = offset;
            } else {
                attributes.textureCoordinates[stIndex + twoOffset] = stLon;
                attributes.textureCoordinates[stIndex + twoOffset + 1] = stLat;
            }
            if (closeBottom) {
                attributes.textureCoordinates[stIndex +  twoExtrudedOffset] = stLon;
                attributes.textureCoordinates[stIndex + 1 +  twoExtrudedOffset] = stLat;
            }
        }
    }

    function constructExtrudedExtent(options, vertexFormat, params) {
        var surfaceHeight = params.surfaceHeight;
        var height = params.height;
        var width = params.width;
        var size = params.size;
        var ellipsoid = params.ellipsoid;
        var extrudedOptions = options.extrudedOptions;
        if (typeof extrudedOptions.height !== 'number'){
            return constructExtent(options, vertexFormat, params);
        }
        var minHeight = Math.min(extrudedOptions.height, surfaceHeight);
        var maxHeight = Math.max(extrudedOptions.height, surfaceHeight);
        if (CesiumMath.equalsEpsilon(minHeight, maxHeight, 0.1)) {
            return constructExtent(options, vertexFormat, params);
        }

        var closeTop = defaultValue(extrudedOptions.closeTop, true);
        var closeBottom  = defaultValue(extrudedOptions.closeBottom, true);

        var perimeterPositions = 2*width + 2*height - 4;
        var twoPP = perimeterPositions * 2;
        var vertexCount = (perimeterPositions + 4)*2;
        if (closeTop) {
            vertexCount += size;
        }
        if (closeBottom) {
            vertexCount += size;
        }

        var threeCount = vertexCount * 3;
        var positions = (vertexFormat.position) ? new Float64Array(threeCount) : undefined;
        var textureCoordinates = (vertexFormat.st) ? new Float32Array(vertexCount * 2) : undefined;
        var normals = (vertexFormat.normal) ? new Float32Array(threeCount) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(threeCount) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(threeCount) : undefined;

        var attributes = {
                positions: positions,
                textureCoordinates: textureCoordinates,
                normals: normals,
                tangents: tangents,
                binormals: binormals
        };

        var attrIndex = 0;
        var stIndex = 0;

        var row;
        var col;
        var countSides = (height - 2) * 2 + width;

        // compute corner points first to find wall normals
        computePosition(params, 0, 0, maxHeight, minHeight);
        addTextureCoordinates(vertexFormat, 0, attributes, twoPP, twoPP + 4, true, true, params);
        addTextureCoordinates(vertexFormat, 0, attributes, 0, perimeterPositions, true, true, params);
        position.clone(northWestTop);
        extrudedPosition.clone(northWestBottom);

        computePosition(params, 0, width-1, maxHeight, minHeight);
        addTextureCoordinates(vertexFormat, 0, attributes, twoPP + 1, twoPP + 5, true, true, params);
        addTextureCoordinates(vertexFormat, (width-1)*2, attributes, 0, perimeterPositions, true, true, params);
        position.clone(northEastTop);
        extrudedPosition.clone(northEastBottom);

        computePosition(params, height-1, 0, maxHeight, minHeight);
        addTextureCoordinates(vertexFormat, 0, attributes, twoPP + 2, twoPP + 6, true, true, params);
        addTextureCoordinates(vertexFormat, 0, attributes, countSides, countSides + perimeterPositions, true, true, params);
        position.clone(southWestTop);
        extrudedPosition.clone(southWestBottom);

        computePosition(params, height-1, width-1, maxHeight, minHeight);
        addTextureCoordinates(vertexFormat, 0, attributes, twoPP + 3, twoPP + 7, true, true, params);
        addTextureCoordinates(vertexFormat, (width-1)*2, attributes, countSides, countSides + perimeterPositions, true, true, params);

        northEastTop.subtract(northWestTop, v1Scratch);
        northWestBottom.subtract(northWestTop, v2Scratch);
        Cartesian3.cross(v1Scratch, v2Scratch, northNormal).normalize(northNormal);

        northWestBottom.subtract(northWestTop, v1Scratch);
        southWestTop.subtract(northWestTop, v2Scratch);
        Cartesian3.cross(v1Scratch, v2Scratch, westNormal).normalize(westNormal);

        southWestBottom.subtract(southWestTop, v1Scratch);
        position.subtract(southWestTop, v2Scratch);
        Cartesian3.cross(v1Scratch, v2Scratch, southNormal).normalize(southNormal);

        position.subtract(northEastTop, v1Scratch);
        northEastBottom.subtract(northEastTop, v2Scratch);
        Cartesian3.cross(v1Scratch, v2Scratch, eastNormal).normalize(eastNormal);

        addAttributes(0, vertexFormat, attributes, ellipsoid, twoPP + 3, twoPP + 7, true, true, 'e', eastNormal);
        addAttributes((width-1)*3, vertexFormat, attributes, ellipsoid, countSides, countSides + perimeterPositions, true, true, 's', southNormal);

        northWestTop.clone(position);
        northWestBottom.clone(extrudedPosition);
        addAttributes(0, vertexFormat, attributes, ellipsoid, twoPP, (twoPP + 4), true, true, 'w', westNormal);
        addAttributes(0, vertexFormat, attributes, ellipsoid, 0, perimeterPositions, true, true, 'n', northNormal);

        northEastTop.clone(position);
        northEastBottom.clone(extrudedPosition);
        addAttributes(0, vertexFormat, attributes, ellipsoid, twoPP + 1, twoPP + 5, true, true, 'e', eastNormal);
        addAttributes((width-1)*3, vertexFormat, attributes, ellipsoid, 0, perimeterPositions, true, true, 'n', northNormal);

        southWestTop.clone(position);
        southWestBottom.clone(extrudedPosition);
        addAttributes(0, vertexFormat, attributes, ellipsoid, twoPP + 2, twoPP + 6, true, true, 'w', westNormal);
        addAttributes(0, vertexFormat, attributes, ellipsoid, countSides, countSides + perimeterPositions, true, true, 's', southNormal);

        attrIndex += 3;
        stIndex += 2;

        for (col = 1; col < width - 1; ++col) {
            row = 0;
            computePosition(params, row, col, maxHeight, minHeight);
            addAttributes(attrIndex, vertexFormat, attributes, ellipsoid, 0, perimeterPositions, true, true, 'n', northNormal); // add north row
            addTextureCoordinates(vertexFormat, stIndex, attributes, 0, perimeterPositions, true, true, params);

            row = height - 1;
            computePosition(params, row, col, maxHeight, minHeight);
            addAttributes(attrIndex, vertexFormat, attributes, ellipsoid, countSides, countSides + perimeterPositions, true, true, 's', southNormal); // add south row
            addTextureCoordinates(vertexFormat, stIndex, attributes, countSides, countSides + perimeterPositions, true, true, params);

            attrIndex += 3;
            stIndex += 2;
        }

        attrIndex += 3;
        stIndex += 2;

        for (row = 1; row < height - 1; ++row) {
            col = 0;
            computePosition(params, row, col, maxHeight, minHeight);
            addAttributes(attrIndex, vertexFormat, attributes, ellipsoid, 0, perimeterPositions, true, true, 'w', westNormal); // add west side
            addTextureCoordinates(vertexFormat, stIndex, attributes, 0, perimeterPositions, true, true, params);

            col = width - 1;
            computePosition(params, row, col, maxHeight, minHeight);
            addAttributes(attrIndex, vertexFormat, attributes, ellipsoid, height - 2, height - 2 + perimeterPositions, true, true, 'e', eastNormal); // add east side
            addTextureCoordinates(vertexFormat, stIndex, attributes, height - 2, height - 2 + perimeterPositions, true, true, params);
            attrIndex += 3;
            stIndex += 2;
        }

        if (closeBottom || closeTop) {
            var maxH = (closeTop) ? maxHeight : undefined;
            var minH = (closeBottom) ? minHeight : undefined;
            var incAmount = width + perimeterPositions + 8 + height - 2;
            attrIndex += 3 * incAmount;
            stIndex += 2 * incAmount;
            for (row = 0; row < height; ++row) { // fill in middle
                for (col = 0; col < width; ++col) {
                    computePosition(params, row, col, maxH, minH);
                    addAttributes(attrIndex, vertexFormat, attributes, ellipsoid, 0, size, closeTop, closeBottom);
                    addTextureCoordinates(vertexFormat, stIndex, attributes, 0, size, closeTop, closeBottom, params);
                    attrIndex += 3;
                    stIndex += 2;
                }
            }
        }

        var topBS = BoundingSphere.fromExtent3D(options.extent, params.ellipsoid, maxHeight, topBoundingSphere);
        var bottomBS = BoundingSphere.fromExtent3D(options.extent, params.ellipsoid, minHeight, bottomBoundingSphere);
        var indexCount = perimeterPositions * 6;
        if (closeTop) {
            indexCount += (width - 1) * (height - 1) * 6;
        }
        if (closeBottom) {
            indexCount += (width - 1) * (height - 1) * 6;
        }
        var indices = IndexDatatype.createTypedArray(vertexCount, indexCount);
        var indicesIndex = 0;
        var attr = {
                binormals: binormals,
                tangents: tangents,
                normals: normals,
                textureCoordinates: textureCoordinates,
                positions: positions,
                boundingSphere: BoundingSphere.union(topBS, bottomBS)
        };

        var upperLeft;
        var lowerLeft;
        var lowerRight;
        var upperRight;
        var i = 0;

        upperLeft = twoPP; //NW corner
        lowerLeft = upperLeft + 4;
        if (width === perimeterPositions - width) {
            upperRight = twoPP + 2; //get clone of corner point
            lowerRight = upperRight + 4;
        } else {
            upperRight = width;
            lowerRight = perimeterPositions + width;
        }
        indices = addIndices(indices, indicesIndex, upperLeft, lowerLeft, upperRight, lowerRight);
        indicesIndex += 6;

        upperLeft = twoPP + 3; //SE corner
        lowerLeft = upperLeft + 4;
        if (perimeterPositions/2 === width - 1) {
            upperRight = twoPP + 1; //get clone of corner point
            lowerRight = upperRight + 4;
        } else {
            lowerRight = twoPP - 1 - width;
            upperRight =  perimeterPositions - width - 1;
        }
        indices = addIndices(indices, indicesIndex, upperLeft, lowerLeft, upperRight, lowerRight);
        indicesIndex += 6;

        for (i = 1; i < width; i++) {
            upperLeft = i; // north wall
            lowerLeft = upperLeft + perimeterPositions;
            lowerRight = lowerLeft - 1;
            upperRight = upperLeft - 1;
            indices = addIndices(indices, indicesIndex, upperLeft, lowerLeft, upperRight, lowerRight);
            indicesIndex += 6;

            upperLeft = i + perimeterPositions - width - 1; // south wall
            lowerLeft = upperLeft + perimeterPositions;
            lowerRight = lowerLeft + 1;
            upperRight = upperLeft + 1;
            indices = addIndices(indices, indicesIndex, upperLeft, lowerLeft, upperRight, lowerRight);
            indicesIndex += 6;
        }

        for (i = width; i < width + height - 2; i++) {
            upperLeft = i; // west wall
            lowerLeft = upperLeft + perimeterPositions;
            if (upperLeft === width - 1 + height - 2) {
                upperRight = twoPP + 2; //get clone of corner point
                lowerRight = upperRight + 4;
            } else {
                lowerRight = lowerLeft + 1;
                upperRight = upperLeft + 1;
            }
            indices = addIndices(indices, indicesIndex, upperLeft, lowerLeft, upperRight, lowerRight);
            indicesIndex += 6;

            upperLeft = i + height - 2; // east wall
            lowerLeft = upperLeft + perimeterPositions;
            if (upperLeft === width + height - 2) {
                upperRight = twoPP + 1; //get clone of corner point
                lowerRight = upperRight + 4;
            } else {
                lowerRight = lowerLeft - 1;
                upperRight = upperLeft - 1;
            }
            indices = addIndices(indices, indicesIndex, upperLeft, lowerLeft, upperRight, lowerRight);
            indicesIndex += 6;
        }

        if (closeTop || closeBottom) {
            var index = twoPP + 8;
            var bottomOffset = (closeBottom && closeTop) ? size : 0;
            for (i = 0; i < height - 1; ++i) {
                for ( var j = 0; j < width - 1; ++j) {
                    upperLeft = index;
                    lowerLeft = upperLeft + width;
                    lowerRight = lowerLeft + 1;
                    upperRight = upperLeft + 1;
                    if (closeBottom) {
                        indices[indicesIndex++] = upperRight + bottomOffset;
                        indices[indicesIndex++] = lowerLeft + bottomOffset;
                        indices[indicesIndex++] = upperLeft + bottomOffset;
                        indices[indicesIndex++] = lowerRight + bottomOffset;
                        indices[indicesIndex++] = lowerLeft + bottomOffset;
                        indices[indicesIndex++] = upperRight + bottomOffset;
                    }

                    if (closeTop) {
                        indices = addIndices(indices, indicesIndex, upperLeft, lowerLeft, upperRight, lowerRight);
                        indicesIndex += 6;
                    }
                    ++index;
                }
                ++index;
            }
        }
        attr.indices= indices;
        return attr;
    }

    /**
     * Creates geometry for a cartographic extent on an ellipsoid centered at the origin.
     *
     * @param {Extent} options.extent A cartographic extent with north, south, east and west properties in radians.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the extent lies.
     * @param {Number} [options.granularity=CesiumMath.toRadians(1.0)] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.surfaceHeight=0.0] The height from the surface of the ellipsoid.
     * @param {Number} [options.rotation=0.0] The rotation of the extent in radians. A positive rotation is counter-clockwise.
     * @param {Object} [options.extrudedOptions] Extruded options
     * @param {Number} [options.extrudedOptions.height] Height of extruded surface
     * @param {Boolean} [options.extrudedOptions.closeTop=true] Render top of extrusion
     * @param {Number} [options.extrudedOptions.closeBottom=true] Render bottom of extrusion
     *
     * @exception {DeveloperError} <code>options.extent</code> is required and must have north, south, east and west attributes.
     * @exception {DeveloperError} <code>options.extent.north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.extent.south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.extent.east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.extent.west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.extent.north</code> must be greater than <code>extent.south</code>.
     * @exception {DeveloperError} <code>options.extent.east</code> must be greater than <code>extent.west</code>.
     * @exception {DeveloperError} Rotated extent is invalid.
     *
     * @see Extent
     *
     * @example
     * var extent = new ExtentGeometry({
     *     ellipsoid : Ellipsoid.WGS84,
     *     extent : new Extent(
     *         CesiumMath.toRadians(-80.0),
     *         CesiumMath.toRadians(39.0),
     *         CesiumMath.toRadians(-74.0),
     *         CesiumMath.toRadians(42.0)
     *     ),
     *     surfaceHeight : 10000.0
     * });
     */
    var ExtentGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var extent = options.extent;
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        extent.validate();

        var granularity = defaultValue(options.granularity, CesiumMath.toRadians(1.0));
        var width = Math.ceil((extent.east - extent.west) / granularity) + 1;
        var height = Math.ceil((extent.north - extent.south) / granularity) + 1;
        var granularityX = (extent.east - extent.west) / (width - 1);
        var granularityY = (extent.north - extent.south) / (height - 1);

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var radiiSquared = ellipsoid.getRadiiSquared();

        var surfaceHeight = defaultValue(options.surfaceHeight, 0.0);
        var rotation = defaultValue(options.rotation, 0.0);

        // for computing texture coordinates
        var lonScalar = 1.0 / (extent.east - extent.west);
        var latScalar = 1.0 / (extent.north - extent.south);

        extent.getNorthwest(nwCartographic);
        extent.getCenter(centerCartographic);
        var latitude, longitude;

        var granYCos = granularityY * cos(rotation);
        var granYSin = granularityY * sin(rotation);
        var granXCos = granularityX * cos(rotation);
        var granXSin = granularityX * sin(rotation);

        if (rotation !== 0) {
            proj.project(nwCartographic, nw);
            proj.project(centerCartographic, center);
            nw.subtract(center, nw);
            Matrix2.fromRotation(rotation, rotationMatrix);
            rotationMatrix.multiplyByVector(nw, nw);
            nw.add(center, nw);
            proj.unproject(nw, nwCartographic);
            latitude = nwCartographic.latitude;
            longitude = nwCartographic.longitude;

            if (!isValidLatLon(latitude, longitude) ||
                    !isValidLatLon(latitude + (width-1)*granXSin, longitude + (width-1)*granXCos) ||
                    !isValidLatLon(latitude - granYCos*(height-1), longitude + (height-1)*granYSin) ||
                    !isValidLatLon(latitude - granYCos*(height-1) + (width-1)*granXSin, longitude + (height-1)*granYSin + (width-1)*granXCos)) {
                throw new DeveloperError('Rotated extent is invalid.');
            }
        }

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        var attributes = {};

        var size = width * height;

        var params = {
            granYCos: granYCos,
            granYSin: granYSin,
            granXCos: granXCos,
            granXSin: granXSin,
            granularityY: granularityY,
            granularityX: granularityX,
            radiiSquared: radiiSquared,
            ellipsoid: ellipsoid,
            lonScalar: lonScalar,
            latScalar: latScalar,
            extent: extent,
            width: width,
            height: height,
            surfaceHeight: surfaceHeight,
            size: size
        };

        var attr;

        if (typeof options.extrudedOptions !== 'undefined') {
            attr = constructExtrudedExtent(options, vertexFormat, params);
        } else {
            attr = constructExtent(options, vertexFormat, params);
        }


        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : attr.positions
            });
        }

        if (vertexFormat.st) {
            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : attr.textureCoordinates
            });
        }

        if (vertexFormat.normal) {
            attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : attr.normals
            });
        }

        if (vertexFormat.tangent) {
            attributes.tangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : attr.tangents
            });
        }

        if (vertexFormat.binormal) {
            attributes.binormal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : attr.binormals
            });
        }

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         *
         * @see Geometry#attributes
         */
        this.attributes = attributes;

        /**
         * Index data that - along with {@link Geometry#primitiveType} - determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = attr.indices;
        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = attr.boundingSphere;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = PrimitiveType.TRIANGLES;
    };

    return ExtentGeometry;
});
