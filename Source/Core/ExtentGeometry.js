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
        './GeometryAttribute',
        './GeometryIndices',
        './Math',
        './Matrix2',
        './Matrix4',
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
        GeometryAttribute,
        GeometryIndices,
        CesiumMath,
        Matrix2,
        Matrix4,
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

    function constructExtent(options, extent, vertexFormat){
        var granularity = defaultValue(options.granularity, 0.1);
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

        var positionIndex = 0;
        var stIndex = 0;
        var normalIndex = 0;
        var tangentIndex = 0;
        var binormalIndex = 0;

        var size = width * height;
        var threeSize = size * 3;
        var positions = (vertexFormat.position) ? new Array(threeSize) : undefined;
        var textureCoordinates = (vertexFormat.st) ? new Array(size * 2) : undefined;
        var normals = (vertexFormat.normal) ? new Array(threeSize) : undefined;
        var tangents = (vertexFormat.tangent) ? new Array(threeSize) : undefined;
        var binormals = (vertexFormat.binormal) ? new Array(threeSize) : undefined;

        for ( var row = 0; row < height; ++row) {
            for ( var col = 0; col < width; ++col) {
                latitude = nwCartographic.latitude - granYCos*row + col*granXSin;
                var cosLatitude = cos(latitude);
                var nZ = sin(latitude);
                var kZ = radiiSquaredZ * nZ;

                longitude = nwCartographic.longitude + row*granYSin + col*granXCos;

                var nX = cosLatitude * cos(longitude);
                var nY = cosLatitude * sin(longitude);

                var kX = radiiSquaredX * nX;
                var kY = radiiSquaredY * nY;

                var gamma = sqrt((kX * nX) + (kY * nY) + (kZ * nZ));

                var rSurfaceX = kX / gamma;
                var rSurfaceY = kY / gamma;
                var rSurfaceZ = kZ / gamma;

                position.x = rSurfaceX + nX * surfaceHeight;
                position.y = rSurfaceY + nY * surfaceHeight;
                position.z = rSurfaceZ + nZ * surfaceHeight;

                if (vertexFormat.position) {
                    positions[positionIndex++] = position.x;
                    positions[positionIndex++] = position.y;
                    positions[positionIndex++] = position.z;
                }

                if (vertexFormat.st) {
                    textureCoordinates[stIndex++] = (longitude - extent.west) * lonScalar;
                    textureCoordinates[stIndex++] = (latitude - extent.south) * latScalar;
                }

                if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                    ellipsoid.geodeticSurfaceNormal(position, normal);

                    if (vertexFormat.normal) {
                        normals[normalIndex++] = normal.x;
                        normals[normalIndex++] = normal.y;
                        normals[normalIndex++] = normal.z;
                    }

                    if (vertexFormat.tangent) {
                        Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);

                        tangents[tangentIndex++] = tangent.x;
                        tangents[tangentIndex++] = tangent.y;
                        tangents[tangentIndex++] = tangent.z;
                    }

                    if (vertexFormat.binormal) {
                        Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                        Cartesian3.cross(normal, tangent, binormal);

                        binormals[binormalIndex++] = binormal.x;
                        binormals[binormalIndex++] = binormal.y;
                        binormals[binormalIndex++] = binormal.z;
                    }
                }
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
        var attributes = {
                indices: indices,
                binormals: binormals,
                tangents: tangents,
                normals: normals,
                textureCoordinates: textureCoordinates,
                positions: positions,
                boundingSphere: BoundingSphere.fromExtent3D(options.extent, ellipsoid, surfaceHeight)
        };

        return attributes;
    }

    function constructExtrudedExtent(options, extent, vertexFormat) {
        var extrudedOptions = options.extrudedOptions;
        var surfaceHeight = defaultValue(options.surfaceHeight, 0);
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

        var granularity = defaultValue(options.granularity, 0.1);
        var width = Math.ceil((extent.east - extent.west) / granularity) + 1;
        var height = Math.ceil((extent.north - extent.south) / granularity) + 1;
        var granularityX = (extent.east - extent.west) / (width - 1);
        var granularityY = (extent.north - extent.south) / (height - 1);

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var radiiSquared = ellipsoid.getRadiiSquared();
        var radiiSquaredX = radiiSquared.x;
        var radiiSquaredY = radiiSquared.y;
        var radiiSquaredZ = radiiSquared.z;
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
        var positionIndex = 0;
        var stIndex = 0;
        var normalIndex = 0;
        var tangentIndex = 0;
        var binormalIndex = 0;

        var size = width * height;
        var perimeterPositions = 2*width + 2*height - 4;
        var vertexCount = (perimeterPositions + 4)*2;
        if (closeTop) {
            vertexCount += size;
        }
        if (closeBottom) {
            vertexCount += size;
        }
        var threeVertexCount = vertexCount * 3;
        var twoVertexCount = vertexCount * 2;
        var positions = (vertexFormat.position) ? new Array(threeVertexCount) : undefined;
        var textureCoordinates = (vertexFormat.st) ? new Array(twoVertexCount) : undefined;
        var normals = (vertexFormat.normal) ? new Array(threeVertexCount) : undefined;
        var tangents = (vertexFormat.tangent) ? new Array(threeVertexCount) : undefined;
        var binormals = (vertexFormat.binormal) ? new Array(threeVertexCount) : undefined;

        var computePosition = function(row, col, top, bottom) {
            top = defaultValue(top, true);
            bottom = defaultValue(bottom, true);
            var lat = nwCartographic.latitude - granYCos*row + col*granXSin;
            var cosLatitude = cos(lat);
            var nZ = sin(lat);
            var kZ = radiiSquaredZ * nZ;

            var lon = nwCartographic.longitude + row*granYSin + col*granXCos;

            var nX = cosLatitude * cos(lon);
            var nY = cosLatitude * sin(lon);

            var kX = radiiSquaredX * nX;
            var kY = radiiSquaredY * nY;

            var gamma = sqrt((kX * nX) + (kY * nY) + (kZ * nZ));

            var rSurfaceX = kX / gamma;
            var rSurfaceY = kY / gamma;
            var rSurfaceZ = kZ / gamma;

            if (top) {
                position.x = rSurfaceX + nX * maxHeight; // top
                position.y = rSurfaceY + nY * maxHeight;
                position.z = rSurfaceZ + nZ * maxHeight;
            }

            if (bottom) {
                extrudedPosition.x = rSurfaceX + nX * minHeight; // bottom
                extrudedPosition.y = rSurfaceY + nY * minHeight;
                extrudedPosition.z = rSurfaceZ + nZ * minHeight;
            }
        };

        var addAttributes = function(offset, extrudedOffset, top, bottom) {
            top = defaultValue(top, true);
            bottom = defaultValue(bottom, true);

            if (!top) {
                extrudedOffset = offset;
            }

            var threeExtrudedOffset = extrudedOffset*3;
            var twoExtrudedOffset = extrudedOffset*2;

            var threeOffset = offset*3;
            var twoOffset = offset*2;

            if (vertexFormat.position) {
                if (bottom) {
                    positions[positionIndex + threeExtrudedOffset ] = extrudedPosition.x;
                    positions[positionIndex + 1 + threeExtrudedOffset] = extrudedPosition.y;
                    positions[positionIndex + 2 + threeExtrudedOffset] = extrudedPosition.z;
                }

                if (top) {
                    positions[positionIndex + threeOffset] = position.x;
                    positions[positionIndex + threeOffset + 1] = position.y;
                    positions[positionIndex + threeOffset + 2] = position.z;
                }
            }

            if (vertexFormat.st) {
                var stLon = (longitude - extent.west) * lonScalar;
                var stlat = (latitude - extent.south) * latScalar;
                if (bottom) {
                    textureCoordinates[stIndex + twoExtrudedOffset] = 1 - stlat;
                    textureCoordinates[stIndex + 1 + twoExtrudedOffset] = 1 - stLon;
                }

                if (top) {
                    textureCoordinates[stIndex + twoOffset] = stlat;
                    textureCoordinates[stIndex + twoOffset + 1] = stLon;
                }
            }

            if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                ellipsoid.geodeticSurfaceNormal(position, normal);
                Cartesian3.negate(normal, extrudedNormal);

                if (vertexFormat.normal) {
                    if (bottom) {
                        normals[normalIndex + threeExtrudedOffset] = extrudedNormal.x;
                        normals[normalIndex + 1 + threeExtrudedOffset] = extrudedNormal.y;
                        normals[normalIndex + 2 + threeExtrudedOffset] = extrudedNormal.z;
                    }

                    if (top) {
                        normals[normalIndex + threeOffset] = normal.x;
                        normals[normalIndex + threeOffset + 1] = normal.y;
                        normals[normalIndex + threeOffset+ 2] = normal.z;
                    }
                }

                if (vertexFormat.tangent) {
                    Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                    Cartesian3.negate(tangent, extrudedTangent);
                    if (bottom) {
                        tangents[tangentIndex + threeExtrudedOffset] = extrudedTangent.x;
                        tangents[tangentIndex + 1 + threeExtrudedOffset] = extrudedTangent.y;
                        tangents[tangentIndex + 2 + threeExtrudedOffset] = extrudedTangent.z;
                    }

                    if (top) {
                        tangents[tangentIndex + threeOffset] = tangent.x;
                        tangents[tangentIndex + threeOffset + 1] = tangent.y;
                        tangents[tangentIndex + threeOffset + 2] = tangent.z;
                    }
                }

                if (vertexFormat.binormal) {
                    Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                    Cartesian3.cross(normal, tangent, binormal);

                    if (bottom) {
                        binormals[binormalIndex + threeExtrudedOffset] = binormal.x;
                        binormals[binormalIndex + 1 + threeExtrudedOffset] = binormal.y;
                        binormals[binormalIndex + 2 + threeExtrudedOffset] = binormal.z;
                    }

                    if (top) {
                        binormals[binormalIndex + threeOffset] = binormal.x;
                        binormals[binormalIndex + threeOffset + 1] = binormal.y;
                        binormals[binormalIndex + threeOffset + 2] = binormal.z;
                    }
                }
            }
        };

        var addAttributesAtIndex = function(index, extrudedIndex) {
            var o = index - vertexIndex;
            var eo = extrudedIndex - vertexIndex;
            addAttributes(o, eo);
        };

        var incrementIndex = function(amount) {
            vertexIndex += amount;
            positionIndex += 3*amount;
            stIndex += 2*amount;
            normalIndex += 3*amount;
            tangentIndex += 3*amount;
            binormalIndex += 3*amount;
        };

        var row;
        var col;

        for (row = 0; row < height; ++row) { // add vertices for walls (the perimeter)
            if (row === 0) { // north row
                for (col = 0; col < width; ++col) {
                    computePosition(row, col);
                    addAttributes(0, perimeterPositions); // add north row
                    if (col === 0) { // add clone northeast and northwest corners
                        addAttributesAtIndex(2*perimeterPositions, 2*perimeterPositions + 4);
                    } else if (col === width - 1) {
                        addAttributesAtIndex(2*perimeterPositions + 1, 2*perimeterPositions + 5);
                    }
                    incrementIndex(1);
                }
            } else if (row === height - 1) { // south row
                for (col = 0; col < width; ++col) {
                    computePosition(row, col);
                    addAttributes(0, perimeterPositions); // add south row
                    if (col === 0) { // add clone southeast and southwest corners
                        addAttributesAtIndex(2*perimeterPositions + 2, 2*perimeterPositions + 6);
                    } else if (col === width - 1) {
                        addAttributesAtIndex(2*perimeterPositions + 3, 2*perimeterPositions + 7);
                    }
                    incrementIndex(1);
                }
            } else { // sides
                col = 0;
                computePosition(row, col);
                addAttributes(0, perimeterPositions); // add west side
                incrementIndex(1);

                col = width - 1;
                computePosition(row, col);
                addAttributes(0, perimeterPositions); // add east side
                incrementIndex(1);
            }
        }

        if (closeBottom || closeTop) {
            incrementIndex(perimeterPositions + 8);
            for (row = 0; row < height; ++row) { // fill in middle
                for (col = 0; col < width; ++col) {
                    computePosition(row, col, closeTop, closeBottom);
                    addAttributes(0, size, closeTop, closeBottom);
                    incrementIndex(1);
                }
            }
        }

        var topBS = BoundingSphere.fromExtent3D(options.extent, ellipsoid, maxHeight, topBoundingSphere);
        var bottomBS = BoundingSphere.fromExtent3D(options.extent, ellipsoid, minHeight, bottomBoundingSphere);
        var indices = [];
        var indicesIndex = 0;
        var attributes = {
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
                if (i === width - 1) {
                    upperLeft = perimeterPositions * 2 + 1; //get clone of corner point
                    lowerLeft = upperLeft + 4;
                }
            } else if (i >= perimeterPositions - width && i < perimeterPositions - 1) { // south wall
                lowerRight = lowerLeft + 1;
                upperRight = upperLeft + 1;
                if (i === perimeterPositions - width) {
                    upperLeft = perimeterPositions * 2 + 2; //get clone of corner point
                    lowerLeft = upperLeft + 4;
                }
            } else if (i === 0) { // west wall: NW corner
                lowerRight = lowerLeft + width;
                upperRight = upperLeft + width;
                upperLeft = perimeterPositions * 2; //get clone of corner point
                lowerLeft = upperLeft + 4;
            } else if (i === perimeterPositions - 1) { // east wall: SE corner
                lowerRight = lowerLeft - width;
                upperRight = upperLeft - width;
                upperLeft = perimeterPositions * 2 + 3; //get clone of corner point
                lowerLeft = upperLeft + 4;
            } else if (evenWidth && i % 2 === 0 || !evenWidth && i % 2 !== 0) { // west walll
                lowerRight = lowerLeft + 2;
                upperRight = upperLeft + 2;
            } else { // east wall: if (evenWidth && i % 2 !== 0 || !evenWidth && i % 2 === 0)
                lowerRight = lowerLeft - 2;
                upperRight = upperLeft - 2;
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
            for (i = 0; i < height - 1; ++i) {
                for ( var j = 0; j < width - 1; ++j) {
                    upperLeft = index;
                    lowerLeft = upperLeft + width;
                    lowerRight = lowerLeft + 1;
                    upperRight = upperLeft + 1;
                    if (closeBottom) {
                        if (closeTop) {
                            indices[indicesIndex++] = upperRight + size;
                            indices[indicesIndex++] = lowerLeft + size;
                            indices[indicesIndex++] = upperLeft + size;
                            indices[indicesIndex++] = lowerRight + size;
                            indices[indicesIndex++] = lowerLeft + size;
                            indices[indicesIndex++] = upperRight + size;
                        } else {
                            indices[indicesIndex++] = upperRight;
                            indices[indicesIndex++] = lowerLeft;
                            indices[indicesIndex++] = upperLeft;
                            indices[indicesIndex++] = lowerRight;
                            indices[indicesIndex++] = lowerLeft;
                            indices[indicesIndex++] = upperRight;
                        }
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

        return attributes;
    }


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

        if (typeof options.extrudedOptions !== 'undefined') {
            attr = constructExtrudedExtent(options, extent, vertexFormat);
        } else {
            attr = constructExtent(options, extent, vertexFormat);
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
         * An array of {@link GeometryIndices} defining primitives.
         *
         * @type Array
         */
        this.indexLists = [
            new GeometryIndices({
                primitiveType : PrimitiveType.TRIANGLES,
                values : attr.indices
            })
        ];

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = attr.boundingSphere;

        /**
         * The 4x4 transformation matrix that transforms the geometry from model to world coordinates.
         * When this is the identity matrix, the geometry is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type Matrix4
         *
         * @see Transforms.eastNorthUpToFixedFrame
         */
        this.modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY.clone());

        /**
         * The color of the geometry when a per-geometry color appearance is used.
         *
         * @type Color
         */
        this.color = options.color;

        /**
         * DOC_TBA
         */
        this.pickData = options.pickData;
    };



    return ExtentGeometry;
});
