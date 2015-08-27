/*global define*/
define([
        './BoundingSphere',
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
        './PrimitiveType'
    ], function(
        BoundingSphere,
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
        PrimitiveType) {
    "use strict";

    var defaultRadii = new Cartesian3(1.0, 1.0, 1.0);
    var cos = Math.cos;
    var sin = Math.sin;

    /**
     * A description of the outline of an ellipsoid centered at the origin.
     *
     * @alias EllipsoidOutlineGeometry
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Cartesian3} [options.radii=Cartesian3(1.0, 1.0, 1.0)] The radii of the ellipsoid in the x, y, and z directions.
     * @param {Number} [options.stackPartitions=10] The count of stacks for the ellipsoid (1 greater than the number of parallel lines).
     * @param {Number} [options.slicePartitions=8] The count of slices for the ellipsoid (Equal to the number of radial lines).
     * @param {Number} [options.subdivisions=128] The number of points per line, determining the granularity of the curvature .
     *
     * @exception {DeveloperError} options.stackPartitions must be greater than or equal to one.
     * @exception {DeveloperError} options.slicePartitions must be greater than or equal to zero.
     * @exception {DeveloperError} options.subdivisions must be greater than or equal to zero.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Ellipsoid%20Outline.html|Cesium Sandcastle Ellipsoid Outline Demo}
     *
     * @example
     * var ellipsoid = new Cesium.EllipsoidOutlineGeometry({
     *   radii : new Cesium.Cartesian3(1000000.0, 500000.0, 500000.0),
     *   stackPartitions: 6,
     *   slicePartitions: 5
     * });
     * var geometry = Cesium.EllipsoidOutlineGeometry.createGeometry(ellipsoid);
     */
    var EllipsoidOutlineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var radii = defaultValue(options.radii, defaultRadii);
        var stackPartitions = defaultValue(options.stackPartitions, 10);
        var slicePartitions = defaultValue(options.slicePartitions, 8);
        var subdivisions = defaultValue(options.subdivisions, 128);

        //>>includeStart('debug', pragmas.debug);
        if (stackPartitions < 1) {
            throw new DeveloperError('options.stackPartitions cannot be less than 1');
        }
        if (slicePartitions < 0) {
            throw new DeveloperError('options.slicePartitions cannot be less than 0');
        }
        if (subdivisions < 0) {
            throw new DeveloperError('options.subdivisions must be greater than or equal to zero.');
        }
        //>>includeEnd('debug');

        this._radii = Cartesian3.clone(radii);
        this._stackPartitions = stackPartitions;
        this._slicePartitions = slicePartitions;
        this._subdivisions = subdivisions;
        this._workerName = 'createEllipsoidOutlineGeometry';
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    EllipsoidOutlineGeometry.packedLength = Cartesian3.packedLength + 3;

    /**
     * Stores the provided instance into the provided array.
     * @function
     *
     * @param {EllipsoidOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    EllipsoidOutlineGeometry.pack = function(value, array, startingIndex) {
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

        array[startingIndex++] = value._stackPartitions;
        array[startingIndex++] = value._slicePartitions;
        array[startingIndex]   = value._subdivisions;
    };

    var scratchRadii = new Cartesian3();
    var scratchOptions = {
        radii : scratchRadii,
        stackPartitions : undefined,
        slicePartitions : undefined,
        subdivisions : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {EllipsoidOutlineGeometry} [result] The object into which to store the result.
     * @returns {EllipsoidOutlineGeometry} The modified result parameter or a new EllipsoidOutlineGeometry instance if one was not provided.
     */
    EllipsoidOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var radii = Cartesian3.unpack(array, startingIndex, scratchRadii);
        startingIndex += Cartesian3.packedLength;

        var stackPartitions = array[startingIndex++];
        var slicePartitions = array[startingIndex++];
        var subdivisions = array[startingIndex++];

        if (!defined(result)) {
            scratchOptions.stackPartitions = stackPartitions;
            scratchOptions.slicePartitions = slicePartitions;
            scratchOptions.subdivisions = subdivisions;
            return new EllipsoidOutlineGeometry(scratchOptions);
        }

        result._radii = Cartesian3.clone(radii, result._radii);
        result._stackPartitions = stackPartitions;
        result._slicePartitions = slicePartitions;
        result._subdivisions = subdivisions;

        return result;
    };

    /**
     * Computes the geometric representation of an outline of an ellipsoid, including its vertices, indices, and a bounding sphere.
     *
     * @param {EllipsoidOutlineGeometry} ellipsoidGeometry A description of the ellipsoid outline.
     * @returns {Geometry} The computed vertices and indices.
     */
    EllipsoidOutlineGeometry.createGeometry = function(ellipsoidGeometry) {
        var radii = ellipsoidGeometry._radii;
        var ellipsoid = Ellipsoid.fromCartesian3(radii);
        var stackPartitions = ellipsoidGeometry._stackPartitions;
        var slicePartitions = ellipsoidGeometry._slicePartitions;
        var subdivisions = ellipsoidGeometry._subdivisions;

        var indicesSize = subdivisions * (stackPartitions + slicePartitions - 1);
        var positionSize = indicesSize - slicePartitions + 2;
        var positions = new Float64Array(positionSize * 3);
        var indices = IndexDatatype.createTypedArray(positionSize, indicesSize * 2);

        var i;
        var j;
        var theta;
        var phi;
        var cosPhi;
        var sinPhi;
        var index = 0;

        var cosTheta = new Array(subdivisions);
        var sinTheta = new Array(subdivisions);
        for (i = 0; i < subdivisions; i++) {
            theta = CesiumMath.TWO_PI * i / subdivisions;
            cosTheta[i] = cos(theta);
            sinTheta[i] = sin(theta);
        }

        for (i = 1; i < stackPartitions; i++) {
            phi = Math.PI * i / stackPartitions;
            cosPhi = cos(phi);
            sinPhi = sin(phi);

            for (j = 0; j < subdivisions; j++) {
                positions[index++] = radii.x * cosTheta[j] * sinPhi;
                positions[index++] = radii.y * sinTheta[j] * sinPhi;
                positions[index++] = radii.z * cosPhi;
            }
        }

        cosTheta.length = slicePartitions;
        sinTheta.length = slicePartitions;
        for (i = 0; i < slicePartitions; i++) {
            theta = CesiumMath.TWO_PI * i / slicePartitions;
            cosTheta[i] = cos(theta);
            sinTheta[i] = sin(theta);
        }

        positions[index++] = 0;
        positions[index++] = 0;
        positions[index++] = radii.z;

        for (i = 1; i < subdivisions; i++) {
            phi = Math.PI * i / subdivisions;
            cosPhi = cos(phi);
            sinPhi = sin(phi);

            for (j = 0; j < slicePartitions; j++) {
                positions[index++] = radii.x * cosTheta[j] * sinPhi;
                positions[index++] = radii.y * sinTheta[j] * sinPhi;
                positions[index++] = radii.z * cosPhi;
            }
        }

        positions[index++] = 0;
        positions[index++] = 0;
        positions[index++] = -radii.z;

        index = 0;
        for (i = 0; i < stackPartitions - 1; ++i) {
            var topRowOffset = (i * subdivisions);
            for (j = 0; j < subdivisions - 1; ++j) {
                indices[index++] = topRowOffset + j;
                indices[index++] = topRowOffset + j + 1;
            }

            indices[index++] = topRowOffset + subdivisions - 1;
            indices[index++] = topRowOffset;
        }

        var sliceOffset = subdivisions * (stackPartitions - 1);
        for (j = 1; j < slicePartitions + 1; ++j) {
            indices[index++] = sliceOffset;
            indices[index++] = sliceOffset + j;
        }

        for (i = 0; i < subdivisions - 2; ++i) {
            var topOffset = (i * slicePartitions) + 1 + sliceOffset;
            var bottomOffset = ((i + 1) * slicePartitions) + 1 + sliceOffset;

            for (j = 0; j < slicePartitions - 1; ++j) {
                indices[index++] = bottomOffset + j;
                indices[index++] = topOffset + j;
            }

            indices[index++] = bottomOffset + slicePartitions - 1;
            indices[index++] = topOffset + slicePartitions - 1;
        }

        var lastPosition = positions.length / 3 - 1;
        for (j = lastPosition - 1; j > lastPosition - slicePartitions - 1; --j) {
            indices[index++] = lastPosition;
            indices[index++] = j;
        }

        var attributes = new GeometryAttributes({
            position: new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            })
        });

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : BoundingSphere.fromEllipsoid(ellipsoid)
        });
    };

    return EllipsoidOutlineGeometry;
});