define([
        './arrayFill',
        './Cartesian3',
        './Check',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './GeometryAttribute',
        './GeometryInstance',
        './GeometryOffsetAttribute',
        './GeometryPipeline',
        './Math',
        './PolylineGeometry'
    ], function(
        arrayFill,
        Cartesian3,
        Check,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        GeometryAttribute,
        GeometryInstance,
        GeometryOffsetAttribute,
        GeometryPipeline,
        CesiumMath,
        PolylineGeometry) {
    'use strict';

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
     * @param {Number} [options.subdivisions=128] The number of points per line, determining the granularity of the curvature.
     * @param {Number} [options.width=2] The width of the outline in pixels.
     *
     * @exception {DeveloperError} options.stackPartitions must be greater than or equal to one.
     * @exception {DeveloperError} options.slicePartitions must be greater than or equal to zero.
     * @exception {DeveloperError} options.subdivisions must be greater than or equal to zero.
     * @exception {DeveloperError} options.width must be greater than or equal to one.
     *
     * @example
     * var ellipsoid = new Cesium.EllipsoidOutlineGeometry({
     *   radii : new Cesium.Cartesian3(1000000.0, 500000.0, 500000.0),
     *   stackPartitions: 6,
     *   slicePartitions: 5
     * });
     * var geometry = Cesium.EllipsoidOutlineGeometry.createGeometry(ellipsoid);
     */
    function EllipsoidOutlineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var radii = defaultValue(options.radii, defaultRadii);
        var stackPartitions = Math.round(defaultValue(options.stackPartitions, 10));
        var slicePartitions = Math.round(defaultValue(options.slicePartitions, 8));
        var subdivisions = Math.round(defaultValue(options.subdivisions, 128));
        var width = defaultValue(options.width, 2.0);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number.greaterThanOrEquals('stackPartitions', stackPartitions, 1.0);
        Check.typeOf.number.greaterThanOrEquals('slicePartitions', slicePartitions, 0.0);
        Check.typeOf.number.greaterThanOrEquals('subdivisions', subdivisions, 0.0);
        Check.typeOf.number.greaterThanOrEquals('width', width, 1.0);
        if (defined(options.offsetAttribute) && options.offsetAttribute === GeometryOffsetAttribute.TOP) {
            throw new DeveloperError('GeometryOffsetAttribute.TOP is not a supported options.offsetAttribute for this geometry.');
        }
        //>>includeEnd('debug');

        this._radii = Cartesian3.clone(radii);
        this._stackPartitions = stackPartitions;
        this._slicePartitions = slicePartitions;
        this._subdivisions = subdivisions;
        this._offsetAttribute = options.offsetAttribute;
        this._width = width;
        this._workerName = 'createEllipsoidOutlineGeometry';
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    EllipsoidOutlineGeometry.packedLength = Cartesian3.packedLength + 5;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {EllipsoidOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
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
        array[startingIndex++] = value._subdivisions;
        array[startingIndex++] = defaultValue(value._offsetAttribute, -1);
        array[startingIndex] = value._width;

        return array;
    };

    var scratchRadii = new Cartesian3();
    var scratchOptions = {
        radii : scratchRadii,
        stackPartitions : undefined,
        slicePartitions : undefined,
        subdivisions : undefined,
        offsetAttribute : undefined,
        width : undefined
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
        var offsetAttribute = array[startingIndex++];
        var width = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.stackPartitions = stackPartitions;
            scratchOptions.slicePartitions = slicePartitions;
            scratchOptions.subdivisions = subdivisions;
            scratchOptions.offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
            scratchOptions.width = width;
            return new EllipsoidOutlineGeometry(scratchOptions);
        }

        result._radii = Cartesian3.clone(radii, result._radii);
        result._stackPartitions = stackPartitions;
        result._slicePartitions = slicePartitions;
        result._subdivisions = subdivisions;
        result._offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
        result._width = width;

        return result;
    };

    /**
     * Computes the geometric representation of an outline of an ellipsoid, including its vertices, indices, and a bounding sphere.
     *
     * @param {EllipsoidOutlineGeometry} ellipsoidGeometry A description of the ellipsoid outline.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    EllipsoidOutlineGeometry.createGeometry = function(ellipsoidGeometry) {
        var radii = ellipsoidGeometry._radii;

        if ((radii.x <= 0) || (radii.y <= 0) || (radii.z <= 0)) {
            return;
        }

        var stackPartitions = ellipsoidGeometry._stackPartitions;
        var slicePartitions = ellipsoidGeometry._slicePartitions;
        var subdivisions = ellipsoidGeometry._subdivisions;
        var width = ellipsoidGeometry._width;

        var i;
        var j;
        var theta;
        var phi;
        var cosPhi;
        var sinPhi;
        var x;
        var y;
        var z;

        var instances = [];
        var partitionPositions = new Array(subdivisions + 1);

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
                x = radii.x * cosTheta[j] * sinPhi;
                y = radii.y * sinTheta[j] * sinPhi;
                z = radii.z * cosPhi;
                partitionPositions[j] = Cartesian3.fromElements(x, y, z, partitionPositions[j]);
            }
            partitionPositions[subdivisions] = partitionPositions[0];

            instances.push(new GeometryInstance({
                geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                    positions : partitionPositions,
                    followSurface : false,
                    width : width
                }))
            }));
        }

        cosPhi = cosTheta;
        sinPhi = sinTheta;
        cosPhi.length = subdivisions;
        sinPhi.length = subdivisions;
        for (i = 0; i < subdivisions; i++) {
            phi = CesiumMath.PI * i / subdivisions;
            cosPhi[i] = cos(phi);
            sinPhi[i] = sin(phi);
        }

        partitionPositions.length = subdivisions;

        for (i = 0; i < slicePartitions; i++) {
            theta = CesiumMath.TWO_PI * i / slicePartitions;
            cosTheta = cos(theta);
            sinTheta = sin(theta);

            for (j = 0; j < subdivisions; j++) {
                x = radii.x * cosTheta * sinPhi[j];
                y = radii.y * sinTheta * sinPhi[j];
                z = radii.z * cosPhi[j];
                partitionPositions[j] = Cartesian3.fromElements(x, y, z, partitionPositions[j]);
            }

            instances.push(new GeometryInstance({
                geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                    positions : partitionPositions,
                    followSurface : false,
                    width : width
                }))
            }));
        }

        var geometry = GeometryPipeline.combineInstances(instances)[0];

        if (defined(ellipsoidGeometry._offsetAttribute)) {
            var length = geometry.attributes.position.values.length / 3;
            var applyOffset = new Uint8Array(length);
            var offsetValue = ellipsoidGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
            arrayFill(applyOffset, offsetValue);
            geometry.attributes.applyOffset = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 1,
                values: applyOffset
            });
        }

        return geometry;
    };

    return EllipsoidOutlineGeometry;
});
