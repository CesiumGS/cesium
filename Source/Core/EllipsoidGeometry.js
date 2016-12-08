/*global define*/
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
    var scratchBinormal = new Cartesian3();
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
        this._stackPartitions = stackPartitions;
        this._slicePartitions = slicePartitions;
        this._vertexFormat = VertexFormat.clone(vertexFormat);
        this._workerName = 'createEllipsoidGeometry';
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    EllipsoidGeometry.packedLength = Cartesian3.packedLength + VertexFormat.packedLength + 2;

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

        VertexFormat.pack(value._vertexFormat, array, startingIndex);
        startingIndex += VertexFormat.packedLength;

        array[startingIndex++] = value._stackPartitions;
        array[startingIndex]   = value._slicePartitions;

        return array;
    };

    var scratchRadii = new Cartesian3();
    var scratchVertexFormat = new VertexFormat();
    var scratchOptions = {
        radii : scratchRadii,
        vertexFormat : scratchVertexFormat,
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

        var vertexFormat = VertexFormat.unpack(array, startingIndex, scratchVertexFormat);
        startingIndex += VertexFormat.packedLength;

        var stackPartitions = array[startingIndex++];
        var slicePartitions = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.stackPartitions = stackPartitions;
            scratchOptions.slicePartitions = slicePartitions;
            return new EllipsoidGeometry(scratchOptions);
        }

        result._radii = Cartesian3.clone(radii, result._radii);
        result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
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

        var ellipsoid = Ellipsoid.fromCartesian3(radii);
        var vertexFormat = ellipsoidGeometry._vertexFormat;

        // The extra slice and stack are for duplicating points at the x axis and poles.
        // We need the texture coordinates to interpolate from (2 * pi - delta) to 2 * pi instead of
        // (2 * pi - delta) to 0.
        var slicePartitions = ellipsoidGeometry._slicePartitions + 1;
        var stackPartitions = ellipsoidGeometry._stackPartitions + 1;

        var vertexCount = stackPartitions * slicePartitions;
        var positions = new Float64Array(vertexCount * 3);

        var numIndices = 6 * (slicePartitions - 1) * (stackPartitions - 2);
        var indices = IndexDatatype.createTypedArray(vertexCount, numIndices);

        var normals = (vertexFormat.normal) ? new Float32Array(vertexCount * 3) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(vertexCount * 3) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(vertexCount * 3) : undefined;
        var st = (vertexFormat.st) ? new Float32Array(vertexCount * 2) : undefined;

        var cosTheta = new Array(slicePartitions);
        var sinTheta = new Array(slicePartitions);

        var i;
        var j;
        var index = 0;

        for (i = 0; i < slicePartitions; i++) {
            var theta = CesiumMath.TWO_PI * i / (slicePartitions - 1);
            cosTheta[i] = cos(theta);
            sinTheta[i] = sin(theta);

            // duplicate first point for correct
            // texture coordinates at the north pole.
            positions[index++] = 0.0;
            positions[index++] = 0.0;
            positions[index++] = radii.z;
        }

        for (i = 1; i < stackPartitions - 1; i++) {
            var phi = Math.PI * i / (stackPartitions - 1);
            var sinPhi = sin(phi);

            var xSinPhi = radii.x * sinPhi;
            var ySinPhi = radii.y * sinPhi;
            var zCosPhi = radii.z * cos(phi);

            for (j = 0; j < slicePartitions; j++) {
                positions[index++] = cosTheta[j] * xSinPhi;
                positions[index++] = sinTheta[j] * ySinPhi;
                positions[index++] = zCosPhi;
            }
        }

        for (i = 0; i < slicePartitions; i++) {
            // duplicate first point for correct
            // texture coordinates at the south pole.
            positions[index++] = 0.0;
            positions[index++] = 0.0;
            positions[index++] = -radii.z;
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
        var binormalIndex = 0;

        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
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

                if (vertexFormat.tangent || vertexFormat.binormal) {
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

                    if (vertexFormat.binormal) {
                        var binormal = Cartesian3.cross(normal, tangent, scratchBinormal);
                        Cartesian3.normalize(binormal, binormal);

                        binormals[binormalIndex++] = binormal.x;
                        binormals[binormalIndex++] = binormal.y;
                        binormals[binormalIndex++] = binormal.z;
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

            if (vertexFormat.binormal) {
                attributes.binormal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : binormals
                });
            }
        }

        index = 0;
        for (j = 0; j < slicePartitions - 1; j++) {
            indices[index++] = slicePartitions + j;
            indices[index++] = slicePartitions + j + 1;
            indices[index++] = j + 1;
        }

        var topOffset;
        var bottomOffset;
        for (i = 1; i < stackPartitions - 2; i++) {
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

        i = stackPartitions - 2;
        topOffset = i * slicePartitions;
        bottomOffset = (i + 1) * slicePartitions;

        for (j = 0; j < slicePartitions - 1; j++) {
            indices[index++] = bottomOffset + j;
            indices[index++] = topOffset + j + 1;
            indices[index++] = topOffset + j;
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
