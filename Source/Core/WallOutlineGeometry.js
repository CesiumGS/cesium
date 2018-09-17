define([
        './Cartesian3',
        './Check',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './GeometryInstance',
        './GeometryPipeline',
        './Math',
        './PolylineGeometry',
        './WallGeometryLibrary'
    ], function(
        Cartesian3,
        Check,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        GeometryInstance,
        GeometryPipeline,
        CesiumMath,
        PolylineGeometry,
        WallGeometryLibrary) {
    'use strict';

    /**
     * A description of a wall outline. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
     *
     * @alias WallOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions An array of Cartesian objects, which are the points of the wall.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number[]} [options.maximumHeights] An array parallel to <code>positions</code> that give the maximum height of the
     *        wall at <code>positions</code>. If undefined, the height of each position in used.
     * @param {Number[]} [options.minimumHeights] An array parallel to <code>positions</code> that give the minimum height of the
     *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation.
     * @param {Number} [options.width=2] The outline width in pixels.
     *
     * @exception {DeveloperError} positions length must be greater than or equal to 2.
     * @exception {DeveloperError} positions and maximumHeights must have the same length.
     * @exception {DeveloperError} positions and minimumHeights must have the same length.
     * @exception {DeveloperError} width must be greater than or equal to 1.0.
     *
     * @see WallGeometry#createGeometry
     * @see WallGeometry#fromConstantHeights
     *
     * @example
     * // create a wall outline that spans from ground level to 10000 meters
     * var wall = new Cesium.WallOutlineGeometry({
     *   positions : Cesium.Cartesian3.fromDegreesArrayHeights([
     *     19.0, 47.0, 10000.0,
     *     19.0, 48.0, 10000.0,
     *     20.0, 48.0, 10000.0,
     *     20.0, 47.0, 10000.0,
     *     19.0, 47.0, 10000.0
     *   ])
     * });
     * var geometry = Cesium.WallOutlineGeometry.createGeometry(wall);
     */
    function WallOutlineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var wallPositions = options.positions;
        var maximumHeights = options.maximumHeights;
        var minimumHeights = options.minimumHeights;
        var width = defaultValue(options.width, 2.0);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('positions', wallPositions);
        Check.typeOf.number.greaterThanOrEquals('width', width, 1.0);
        if (defined(maximumHeights) && maximumHeights.length !== wallPositions.length) {
            throw new DeveloperError('options.positions and options.maximumHeights must have the same length.');
        }
        if (defined(minimumHeights) && minimumHeights.length !== wallPositions.length) {
            throw new DeveloperError('options.positions and options.minimumHeights must have the same length.');
        }
        //>>includeEnd('debug');

        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

        this._positions = wallPositions;
        this._minimumHeights = minimumHeights;
        this._maximumHeights = maximumHeights;
        this._granularity = granularity;
        this._ellipsoid = Ellipsoid.clone(ellipsoid);
        this._width = width;
        this._workerName = 'createWallOutlineGeometry';

        var numComponents = 1 + wallPositions.length * Cartesian3.packedLength + 2;
        if (defined(minimumHeights)) {
            numComponents += minimumHeights.length;
        }
        if (defined(maximumHeights)) {
            numComponents += maximumHeights.length;
        }

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = numComponents + Ellipsoid.packedLength + 2;
    }

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {WallOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    WallOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var i;

        var positions = value._positions;
        var length = positions.length;
        array[startingIndex++] = length;

        for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
            Cartesian3.pack(positions[i], array, startingIndex);
        }

        var minimumHeights = value._minimumHeights;
        length = defined(minimumHeights) ? minimumHeights.length : 0;
        array[startingIndex++] = length;

        if (defined(minimumHeights)) {
            for (i = 0; i < length; ++i) {
                array[startingIndex++] = minimumHeights[i];
            }
        }

        var maximumHeights = value._maximumHeights;
        length = defined(maximumHeights) ? maximumHeights.length : 0;
        array[startingIndex++] = length;

        if (defined(maximumHeights)) {
            for (i = 0; i < length; ++i) {
                array[startingIndex++] = maximumHeights[i];
            }
        }

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        array[startingIndex++] = value._granularity;
        array[startingIndex] = value._width;

        return array;
    };

    var scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
    var scratchOptions = {
        positions : undefined,
        minimumHeights : undefined,
        maximumHeights : undefined,
        ellipsoid : scratchEllipsoid,
        granularity : undefined,
        width : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {WallOutlineGeometry} [result] The object into which to store the result.
     * @returns {WallOutlineGeometry} The modified result parameter or a new WallOutlineGeometry instance if one was not provided.
     */
    WallOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var i;

        var length = array[startingIndex++];
        var positions = new Array(length);

        for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
            positions[i] = Cartesian3.unpack(array, startingIndex);
        }

        length = array[startingIndex++];
        var minimumHeights;

        if (length > 0) {
            minimumHeights = new Array(length);
            for (i = 0; i < length; ++i) {
                minimumHeights[i] = array[startingIndex++];
            }
        }

        length = array[startingIndex++];
        var maximumHeights;

        if (length > 0) {
            maximumHeights = new Array(length);
            for (i = 0; i < length; ++i) {
                maximumHeights[i] = array[startingIndex++];
            }
        }

        var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
        startingIndex += Ellipsoid.packedLength;

        var granularity = array[startingIndex++];
        var width = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.positions = positions;
            scratchOptions.minimumHeights = minimumHeights;
            scratchOptions.maximumHeights = maximumHeights;
            scratchOptions.granularity = granularity;
            scratchOptions.width = width;
            return new WallOutlineGeometry(scratchOptions);
        }

        result._positions = positions;
        result._minimumHeights = minimumHeights;
        result._maximumHeights = maximumHeights;
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._granularity = granularity;
        result._width = width;

        return result;
    };

    /**
     * A description of a walloutline. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions An array of Cartesian objects, which are the points of the wall.
     * @param {Number} [options.maximumHeight] A constant that defines the maximum height of the
     *        wall at <code>positions</code>. If undefined, the height of each position in used.
     * @param {Number} [options.minimumHeight] A constant that defines the minimum height of the
     *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation.
     * @param {Number} [options.width=2] The outline width in pixels.
     * @returns {WallOutlineGeometry}
     *
     * @exception {DeveloperError} width must be greater than or equal to 1.0.
     *
     * @example
     * // create a wall that spans from 10000 meters to 20000 meters
     * var wall = Cesium.WallOutlineGeometry.fromConstantHeights({
     *   positions : Cesium.Cartesian3.fromDegreesArray([
     *     19.0, 47.0,
     *     19.0, 48.0,
     *     20.0, 48.0,
     *     20.0, 47.0,
     *     19.0, 47.0,
     *   ]),
     *   minimumHeight : 20000.0,
     *   maximumHeight : 10000.0
     * });
     * var geometry = Cesium.WallOutlineGeometry.createGeometry(wall);
     *
     * @see WallOutlineGeometry#createGeometry
     */
    WallOutlineGeometry.fromConstantHeights = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.positions;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(positions)) {
            throw new DeveloperError('options.positions is required.');
        }
        //>>includeEnd('debug');

        var minHeights;
        var maxHeights;

        var min = options.minimumHeight;
        var max = options.maximumHeight;

        var doMin = defined(min);
        var doMax = defined(max);
        if (doMin || doMax) {
            var length = positions.length;
            minHeights = (doMin) ? new Array(length) : undefined;
            maxHeights = (doMax) ? new Array(length) : undefined;

            for (var i = 0; i < length; ++i) {
                if (doMin) {
                    minHeights[i] = min;
                }

                if (doMax) {
                    maxHeights[i] = max;
                }
            }
        }

        var newOptions = {
            positions : positions,
            maximumHeights : maxHeights,
            minimumHeights : minHeights,
            ellipsoid : options.ellipsoid,
            width : options.width
        };
        return new WallOutlineGeometry(newOptions);
    };

    var verticalLineScratch = [new Cartesian3(), new Cartesian3()];

    /**
     * Computes the geometric representation of a wall outline, including its vertices, indices, and a bounding sphere.
     *
     * @param {WallOutlineGeometry} wallGeometry A description of the wall outline.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    WallOutlineGeometry.createGeometry = function(wallGeometry) {
        var wallPositions = wallGeometry._positions;
        var minimumHeights = wallGeometry._minimumHeights;
        var maximumHeights = wallGeometry._maximumHeights;
        var granularity = wallGeometry._granularity;
        var ellipsoid = wallGeometry._ellipsoid;
        var width = wallGeometry._width;

        var pos = WallGeometryLibrary.computePositions(ellipsoid, wallPositions, maximumHeights, minimumHeights, granularity, false);
        if (!defined(pos)) {
            return;
        }

        var bottomPositions = pos.bottomPositions;
        var topPositions = pos.topPositions;

        var bottomLinePositions = new Array(bottomPositions.length / 3);
        var topLinePositions = new Array(bottomPositions.length / 3);
        var instances = [];

        var verticalLine = verticalLineScratch;
        var length = topPositions.length / 3;

        for (var i = 0; i < length; ++i) {
            var i3 = i * 3;
            var top = Cartesian3.fromArray(topPositions, i3, verticalLine[0]);
            var bottom = Cartesian3.fromArray(bottomPositions, i3, verticalLine[1]);

            bottomLinePositions[i] = Cartesian3.clone(bottom);
            topLinePositions[i] = Cartesian3.clone(top);

            instances.push(new GeometryInstance({
                geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                    positions : verticalLine,
                    followSurface : false,
                    width : width
                }))
            }));
        }

        instances.push(new GeometryInstance({
            geometry : PolylineGeometry.createGeometry((new PolylineGeometry({
                positions : bottomLinePositions,
                followSurface : false,
                width : width
            })))
        }));
        instances.push(new GeometryInstance({
            geometry : PolylineGeometry.createGeometry((new PolylineGeometry({
                positions : topLinePositions,
                followSurface : false,
                width : width
            })))
        }));

        return GeometryPipeline.combineInstances(instances)[0];
    };

    return WallOutlineGeometry;
});
