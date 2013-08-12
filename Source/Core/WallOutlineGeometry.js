/*global define*/
define([
        './defaultValue',
        './BoundingSphere',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './IndexDatatype',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './GeometryAttribute',
        './GeometryAttributes',
        './Math',
        './PolylinePipeline',
        './PolygonPipeline',
        './PrimitiveType',
        './WallGeometryLibrary',
        './WindingOrder'
    ], function(
        defaultValue,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        IndexDatatype,
        DeveloperError,
        Ellipsoid,
        EllipsoidTangentPlane,
        GeometryAttribute,
        GeometryAttributes,
        CesiumMath,
        PolylinePipeline,
        PolygonPipeline,
        PrimitiveType,
        WallGeometryLibrary,
        WindingOrder) {
    "use strict";

    var scratchCartesian3Position1 = new Cartesian3();
    var scratchCartesian3Position2 = new Cartesian3();

    /**
     * A {@link Geometry} that represents a wall, which is similar to a KML line string. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
     *
     * @alias WallGeometry
     * @constructor
     *
     * @param {Array} positions An array of Cartesian objects, which are the points of the wall.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Array} [maximumHeights] An array parallel to <code>positions</code> that give the maximum height of the
     *        wall at <code>positions</code>. If undefined, the height of each position in used.
     * @param {Array} [minimumHeights] An array parallel to <code>positions</code> that give the minimum height of the
     *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} positions is required.
     * @exception {DeveloperError} positions and maximumHeights must have the same length.
     * @exception {DeveloperError} positions and minimumHeights must have the same length.
     * @exception {DeveloperError} unique positions must be greater than or equal to 2.
     *
     * @example
     * var positions = [
     *   Cartographic.fromDegrees(19.0, 47.0, 10000.0),
     *   Cartographic.fromDegrees(19.0, 48.0, 10000.0),
     *   Cartographic.fromDegrees(20.0, 48.0, 10000.0),
     *   Cartographic.fromDegrees(20.0, 47.0, 10000.0),
     *   Cartographic.fromDegrees(19.0, 47.0, 10000.0)
     * ];
     *
     * // create a wall that spans from ground level to 10000 meters
     * var wall = new WallGeometry({
     *     positions : ellipsoid.cartographicArrayToCartesianArray(positions)
     * });
     */
    var WallGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var wallPositions = options.positions;
        var maximumHeights = options.maximumHeights;
        var minimumHeights = options.minimumHeights;

        if (typeof wallPositions === 'undefined') {
            throw new DeveloperError('positions is required.');
        }

        if (typeof maximumHeights !== 'undefined' && maximumHeights.length !== wallPositions.length) {
            throw new DeveloperError('positions and maximumHeights must have the same length.');
        }

        if (typeof minimumHeights !== 'undefined' && minimumHeights.length !== wallPositions.length) {
            throw new DeveloperError('positions and minimumHeights must have the same length.');
        }

        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

        var pos = WallGeometryLibrary.computePositions(ellipsoid, wallPositions, maximumHeights, minimumHeights, granularity, false);
        var newWallPositions = pos.newWallPositions;
        var bottomPositions = pos.bottomPositions;
        var topPositions = pos.topPositions;

        var length = newWallPositions.length;
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
        size = 2*numVertices - 4 + numVertices;
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

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type GeometryAttributes
         *
         * @see Geometry#attributes
         */
        this.attributes = attributes;

        /**
         * Index data that, along with {@link Geometry#primitiveType}, determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = PrimitiveType.LINES;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = new BoundingSphere.fromVertices(positions);
    };

    /**
     * A {@link Geometry} that represents a wall, which is similar to a KML line string. A wall is defined by a series of points,
     * which extrude down to the ground. Optionally, they can extrude downwards to a specified height.
     *
     * @memberof WallGeometry
     *
     * @param {Array} positions An array of Cartesian objects, which are the points of the wall.
     * @param {Number} [maximumHeight] A constant that defines the maximum height of the
     *        wall at <code>positions</code>. If undefined, the height of each position in used.
     * @param {Number} [minimumHeight] A constant that defines the minimum height of the
     *        wall at <code>positions</code>. If undefined, the height at each position is 0.0.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid for coordinate manipulation
     *
     * @exception {DeveloperError} positions is required.
     *
     * @example
     * var positions = [
     *   Cartographic.fromDegrees(19.0, 47.0, 10000.0),
     *   Cartographic.fromDegrees(19.0, 48.0, 10000.0),
     *   Cartographic.fromDegrees(20.0, 48.0, 10000.0),
     *   Cartographic.fromDegrees(20.0, 47.0, 10000.0),
     *   Cartographic.fromDegrees(19.0, 47.0, 10000.0)
     * ];
     *
     * // create a wall that spans from 10000 meters to 20000 meters
     * var wall = new WallGeometry({
     *     positions : ellipsoid.cartographicArrayToCartesianArray(positions),
     *     topHeight : 20000.0,
     *     bottomHeight : 10000.0
     * });
     */
    WallGeometry.fromConstantHeights = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var positions = options.positions;
        if (typeof positions === 'undefined') {
            throw new DeveloperError('options.positions is required.');
        }

        var minHeights;
        var maxHeights;

        var min = options.minimumHeight;
        var max = options.maximumHeight;

        var doMin = (typeof min !== 'undefined');
        var doMax = (typeof max !== 'undefined');
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
        return new WallGeometry(newOptions);
    };

    return WallGeometry;
});
