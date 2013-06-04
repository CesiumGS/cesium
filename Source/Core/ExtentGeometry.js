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
    var extrudedBinormal = new Cartesian3();


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
     * @param {Number} [options.extrudedOptions.minHeight] Lower height of extruded extent
     * @param {Number} [options.extrudedOptions.maxHeight] Upper height of extruded extent
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

        if (typeof options.extrudedOptions !== 'undefined') {
            attr = constructExtrudedExtent(options, vertexFormat);
        } else {
            attr = constructExtent(options, vertexFormat, false);
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
      //  this.boundingSphere = BoundingSphere.fromExtent3D(extent, ellipsoid, surfaceHeight);

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

    function constructExtent(options, vertexFormat, extrude){
        var extent = options.extent;
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }
        extent.validate();

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
        var extrudedMinHeight = extrude ? options.extrudedOptions.minHeight : 0;
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
        var twoSize = size * 2;
        var positions = (vertexFormat.position) ? new Array(threeSize * ((extrude)? 2 : 1)) : undefined;
        var textureCoordinates = (vertexFormat.st) ? new Array(twoSize * ((extrude)? 2 : 1)) : undefined;
        var normals = (vertexFormat.normal) ? new Array(threeSize * ((extrude)? 2 : 1)) : undefined;
        var tangents = (vertexFormat.tangent) ? new Array(threeSize * ((extrude)? 2 : 1)) : undefined;
        var binormals = (vertexFormat.binormal) ? new Array(threeSize * ((extrude)? 2 : 1)) : undefined;

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

                if (extrude) {
                    extrudedPosition.x = rSurfaceX + nX * extrudedMinHeight;
                    extrudedPosition.y = rSurfaceY + nY * extrudedMinHeight;
                    extrudedPosition.z = rSurfaceZ + nZ * extrudedMinHeight;
                }

                if (vertexFormat.position) {
                    if (extrude) {
                        positions[positionIndex + threeSize ] = extrudedPosition.x;
                        positions[positionIndex + 1 + threeSize] = extrudedPosition.y;
                        positions[positionIndex + 2 + threeSize] = extrudedPosition.z;
                    }

                    positions[positionIndex++] = position.x;
                    positions[positionIndex++] = position.y;
                    positions[positionIndex++] = position.z;
                }

                if (vertexFormat.st) {
                    if (extrude) {
                        textureCoordinates[stIndex + twoSize] = (longitude - extent.west) * lonScalar;
                        textureCoordinates[stIndex + 1 + twoSize] = (latitude - extent.south) * latScalar;
                    }

                    textureCoordinates[stIndex++] = (longitude - extent.west) * lonScalar;
                    textureCoordinates[stIndex++] = (latitude - extent.south) * latScalar;
                }

                if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                    ellipsoid.geodeticSurfaceNormal(position, normal);
                    if (extrude) {
                        Cartesian3.negate(normal, extrudedNormal);
                    }

                    if (vertexFormat.normal) {
                        if (extrude) {
                            normals[normalIndex + threeSize] = extrudedNormal.x;
                            normals[normalIndex + 1 + threeSize] = extrudedNormal.y;
                            normals[normalIndex + 2 + threeSize] = extrudedNormal.z;
                        }
                        normals[normalIndex++] = normal.x;
                        normals[normalIndex++] = normal.y;
                        normals[normalIndex++] = normal.z;
                    }

                    if (vertexFormat.tangent) {
                        Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                        if (extrude) {
                            Cartesian3.cross(Cartesian3.UNIT_Z, extrudedNormal, extrudedTangent);
                            tangents[tangentIndex + threeSize] = extrudedTangent.x;
                            tangents[tangentIndex + 1 + threeSize] = extrudedTangent.y;
                            tangents[tangentIndex + 2 + threeSize] = extrudedTangent.z;
                        }

                        tangents[tangentIndex++] = tangent.x;
                        tangents[tangentIndex++] = tangent.y;
                        tangents[tangentIndex++] = tangent.z;
                    }

                    if (vertexFormat.binormal) {
                        Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                        Cartesian3.cross(normal, tangent, binormal);
                        if (extrude) {
                            Cartesian3.cross(Cartesian3.UNIT_Z, extrudedNormal, extrudedTangent);
                            Cartesian3.cross(extrudedNormal, extrudedTangent, extrudedBinormal);
                            binormals[binormalIndex + threeSize] = extrudedBinormal.x;
                            binormals[binormalIndex + 1 + threeSize] = extrudedBinormal.y;
                            binormals[binormalIndex + 2 + threeSize] = extrudedBinormal.z;
                        }

                        binormals[binormalIndex++] = binormal.x;
                        binormals[binormalIndex++] = binormal.y;
                        binormals[binormalIndex++] = binormal.z;
                    }
                }
            }
        }
        var attributes = {
                indices: [],
                binormals: binormals,
                tangents: tangents,
                normals: normals,
                textureCoordinates: textureCoordinates,
                positions: positions
        };

        if (extrude) {
            if (!options.extrudedOptions.closeTop && !options.extrudedOptions.closeBottom) {
                return attributes;
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
                if (extrude) {
                    if (options.extrudedOptions.closeBottom) {
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
                    if (options.extrudedOptions.closeTop) {
                        indices[indicesIndex++] = upperLeft;
                        indices[indicesIndex++] = lowerLeft;
                        indices[indicesIndex++] = upperRight;
                        indices[indicesIndex++] = upperRight;
                        indices[indicesIndex++] = lowerLeft;
                        indices[indicesIndex++] = lowerRight;
                    } else {
                        indices[indicesIndex++] = upperLeft + size;
                        indices[indicesIndex++] = lowerLeft + size;
                        indices[indicesIndex++] = upperRight + size;
                        indices[indicesIndex++] = upperRight + size;
                        indices[indicesIndex++] = lowerLeft + size;
                        indices[indicesIndex++] = lowerRight + size;
                    }
                } else {
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
        attributes.indices = indices;

        return attributes;
    }

    function constructExtrudedExtent(options, vertexFormat) {
        var extrudedOptions = options.extrudedOptions;
        var minHeight = extrudedOptions.minHeight;
        var maxHeight = extrudedOptions.maxHeight;
        if (minHeight > maxHeight) {
            throw new DeveloperError('options.extrudedOptions.maxHeight cannot be less than options.extrudedOptions.minHeight');
        }

        options.surfaceHeight = maxHeight;
        options.extrudedOptions.closeTop = defaultValue(extrudedOptions.closeTop, true);
        options.extrudedOptions.closeBottom  = defaultValue(extrudedOptions.closeBottom, true);
        var attr = constructExtent(options, vertexFormat, true);
        var extent = options.extent;
        var granularity = defaultValue(options.granularity, 0.1);
        var width = Math.ceil((extent.east - extent.west) / granularity) + 1;
        var height = Math.ceil((extent.north - extent.south) / granularity) + 1;
        var size = width * height;
        var indices = attr.indices;
        var upperLeft;
        var lowerLeft;
        var lowerRight;
        var upperRight;
        var indicesIndex = indices.length;
        var i = 0;

        for (i = width - 1; i > 0; i--) { // north
            upperLeft = i;
            lowerLeft = upperLeft + size;
            lowerRight = lowerLeft - 1;
            upperRight = upperLeft - 1;
            indices[indicesIndex++] = upperLeft;
            indices[indicesIndex++] = lowerLeft;
            indices[indicesIndex++] = upperRight;
            indices[indicesIndex++] = upperRight;
            indices[indicesIndex++] = lowerLeft;
            indices[indicesIndex++] = lowerRight;
            if (!extrudedOptions.closeTop || !extrudedOptions.closeBottom) {
                indices[indicesIndex++] = upperRight;
                indices[indicesIndex++] = lowerLeft;
                indices[indicesIndex++] = upperLeft;
                indices[indicesIndex++] = lowerRight;
                indices[indicesIndex++] = lowerLeft;
                indices[indicesIndex++] = upperRight;
            }
        }

        for (i = 0; i < size - width; i += width) { // west
            upperLeft = i;
            lowerLeft = upperLeft + size;
            lowerRight = lowerLeft + width;
            upperRight = upperLeft + width;
            indices[indicesIndex++] = upperLeft;
            indices[indicesIndex++] = lowerLeft;
            indices[indicesIndex++] = upperRight;
            indices[indicesIndex++] = upperRight;
            indices[indicesIndex++] = lowerLeft;
            indices[indicesIndex++] = lowerRight;
            if (!extrudedOptions.closeTop || !extrudedOptions.closeBottom) {
                indices[indicesIndex++] = upperRight;
                indices[indicesIndex++] = lowerLeft;
                indices[indicesIndex++] = upperLeft;
                indices[indicesIndex++] = lowerRight;
                indices[indicesIndex++] = lowerLeft;
                indices[indicesIndex++] = upperRight;
            }
        }

        for (i = size - 1; i > width - 1; i -= width) { // east
            upperLeft = i;
            lowerLeft = upperLeft + size;
            lowerRight = lowerLeft - width;
            upperRight = upperLeft - width;
            indices[indicesIndex++] = upperLeft;
            indices[indicesIndex++] = lowerLeft;
            indices[indicesIndex++] = upperRight;
            indices[indicesIndex++] = upperRight;
            indices[indicesIndex++] = lowerLeft;
            indices[indicesIndex++] = lowerRight;
            if (!extrudedOptions.closeTop || !extrudedOptions.closeBottom) {
                indices[indicesIndex++] = upperRight;
                indices[indicesIndex++] = lowerLeft;
                indices[indicesIndex++] = upperLeft;
                indices[indicesIndex++] = lowerRight;
                indices[indicesIndex++] = lowerLeft;
                indices[indicesIndex++] = upperRight;
            }
        }

        for (i = size - width; i < size-1; i++) { // south
            upperLeft = i;
            lowerLeft = upperLeft + size;
            lowerRight = lowerLeft + 1;
            upperRight = upperLeft + 1;
            indices[indicesIndex++] = upperLeft;
            indices[indicesIndex++] = lowerLeft;
            indices[indicesIndex++] = upperRight;
            indices[indicesIndex++] = upperRight;
            indices[indicesIndex++] = lowerLeft;
            indices[indicesIndex++] = lowerRight;
            if (!extrudedOptions.closeTop || !extrudedOptions.closeBottom) {
                indices[indicesIndex++] = upperRight;
                indices[indicesIndex++] = lowerLeft;
                indices[indicesIndex++] = upperLeft;
                indices[indicesIndex++] = lowerRight;
                indices[indicesIndex++] = lowerLeft;
                indices[indicesIndex++] = upperRight;
            }
        }

        return attr;
    }

    return ExtentGeometry;
});
