/*global define*/
define([
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './GeographicProjection',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './GeometryInstance',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './Matrix2',
        './Matrix3',
        './PrimitiveType',
        './Quaternion',
        './Rectangle',
        './VertexFormat'
    ], function(
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        GeographicProjection,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        Matrix2,
        Matrix3,
        PrimitiveType,
        Quaternion,
        Rectangle,
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
    var stRectangle = new Rectangle();
    var textureMatrix = new Matrix2();
    var rotationMatrix = new Matrix2();
    var tangentRotationMatrix = new Matrix3();
    var proj = new GeographicProjection();
    var position = new Cartesian3();
    var normal = new Cartesian3();
    var tangent = new Cartesian3();
    var binormal = new Cartesian3();
    var extrudedPosition = new Cartesian3();
    var bottomBoundingSphere = new BoundingSphere();
    var topBoundingSphere = new BoundingSphere();

    var v1Scratch = new Cartesian3();
    var v2Scratch = new Cartesian3();
    var textureCoordsScratch = new Cartesian2();
    var quaternionScratch = new Quaternion();

    var cos = Math.cos;
    var sin = Math.sin;
    var sqrt = Math.sqrt;

    var stLatitude, stLongitude;

    function computePosition(params, row, col, maxHeight, minHeight) {
        var radiiSquared = params.radiiSquared;

        stLatitude = nwCartographic.latitude - params.granYCos * row + col * params.granXSin;
        var cosLatitude = cos(stLatitude);
        var nZ = sin(stLatitude);
        var kZ = radiiSquared.z * nZ;

        stLongitude = nwCartographic.longitude + row * params.granYSin + col * params.granXCos;
        var nX = cosLatitude * cos(stLongitude);
        var nY = cosLatitude * sin(stLongitude);

        var kX = radiiSquared.x * nX;
        var kY = radiiSquared.y * nY;

        var gamma = sqrt((kX * nX) + (kY * nY) + (kZ * nZ));

        var rSurfaceX = kX / gamma;
        var rSurfaceY = kY / gamma;
        var rSurfaceZ = kZ / gamma;

        if (defined(maxHeight)) {
            position.x = rSurfaceX + nX * maxHeight; // top
            position.y = rSurfaceY + nY * maxHeight;
            position.z = rSurfaceZ + nZ * maxHeight;
        }

        if (defined(minHeight)) {
            extrudedPosition.x = rSurfaceX + nX * minHeight; // bottom
            extrudedPosition.y = rSurfaceY + nY * minHeight;
            extrudedPosition.z = rSurfaceZ + nZ * minHeight;
        }
    }


    function createAttributes(vertexFormat, attributes) {
        var geo = new Geometry({
            attributes : new GeometryAttributes(),
            primitiveType : PrimitiveType.TRIANGLES
        });
        if (vertexFormat.position) {
            geo.attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : attributes.positions
            });
        }
        if (vertexFormat.normal) {
            geo.attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : attributes.normals
            });
        }
        if (vertexFormat.tangent) {
            geo.attributes.tangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : attributes.tangents
            });
        }
        if (vertexFormat.binormal) {
            geo.attributes.binormal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : attributes.binormals
            });
        }
        return geo;
    }

    function calculateAttributesTopBottom(positions, vertexFormat, ellipsoid, top, bottom) {
        var length = positions.length;

        var normals = (vertexFormat.normal) ? new Float32Array(length) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(length) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(length) : undefined;

        var attrIndex = 0;
        var bottomOffset = (top) ? length / 2 : 0;
        length = (top && bottom) ? length / 2 : length;
        for ( var i = 0; i < length; i += 3) {
            var p = Cartesian3.fromArray(positions, i, position);
            var attrIndex1 = attrIndex + 1;
            var attrIndex2 = attrIndex + 2;

            if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                normal = ellipsoid.geodeticSurfaceNormal(p, normal);
                if (vertexFormat.tangent || vertexFormat.binormal) {
                    Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                    Matrix3.multiplyByVector(tangentRotationMatrix, tangent, tangent);
                    Cartesian3.normalize(tangent, tangent);

                    if (vertexFormat.binormal) {
                        Cartesian3.normalize(Cartesian3.cross(normal, tangent, binormal), binormal);
                    }
                }

                if (top) {
                    if (vertexFormat.normal) {
                        normals[attrIndex] = normal.x;
                        normals[attrIndex1] = normal.y;
                        normals[attrIndex2] = normal.z;
                    }
                    if (vertexFormat.tangent) {
                        tangents[attrIndex] = tangent.x;
                        tangents[attrIndex1] = tangent.y;
                        tangents[attrIndex2] = tangent.z;
                    }
                    if (vertexFormat.binormal) {
                        binormals[attrIndex] = binormal.x;
                        binormals[attrIndex1] = binormal.y;
                        binormals[attrIndex2] = binormal.z;
                    }
                }

                if (bottom) {
                    if (vertexFormat.normal) {
                        normals[attrIndex + bottomOffset] = -normal.x;
                        normals[attrIndex1 + bottomOffset] = -normal.y;
                        normals[attrIndex2 + bottomOffset] = -normal.z;
                    }
                    if (vertexFormat.tangent) {
                        tangents[attrIndex + bottomOffset] = -tangent.x;
                        tangents[attrIndex1 + bottomOffset] = -tangent.y;
                        tangents[attrIndex2 + bottomOffset] = -tangent.z;
                    }
                    if (vertexFormat.binormal) {
                        binormals[attrIndex + bottomOffset] = binormal.x;
                        binormals[attrIndex1 + bottomOffset] = binormal.y;
                        binormals[attrIndex2 + bottomOffset] = binormal.z;
                    }
                }
            }
            attrIndex += 3;
        }
        return createAttributes(vertexFormat, {
            positions : positions,
            normals : normals,
            tangents : tangents,
            binormals : binormals
        });
    }

    function calculateAttributesWall(positions, vertexFormat, ellipsoid) {
        var length = positions.length;

        var normals = (vertexFormat.normal) ? new Float32Array(length) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(length) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(length) : undefined;

        var attrIndex = 0;
        var recomputeNormal = true;
        var bottomOffset = length / 2;
        for ( var i = 0; i < bottomOffset; i += 3) {
            var p = Cartesian3.fromArray(positions, i, position);
            var attrIndex1 = attrIndex + 1;
            var attrIndex2 = attrIndex + 2;

            if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                var p1 = Cartesian3.fromArray(positions, i + 3, v1Scratch);
                if (recomputeNormal) {
                    var p2 = Cartesian3.fromArray(positions, i + bottomOffset, v2Scratch);
                    Cartesian3.subtract(p1, p, p1);
                    Cartesian3.subtract(p2, p, p2);
                    normal = Cartesian3.normalize(Cartesian3.cross(p2, p1, normal), normal);
                    recomputeNormal = false;
                }

                if (Cartesian3.equalsEpsilon(p1, p, CesiumMath.EPSILON10)) { // if we've reached a corner
                    recomputeNormal = true;
                }

                if (vertexFormat.tangent || vertexFormat.binormal) {
                    binormal = ellipsoid.geodeticSurfaceNormal(p, binormal);
                    if (vertexFormat.tangent) {
                        tangent = Cartesian3.normalize(Cartesian3.cross(binormal, normal, tangent), tangent);
                    }
                }

                if (vertexFormat.normal) {
                    normals[attrIndex] = normal.x;
                    normals[attrIndex1] = normal.y;
                    normals[attrIndex2] = normal.z;
                    normals[attrIndex + bottomOffset] = normal.x;
                    normals[attrIndex1 + bottomOffset] = normal.y;
                    normals[attrIndex2 + bottomOffset] = normal.z;
                }

                if (vertexFormat.tangent) {
                    tangents[attrIndex] = tangent.x;
                    tangents[attrIndex1] = tangent.y;
                    tangents[attrIndex2] = tangent.z;
                    tangents[attrIndex + bottomOffset] = tangent.x;
                    tangents[attrIndex1 + bottomOffset] = tangent.y;
                    tangents[attrIndex2 + bottomOffset] = tangent.z;
                }

                if (vertexFormat.binormal) {
                    binormals[attrIndex] = binormal.x;
                    binormals[attrIndex1] = binormal.y;
                    binormals[attrIndex2] = binormal.z;
                    binormals[attrIndex + bottomOffset] = binormal.x;
                    binormals[attrIndex1 + bottomOffset] = binormal.y;
                    binormals[attrIndex2 + bottomOffset] = binormal.z;
                }
            }
            attrIndex += 3;
        }
        return createAttributes(vertexFormat, {
            positions : positions,
            normals : normals,
            tangents : tangents,
            binormals : binormals
        });
    }

    function calculateST(vertexFormat, stIndex, wallTextureCoordinates, params, offset) {
        textureCoordsScratch.x = (stLongitude - stRectangle.west) * params.lonScalar - 0.5;
        textureCoordsScratch.y = (stLatitude - stRectangle.south) * params.latScalar - 0.5;

        Matrix2.multiplyByVector(textureMatrix, textureCoordsScratch, textureCoordsScratch);

        textureCoordsScratch.x += 0.5;
        textureCoordsScratch.y += 0.5;

        if (defined(offset)) {
            wallTextureCoordinates[stIndex + offset] = textureCoordsScratch.x;
            wallTextureCoordinates[stIndex + 1 + offset] = textureCoordsScratch.y;
        }
        wallTextureCoordinates[stIndex++] = textureCoordsScratch.x;
        wallTextureCoordinates[stIndex++] = textureCoordsScratch.y;
        return stIndex;
    }

    function addWallPositions(wallPositions, posIndex, bottomOffset) {
        wallPositions[posIndex + bottomOffset] = extrudedPosition.x;
        wallPositions[posIndex++] = position.x;
        wallPositions[posIndex + bottomOffset] = extrudedPosition.y;
        wallPositions[posIndex++] = position.y;
        wallPositions[posIndex + bottomOffset] = extrudedPosition.z;
        wallPositions[posIndex++] = position.z;
        return wallPositions;
    }

    function constructRectangle(vertexFormat, params) {
        var ellipsoid = params.ellipsoid;
        var size = params.size;
        var height = params.height;
        var width = params.width;
        var surfaceHeight = params.surfaceHeight;

        var stIndex = 0;

        var positions = (vertexFormat.position) ? new Float64Array(size * 3) : undefined;
        var textureCoordinates = (vertexFormat.st) ? new Float32Array(size * 2) : undefined;

        var posIndex = 0;
        for ( var row = 0; row < height; ++row) {
            for ( var col = 0; col < width; ++col) {
                computePosition(params, row, col, surfaceHeight);

                positions[posIndex++] = position.x;
                positions[posIndex++] = position.y;
                positions[posIndex++] = position.z;

                if (vertexFormat.st) {
                    textureCoordsScratch.x = (stLongitude - stRectangle.west) * params.lonScalar - 0.5;
                    textureCoordsScratch.y = (stLatitude - stRectangle.south) * params.latScalar - 0.5;

                    Matrix2.multiplyByVector(textureMatrix, textureCoordsScratch, textureCoordsScratch);

                    textureCoordsScratch.x += 0.5;
                    textureCoordsScratch.y += 0.5;

                    textureCoordinates[stIndex++] = textureCoordsScratch.x;
                    textureCoordinates[stIndex++] = textureCoordsScratch.y;
                }
            }
        }

        var geo = calculateAttributesTopBottom(positions, vertexFormat, ellipsoid, true, false);

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

        geo.indices = indices;
        if (vertexFormat.st) {
            geo.attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : textureCoordinates
            });
        }

        return {
            boundingSphere : BoundingSphere.fromRectangle3D(params.rectangle, ellipsoid, surfaceHeight),
            geometry : geo
        };
    }

    function constructExtrudedRectangle(vertexFormat, params) {
        var surfaceHeight = params.surfaceHeight;
        var extrudedHeight = params.extrudedHeight;
        var minHeight = Math.min(extrudedHeight, surfaceHeight);
        var maxHeight = Math.max(extrudedHeight, surfaceHeight);
        if (CesiumMath.equalsEpsilon(minHeight, maxHeight, 0.1)) {
            return constructRectangle(vertexFormat, params);
        }

        var height = params.height;
        var width = params.width;
        var size = params.size;
        var ellipsoid = params.ellipsoid;

        var closeTop = defaultValue(params.closeTop, true);
        var closeBottom = defaultValue(params.closeBottom, true);

        var perimeterPositions = 2 * width + 2 * height - 4;
        var wallCount = (perimeterPositions + 4) * 2;

        var wallPositions = new Float64Array(wallCount * 3);
        var wallTextureCoordinates = (vertexFormat.st) ? new Float32Array(wallCount * 2) : undefined;

        var row;
        var col = 0;
        var posIndex = 0;
        var stIndex = 0;
        var bottomOffset = wallCount / 2 * 3;
        for (row = 0; row < height; row++) {
            computePosition(params, row, col, maxHeight, minHeight);
            wallPositions = addWallPositions(wallPositions, posIndex, bottomOffset);
            posIndex += 3;
            if (vertexFormat.st) {
                stIndex = calculateST(vertexFormat, stIndex, wallTextureCoordinates, params, wallCount);
            }
        }

        row = height - 1;
        for (col = 0; col < width; col++) {
            computePosition(params, row, col, maxHeight, minHeight);
            wallPositions = addWallPositions(wallPositions, posIndex, bottomOffset);
            posIndex += 3;
            if (vertexFormat.st) {
                stIndex = calculateST(vertexFormat, stIndex, wallTextureCoordinates, params, wallCount);
            }
        }

        col = width - 1;
        for (row = height - 1; row >= 0; row--) {
            computePosition(params, row, col, maxHeight, minHeight);
            wallPositions = addWallPositions(wallPositions, posIndex, bottomOffset);
            posIndex += 3;
            if (vertexFormat.st) {
                stIndex = calculateST(vertexFormat, stIndex, wallTextureCoordinates, params, wallCount);
            }
        }

        row = 0;
        for (col = width - 1; col >= 0; col--) {
            computePosition(params, row, col, maxHeight, minHeight);
            wallPositions = addWallPositions(wallPositions, posIndex, bottomOffset);
            posIndex += 3;
            if (vertexFormat.st) {
                stIndex = calculateST(vertexFormat, stIndex, wallTextureCoordinates, params, wallCount);
            }
        }

        var geo = calculateAttributesWall(wallPositions, vertexFormat, ellipsoid);

        if (vertexFormat.st) {
            geo.attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : wallTextureCoordinates
            });
        }

        var wallIndices = IndexDatatype.createTypedArray(wallCount, perimeterPositions * 6);

        var upperLeft;
        var lowerLeft;
        var lowerRight;
        var upperRight;
        var length = wallPositions.length / 6;
        var i;
        var index = 0;
        for (i = 0; i < length - 1; i++) {
            upperLeft = i;
            upperRight = upperLeft + 1;
            var p1 = Cartesian3.fromArray(wallPositions, upperLeft * 3, v1Scratch);
            var p2 = Cartesian3.fromArray(wallPositions, upperRight * 3, v2Scratch);
            if (Cartesian3.equalsEpsilon(p1, p2, CesiumMath.EPSILON10)) {
                continue;
            }
            lowerLeft = upperLeft + length;
            lowerRight = lowerLeft + 1;
            wallIndices[index++] = upperLeft;
            wallIndices[index++] = lowerLeft;
            wallIndices[index++] = upperRight;
            wallIndices[index++] = upperRight;
            wallIndices[index++] = lowerLeft;
            wallIndices[index++] = lowerRight;
        }

        geo.indices = wallIndices;

        if (closeBottom || closeTop) {
            var maxH;
            var minH;
            var topBottomCount = 0;
            var topBottomIndicesCount = 0;
            if (closeTop) {
                topBottomCount += size;
                topBottomIndicesCount += (width - 1) * (height - 1) * 6;
                maxH = maxHeight;
            }
            if (closeBottom) {
                topBottomCount += size;
                topBottomIndicesCount += (width - 1) * (height - 1) * 6;
                minH = minHeight;
            }

            var topBottomPositions = new Float64Array(topBottomCount * 3);
            var topBottomTextureCoordinates = (vertexFormat.st) ? new Float32Array(topBottomCount * 2) : undefined;
            var topBottomIndices = IndexDatatype.createTypedArray(topBottomCount, topBottomIndicesCount);

            posIndex = 0;
            stIndex = 0;
            bottomOffset = (closeBottom && closeTop) ? size * 3 : 0;
            for (row = 0; row < height; ++row) {
                for (col = 0; col < width; ++col) {
                    computePosition(params, row, col, maxH, minH);
                    if (closeBottom) {
                        topBottomPositions[posIndex + bottomOffset] = extrudedPosition.x;
                        topBottomPositions[posIndex + 1 + bottomOffset] = extrudedPosition.y;
                        topBottomPositions[posIndex + 2 + bottomOffset] = extrudedPosition.z;
                    }
                    if (closeTop) {
                        topBottomPositions[posIndex] = position.x;
                        topBottomPositions[posIndex + 1] = position.y;
                        topBottomPositions[posIndex + 2] = position.z;
                    }
                    if (vertexFormat.st) {
                        stIndex = calculateST(vertexFormat, stIndex, topBottomTextureCoordinates, params, size * 2);
                    }
                    posIndex += 3;
                }
            }

            var topBottomGeo = calculateAttributesTopBottom(topBottomPositions, vertexFormat, ellipsoid, closeTop, closeBottom);
            if (vertexFormat.st) {
                topBottomGeo.attributes.st = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : topBottomTextureCoordinates
                });
            }

            var indicesIndex = 0;
            index = 0;
            bottomOffset /= 3;
            for (i = 0; i < height - 1; ++i) {
                for ( var j = 0; j < width - 1; ++j) {
                    upperLeft = index;
                    lowerLeft = upperLeft + width;
                    lowerRight = lowerLeft + 1;
                    upperRight = upperLeft + 1;
                    if (closeBottom) {
                        topBottomIndices[indicesIndex++] = upperRight + bottomOffset;
                        topBottomIndices[indicesIndex++] = lowerLeft + bottomOffset;
                        topBottomIndices[indicesIndex++] = upperLeft + bottomOffset;
                        topBottomIndices[indicesIndex++] = lowerRight + bottomOffset;
                        topBottomIndices[indicesIndex++] = lowerLeft + bottomOffset;
                        topBottomIndices[indicesIndex++] = upperRight + bottomOffset;
                    }

                    if (closeTop) {
                        topBottomIndices[indicesIndex++] = upperLeft;
                        topBottomIndices[indicesIndex++] = lowerLeft;
                        topBottomIndices[indicesIndex++] = upperRight;
                        topBottomIndices[indicesIndex++] = upperRight;
                        topBottomIndices[indicesIndex++] = lowerLeft;
                        topBottomIndices[indicesIndex++] = lowerRight;
                    }
                    ++index;
                }
                ++index;
            }
            topBottomGeo.indices = topBottomIndices;
            geo = GeometryPipeline.combine([
                new GeometryInstance({
                    geometry : topBottomGeo
                }),
                new GeometryInstance({
                    geometry : geo
                })
            ]);
        }

        var topBS = BoundingSphere.fromRectangle3D(params.rectangle, ellipsoid, maxHeight, topBoundingSphere);
        var bottomBS = BoundingSphere.fromRectangle3D(params.rectangle, ellipsoid, minHeight, bottomBoundingSphere);
        var boundingSphere = BoundingSphere.union(topBS, bottomBS);

        return {
            boundingSphere : boundingSphere,
            geometry : geo
        };
    }

    /**
     * A description of a cartographic rectangle on an ellipsoid centered at the origin.
     *
     * @alias RectangleGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Rectangle} options.rectangle A cartographic rectangle with north, south, east and west properties in radians.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the rectangle lies.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.height=0.0] The height from the surface of the ellipsoid.
     * @param {Number} [options.rotation=0.0] The rotation of the rectangle, in radians. A positive rotation is counter-clockwise.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     * @param {Number} [options.extrudedHeight] Height of extruded surface.
     * @param {Boolean} [options.closeTop=true] <code>true</code> to render top of an extruded rectangle; <code>false</code> otherwise.  (Only applicable if options.extrudedHeight is not equal to options.height.)
     * @param {Boolean} [options.closeBottom=true] <code>true</code> to render bottom of an extruded rectangle; <code>false</code> otherwise.  (Only applicable if options.extrudedHeight is not equal to options.height.)
     *
     * @exception {DeveloperError} <code>options.rectangle.north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.rectangle.south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.rectangle.east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.rectangle.west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.rectangle.north</code> must be greater than <code>options.rectangle.south</code>.
     * @exception {DeveloperError} <code>options.rectangle.east</code> must be greater than <code>options.rectangle.west</code>.
     *
     * @see RectangleGeometry#createGeometry
     *
     * @example
     * // 1. create an rectangle
     * var rectangle = new Cesium.RectangleGeometry({
     *   ellipsoid : Cesium.Ellipsoid.WGS84,
     *   rectangle : Cesium.Rectangle.fromDegrees(-80.0, 39.0, -74.0, 42.0),
     *   height : 10000.0
     * });
     * var geometry = Cesium.RectangleGeometry.createGeometry(rectangle);
     *
     * // 2. create an extruded rectangle without a top
     * var rectangle = new Cesium.RectangleGeometry({
     *   ellipsoid : Cesium.Ellipsoid.WGS84,
     *   rectangle : Cesium.Rectangle.fromDegrees(-80.0, 39.0, -74.0, 42.0),
     *   height : 10000.0,
     *   extrudedHieght: 300000,
     *   closeTop: false
     * });
     * var geometry = Cesium.RectangleGeometry.createGeometry(rectangle);
     */
    var RectangleGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var rectangle = options.rectangle;
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var surfaceHeight = defaultValue(options.height, 0.0);
        var rotation = options.rotation;
        var stRotation = options.stRotation;
        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required.');
        }
        Rectangle.validate(rectangle);
        if (rectangle.east < rectangle.west) {
            throw new DeveloperError('options.rectangle.east must be greater than options.rectangle.west');
        }
        if (rectangle.north < rectangle.south) {
            throw new DeveloperError('options.rectangle.north must be greater than options.rectangle.south');
        }
        //>>includeEnd('debug');

        this._rectangle = rectangle;
        this._granularity = granularity;
        this._ellipsoid = ellipsoid;
        this._surfaceHeight = surfaceHeight;
        this._rotation = rotation;
        this._stRotation = stRotation;
        this._vertexFormat = vertexFormat;
        this._extrudedHeight = options.extrudedHeight;
        this._closeTop = options.closeTop;
        this._closeBottom = options.closeBottom;
        this._workerName = 'createRectangleGeometry';
    };

    /**
     * Computes the geometric representation of an rectangle, including its vertices, indices, and a bounding sphere.
     *
     * @param {RectangleGeometry} rectangleGeometry A description of the rectangle.
     * @returns {Geometry} The computed vertices and indices.
     *
     * @exception {DeveloperError} Rotated rectangle is invalid.
     */
    RectangleGeometry.createGeometry = function(rectangleGeometry) {
        var rectangle = rectangleGeometry._rectangle;
        var granularity = rectangleGeometry._granularity;
        var ellipsoid = rectangleGeometry._ellipsoid;
        var surfaceHeight = rectangleGeometry._surfaceHeight;
        var rotation = rectangleGeometry._rotation;
        var stRotation = rectangleGeometry._stRotation;
        var vertexFormat = rectangleGeometry._vertexFormat;
        var extrudedHeight = rectangleGeometry._extrudedHeight;
        var closeTop = rectangleGeometry._closeTop;
        var closeBottom = rectangleGeometry._closeBottom;

        var width = Math.ceil((rectangle.east - rectangle.west) / granularity) + 1;
        var height = Math.ceil((rectangle.north - rectangle.south) / granularity) + 1;
        var granularityX = (rectangle.east - rectangle.west) / (width - 1);
        var granularityY = (rectangle.north - rectangle.south) / (height - 1);

        var radiiSquared = ellipsoid.radiiSquared;

        Rectangle.clone(rectangle, stRectangle);
        Rectangle.getNorthwest(rectangle, nwCartographic);
        Rectangle.getCenter(rectangle, centerCartographic);

        var granYCos = granularityY;
        var granXCos = granularityX;
        var granYSin = 0.0;
        var granXSin = 0.0;

        if (defined(rotation)) {
            var cosRotation = cos(rotation);
            granYCos *= cosRotation;
            granXCos *= cosRotation;

            var sinRotation = sin(rotation);
            granYSin = granularityY * sinRotation;
            granXSin = granularityX * sinRotation;

            proj.project(nwCartographic, nw);
            proj.project(centerCartographic, center);

            Cartesian3.subtract(nw, center, nw);
            Matrix2.fromRotation(rotation, rotationMatrix);
            Matrix2.multiplyByVector(rotationMatrix, nw, nw);
            Cartesian3.add(nw, center, nw);
            proj.unproject(nw, nwCartographic);

            var latitude = nwCartographic.latitude;
            var latitude0 = latitude + (width - 1) * granXSin;
            var latitude1 = latitude - granYCos * (height - 1);
            var latitude2 = latitude - granYCos * (height - 1) + (width - 1) * granXSin;

            var north = Math.max(latitude, latitude0, latitude1, latitude2);
            var south = Math.min(latitude, latitude0, latitude1, latitude2);

            var longitude = nwCartographic.longitude;
            var longitude0 = longitude + (width - 1) * granXCos;
            var longitude1 = longitude + (height - 1) * granYSin;
            var longitude2 = longitude + (height - 1) * granYSin + (width - 1) * granXCos;

            var east = Math.max(longitude, longitude0, longitude1, longitude2);
            var west = Math.min(longitude, longitude0, longitude1, longitude2);

            if (!isValidLatLon(north, west) || !isValidLatLon(north, east) ||
                    !isValidLatLon(south, west) || !isValidLatLon(south, east)) {
                throw new DeveloperError('Rotated rectangle is invalid.');
            }

            stRectangle.north = north;
            stRectangle.south = south;
            stRectangle.east = east;
            stRectangle.west = west;
        }

        var lonScalar = 1.0 / (stRectangle.east - stRectangle.west);
        var latScalar = 1.0 / (stRectangle.north - stRectangle.south);

        var size = width * height;

        if (defined(stRotation)) {
            // negate angle for a counter-clockwise rotation
            Matrix2.fromRotation(-stRotation, textureMatrix);

            var axis = ellipsoid.cartographicToCartesian(centerCartographic, v1Scratch);
            Cartesian3.normalize(axis, axis);
            Quaternion.fromAxisAngle(axis, -stRotation, quaternionScratch);
            Matrix3.fromQuaternion(quaternionScratch, tangentRotationMatrix);
        } else {
            Matrix2.clone(Matrix2.IDENTITY, textureMatrix);
            Matrix3.clone(Matrix3.IDENTITY, tangentRotationMatrix);
        }

        var params = {
            granYCos : granYCos,
            granYSin : granYSin,
            granXCos : granXCos,
            granXSin : granXSin,
            radiiSquared : radiiSquared,
            ellipsoid : ellipsoid,
            lonScalar : lonScalar,
            latScalar : latScalar,
            rectangle : rectangle,
            width : width,
            height : height,
            surfaceHeight : surfaceHeight,
            size : size,
            extrudedHeight : extrudedHeight,
            closeTop : closeTop,
            closeBottom : closeBottom
        };

        var geometry;
        if (defined(extrudedHeight)) {
            geometry = constructExtrudedRectangle(vertexFormat, params);
        } else {
            geometry = constructRectangle(vertexFormat, params);
        }

        var boundingSphere = geometry.boundingSphere;
        geometry = geometry.geometry;

        return new Geometry({
            attributes : new GeometryAttributes(geometry.attributes),
            indices : geometry.indices,
            primitiveType : geometry.primitiveType,
            boundingSphere : boundingSphere
        });
    };

    return RectangleGeometry;
});
