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
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './GeometryInstance',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './Matrix2',
        './Matrix3',
        './PolygonPipeline',
        './PrimitiveType',
        './Quaternion',
        './Rectangle',
        './RectangleGeometryLibrary',
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
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        Matrix2,
        Matrix3,
        PolygonPipeline,
        PrimitiveType,
        Quaternion,
        Rectangle,
        RectangleGeometryLibrary,
        VertexFormat) {
    "use strict";

    var positionScratch = new Cartesian3();
    var normalScratch = new Cartesian3();
    var tangentScratch = new Cartesian3();
    var binormalScratch = new Cartesian3();
    var rectangleScratch = new Rectangle();
    var stScratch = new Cartesian2();
    var bottomBoundingSphere = new BoundingSphere();
    var topBoundingSphere = new BoundingSphere();

    function createAttributes(vertexFormat, attributes) {
        var geo = new Geometry({
            attributes : new GeometryAttributes(),
            primitiveType : PrimitiveType.TRIANGLES
        });

        geo.attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : attributes.positions
        });
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

    function calculateAttributes(positions, vertexFormat, ellipsoid, tangentRotationMatrix) {
        var length = positions.length;

        var normals = (vertexFormat.normal) ? new Float32Array(length) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(length) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(length) : undefined;

        var attrIndex = 0;
        var binormal = binormalScratch;
        var tangent = tangentScratch;
        var normal = normalScratch;
        for (var i = 0; i < length; i += 3) {
            var p = Cartesian3.fromArray(positions, i, positionScratch);
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
            attrIndex += 3;
        }
        return createAttributes(vertexFormat, {
            positions : positions,
            normals : normals,
            tangents : tangents,
            binormals : binormals
        });
    }

    var v1Scratch = new Cartesian3();
    var v2Scratch = new Cartesian3();
    function calculateAttributesWall(positions, vertexFormat, ellipsoid) {
        var length = positions.length;

        var normals = (vertexFormat.normal) ? new Float32Array(length) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(length) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(length) : undefined;

        var normalIndex = 0;
        var tangentIndex = 0;
        var binormalIndex = 0;
        var recomputeNormal = true;

        var binormal = binormalScratch;
        var tangent = tangentScratch;
        var normal = normalScratch;
        for (var i = 0; i < length; i += 6) {
            var p = Cartesian3.fromArray(positions, i, positionScratch);

            if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                var p1 = Cartesian3.fromArray(positions, i + 6, v1Scratch);
                if (recomputeNormal) {
                    var p2 = Cartesian3.fromArray(positions, i + 3, v2Scratch);
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
                    normals[normalIndex++] = normal.x;
                    normals[normalIndex++] = normal.y;
                    normals[normalIndex++] = normal.z;
                    normals[normalIndex++] = normal.x;
                    normals[normalIndex++] = normal.y;
                    normals[normalIndex++] = normal.z;
                }

                if (vertexFormat.tangent) {
                    tangents[tangentIndex++] = tangent.x;
                    tangents[tangentIndex++] = tangent.y;
                    tangents[tangentIndex++] = tangent.z;
                    tangents[tangentIndex++] = tangent.x;
                    tangents[tangentIndex++] = tangent.y;
                    tangents[tangentIndex++] = tangent.z;
                }

                if (vertexFormat.binormal) {
                    binormals[binormalIndex++] = binormal.x;
                    binormals[binormalIndex++] = binormal.y;
                    binormals[binormalIndex++] = binormal.z;
                    binormals[binormalIndex++] = binormal.x;
                    binormals[binormalIndex++] = binormal.y;
                    binormals[binormalIndex++] = binormal.z;
                }
            }
        }

        return createAttributes(vertexFormat, {
            positions : positions,
            normals : normals,
            tangents : tangents,
            binormals : binormals
        });
    }

    function constructRectangle(options) {
        var vertexFormat = options.vertexFormat;
        var ellipsoid = options.ellipsoid;
        var size = options.size;
        var height = options.height;
        var width = options.width;

        var positions = (vertexFormat.position) ? new Float64Array(size * 3) : undefined;
        var textureCoordinates = (vertexFormat.st) ? new Float32Array(size * 2) : undefined;

        var posIndex = 0;
        var stIndex = 0;

        var position = positionScratch;
        var st = stScratch;
        for (var row = 0; row < height; ++row) {
            for (var col = 0; col < width; ++col) {
                RectangleGeometryLibrary.computePosition(options, row, col, position, st);

                positions[posIndex++] = position.x;
                positions[posIndex++] = position.y;
                positions[posIndex++] = position.z;

                if (vertexFormat.st) {
                    textureCoordinates[stIndex++] = st.x;
                    textureCoordinates[stIndex++] = st.y;
                }
            }
        }

        var geo = calculateAttributes(positions, vertexFormat, ellipsoid, options.tangentRotationMatrix);

        var indicesSize = 6 * (width - 1) * (height - 1);
        var indices = IndexDatatype.createTypedArray(size, indicesSize);
        var index = 0;
        var indicesIndex = 0;
        for (var i = 0; i < height - 1; ++i) {
            for (var j = 0; j < width - 1; ++j) {
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

        return geo;
    }

    function addWallPositions(wallPositions, posIndex, i, topPositions, bottomPositions) {
        wallPositions[posIndex++] = topPositions[i];
        wallPositions[posIndex++] = topPositions[i + 1];
        wallPositions[posIndex++] = topPositions[i + 2];
        wallPositions[posIndex++] = bottomPositions[i];
        wallPositions[posIndex++] = bottomPositions[i + 1];
        wallPositions[posIndex++] = bottomPositions[i + 2];
        return wallPositions;
    }

    function addWallTextureCoordinates(wallTextures, stIndex, i, st) {
        wallTextures[stIndex++] = st[i];
        wallTextures[stIndex++] = st[i + 1];
        wallTextures[stIndex++] = st[i];
        wallTextures[stIndex++] = st[i + 1];
        return wallTextures;
    }

    function constructExtrudedRectangle(options) {
        var vertexFormat = options.vertexFormat;
        var surfaceHeight = options.surfaceHeight;
        var extrudedHeight = options.extrudedHeight;
        var minHeight = Math.min(extrudedHeight, surfaceHeight);
        var maxHeight = Math.max(extrudedHeight, surfaceHeight);

        var height = options.height;
        var width = options.width;
        var ellipsoid = options.ellipsoid;
        var i;

        var topBottomGeo = constructRectangle(options);
        if (CesiumMath.equalsEpsilon(minHeight, maxHeight, 0.1)) {
            return topBottomGeo;
        }
        topBottomGeo = PolygonPipeline.scaleToGeodeticHeight(topBottomGeo, maxHeight, ellipsoid, false);
        var topPositions = new Float64Array(topBottomGeo.attributes.position.values);
        var length = topPositions.length;
        var newLength = length*2;
        var positions = new Float64Array(newLength);
        positions.set(topPositions);
        topBottomGeo = PolygonPipeline.scaleToGeodeticHeight(topBottomGeo, minHeight, ellipsoid);
        var bottomPositions = topBottomGeo.attributes.position.values;
        positions.set(bottomPositions, length);
        topBottomGeo.attributes.position.values = positions;

        var normals = (vertexFormat.normal) ? new Float32Array(newLength) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(newLength) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(newLength) : undefined;
        var textures = (vertexFormat.st) ? new Float32Array(newLength/3*2) : undefined;
        var topSt;
        if (vertexFormat.normal) {
            var topNormals = topBottomGeo.attributes.normal.values;
            normals.set(topNormals);
            for (i = 0; i < length; i ++) {
                topNormals[i] = -topNormals[i];
            }
            normals.set(topNormals, length);
            topBottomGeo.attributes.normal.values = normals;
        }
        if (vertexFormat.tangent) {
            var topTangents = topBottomGeo.attributes.tangent.values;
            tangents.set(topTangents);
            for (i = 0; i < length; i ++) {
                topTangents[i] = -topTangents[i];
            }
            tangents.set(topTangents, length);
            topBottomGeo.attributes.tangent.values = tangents;
        }
        if (vertexFormat.binormal) {
            var topBinormals = topBottomGeo.attributes.binormal.values;
            binormals.set(topBinormals);
            binormals.set(topBinormals, length);
            topBottomGeo.attributes.binormal.values = binormals;
        }
        if (vertexFormat.st) {
            topSt = topBottomGeo.attributes.st.values;
            textures.set(topSt);
            textures.set(topSt, length/3*2);
            topBottomGeo.attributes.st.values = textures;
        }

        var indices = topBottomGeo.indices;
        var indicesLength = indices.length;
        var posLength = length / 3;
        var newIndices = IndexDatatype.createTypedArray(newLength/3, indicesLength*2);
        newIndices.set(indices);
        for (i = 0; i < indicesLength; i += 3) {
            newIndices[i + indicesLength] = indices[i + 2] + posLength;
            newIndices[i + 1 + indicesLength] = indices[i + 1] + posLength;
            newIndices[i + 2 + indicesLength] = indices[i] + posLength;
        }
        topBottomGeo.indices = newIndices;

        var perimeterPositions = 2 * width + 2 * height - 4;
        var wallCount = (perimeterPositions + 4) * 2;

        var wallPositions = new Float64Array(wallCount * 3);
        var wallTextures = (vertexFormat.st) ? new Float32Array(wallCount * 2) : undefined;

        var posIndex = 0;
        var stIndex = 0;
        var area = width * height;
        for (i = 0; i < area; i+=width) {
            wallPositions = addWallPositions(wallPositions, posIndex, i*3, topPositions, bottomPositions);
            posIndex += 6;
            if (vertexFormat.st) {
                wallTextures = addWallTextureCoordinates(wallTextures, stIndex, i*2, topSt);
                stIndex += 4;
            }
        }

        for (i = area-width; i < area; i++) {
            wallPositions = addWallPositions(wallPositions, posIndex, i*3, topPositions, bottomPositions);
            posIndex += 6;
            if (vertexFormat.st) {
                wallTextures = addWallTextureCoordinates(wallTextures, stIndex, i*2, topSt);
                stIndex += 4;
            }
        }

        for (i = area-1; i > 0; i-=width) {
            wallPositions = addWallPositions(wallPositions, posIndex, i*3, topPositions, bottomPositions);
            posIndex += 6;
            if (vertexFormat.st) {
                wallTextures = addWallTextureCoordinates(wallTextures, stIndex, i*2, topSt);
                stIndex += 4;
            }
        }

        for (i = width-1; i >= 0; i--) {
            wallPositions = addWallPositions(wallPositions, posIndex, i*3, topPositions, bottomPositions);
            posIndex += 6;
            if (vertexFormat.st) {
                wallTextures = addWallTextureCoordinates(wallTextures, stIndex, i*2, topSt);
                stIndex += 4;
            }
        }

        var geo = calculateAttributesWall(wallPositions, vertexFormat, ellipsoid);

        if (vertexFormat.st) {
            geo.attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : wallTextures
            });
        }

        var wallIndices = IndexDatatype.createTypedArray(wallCount, perimeterPositions * 6);

        var upperLeft;
        var lowerLeft;
        var lowerRight;
        var upperRight;
        length = wallPositions.length / 3;
        var index = 0;
        for (i = 0; i < length - 1; i+=2) {
            upperLeft = i;
            upperRight = upperLeft + 2;
            var p1 = Cartesian3.fromArray(wallPositions, upperLeft * 3, v1Scratch);
            var p2 = Cartesian3.fromArray(wallPositions, upperRight * 3, v2Scratch);
            if (Cartesian3.equalsEpsilon(p1, p2, CesiumMath.EPSILON10)) {
                continue;
            }
            lowerLeft = upperLeft + 1;
            lowerRight = lowerLeft + 2;
            wallIndices[index++] = upperLeft;
            wallIndices[index++] = lowerLeft;
            wallIndices[index++] = upperRight;
            wallIndices[index++] = upperRight;
            wallIndices[index++] = lowerLeft;
            wallIndices[index++] = lowerRight;
        }

        geo.indices = wallIndices;

        geo = GeometryPipeline.combine([
            new GeometryInstance({
                geometry : topBottomGeo
            }),
            new GeometryInstance({
                geometry : geo
            })
        ]);

        return geo;
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
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Rectangle.html|Cesium Sandcastle Rectangle Demo}
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

    var textureMatrixScratch = new Matrix2();
    var tangentRotationMatrixScratch = new Matrix3();
    var nwScratch = new Cartographic();
    var quaternionScratch = new Quaternion();
    var centerScratch = new Cartographic();
    /**
     * Computes the geometric representation of an rectangle, including its vertices, indices, and a bounding sphere.
     *
     * @param {RectangleGeometry} rectangleGeometry A description of the rectangle.
     * @returns {Geometry} The computed vertices and indices.
     *
     * @exception {DeveloperError} Rotated rectangle is invalid.
     */
    RectangleGeometry.createGeometry = function(rectangleGeometry) {
        var rectangle = Rectangle.clone(rectangleGeometry._rectangle, rectangleScratch);
        var ellipsoid = rectangleGeometry._ellipsoid;
        var surfaceHeight = rectangleGeometry._surfaceHeight;
        var extrudedHeight = rectangleGeometry._extrudedHeight;
        var stRotation = rectangleGeometry._stRotation;
        var vertexFormat = rectangleGeometry._vertexFormat;

        var options = RectangleGeometryLibrary.computeOptions(rectangleGeometry, rectangle, nwScratch);

        var textureMatrix = textureMatrixScratch;
        var tangentRotationMatrix = tangentRotationMatrixScratch;
        if (defined(stRotation)) {
            // negate angle for a counter-clockwise rotation
            Matrix2.fromRotation(-stRotation, textureMatrix);
            var center = Rectangle.center(rectangle, centerScratch);
            var axis = ellipsoid.cartographicToCartesian(center, v1Scratch);
            Cartesian3.normalize(axis, axis);
            Quaternion.fromAxisAngle(axis, -stRotation, quaternionScratch);
            Matrix3.fromQuaternion(quaternionScratch, tangentRotationMatrix);
        } else {
            Matrix2.clone(Matrix2.IDENTITY, textureMatrix);
            Matrix3.clone(Matrix3.IDENTITY, tangentRotationMatrix);
        }

        options.lonScalar = 1.0 / (rectangle.east - rectangle.west);
        options.latScalar = 1.0 / (rectangle.north - rectangle.south);
        options.vertexFormat = vertexFormat;
        options.textureMatrix = textureMatrix;
        options.tangentRotationMatrix = tangentRotationMatrix;
        options.size = options.width * options.height;

        var geometry;
        var boundingSphere;
        rectangle = rectangleGeometry._rectangle;
        if (defined(extrudedHeight)) {
            geometry = constructExtrudedRectangle(options);
            var topBS = BoundingSphere.fromRectangle3D(rectangle, ellipsoid, surfaceHeight, topBoundingSphere);
            var bottomBS = BoundingSphere.fromRectangle3D(rectangle, ellipsoid, extrudedHeight, bottomBoundingSphere);
            boundingSphere = BoundingSphere.union(topBS, bottomBS);
        } else {
            geometry = constructRectangle(options);
            geometry = PolygonPipeline.scaleToGeodeticHeight(geometry, surfaceHeight, ellipsoid, false);
            boundingSphere = BoundingSphere.fromRectangle3D(rectangle, ellipsoid, surfaceHeight);
        }

        if (!vertexFormat.position) {
            delete geometry.attributes.position;
        }

        return new Geometry({
            attributes : new GeometryAttributes(geometry.attributes),
            indices : geometry.indices,
            primitiveType : geometry.primitiveType,
            boundingSphere : boundingSphere
        });
    };

    return RectangleGeometry;
});
