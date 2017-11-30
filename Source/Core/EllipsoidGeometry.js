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
     * @param {Number} [options.minimumAzimuth=0.0] The minimum azimuth in radians.
     * @param {Number} [options.maximumAzimuth=2*PI] The maximum azimuth in radians.
     * @param {Number} [options.minimumElevation=-PI/2] The minimum elevation in radians.
     * @param {Number} [options.maximumElevation=PI/2] The maximum elevation in radians.
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
        var minimumAzimuth = defaultValue(options.minimumAzimuth, 0);
        var maximumAzimuth = defaultValue(options.maximumAzimuth, CesiumMath.TWO_PI);
        var minimumElevation = defaultValue(options.minimumElevation, -CesiumMath.PI_OVER_TWO);
        var maximumElevation = defaultValue(options.maximumElevation, CesiumMath.PI_OVER_TWO);
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
        this._minimumAzimuth = minimumAzimuth;
        this._maximumAzimuth = maximumAzimuth;
        this._minimumElevation = minimumElevation;
        this._maximumElevation = maximumElevation;
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

        array[startingIndex++] = value._minimumAzimuth;
        array[startingIndex++] = value._maximumAzimuth;
        array[startingIndex++] = value._minimumElevation;
        array[startingIndex++] = value._maximumElevation;
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
        minimumAzimuth : undefined,
        maximumAzimuth : undefined,
        minimumElevation : undefined,
        maximumElevation : undefined,
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

        var minimumAzimuth = array[startingIndex++];
        var maximumAzimuth = array[startingIndex++];
        var minimumElevation = array[startingIndex++];
        var maximumElevation = array[startingIndex++];
        var stackPartitions = array[startingIndex++];
        var slicePartitions = array[startingIndex++];

        if (!defined(result)) {
            scratchOptions.minimumAzimuth = minimumAzimuth;
            scratchOptions.maximumAzimuth = maximumAzimuth;
            scratchOptions.minimumElevation = minimumElevation;
            scratchOptions.maximumElevation = maximumElevation;
            scratchOptions.stackPartitions = stackPartitions;
            scratchOptions.slicePartitions = slicePartitions;
            return new EllipsoidGeometry(scratchOptions);
        }

        result._radii = Cartesian3.clone(radii, result._radii);
        result._innerRadii = Cartesian3.clone(innerRadii, result._innerRadii);
        result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
        result._minimumAzimuth = minimumAzimuth;
        result._maximumAzimuth = maximumAzimuth;
        result._minimumElevation = minimumElevation;
        result._maximumElevation = maximumElevation;
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

        var minimumAzimuth = ellipsoidGeometry._minimumAzimuth;
        var maximumAzimuth = ellipsoidGeometry._maximumAzimuth;
        var minimumElevation = ellipsoidGeometry._minimumElevation;
        var maximumElevation = ellipsoidGeometry._maximumElevation;
        var inclination1 = (CesiumMath.PI_OVER_TWO - maximumElevation);
        var inclination2 = (CesiumMath.PI_OVER_TWO - minimumElevation);

        var vertexFormat = ellipsoidGeometry._vertexFormat;

        var slicePartitions = Math.round(ellipsoidGeometry._slicePartitions * Math.abs(maximumAzimuth - minimumAzimuth) / CesiumMath.TWO_PI);
        var stackPartitions = Math.round(ellipsoidGeometry._stackPartitions * Math.abs(maximumElevation - minimumElevation) / CesiumMath.TWO_PI);
        if (slicePartitions < 2) {
            slicePartitions = 2;
        }
        if (stackPartitions < 2) {
            stackPartitions = 2;
        }

        // The extra slice and stack are for duplicating points at the x axis
        // and poles. We need the texture coordinates to interpolate from
        // (2 * pi - delta) to 2 * pi instead of (2 * pi - delta) to 0.
        slicePartitions++;
        stackPartitions++;

        var i;
        var j;
        var index = 0;

        // Create arrays for theta and phi. Duplicate first and last angle to
        // allow different normals at the intersections.
        var phis = [inclination1];
        var thetas = [minimumAzimuth];
        for (i = 0; i < stackPartitions; i++) {
            phis.push(inclination1 + i * (inclination2 - inclination1) / (stackPartitions - 1));
        }
        phis.push(inclination2);
        for (j = 0; j < slicePartitions; j++) {
            thetas.push(minimumAzimuth + j * (maximumAzimuth - minimumAzimuth) / (slicePartitions - 1));
        }
        thetas.push(maximumAzimuth);
        var numPhis = phis.length;
        var numThetas = thetas.length;

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
            if (maximumElevation < CesiumMath.PI_OVER_TWO) {
                isTopOpen = true;
                extraIndices += (slicePartitions - 1);
            }
            if (minimumElevation > -CesiumMath.PI_OVER_TWO) {
                isBotOpen = true;
                extraIndices += (slicePartitions - 1);
            }
            if ((maximumAzimuth - minimumAzimuth) % CesiumMath.TWO_PI) {
                isAzimuthOpen = true;
                extraIndices += ((stackPartitions - 1) * 2) + 1;
            } else {
                extraIndices += 1;
            }
        }

        var vertexCount = numThetas * numPhis* vertexMultiplier;
        var positions = new Float64Array(vertexCount * 3);
        var isInner = new Array(vertexCount).fill(false);
        var negateNormal = new Array(vertexCount).fill(false);

        // Multiply by 6 because there are two triangles per sector
        var indexCount = slicePartitions * stackPartitions * vertexMultiplier;
        var numIndices = 6 * (indexCount + extraIndices + 1 - (slicePartitions + stackPartitions) * vertexMultiplier);
        var indices = IndexDatatype.createTypedArray(indexCount, numIndices);

        var normals = (vertexFormat.normal) ? new Float32Array(vertexCount * 3) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(vertexCount * 3) : undefined;
        var bitangents = (vertexFormat.bitangent) ? new Float32Array(vertexCount * 3) : undefined;
        var st = (vertexFormat.st) ? new Float32Array(vertexCount * 2) : undefined;

        // Calculate sin/cos phi
        var sinPhi = new Array(numPhis);
        var cosPhi = new Array(numPhis);
        for (i = 0; i < numPhis; i++) {
            sinPhi[i] = sin(phis[i]);
            cosPhi[i] = cos(phis[i]);
        }

        // Calculate sin/cos theta
        var sinTheta = new Array(numThetas);
        var cosTheta = new Array(numThetas);
        for (j = 0; j < numThetas; j++) {
            cosTheta[j] = cos(thetas[j]);
            sinTheta[j] = sin(thetas[j]);
        }

        // Create outer surface
        for (i = 0; i < numPhis; i++) {
            for (j = 0; j < numThetas; j++) {
                positions[index++] = radii.x * sinPhi[i] * cosTheta[j];
                positions[index++] = radii.y * sinPhi[i] * sinTheta[j];
                positions[index++] = radii.z * cosPhi[i];
            }
        }

        // Create inner surface
        var vertexIndex = vertexCount / 2.0;
        if (hasInnerSurface) {
            for (i = 0; i < numPhis; i++) {
                for (j = 0; j < numThetas; j++) {
                    positions[index++] = innerRadii.x * sinPhi[i] * cosTheta[j];
                    positions[index++] = innerRadii.y * sinPhi[i] * sinTheta[j];
                    positions[index++] = innerRadii.z * cosPhi[i];

                    // Keep track of which vertices are the inner and which ones
                    // need the normal to be negated
                    isInner[vertexIndex] = true;
                    if (i > 0 && i !== (numPhis-1) && j !== 0 && j !== (numThetas-1)) {
                        negateNormal[vertexIndex] = true;
                    }
                    vertexIndex++;
                }
            }
        }

        // Create indices for outer surface
        index = 0;
        var topOffset;
        var bottomOffset;
        for (i = 1; i < (numPhis - 2); i++) {
            topOffset = i * numThetas;
            bottomOffset = (i + 1) * numThetas;

            for (j = 1; j < numThetas - 2; j++) {
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
            var offset = numPhis * numThetas;
            for (i = 1; i < (numPhis - 2); i++) {
                topOffset = offset + i * numThetas;
                bottomOffset = offset + (i + 1) * numThetas;

                for (j = 1; j < numThetas - 2; j++) {
                    indices[index++] = bottomOffset + j;
                    indices[index++] = topOffset + j;
                    indices[index++] = topOffset + j + 1;

                    indices[index++] = bottomOffset + j;
                    indices[index++] = topOffset + j + 1;
                    indices[index++] = bottomOffset + j + 1;
                }
            }
        }

        if (hasInnerSurface) {
            if (isTopOpen) {
                // Connect the top of the inner surface to the top of the outer surface
                var innerOffset = numPhis * numThetas;
                for (i = 1; i < numThetas - 2; i++) {
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
                var outerOffset = numPhis * numThetas - numThetas;
                innerOffset = numPhis * numThetas * vertexMultiplier - numThetas;
                for (i = 1; i < numThetas - 2; i++) {
                    indices[index++] = outerOffset + i + 1;
                    indices[index++] = outerOffset + i;
                    indices[index++] = innerOffset + i;

                    indices[index++] = outerOffset + i + 1;
                    indices[index++] = innerOffset + i;
                    indices[index++] = innerOffset + i + 1;
                }
            }
        }

        // Connect the edges if azimuth is not closed
        if (isAzimuthOpen) {
            var outerOffset;
            var innerOffset;
            for (i = 1; i < numPhis - 2; i++) {
                innerOffset = numThetas * numPhis + (numThetas * i);
                outerOffset = numThetas * i;
                indices[index++] = innerOffset;
                indices[index++] = outerOffset + numThetas;
                indices[index++] = outerOffset;

                indices[index++] = innerOffset;
                indices[index++] = innerOffset + numThetas;
                indices[index++] = outerOffset + numThetas;
            }

            for (i = 1; i < numPhis - 2; i++) {
                innerOffset = numThetas * numPhis + (numThetas * (i + 1)) - 1;
                outerOffset = numThetas * (i + 1) - 1;
                indices[index++] = outerOffset + numThetas;
                indices[index++] = innerOffset;
                indices[index++] = outerOffset;

                indices[index++] = outerOffset + numThetas;
                indices[index++] = innerOffset + numThetas;
                indices[index++] = innerOffset;
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

        var ellipsoid;
        var ellipsoidOuter = Ellipsoid.fromCartesian3(radii);
        var ellipsoidInner = Ellipsoid.fromCartesian3(innerRadii);

        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent) {
            for( i = 0; i < vertexCount; i++) {
                ellipsoid = (isInner[i]) ? ellipsoidInner : ellipsoidOuter;
                var position = Cartesian3.fromArray(positions, i * 3, scratchPosition);
                var normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
                if (negateNormal[i]) {
                    Cartesian3.negate(normal, normal);
                }

                if (vertexFormat.st) {
                    var normalST = Cartesian2.negate(normal, scratchNormalST);

                    // if the point is at or close to the pole, find a point along the same longitude
                    // close to the xy-plane for the s coordinate.
                    if (Cartesian2.magnitude(normalST) < CesiumMath.EPSILON6) {
                        index = (i + numThetas * Math.floor(numPhis * 0.5)) * 3;
                        if (index > positions.length) {
                            index = (i - numThetas * Math.floor(numPhis * 0.5)) * 3;
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
                    if (i < numThetas*2 || i > vertexCount - numThetas*2 - 1) {
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
            boundingSphere : BoundingSphere.fromEllipsoid(ellipsoidOuter)
        });
    };

    return EllipsoidGeometry;
});
