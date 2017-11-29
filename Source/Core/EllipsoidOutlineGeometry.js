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
     * @param {Cartesian3} [options.innerRadii=options.radii] The inner radii of the ellipsoid in the x, y, and z directions.
     * @param {Number} [options.minimumAzimuth=0.0] The minimum azimuth in radians (0 is north, +CW).
     * @param {Number} [options.maximumAzimuth=2*PI] The maximum azimuth in radians (0 is north, +CW).
     * @param {Number} [options.minimumElevation=-PI/2] The minimum elevation in radians (0 is tangential to earth surface, +UP).
     * @param {Number} [options.maximumElevation=PI/2] The maximum elevation in radians (0 is tangential to earth surface, +UP).
     * @param {Number} [options.stackPartitions=10] The count of stacks for the ellipsoid (1 greater than the number of parallel lines).
     * @param {Number} [options.slicePartitions=8] The count of slices for the ellipsoid (Equal to the number of radial lines).
     * @param {Number} [options.subdivisions=128] The number of points per line, determining the granularity of the curvature.
     *
     * @exception {DeveloperError} options.stackPartitions must be greater than or equal to one.
     * @exception {DeveloperError} options.slicePartitions must be greater than or equal to zero.
     * @exception {DeveloperError} options.subdivisions must be greater than or equal to zero.
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
        var innerRadii = defaultValue(options.innerRadii, radii);
        var minimumAzimuth = defaultValue(options.minimumAzimuth, 0);
        var maximumAzimuth = defaultValue(options.maximumAzimuth, CesiumMath.TWO_PI);
        var minimumElevation = defaultValue(options.minimumElevation, -CesiumMath.PI_OVER_TWO);
        var maximumElevation = defaultValue(options.maximumElevation, CesiumMath.PI_OVER_TWO);
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
        this._innerRadii = Cartesian3.clone(innerRadii);
        this._minimumAzimuth = minimumAzimuth;
        this._maximumAzimuth = maximumAzimuth;
        this._minimumElevation = minimumElevation;
        this._maximumElevation = maximumElevation;
        this._stackPartitions = stackPartitions;
        this._slicePartitions = slicePartitions;
        this._subdivisions = subdivisions;
        this._workerName = 'createEllipsoidOutlineGeometry';
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    EllipsoidOutlineGeometry.packedLength = 2 * (Cartesian3.packedLength) + 7;

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

        Cartesian3.pack(value._innerRadii, array, startingIndex);
        startingIndex += Cartesian3.packedLength;

        array[startingIndex++] = value._minimumAzimuth;
        array[startingIndex++] = value._maximumAzimuth;
        array[startingIndex++] = value._minimumElevation;
        array[startingIndex++] = value._maximumElevation;
        array[startingIndex++] = value._stackPartitions;
        array[startingIndex++] = value._slicePartitions;
        array[startingIndex++] = value._subdivisions;

        return array;
    };

    var scratchRadii = new Cartesian3();
    var scratchInnerRadii = new Cartesian3();
    var scratchOptions = {
        radii : scratchRadii,
        innerRadii : scratchInnerRadii,
        minimumAzimuth : undefined,
        maximumAzimuth : undefined,
        minimumElevation : undefined,
        maximumElevation : undefined,
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

        var innerRadii = Cartesian3.unpack(array, startingIndex, scratchInnerRadii);
        startingIndex += Cartesian3.packedLength;

        var minimumAzimuth = array[startingIndex++];
        var maximumAzimuth = array[startingIndex++];
        var minimumElevation = array[startingIndex++];
        var maximumElevation = array[startingIndex++];
        var stackPartitions = array[startingIndex++];
        var slicePartitions = array[startingIndex++];
        var subdivisions = array[startingIndex++];

        if (!defined(result)) {
            scratchOptions.minimumAzimuth = minimumAzimuth;
            scratchOptions.maximumAzimuth = maximumAzimuth;
            scratchOptions.minimumElevation = minimumElevation;
            scratchOptions.maximumElevation = maximumElevation;
            scratchOptions.stackPartitions = stackPartitions;
            scratchOptions.slicePartitions = slicePartitions;
            scratchOptions.subdivisions = subdivisions;
            return new EllipsoidOutlineGeometry(scratchOptions);
        }

        result._radii = Cartesian3.clone(radii, result._radii);
        result._innerRadii = Cartesian3.clone(innerRadii, result._innerRadii);
        result._minimumAzimuth = minimumAzimuth;
        result._maximumAzimuth = maximumAzimuth;
        result._minimumElevation = minimumElevation;
        result._maximumElevation = maximumElevation;
        result._stackPartitions = stackPartitions;
        result._slicePartitions = slicePartitions;
        result._subdivisions = subdivisions;

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

        var innerRadii = ellipsoidGeometry._innerRadii;
        if ((innerRadii.x <= 0) || (innerRadii.y <= 0) || (innerRadii.z <= 0)) {
            return;
        }

        // The azimuth input assumes 0 is north with CW+. The geometry uses an
        // ENU frame where 0 is east with CCW+. We have to convert the azimuth
        // to ENU here.
        var azMin = (Math.PI * 2.5) - ellipsoidGeometry._maximumAzimuth;
        var azMax = (Math.PI * 2.5) - ellipsoidGeometry._minimumAzimuth;

        var minimumAzimuth = azMin;
        var maximumAzimuth = azMax;
        var minimumElevation = ellipsoidGeometry._minimumElevation;
        var maximumElevation = ellipsoidGeometry._maximumElevation;
        var inclination1 = (CesiumMath.PI_OVER_TWO - maximumElevation);
        var inclination2 = (CesiumMath.PI_OVER_TWO - minimumElevation);

        var ellipsoid = Ellipsoid.fromCartesian3(radii);
        var subdivisions = ellipsoidGeometry._subdivisions;

        var slicePartitions = Math.round(ellipsoidGeometry._slicePartitions * Math.abs(maximumAzimuth - minimumAzimuth) / CesiumMath.TWO_PI);
        var stackPartitions = Math.round(ellipsoidGeometry._stackPartitions * Math.abs(maximumElevation - minimumElevation) / CesiumMath.TWO_PI);
        if (slicePartitions < 2) {
            slicePartitions = 2;
        }
        if (stackPartitions < 2) {
            stackPartitions = 2;
        }

        var extraIndices = 0;
        var vertexMultiplier = 1.0;
        var hasInnerSurface = ((innerRadii.x !== radii.x) || (innerRadii.y !== radii.y) || innerRadii.z !== radii.z);
        var isTopOpen = false;
        var isBotOpen = false;
        if (hasInnerSurface) {
            vertexMultiplier = 2.0;
            // Add 2x slicePartitions to connect the top/bottom of the outer to
            // the top/bottom of the inner
            if (maximumElevation < CesiumMath.PI_OVER_TWO) {
                isTopOpen = true;
                extraIndices += slicePartitions;
            }
            if (minimumElevation > -CesiumMath.PI_OVER_TWO) {
                isBotOpen = true;
                extraIndices += slicePartitions;
            }
        }

        var vertexCount = subdivisions * vertexMultiplier * (stackPartitions + slicePartitions);
        var positions = new Float64Array(vertexCount * 3);

        // Multiply by two because two points define each line segment
        var numIndices = 2 * (vertexCount + extraIndices - (slicePartitions + stackPartitions) * vertexMultiplier);
        var indices = IndexDatatype.createTypedArray(vertexCount, numIndices);

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
        var sinTheta = new Array(subdivisions);
        var cosTheta = new Array(subdivisions);
        for (i = 0; i < subdivisions; i++) {
            theta = minimumAzimuth + i * (maximumAzimuth - minimumAzimuth) / (subdivisions - 1);
            sinTheta[i] = sin(theta);
            cosTheta[i] = cos(theta);
        }

        // Calculate the latitude lines on the outer surface
        for (i = 0; i < stackPartitions; i++) {
            for (j = 0; j < subdivisions; j++) {
                positions[index++] = radii.x * sinPhi[i] * cosTheta[j];
                positions[index++] = radii.y * sinPhi[i] * sinTheta[j];
                positions[index++] = radii.z * cosPhi[i];
            }
        }

        // Calculate the latitude lines on the inner surface
        if (hasInnerSurface) {
            for (i = 0; i < stackPartitions; i++) {
                for (j = 0; j < subdivisions; j++) {
                    positions[index++] = innerRadii.x * sinPhi[i] * cosTheta[j];
                    positions[index++] = innerRadii.y * sinPhi[i] * sinTheta[j];
                    positions[index++] = innerRadii.z * cosPhi[i];
                }
            }
        }

        // Calculate sin/cos phi
        sinPhi.length = subdivisions;
        cosPhi.length = subdivisions;
        for (i = 0; i < subdivisions; i++) {
            phi = inclination1 + i * (inclination2 - inclination1) / (subdivisions - 1);
            sinPhi[i] = sin(phi);
            cosPhi[i] = cos(phi);
        }

        // Calculate sin/cos theta for each slice partition
        sinTheta.length = slicePartitions;
        cosTheta.length = slicePartitions;
        for (i = 0; i < slicePartitions; i++) {
            theta = minimumAzimuth + i * (maximumAzimuth - minimumAzimuth) / (slicePartitions - 1);
            sinTheta[i] = sin(theta);
            cosTheta[i] = cos(theta);
        }

        // Calculate the longitude lines on the outer surface
        for (i = 0; i < subdivisions; i++) {
            for (j = 0; j < slicePartitions; j++) {
                positions[index++] = radii.x * sinPhi[i] * cosTheta[j];
                positions[index++] = radii.y * sinPhi[i] * sinTheta[j];
                positions[index++] = radii.z * cosPhi[i];
            }
        }

        // Calculate the longitude lines on the inner surface
        if (hasInnerSurface) {
            for (i = 0; i < subdivisions; i++) {
                for (j = 0; j < slicePartitions; j++) {
                    positions[index++] = innerRadii.x * sinPhi[i] * cosTheta[j];
                    positions[index++] = innerRadii.y * sinPhi[i] * sinTheta[j];
                    positions[index++] = innerRadii.z * cosPhi[i];
                }
            }
        }

        // Create indices for the latitude lines
        index = 0;
        for (i = 0; i < stackPartitions*vertexMultiplier; i++) {
            var topOffset = i * subdivisions;
            for (j = 0; j < subdivisions - 1; j++) {
                indices[index++] = topOffset + j;
                indices[index++] = topOffset + j + 1;
            }
        }

        // Create indices for the outer longitude lines
        var offset = stackPartitions * subdivisions * vertexMultiplier;
        for (i = 0; i < slicePartitions; i++) {
            for (j = 0; j < subdivisions - 1; j++) {
                indices[index++] = offset + i + (j * slicePartitions);
                indices[index++] = offset + i + (j + 1) * slicePartitions;
            }
        }

        // Create indices for the inner longitude lines
        if (hasInnerSurface) {
            offset = stackPartitions * subdivisions * vertexMultiplier + slicePartitions * subdivisions;
            for (i = 0; i < slicePartitions; i++) {
                for (j = 0; j < subdivisions - 1; j++) {
                    indices[index++] = offset + i + (j * slicePartitions);
                    indices[index++] = offset + i + (j + 1) * slicePartitions;
                }
            }
        }

        if (hasInnerSurface) {
            var outerOffset = stackPartitions * subdivisions * vertexMultiplier;
            var innerOffset = outerOffset + (subdivisions * slicePartitions);
            if (isTopOpen) {
                // Draw lines from the top of the inner surface to the top of the outer surface
                for (i = 0; i < slicePartitions; i++) {
                    indices[index++] = outerOffset + i;
                    indices[index++] = innerOffset + i;
                }
            }

            if (isBotOpen) {
                // Draw lines from the top of the inner surface to the top of the outer surface
                outerOffset += (subdivisions * slicePartitions) - slicePartitions;
                innerOffset += (subdivisions * slicePartitions) - slicePartitions;
                for (i = 0; i < slicePartitions; i++) {
                    indices[index++] = outerOffset + i;
                    indices[index++] = innerOffset + i;
                }
            }
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
