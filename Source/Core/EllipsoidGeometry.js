define([
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './IndexDatatype',
        './Math',
        './PrimitiveType',
        './VertexFormat'
    ], function(
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        IndexDatatype,
        CesiumMath,
        PrimitiveType,
        VertexFormat) {
    'use strict';

    var scratchPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBitangent = new Cartesian3();
    var scratchNormalST = new Cartesian3();
    var defaultRadii = new Cartesian3(1.0, 1.0, 1.0);

    var cos = Math.cos;
    var sin = Math.sin;

    /**
     * A description of an ellipsoid centered at the origin.
     *
     * @alias EllipsoidGeometry
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Cartesian3} [options.radii=Cartesian3(1.0, 1.0, 1.0)] The radii of the ellipsoid in the x, y, and z directions.
     * @param {Cartesian3} [options.innerRadii=options.radii] The inner radii of the ellipsoid in the x, y, and z directions.
     * @param {Number} [options.azimuthMin=0.0] The minimum azimuth in degrees (0 is north, +CW).
     * @param {Number} [options.azimuthMax=360.0] The maximum azimuth in degrees (0 is north, +CW).
     * @param {Number} [options.elevationMin=-90.0] The minimum elevation in degrees (0 is tangential to earth surface, +UP).
     * @param {Number} [options.elevationMax=90.0] The maximum elevation in degrees (0 is tangential to earth surface, +UP).
     * @param {Number} [options.stackPartitions=64] The number of times to partition the ellipsoid into stacks.
     * @param {Number} [options.slicePartitions=64] The number of times to partition the ellipsoid into radial slices.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} options.slicePartitions cannot be less than three.
     * @exception {DeveloperError} options.stackPartitions cannot be less than three.
     *
     * @see EllipsoidGeometry#createGeometry
     *
     * @example
     * var ellipsoid = new Cesium.EllipsoidGeometry({
     *   vertexFormat : Cesium.VertexFormat.POSITION_ONLY,
     *   radii : new Cesium.Cartesian3(1000000.0, 500000.0, 500000.0)
     * });
     * var geometry = Cesium.EllipsoidGeometry.createGeometry(ellipsoid);
     */
    function EllipsoidGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var radii = defaultValue(options.radii, defaultRadii);
        var innerRadii = defaultValue(options.innerRadii, radii);
        var azimuthMin = defaultValue(options.azimuthMin, 0);
        var azimuthMax = defaultValue(options.azimuthMax, 360);
        var elevationMin = defaultValue(options.elevationMin, -90);
        var elevationMax = defaultValue(options.elevationMax, 90);
        var stackPartitions = defaultValue(options.stackPartitions, 64);
        var slicePartitions = defaultValue(options.slicePartitions, 64);
        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        //>>includeStart('debug', pragmas.debug);
        if (slicePartitions < 3) {
            throw new DeveloperError ('options.slicePartitions cannot be less than three.');
        }
        if (stackPartitions < 3) {
            throw new DeveloperError('options.stackPartitions cannot be less than three.');
        }
        //>>includeEnd('debug');

        this._radii = Cartesian3.clone(radii);
        this._innerRadii = Cartesian3.clone(innerRadii);
        this._azimuthMin = azimuthMin;
        this._azimuthMax = azimuthMax;
        this._elevationMin = elevationMin;
        this._elevationMax = elevationMax;
        this._stackPartitions = stackPartitions;
        this._slicePartitions = slicePartitions;
        this._vertexFormat = VertexFormat.clone(vertexFormat);
        this._workerName = 'createEllipsoidGeometry';
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    EllipsoidGeometry.packedLength = 2 * (Cartesian3.packedLength) + VertexFormat.packedLength + 6;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {EllipsoidGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    EllipsoidGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        Cartesian3.pack(value._radii, array, startingIndex);
        startingIndex += Cartesian3.packedLength;

        Cartesian3.pack(value._innerRadii, array, startingIndex);
        startingIndex += Cartesian3.packedLength;

        VertexFormat.pack(value._vertexFormat, array, startingIndex);
        startingIndex += VertexFormat.packedLength;

        array[startingIndex++] = value._azimuthMin;
        array[startingIndex++] = value._azimuthMax;
        array[startingIndex++] = value._elevationMin;
        array[startingIndex++] = value._elevationMax;
        array[startingIndex++] = value._stackPartitions;
        array[startingIndex++] = value._slicePartitions;

        return array;
    };

    var scratchRadii = new Cartesian3();
    var scratchInnerRadii = new Cartesian3();
    var scratchVertexFormat = new VertexFormat();
    var scratchOptions = {
        radii : scratchRadii,
        innerRadii : scratchInnerRadii,
        vertexFormat : scratchVertexFormat,
        azimuthMin : undefined,
        azimuthMax : undefined,
        elevationMin : undefined,
        elevationMax : undefined,
        stackPartitions : undefined,
        slicePartitions : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {EllipsoidGeometry} [result] The object into which to store the result.
     * @returns {EllipsoidGeometry} The modified result parameter or a new EllipsoidGeometry instance if one was not provided.
     */
    EllipsoidGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var radii = Cartesian3.unpack(array, startingIndex, scratchRadii);
        startingIndex += Cartesian3.packedLength;

        var innerRadii = Cartesian3.unpack(array, startingIndex, scratchInnerRadii);
        startingIndex += Cartesian3.packedLength;

        var vertexFormat = VertexFormat.unpack(array, startingIndex, scratchVertexFormat);
        startingIndex += VertexFormat.packedLength;

        var azimuthMin = array[startingIndex++];
        var azimuthMax = array[startingIndex++];
        var elevationMin = array[startingIndex++];
        var elevationMax = array[startingIndex++];
        var stackPartitions = array[startingIndex++];
        var slicePartitions = array[startingIndex++];

        if (!defined(result)) {
            scratchOptions.azimuthMin = azimuthMin;
            scratchOptions.azimuthMax = azimuthMax;
            scratchOptions.elevationMin = elevationMin;
            scratchOptions.elevationMax = elevationMax;
            scratchOptions.stackPartitions = stackPartitions;
            scratchOptions.slicePartitions = slicePartitions;
            return new EllipsoidGeometry(scratchOptions);
        }

        result._radii = Cartesian3.clone(radii, result._radii);
        result._innerRadii = Cartesian3.clone(innerRadii, result._innerRadii);
        result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
        result._azimuthMin = azimuthMin;
        result._azimuthMax = azimuthMax;
        result._elevationMin = elevationMin;
        result._elevationMax = elevationMax;
        result._stackPartitions = stackPartitions;
        result._slicePartitions = slicePartitions;

        return result;
    };

    /**
     * Computes the geometric representation of an ellipsoid, including its vertices, indices, and a bounding sphere.
     *
     * @param {EllipsoidGeometry} ellipsoidGeometry A description of the ellipsoid.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    EllipsoidGeometry.createGeometry = function(ellipsoidGeometry) {
        var radii = ellipsoidGeometry._radii;
        if ((radii.x <= 0) || (radii.y <= 0) || (radii.z <= 0)) {
            return;
        }

        var innerRadii = ellipsoidGeometry._innerRadii;
        if ((innerRadii.x <= 0) || (innerRadii.y <= 0) || innerRadii.z <= 0) {
            return;
        }

        // The azimuth input assumes 0 is north with CW+. The geometry uses an
        // ENU frame where 0 is east with CCW+. We have to convert the azimuth
        // to ENU here.
        var azMin = 450.0 - ellipsoidGeometry._azimuthMax;
        var azMax = 450.0 - ellipsoidGeometry._azimuthMin;

        var azimuthMin = azMin * Math.PI / 180.0;
        var azimuthMax = azMax * Math.PI / 180.0;
        var elevationMin = ellipsoidGeometry._elevationMin * Math.PI / 180.0;
        var elevationMax = ellipsoidGeometry._elevationMax * Math.PI / 180.0;
        var inclination1 = (Math.PI / 2.0 - elevationMax);
        var inclination2 = (Math.PI / 2.0 - elevationMin);

        var ellipsoid = Ellipsoid.fromCartesian3(radii);
        var vertexFormat = ellipsoidGeometry._vertexFormat;

        var slicePartitions = Math.round(ellipsoidGeometry._slicePartitions * Math.abs(azimuthMax - azimuthMin) / CesiumMath.TWO_PI);
        var stackPartitions = Math.round(ellipsoidGeometry._stackPartitions * Math.abs(elevationMax - elevationMin) / CesiumMath.TWO_PI);
        if (slicePartitions < 2) {
            slicePartitions = 2;
        }
        if (stackPartitions < 2) {
            stackPartitions = 2;
        }

        // Allow for extra indices if there is an inner surface and if we need
        // to close the sides if the azimuth range is not a full circle
        var extraIndices = 0;
        var vertexMultiplier = 1.0;
        var hasInnerSurface = ((innerRadii.x !== radii.x) || (innerRadii.y !== radii.y) || innerRadii.z !== radii.z);
        var isTopOpen = false;
        var isBotOpen = false;
        var isAzimuthOpen = false;
        if (hasInnerSurface) {
            vertexMultiplier = 2.0;
            if (ellipsoidGeometry._elevationMax < 90.0) {
                isTopOpen = true;
                extraIndices += (slicePartitions - 1);
            }
            if (ellipsoidGeometry._elevationMin > -90.0) {
                isBotOpen = true;
                extraIndices += (slicePartitions - 1);
            }
            if ((azimuthMax - azimuthMin) % CesiumMath.TWO_PI) {
                isAzimuthOpen = true;
                extraIndices += ((stackPartitions - 1) * 2) + 1;
            } else {
                extraIndices += 1;
            }
        }

        var vertexCount = stackPartitions * slicePartitions * vertexMultiplier;
        var positions = new Float64Array(vertexCount * 3);

        // Multiply by 6 because there are two triangles per sector
        var numIndices = 6 * (vertexCount + extraIndices + 1 - (slicePartitions + stackPartitions) * vertexMultiplier);
        var indices = IndexDatatype.createTypedArray(vertexCount, numIndices);

        var normals = (vertexFormat.normal) ? new Float32Array(vertexCount * 3) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(vertexCount * 3) : undefined;
        var bitangents = (vertexFormat.bitangent) ? new Float32Array(vertexCount * 3) : undefined;
        var st = (vertexFormat.st) ? new Float32Array(vertexCount * 2) : undefined;

        var i;
        var j;
        var theta;
        var phi;
        var index = 0;

        // Calculate sin/cos phi
        var sinPhi = new Array(stackPartitions);
        var cosPhi = new Array(stackPartitions);
        for (i = 0; i < stackPartitions; i++) {
            phi = inclination1 + i * (inclination2 - inclination1) / (stackPartitions - 1);
            sinPhi[i] = sin(phi);
            cosPhi[i] = cos(phi);
        }

        // Calculate sin/cos theta
        var sinTheta = new Array(slicePartitions);
        var cosTheta = new Array(slicePartitions);
        for (i = 0; i < slicePartitions; i++) {
            theta = azimuthMin + i * (azimuthMax - azimuthMin) / (slicePartitions - 1);
            cosTheta[i] = cos(theta);
            sinTheta[i] = sin(theta);
        }

        // Create outer surface
        for (i = 0; i < stackPartitions; i++) {
            for (j = 0; j < slicePartitions; j++) {
                positions[index++] = radii.x * sinPhi[i] * cosTheta[j];
                positions[index++] = radii.y * sinPhi[i] * sinTheta[j];
                positions[index++] = radii.z * cosPhi[i];
            }
        }

        // Create inner surface
        if (hasInnerSurface) {
            for (i = 0; i < stackPartitions; i++) {
                for (j = 0; j < slicePartitions; j++) {
                    positions[index++] = innerRadii.x * sinPhi[i] * cosTheta[j];
                    positions[index++] = innerRadii.y * sinPhi[i] * sinTheta[j];
                    positions[index++] = innerRadii.z * cosPhi[i];
                }
            }
        }

        // Create indices for outer surface
        index = 0;
        var topOffset;
        var bottomOffset;
        for (i = 0; i < (stackPartitions - 1); i++) {
            topOffset = i * slicePartitions;
            bottomOffset = (i + 1) * slicePartitions;

            for (j = 0; j < slicePartitions - 1; j++) {
                indices[index++] = bottomOffset + j;
                indices[index++] = bottomOffset + j + 1;
                indices[index++] = topOffset + j + 1;

                indices[index++] = bottomOffset + j;
                indices[index++] = topOffset + j + 1;
                indices[index++] = topOffset + j;
            }
        }

        // Create indices for inner surface
        if (hasInnerSurface) {
            var offset = stackPartitions * slicePartitions;
            for (i = 0; i < (stackPartitions - 1); i++) {
                topOffset = offset + i * slicePartitions;
                bottomOffset = offset + (i + 1) * slicePartitions;

                for (j = 0; j < slicePartitions - 1; j++) {
                    indices[index++] = topOffset + j;
                    indices[index++] = topOffset + j + 1;
                    indices[index++] = bottomOffset + j;

                    indices[index++] = bottomOffset + j;
                    indices[index++] = bottomOffset + j + 1;
                    indices[index++] = topOffset + j + 1;
                }
            }
        }

        if (hasInnerSurface) {
            if (isTopOpen) {
                // Connect the top of the inner surface to the top of the outer surface
                var innerOffset = stackPartitions * slicePartitions;
                for (i = 0; i < slicePartitions - 1; i++) {
                    indices[index++] = i;
                    indices[index++] = i + 1;
                    indices[index++] = innerOffset + i + 1;

                    indices[index++] = i;
                    indices[index++] = innerOffset + i + 1;
                    indices[index++] = innerOffset + i;
                }
            }

            if (isBotOpen) {
                // Connect the bottom of the inner surface to the bottom of the outer surface
                var outerOffset = stackPartitions * slicePartitions - slicePartitions;
                innerOffset = stackPartitions * slicePartitions * vertexMultiplier - slicePartitions;
                for (i = 0; i < slicePartitions - 1; i++) {
                    indices[index++] = outerOffset + i;
                    indices[index++] = outerOffset + i + 1;
                    indices[index++] = innerOffset + i + 1;

                    indices[index++] = outerOffset + i;
                    indices[index++] = innerOffset + i;
                    indices[index++] = innerOffset + i + 1;
                }
            }
        }

        // Connect the edges if azimuth is not closed
        if (isAzimuthOpen) {
            var outerOffset;
            var innerOffset = slicePartitions * stackPartitions;
            for (i = 0; i < stackPartitions - 1; i++) {
                outerOffset = slicePartitions * i;
                indices[index++] = outerOffset;
                indices[index++] = outerOffset + slicePartitions;
                indices[index++] = innerOffset;

                indices[index++] = outerOffset + slicePartitions;
                indices[index++] = innerOffset;
                indices[index++] = innerOffset + slicePartitions;
                innerOffset += slicePartitions;
            }

            innerOffset = slicePartitions * stackPartitions + slicePartitions - 1;
            for (i = 0; i < stackPartitions - 1; i++) {
                outerOffset = slicePartitions * (i + 1) - 1;
                indices[index++] = outerOffset;
                indices[index++] = outerOffset + slicePartitions;
                indices[index++] = innerOffset;

                indices[index++] = outerOffset + slicePartitions;
                indices[index++] = innerOffset;
                indices[index++] = innerOffset + slicePartitions;
                innerOffset += slicePartitions;
            }
        }

        var attributes = new GeometryAttributes();

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });
        }

        var stIndex = 0;
        var normalIndex = 0;
        var tangentIndex = 0;
        var bitangentIndex = 0;

        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent) {
            for( i = 0; i < vertexCount; i++) {
                var position = Cartesian3.fromArray(positions, i * 3, scratchPosition);
                var normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);

                if (vertexFormat.st) {
                    var normalST = Cartesian2.negate(normal, scratchNormalST);

                    // if the point is at or close to the pole, find a point along the same longitude
                    // close to the xy-plane for the s coordinate.
                    if (Cartesian2.magnitude(normalST) < CesiumMath.EPSILON6) {
                        index = (i + slicePartitions * Math.floor(stackPartitions * 0.5)) * 3;
                        if (index > positions.length) {
                            index = (i - slicePartitions * Math.floor(stackPartitions * 0.5)) * 3;
                        }
                        Cartesian3.fromArray(positions, index, normalST);
                        ellipsoid.geodeticSurfaceNormal(normalST, normalST);
                        Cartesian2.negate(normalST, normalST);
                    }

                    st[stIndex++] = (Math.atan2(normalST.y, normalST.x) / CesiumMath.TWO_PI) + 0.5;
                    st[stIndex++] = (Math.asin(normal.z) / Math.PI) + 0.5;
                }

                if (vertexFormat.normal) {
                    normals[normalIndex++] = normal.x;
                    normals[normalIndex++] = normal.y;
                    normals[normalIndex++] = normal.z;
                }

                if (vertexFormat.tangent || vertexFormat.bitangent) {
                    var tangent = scratchTangent;
                    if (i < slicePartitions || i > vertexCount - slicePartitions - 1) {
                        Cartesian3.cross(Cartesian3.UNIT_X, normal, tangent);
                        Cartesian3.normalize(tangent, tangent);
                    } else {
                        Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                        Cartesian3.normalize(tangent, tangent);
                    }

                    if (vertexFormat.tangent) {
                        tangents[tangentIndex++] = tangent.x;
                        tangents[tangentIndex++] = tangent.y;
                        tangents[tangentIndex++] = tangent.z;
                    }

                    if (vertexFormat.bitangent) {
                        var bitangent = Cartesian3.cross(normal, tangent, scratchBitangent);
                        Cartesian3.normalize(bitangent, bitangent);

                        bitangents[bitangentIndex++] = bitangent.x;
                        bitangents[bitangentIndex++] = bitangent.y;
                        bitangents[bitangentIndex++] = bitangent.z;
                    }
                }
            }

            if (vertexFormat.st) {
                attributes.st = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : st
                });
            }

            if (vertexFormat.normal) {
                attributes.normal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : normals
                });
            }

            if (vertexFormat.tangent) {
                attributes.tangent = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : tangents
                });
            }

            if (vertexFormat.bitangent) {
                attributes.bitangent = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : bitangents
                });
            }
        }

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : BoundingSphere.fromEllipsoid(ellipsoid)
        });
    };

    return EllipsoidGeometry;
});
