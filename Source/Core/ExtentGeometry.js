/*global define*/
define([
        './clone',
        './defaultValue',
        './BoundingSphere',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './DeveloperError',
        './Ellipsoid',
        './Extent',
        './GeographicProjection',
        './Geometry',
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
        DeveloperError,
        Ellipsoid,
        Extent,
        GeographicProjection,
        Geometry,
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
    var tangent = new Cartesian3();
    var binormal = new Cartesian3();
    var extrudedPosition = new Cartesian3();
    var extrudedNormal = new Cartesian3();
    var extrudedTangent = new Cartesian3();
    var bottomBoundingSphere = new BoundingSphere();
    var topBoundingSphere = new BoundingSphere();

    var westNormal = new Cartesian3();
    var northNormal = new Cartesian3();
    var eastNormal = new Cartesian3();
    var southNormal = new Cartesian3();
    var northEastTop = new Cartesian3();
    var northWestTop = new Cartesian3();
    var southWestTop = new Cartesian3();
    var northWestBottom = new Cartesian3();
    var v1Scratch = new Cartesian3();
    var v2Scratch = new Cartesian3();

    var cos = Math.cos;
    var sin = Math.sin;
    var sqrt = Math.sqrt;

    var granYCos;
    var granYSin;
    var granXCos;
    var granXSin;
    var granularityY;
    var granularityX;
    var radiiSquared;

    var ellipsoid;
    var stLatitude, stLongitude;

    var extent;

    var lonScalar, latScalar;

    function computePosition(row, col, maxHeight, minHeight) {
        var latitude = nwCartographic.latitude - granYCos*row + col*granXSin;
        stLatitude = extent.north - granularityY*row;

        var cosLatitude = cos(latitude);
        var nZ = sin(latitude);
        var kZ = radiiSquared.z * nZ;

        var longitude = nwCartographic.longitude + row*granYSin + col*granXCos;
        stLongitude = extent.west + col*granularityX;

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

    function constructExtent(options, vertexFormat, width, height, surfaceHeight){
        var size = width * height;
        var threeCount = size * 3;
        var positions = (vertexFormat.position) ? new Array(threeCount) : undefined;
        var textureCoordinates = (vertexFormat.st) ? new Array(size * 2) : undefined;
        var normals = (vertexFormat.normal) ? new Array(threeCount) : undefined;
        var tangents = (vertexFormat.tangent) ? new Array(threeCount) : undefined;
        var binormals = (vertexFormat.binormal) ? new Array(threeCount) : undefined;

        var vertexIndex = 0;
        var attrIndex = 0;
        var stIndex = 0;

        for ( var row = 0; row < height; ++row) {
            for ( var col = 0; col < width; ++col) {
                computePosition(row, col, surfaceHeight);

                var attrIndex1 = attrIndex + 1;
                var attrIndex2 = attrIndex + 2;

                if (vertexFormat.position) {
                    positions[attrIndex] = position.x;
                    positions[attrIndex1] = position.y;
                    positions[attrIndex2] = position.z;
                }

                if (vertexFormat.st) {
                    textureCoordinates[stIndex] = (stLongitude - extent.west) * lonScalar;
                    textureCoordinates[stIndex+1] = (stLatitude - extent.south) * latScalar;
                }

                if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                    ellipsoid.geodeticSurfaceNormal(position, normal);

                    if (vertexFormat.normal) {
                        normals[attrIndex] = normal.x;
                        normals[attrIndex1] = normal.y;
                        normals[attrIndex2] = normal.z;
                    }

                    if (vertexFormat.tangent) {
                        Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);

                        tangents[attrIndex] = tangent.x;
                        tangents[attrIndex1] = tangent.y;
                        tangents[attrIndex2] = tangent.z;
                    }

                    if (vertexFormat.binormal) {
                        Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                        Cartesian3.cross(normal, tangent, binormal);

                        binormals[attrIndex] = binormal.x;
                        binormals[attrIndex1] = binormal.y;
                        binormals[attrIndex2] = binormal.z;
                    }
                }
                vertexIndex ++;
                attrIndex += 3;
                stIndex += 2;
            }
        }

        var indices = [];
        var index = 0;
        var indicesIndex = 0;
        for ( var i = 0; i < height - 1; ++i) {
            for ( var j = 0; j < width - 1; ++j) {
                var upperLeft = index;
                var lowerLeft = upperLeft + width;
                var lowerRight = lowerLeft + 1;
                var upperRight = upperLeft + 1;
                indices[indicesIndex++] = upperLeft;
                indices[indicesIndex++] = lowerLeft;
                indices[indicesIndex++] = upperRight;
                indices[indicesIndex++] = upperRight;
                indices[indicesIndex++] = lowerLeft;
                indices[indicesIndex++] = lowerRight;
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

    function addAttributes(attrIndex, vertexFormat, attributes, offset, extrudedOffset, top, bottom, setNormal) {
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
            if (typeof setNormal !== 'undefined') { //if wall
                setNormal.clone(normal);
                setNormal.clone(extrudedNormal);
            } else {
                ellipsoid.geodeticSurfaceNormal(position, normal);
                Cartesian3.negate(normal, extrudedNormal);
            }
            if (vertexFormat.tangent || vertexFormat.binormal) {
                Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                if (vertexFormat.binormal) {
                    Cartesian3.cross(normal, tangent, binormal);
                }
                if (typeof setNormal !== 'undefined') { // if wall
                    tangent.clone(extrudedTangent);
                } else {
                    Cartesian3.negate(tangent, extrudedTangent);
                }
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
                    attributes.tangents[attrIndex + threeExtrudedOffset] = extrudedTangent.x;
                    attributes.tangents[attrIndex1 + threeExtrudedOffset] = extrudedTangent.y;
                    attributes.tangents[attrIndex2 + threeExtrudedOffset] = extrudedTangent.z;
                }

                if (vertexFormat.binormal) {
                    attributes.binormals[attrIndex + threeExtrudedOffset] = binormal.x;
                    attributes.binormals[attrIndex1 + threeExtrudedOffset] = binormal.y;
                    attributes.binormals[attrIndex2 + threeExtrudedOffset] = binormal.z;
                }
            }
        }
    }

    function stWall (vertexFormat, stIndex, attributes, offset, extrudedOffset, direction){
        if (vertexFormat.st) {
            var twoOffset = offset*2;
            var twoExtrudedOffset = extrudedOffset*2;

            var stLon = (stLongitude - extent.west) * lonScalar;
            var stLat = (stLatitude - extent.south) * latScalar;

            if (direction === 'n') {
                attributes.textureCoordinates[stIndex + twoExtrudedOffset] = 1 - stLon;
                attributes.textureCoordinates[stIndex + 1 + twoExtrudedOffset] = 0;
                attributes.textureCoordinates[stIndex + twoOffset] =  1 - stLon;
                attributes.textureCoordinates[stIndex + twoOffset + 1] = 1;
            } else if (direction === 's') {
                attributes.textureCoordinates[stIndex + twoExtrudedOffset] = stLon;
                attributes.textureCoordinates[stIndex + 1 + twoExtrudedOffset] = 0;
                attributes.textureCoordinates[stIndex + twoOffset] = stLon;
                attributes.textureCoordinates[stIndex + twoOffset + 1] = 1;
            } else if (direction === 'e') {
                attributes.textureCoordinates[stIndex + twoExtrudedOffset] = stLat;
                attributes.textureCoordinates[stIndex + 1 + twoExtrudedOffset] = 0;
                attributes.textureCoordinates[stIndex + twoOffset] = stLat;
                attributes.textureCoordinates[stIndex + twoOffset + 1] = 1;
            } else if (direction === 'w') {
                attributes.textureCoordinates[stIndex + twoExtrudedOffset] = 1 - stLat;
                attributes.textureCoordinates[stIndex + 1 + twoExtrudedOffset] =  0;
                attributes.textureCoordinates[stIndex + twoOffset] = 1 - stLat;
                attributes.textureCoordinates[stIndex + twoOffset + 1] = 1;
            }
        }
    }

    function stTopBottom(vertexFormat, stIndex, attributes, offset, extrudedOffset, closeTop, closeBottom) {
        if (vertexFormat.st) {
            var stLon = (stLongitude - extent.west) * lonScalar;
            var stlat = (stLatitude - extent.south) * latScalar;
            if (!closeTop) {
                extrudedOffset = offset;
            } else {
                attributes.textureCoordinates[stIndex + offset*2] = stLon;
                attributes.textureCoordinates[stIndex + offset*2 + 1] = stlat;
            }
            if (closeBottom) {
                attributes.textureCoordinates[stIndex +  extrudedOffset*2] = 1 - stLon;
                attributes.textureCoordinates[stIndex + 1 +  extrudedOffset*2] = stlat;
            }
        }
    }

    function constructExtrudedExtent(options, vertexFormat, width, height, surfaceHeight) {
        var size = width * height;
        var extrudedOptions = options.extrudedOptions;
        if (typeof extrudedOptions.height !== 'number'){
            return constructExtent(options, vertexFormat, width, height, surfaceHeight);
        }
        var minHeight = Math.min(extrudedOptions.height, surfaceHeight);
        var maxHeight = Math.max(extrudedOptions.height, surfaceHeight);
        if (CesiumMath.equalsEpsilon(minHeight, maxHeight, 0.1)) {
            return constructExtent(options, vertexFormat, width, height, surfaceHeight);
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
        var positions = (vertexFormat.position) ? new Array(threeCount) : undefined;
        var textureCoordinates = (vertexFormat.st) ? new Array(vertexCount * 2) : undefined;
        var normals = (vertexFormat.normal) ? new Array(threeCount) : undefined;
        var tangents = (vertexFormat.tangent) ? new Array(threeCount) : undefined;
        var binormals = (vertexFormat.binormal) ? new Array(threeCount) : undefined;

        var attributes = {
                positions: positions,
                textureCoordinates: textureCoordinates,
                normals: normals,
                tangents: tangents,
                binormals: binormals
        };

        var vertexIndex = 0;
        var attrIndex = 0;
        var stIndex = 0;

        var row;
        var col;

        computePosition(0, 0, maxHeight, minHeight);
        position.clone(northWestTop);
        extrudedPosition.clone(northWestBottom);

        computePosition(0, width-1, maxHeight);
        position.clone(northEastTop);

        computePosition(height-1, 0, maxHeight);
        position.clone(southWestTop);

        northEastTop.subtract(northWestTop, v1Scratch);
        northWestBottom.subtract(northWestTop, v2Scratch);
        Cartesian3.cross(v1Scratch, v2Scratch, northNormal);

        northWestBottom.subtract(northWestTop, v1Scratch);
        southWestTop.subtract(northWestTop, v2Scratch);
        Cartesian3.cross(v1Scratch, v2Scratch, westNormal);

        Cartesian3.negate(westNormal, eastNormal);
        Cartesian3.negate(northNormal, southNormal);

        for (row = 0; row < height; ++row) { // add vertices for walls (the perimeter)
            if (row === 0) { // north row
                for (col = 0; col < width; ++col) {
                    computePosition(row, col, maxHeight, minHeight);

                    if (col === 0) {
                        addAttributes(attrIndex, vertexFormat, attributes, twoPP - vertexIndex, (twoPP + 4) - vertexIndex, true, true, westNormal);
                        stWall(vertexFormat, stIndex, attributes, twoPP - vertexIndex, twoPP + 4 - vertexIndex, 'w');
                    } else if (col === width - 1) {
                        addAttributes(attrIndex, vertexFormat, attributes, (twoPP + 1)- vertexIndex, (twoPP + 5)- vertexIndex, true, true, eastNormal);
                        stWall(vertexFormat, stIndex, attributes, twoPP + 1 - vertexIndex, twoPP + 5 - vertexIndex, 'e');
                    }

                    addAttributes(attrIndex, vertexFormat, attributes, 0, perimeterPositions, true, true, northNormal); // add north row
                    stWall(vertexFormat, stIndex, attributes, 0, perimeterPositions, 'n');

                    vertexIndex ++;
                    attrIndex += 3;
                    stIndex += 2;
                }
            } else if (row === height - 1) { // south row
                for (col = 0; col < width; ++col) {
                    computePosition(row, col, maxHeight, minHeight);

                    if (col === 0) {
                        addAttributes(attrIndex, vertexFormat, attributes, (twoPP + 2)- vertexIndex, (twoPP + 6)- vertexIndex, true, true, westNormal);
                        stWall(vertexFormat, stIndex, attributes, twoPP + 2 - vertexIndex, twoPP + 6 - vertexIndex, 'w');
                    } else if (col === width - 1) {
                        addAttributes(attrIndex, vertexFormat, attributes, (twoPP + 3)- vertexIndex, (twoPP + 7)- vertexIndex, true, true, eastNormal);
                        stWall(vertexFormat, stIndex, attributes, twoPP + 3 - vertexIndex, twoPP + 7 - vertexIndex, 'e');
                    }

                    addAttributes(attrIndex, vertexFormat, attributes, 0, perimeterPositions, true, true, southNormal); // add south row
                    stWall(vertexFormat, stIndex, attributes, 0, perimeterPositions, 's');

                    vertexIndex ++;
                    attrIndex += 3;
                    stIndex += 2;
                }
            } else { // sides
                col = 0;
                computePosition(row, col, maxHeight, minHeight);
                addAttributes(attrIndex, vertexFormat, attributes, 0, perimeterPositions, true, true, westNormal); // add west side
                stWall(vertexFormat, stIndex, attributes, 0, perimeterPositions, 'w');
                vertexIndex ++;
                attrIndex += 3;
                stIndex += 2;

                col = width - 1;
                computePosition(row, col, maxHeight, minHeight);
                addAttributes(attrIndex, vertexFormat, attributes, 0, perimeterPositions, true, true, eastNormal); // add east side
                stWall(vertexFormat, stIndex, attributes, 0, perimeterPositions, 'e');
                vertexIndex ++;
                attrIndex += 3;
                stIndex += 2;
            }
        }

        if (closeBottom || closeTop) {
            var maxH = (closeTop) ? maxHeight : undefined;
            var minH = (closeBottom) ? minHeight : undefined;
            var incAmount = perimeterPositions + 8;
            vertexIndex += incAmount;
            attrIndex += 3 * incAmount;
            stIndex += 2 * incAmount;
            for (row = 0; row < height; ++row) { // fill in middle
                for (col = 0; col < width; ++col) {
                    computePosition(row, col, maxH, minH);
                    addAttributes(attrIndex, vertexFormat, attributes, 0, size, closeTop, closeBottom);
                    stTopBottom(vertexFormat, stIndex, attributes, 0, size, closeTop, closeBottom);
                    vertexIndex ++;
                    attrIndex += 3;
                    stIndex += 2;
                }
            }
        }

        var topBS = BoundingSphere.fromExtent3D(options.extent, ellipsoid, maxHeight, topBoundingSphere);
        var bottomBS = BoundingSphere.fromExtent3D(options.extent, ellipsoid, minHeight, bottomBoundingSphere);
        var indices = [];
        var indicesIndex = 0;
        var attr = {
                indices: indices,
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
        var evenWidth = (width % 2 === 0);
        while (i < perimeterPositions) {
            upperLeft = i;
            lowerLeft = upperLeft + perimeterPositions;
            if (i > 0 && i < width) { // north wall
                lowerRight = lowerLeft - 1;
                upperRight = upperLeft - 1;
            } else if (i >= perimeterPositions - width && i < perimeterPositions - 1) { // south wall
                lowerRight = lowerLeft + 1;
                upperRight = upperLeft + 1;
            } else if (i === 0) { // north wall: NW corner
                lowerRight = lowerLeft + width;
                upperRight = upperLeft + width;
                upperLeft = twoPP; //get clone of corner point
                lowerLeft = upperLeft + 4;
            } else if (i === perimeterPositions - 1) { // south wall: SE corner
                lowerRight = lowerLeft - width;
                upperRight = upperLeft - width;
                upperLeft = twoPP + 3; //get clone of corner point
                lowerLeft = upperLeft + 4;
            } else if (evenWidth && i % 2 === 0 || !evenWidth && i % 2 !== 0) { // west walll
                lowerRight = lowerLeft + 2;
                upperRight = upperLeft + 2;
                if (upperRight === perimeterPositions - width) {
                    upperRight = twoPP + 2; //get clone of corner point
                    lowerRight = upperRight + 4;
                }
            } else { // east wall: if (evenWidth && i % 2 !== 0 || !evenWidth && i % 2 === 0)
                lowerRight = lowerLeft - 2;
                upperRight = upperLeft - 2;
                if (upperRight === width - 1) {
                    upperRight = twoPP + 1; //get clone of corner point
                    lowerRight = upperRight + 4;
                }
            }

            indices[indicesIndex++] = upperLeft;
            indices[indicesIndex++] = lowerLeft;
            indices[indicesIndex++] = upperRight;
            indices[indicesIndex++] = upperRight;
            indices[indicesIndex++] = lowerLeft;
            indices[indicesIndex++] = lowerRight;
            i++;
        }

        if (closeTop || closeBottom) {
            var index = perimeterPositions*2 + 8;
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
                        indices[indicesIndex++] = upperLeft;
                        indices[indicesIndex++] = lowerLeft;
                        indices[indicesIndex++] = upperRight;
                        indices[indicesIndex++] = upperRight;
                        indices[indicesIndex++] = lowerLeft;
                        indices[indicesIndex++] = lowerRight;
                    }
                    ++index;
                }
                ++index;
            }
        }
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
     * @param {Matrix4} [options.modelMatrix] The model matrix for this geometry.
     * @param {Color} [options.color] The color of the geometry when a per-geometry color appearance is used.
     * @param {Object} [options.extrudedOptions] Extruded options
     * @param {Number} [options.extrudedOptions.height] Height of extruded surface
     * @param {Boolean} [options.extrudedOptions.closeTop=true] Render top of extrusion
     * @param {Number} [options.extrudedOptions.closeBottom=true] Render bottom of extrusion
     * @param {DOC_TBA} [options.pickData] DOC_TBA
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
     *     granularity : 0.01,
     *     surfaceHeight : 10000.0
     * });
     */
    var ExtentGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        var attr;

        extent = options.extent;
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }
        extent.validate();

        var granularity = defaultValue(options.granularity, CesiumMath.toRadians(1.0));
        var width = Math.ceil((extent.east - extent.west) / granularity) + 1;
        var height = Math.ceil((extent.north - extent.south) / granularity) + 1;
        granularityX = (extent.east - extent.west) / (width - 1);
        granularityY = (extent.north - extent.south) / (height - 1);

        ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        radiiSquared = ellipsoid.getRadiiSquared();

        var surfaceHeight = defaultValue(options.surfaceHeight, 0.0);
        var rotation = defaultValue(options.rotation, 0.0);

        // for computing texture coordinates
        lonScalar = 1.0 / (extent.east - extent.west);
        latScalar = 1.0 / (extent.north - extent.south);

        extent.getNorthwest(nwCartographic);
        extent.getCenter(centerCartographic);
        var latitude, longitude;

        granYCos = granularityY * cos(rotation);
        granYSin = granularityY * sin(rotation);
        granXCos = granularityX * cos(rotation);
        granXSin = granularityX * sin(rotation);

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

        if (typeof options.extrudedOptions !== 'undefined') {
            attr = constructExtrudedExtent(options, vertexFormat, width, height, surfaceHeight);
        } else {
            attr = constructExtent(options, vertexFormat, width, height, surfaceHeight);
        }

        var attributes = {};

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
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
         */
        this.attributes = attributes;

        /**
         * The geometry indices.
         *
         * @type Array
         */
        this.indexList = attr.indices;
        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = attr.boundingSphere;

        /**
         * DOC_TBA
         */
        this.primitiveType = PrimitiveType.TRIANGLES;
    };

    /**
     * DOC_TBA
     */
    ExtentGeometry.prototype.cloneGeometry = Geometry.prototype.cloneGeometry;

    return ExtentGeometry;
});
