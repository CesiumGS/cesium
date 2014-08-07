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
        './PrimitiveType',
        './WallGeometryLibrary'
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
        PrimitiveType,
        WallGeometryLibrary) {
    "use strict";

    var scratchCartesian3Position1 = new Cartesian3();
    var scratchCartesian3Position2 = new Cartesian3();

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
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
     *
     * @exception {DeveloperError} positions and maximumHeights must have the same length.
     * @exception {DeveloperError} positions and minimumHeights must have the same length.
     *
     * @see WallGeometry#createGeometry
     * @see WallGeometry#fromConstantHeight
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Wall%20Outline.html|Cesium Sandcastle Wall Outline Demo}
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
    var WallOutlineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var wallPositions = options.positions;
        var maximumHeights = options.maximumHeights;
        var minimumHeights = options.minimumHeights;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(wallPositions)) {
            throw new DeveloperError('options.positions is required.');
        }
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
        this._ellipsoid = ellipsoid;
        this._workerName = 'createWallOutlineGeometry';
    };

    /**
     * A description of a walloutline. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
     *
     * @param {Cartesian3[]} positions An array of Cartesian objects, which are the points of the wall.
     * @param {Number} [maximumHeight] A constant that defines the maximum height of the
     *        wall at <code>positions</code>. If undefined, the height of each position in used.
     * @param {Number} [minimumHeight] A constant that defines the minimum height of the
     *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
     *
     * @see WallOutlineGeometry#createGeometry
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
            ellipsoid : options.ellipsoid
        };
        return new WallOutlineGeometry(newOptions);
    };

    /**
     * Computes the geometric representation of a wall outline, including its vertices, indices, and a bounding sphere.
     *
     * @param {WallOutlineGeometry} wallGeometry A description of the wall outline.
     * @returns {Geometry} The computed vertices and indices.
     *
     * @exception {DeveloperError} unique positions must be greater than or equal to 2.
     */
    WallOutlineGeometry.createGeometry = function(wallGeometry) {
        var wallPositions = wallGeometry._positions;
        var minimumHeights = wallGeometry._minimumHeights;
        var maximumHeights = wallGeometry._maximumHeights;
        var granularity = wallGeometry._granularity;
        var ellipsoid = wallGeometry._ellipsoid;

        var pos = WallGeometryLibrary.computePositions(ellipsoid, wallPositions, maximumHeights, minimumHeights, granularity, false);
        var bottomPositions = pos.bottomPositions;
        var topPositions = pos.topPositions;

        var length = topPositions.length;
        var size = length * 2;

        var positions = new Float64Array(size);
        var positionIndex = 0;

        // add lower and upper points one after the other, lower
        // points being even and upper points being odd
        length /= 3;
        var i;
        for (i = 0; i < length; ++i) {
            var i3 = i * 3;
            var topPosition = Cartesian3.fromArray(topPositions, i3, scratchCartesian3Position1);
            var bottomPosition = Cartesian3.fromArray(bottomPositions, i3, scratchCartesian3Position2);

            // insert the lower point
            positions[positionIndex++] = bottomPosition.x;
            positions[positionIndex++] = bottomPosition.y;
            positions[positionIndex++] = bottomPosition.z;

            // insert the upper point
            positions[positionIndex++] = topPosition.x;
            positions[positionIndex++] = topPosition.y;
            positions[positionIndex++] = topPosition.z;
        }

        var attributes = new GeometryAttributes({
            position : new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            })
        });

        var numVertices = size / 3;
        size = 2 * numVertices - 4 + numVertices;
        var indices = IndexDatatype.createTypedArray(numVertices, size);

        var edgeIndex = 0;
        for (i = 0; i < numVertices - 2; i += 2) {
            var LL = i;
            var LR = i + 2;
            var pl = Cartesian3.fromArray(positions, LL * 3, scratchCartesian3Position1);
            var pr = Cartesian3.fromArray(positions, LR * 3, scratchCartesian3Position2);
            if (Cartesian3.equalsEpsilon(pl, pr, CesiumMath.EPSILON6)) {
                continue;
            }
            var UL = i + 1;
            var UR = i + 3;

            indices[edgeIndex++] = UL;
            indices[edgeIndex++] = LL;
            indices[edgeIndex++] = UL;
            indices[edgeIndex++] = UR;
            indices[edgeIndex++] = LL;
            indices[edgeIndex++] = LR;
        }

        indices[edgeIndex++] = numVertices - 2;
        indices[edgeIndex++] = numVertices - 1;

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : new BoundingSphere.fromVertices(positions)
        });
    };

    return WallOutlineGeometry;
});
