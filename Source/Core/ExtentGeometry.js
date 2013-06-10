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

    /**
     * Creates geometry for a cartographic extent on an ellipsoid centered at the origin.
     *
     * @param {Extent} options.extent A cartographic extent with north, south, east and west properties in radians.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the extent lies.
     * @param {Number} [options.granularity=0.1] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
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
        var radiiSquaredX = radiiSquared.x;
        var radiiSquaredY = radiiSquared.y;
        var radiiSquaredZ = radiiSquared.z;

        var surfaceHeight = defaultValue(options.surfaceHeight, 0.0);
        var rotation = defaultValue(options.rotation, 0.0);

        var cos = Math.cos;
        var sin = Math.sin;
        var sqrt = Math.sqrt;

        // for computing texture coordinates
        var lonScalar = 1.0 / (extent.east - extent.west);
        var latScalar = 1.0 / (extent.north - extent.south);

        extent.getNorthwest(nwCartographic);
        extent.getCenter(centerCartographic);
        var latitude, longitude;
        var stLatitude, stLongitude;

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

        var vertexIndex = 0;
        var attrIndex = 0;
        var stIndex = 0;
        var size = width * height;

        var positions;
        var textureCoordinates;
        var normals;
        var tangents;
        var binormals;

        function setAttributeSize(vertexCount){
            var threeCount = vertexCount * 3;
            positions = (vertexFormat.position) ? new Array(threeCount) : undefined;
            textureCoordinates = (vertexFormat.st) ? new Array(vertexCount * 2) : undefined;
            normals = (vertexFormat.normal) ? new Array(threeCount) : undefined;
            tangents = (vertexFormat.tangent) ? new Array(threeCount) : undefined;
            binormals = (vertexFormat.binormal) ? new Array(threeCount) : undefined;
        }

        function computePosition(row, col, maxHeight, minHeight) {
            latitude = nwCartographic.latitude - granYCos*row + col*granXSin;
            stLatitude = extent.north - granularityY*row;

            var cosLatitude = cos(latitude);
            var nZ = sin(latitude);
            var kZ = radiiSquaredZ * nZ;

            longitude = nwCartographic.longitude + row*granYSin + col*granXCos;
            stLongitude = extent.west + col*granularityX;

            var nX = cosLatitude * cos(longitude);
            var nY = cosLatitude * sin(longitude);

            var kX = radiiSquaredX * nX;
            var kY = radiiSquaredY * nY;

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

        function incrementIndex(amount) {
            vertexIndex += amount;
            attrIndex += 3*amount;
            stIndex += 2*amount;
        }

        function constructExtent(options, extent, vertexFormat){
            setAttributeSize(size);

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
                    incrementIndex(1);
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
            attr = {
                    indices: indices,
                    binormals: binormals,
                    tangents: tangents,
                    normals: normals,
                    textureCoordinates: textureCoordinates,
                    positions: positions,
                    boundingSphere: BoundingSphere.fromExtent3D(options.extent, ellipsoid, surfaceHeight)
            };
        }

        function constructExtrudedExtent(options, extent, vertexFormat) {
            var extrudedOptions = options.extrudedOptions;
            if (typeof extrudedOptions.height !== 'number'){
                return constructExtent(options, extent, vertexFormat);
            }
            var minHeight = Math.min(extrudedOptions.height, surfaceHeight);
            var maxHeight = Math.max(extrudedOptions.height, surfaceHeight);
            if (CesiumMath.equalsEpsilon(minHeight, maxHeight, 0.1)) {
                return constructExtent(options, extent, vertexFormat);
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

            setAttributeSize(vertexCount);

             var addAttributes = function(offset, extrudedOffset, top, bottom, setNormal) {
                if (!top) {
                    extrudedOffset = offset;
                }

                var threeExtrudedOffset = extrudedOffset*3;
                var threeOffset = offset*3;

                var attrIndex1 = attrIndex + 1;
                var attrIndex2 = attrIndex + 2;

                if (vertexFormat.position) {
                    if (bottom) {
                        positions[attrIndex + threeExtrudedOffset ] = extrudedPosition.x;
                        positions[attrIndex1 + threeExtrudedOffset] = extrudedPosition.y;
                        positions[attrIndex2 + threeExtrudedOffset] = extrudedPosition.z;
                    }

                    if (top) {
                        positions[attrIndex + threeOffset] = position.x;
                        positions[attrIndex1 + threeOffset] = position.y;
                        positions[attrIndex2 + threeOffset] = position.z;
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
                            normals[attrIndex + threeOffset] = normal.x;
                            normals[attrIndex1 + threeOffset] = normal.y;
                            normals[attrIndex2 + threeOffset] = normal.z;
                        }

                        if (vertexFormat.tangent) {
                            tangents[attrIndex + threeOffset] = tangent.x;
                            tangents[attrIndex1 + threeOffset] = tangent.y;
                            tangents[attrIndex2 + threeOffset] = tangent.z;
                        }

                        if (vertexFormat.binormal) {
                            binormals[attrIndex + threeOffset] = binormal.x;
                            binormals[attrIndex1 + threeOffset] = binormal.y;
                            binormals[attrIndex2 + threeOffset] = binormal.z;
                        }
                    }

                    if (bottom) {
                        if (vertexFormat.normal) {
                            normals[attrIndex + threeExtrudedOffset] = extrudedNormal.x;
                            normals[attrIndex1 + threeExtrudedOffset] = extrudedNormal.y;
                            normals[attrIndex2 + threeExtrudedOffset] = extrudedNormal.z;
                        }

                        if (vertexFormat.tangent) {
                            tangents[attrIndex + threeExtrudedOffset] = extrudedTangent.x;
                            tangents[attrIndex1 + threeExtrudedOffset] = extrudedTangent.y;
                            tangents[attrIndex2 + threeExtrudedOffset] = extrudedTangent.z;
                        }

                        if (vertexFormat.binormal) {
                            binormals[attrIndex + threeExtrudedOffset] = binormal.x;
                            binormals[attrIndex1 + threeExtrudedOffset] = binormal.y;
                            binormals[attrIndex2 + threeExtrudedOffset] = binormal.z;
                        }
                    }
                }
            };

            var stWall = function(offset, extrudedOffset, direction){
                if (vertexFormat.st) {
                    var twoOffset = offset*2;
                    var twoExtrudedOffset = extrudedOffset*2;

                    var stLon = (stLongitude - extent.west) * lonScalar;
                    var stLat = (stLatitude - extent.south) * latScalar;

                    if (direction === 'n') {
                        textureCoordinates[stIndex + twoExtrudedOffset] = 1 - stLon;
                        textureCoordinates[stIndex + 1 + twoExtrudedOffset] = 0;
                        textureCoordinates[stIndex + twoOffset] =  1 - stLon;
                        textureCoordinates[stIndex + twoOffset + 1] = 1;
                    } else if (direction === 's') {
                        textureCoordinates[stIndex + twoExtrudedOffset] = stLon;
                        textureCoordinates[stIndex + 1 + twoExtrudedOffset] = 0;
                        textureCoordinates[stIndex + twoOffset] = stLon;
                        textureCoordinates[stIndex + twoOffset + 1] = 1;
                    } else if (direction === 'e') {
                        textureCoordinates[stIndex + twoExtrudedOffset] = stLat;
                        textureCoordinates[stIndex + 1 + twoExtrudedOffset] = 0;
                        textureCoordinates[stIndex + twoOffset] = stLat;
                        textureCoordinates[stIndex + twoOffset + 1] = 1;
                    } else if (direction === 'w') {
                        textureCoordinates[stIndex + twoExtrudedOffset] = 1 - stLat;
                        textureCoordinates[stIndex + 1 + twoExtrudedOffset] =  0;
                        textureCoordinates[stIndex + twoOffset] = 1 - stLat;
                        textureCoordinates[stIndex + twoOffset + 1] = 1;
                    }
                }
            };

            var stTopBottom = function(offset, extrudedOffset) {
                if (vertexFormat.st) {
                    var stLon = (stLongitude - extent.west) * lonScalar;
                    var stlat = (stLatitude - extent.south) * latScalar;
                    if (!closeTop) {
                        extrudedOffset = offset;
                    } else {
                        textureCoordinates[stIndex + offset*2] = stLon;
                        textureCoordinates[stIndex + offset*2 + 1] = stlat;
                    }
                    if (closeBottom) {
                        textureCoordinates[stIndex +  extrudedOffset*2] = 1 - stLon;
                        textureCoordinates[stIndex + 1 +  extrudedOffset*2] = stlat;
                    }
                }
            };

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
                            addAttributes(twoPP - vertexIndex, (twoPP + 4) - vertexIndex, true, true, westNormal);
                            stWall(twoPP - vertexIndex, twoPP + 4 - vertexIndex, 'w');
                        } else if (col === width - 1) {
                            addAttributes((twoPP + 1)- vertexIndex, (twoPP + 5)- vertexIndex, true, true, eastNormal);
                            stWall(twoPP + 1 - vertexIndex, twoPP + 5 - vertexIndex, 'e');
                        }

                        addAttributes(0, perimeterPositions, true, true, northNormal); // add north row
                        stWall(0, perimeterPositions, 'n');

                        incrementIndex(1);
                    }
                } else if (row === height - 1) { // south row
                    for (col = 0; col < width; ++col) {
                        computePosition(row, col, maxHeight, minHeight);

                        if (col === 0) {
                            addAttributes((twoPP + 2)- vertexIndex, (twoPP + 6)- vertexIndex, true, true, westNormal);
                            stWall(twoPP + 2 - vertexIndex, twoPP + 6 - vertexIndex, 'w');
                        } else if (col === width - 1) {
                            addAttributes((twoPP + 3)- vertexIndex, (twoPP + 7)- vertexIndex, true, true, eastNormal);
                            stWall(twoPP + 3 - vertexIndex, twoPP + 7 - vertexIndex, 'e');
                        }

                        addAttributes(0, perimeterPositions, true, true, southNormal); // add south row
                        stWall(0, perimeterPositions, 's');

                        incrementIndex(1);
                    }
                } else { // sides
                    col = 0;
                    computePosition(row, col, maxHeight, minHeight);
                    addAttributes(0, perimeterPositions, true, true, westNormal); // add west side
                    stWall(0, perimeterPositions, 'w');
                    incrementIndex(1);

                    col = width - 1;
                    computePosition(row, col, maxHeight, minHeight);
                    addAttributes(0, perimeterPositions, true, true, eastNormal); // add east side
                    stWall(0, perimeterPositions, 'e');
                    incrementIndex(1);
                }
            }

            if (closeBottom || closeTop) {
                var maxH = (closeTop) ? maxHeight : undefined;
                var minH = (closeBottom) ? minHeight : undefined;
                incrementIndex(perimeterPositions + 8);
                for (row = 0; row < height; ++row) { // fill in middle
                    for (col = 0; col < width; ++col) {
                        computePosition(row, col, maxH, minH);
                        addAttributes(0, size, closeTop, closeBottom);
                        stTopBottom(0, size);
                        incrementIndex(1);
                    }
                }
            }

            var topBS = BoundingSphere.fromExtent3D(options.extent, ellipsoid, maxHeight, topBoundingSphere);
            var bottomBS = BoundingSphere.fromExtent3D(options.extent, ellipsoid, minHeight, bottomBoundingSphere);
            var indices = [];
            var indicesIndex = 0;
            attr = {
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
        }

        if (typeof options.extrudedOptions !== 'undefined') {
            constructExtrudedExtent(options, extent, vertexFormat);
        } else {
            constructExtent(options, extent, vertexFormat);
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
