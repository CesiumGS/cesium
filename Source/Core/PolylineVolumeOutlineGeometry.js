define([
        './arrayRemoveDuplicates',
        './BoundingRectangle',
        './Cartesian2',
        './Cartesian3',
        './Check',
        './CornerType',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './GeometryInstance',
        './GeometryPipeline',
        './Math',
        './PolygonPipeline',
        './PolylineGeometry',
        './PolylineVolumeGeometryLibrary',
        './WindingOrder'
    ], function(
        arrayRemoveDuplicates,
        BoundingRectangle,
        Cartesian2,
        Cartesian3,
        Check,
        CornerType,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        GeometryInstance,
        GeometryPipeline,
        CesiumMath,
        PolygonPipeline,
        PolylineGeometry,
        PolylineVolumeGeometryLibrary,
        WindingOrder) {
    'use strict';

    var singleLinesScratch = [new Cartesian3(), new Cartesian3()];

    function computeAttributes(positions, shape, width) {
        var shapeLength = shape.length;
        var shapeCount = positions.length / (3 * shapeLength);

        var j;
        var offset = shapeLength;
        var linePositions = [];

        for (j = 0; j < shapeLength; j++) {
            linePositions.push(Cartesian3.fromArray(positions, (j + offset) * 3));
        }
        linePositions.push(linePositions[0]);

        var instances = [];
        instances.push(new GeometryInstance({
            geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                positions : linePositions,
                followSurface : false,
                width : width
            }))
        }));

        offset = (shapeCount - 1) * shapeLength;
        for (j = 0; j < shapeLength; j++) {
            Cartesian3.fromArray(positions, (j + offset) * 3, linePositions[j]);
        }
        linePositions[shapeLength] = linePositions[0];

        instances.push(new GeometryInstance({
            geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                positions : linePositions,
                followSurface : false,
                width : width
            }))
        }));

        for (var i = 1; i < shapeCount - 1; i++) {
            var firstOffset = shapeLength * i;
            var secondOffset = firstOffset + shapeLength;
            for (j = 0; j < shapeLength; j++) {
                var singleLine = singleLinesScratch;
                Cartesian3.fromArray(positions, (j + firstOffset) * 3, singleLine[0]);
                Cartesian3.fromArray(positions, (j + secondOffset) * 3, singleLine[1]);
                var geometry = PolylineGeometry.createGeometry(new PolylineGeometry({
                    positions : singleLine,
                    followSurface : false,
                    width : width
                }));
                if (defined(geometry)) {
                    instances.push(new GeometryInstance({
                        geometry : geometry
                    }));
                }
            }
        }

        return GeometryPipeline.combineInstances(instances)[0];
    }

    /**
     * A description of a polyline with a volume (a 2D shape extruded along a polyline).
     *
     * @alias PolylineVolumeOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.polylinePositions An array of positions that define the center of the polyline volume.
     * @param {Cartesian2[]} options.shapePositions An array of positions that define the shape to be extruded along the polyline
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {CornerType} [options.cornerType=CornerType.ROUNDED] Determines the style of the corners.
     * @param {Number} [options.width=2] The outline width in pixels.
     *
     * @exception {DeveloperError} width must be greater than or equal to 1.0.
     *
     * @see PolylineVolumeOutlineGeometry#createGeometry
     *
     * @example
     * function computeCircle(radius) {
     *   var positions = [];
     *   for (var i = 0; i < 360; i++) {
     *     var radians = Cesium.Math.toRadians(i);
     *     positions.push(new Cesium.Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)));
     *   }
     *   return positions;
     * }
     *
     * var volumeOutline = new Cesium.PolylineVolumeOutlineGeometry({
     *   polylinePositions : Cesium.Cartesian3.fromDegreesArray([
     *     -72.0, 40.0,
     *     -70.0, 35.0
     *   ]),
     *   shapePositions : computeCircle(100000.0)
     * });
     */
    function PolylineVolumeOutlineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.polylinePositions;
        var shape = options.shapePositions;
        var width = defaultValue(options.width, 2.0);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.polylinePositions', positions);
        Check.defined('options.shapePositions', shape);
        Check.typeOf.number.greaterThanOrEquals('options.width', width, 1.0);
        //>>includeEnd('debug');

        this._positions = positions;
        this._shape = shape;
        this._ellipsoid = Ellipsoid.clone(defaultValue(options.ellipsoid, Ellipsoid.WGS84));
        this._cornerType = defaultValue(options.cornerType, CornerType.ROUNDED);
        this._granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        this._width = width;
        this._workerName = 'createPolylineVolumeOutlineGeometry';

        var numComponents = 1 + positions.length * Cartesian3.packedLength;
        numComponents += 1 + shape.length * Cartesian2.packedLength;

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = numComponents + Ellipsoid.packedLength + 3;
    }

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {PolylineVolumeOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    PolylineVolumeOutlineGeometry.pack = function(value, array, startingIndex) {
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

        var shape = value._shape;
        length = shape.length;
        array[startingIndex++] = length;

        for (i = 0; i < length; ++i, startingIndex += Cartesian2.packedLength) {
            Cartesian2.pack(shape[i], array, startingIndex);
        }

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        array[startingIndex++] = value._cornerType;
        array[startingIndex++] = value._granularity;
        array[startingIndex] = value._width;

        return array;
    };

    var scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
    var scratchOptions = {
        polylinePositions : undefined,
        shapePositions : undefined,
        ellipsoid : scratchEllipsoid,
        height : undefined,
        cornerType : undefined,
        granularity : undefined,
        width : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {PolylineVolumeOutlineGeometry} [result] The object into which to store the result.
     * @returns {PolylineVolumeOutlineGeometry} The modified result parameter or a new PolylineVolumeOutlineGeometry instance if one was not provided.
     */
    PolylineVolumeOutlineGeometry.unpack = function(array, startingIndex, result) {
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
        var shape = new Array(length);

        for (i = 0; i < length; ++i, startingIndex += Cartesian2.packedLength) {
            shape[i] = Cartesian2.unpack(array, startingIndex);
        }

        var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
        startingIndex += Ellipsoid.packedLength;

        var cornerType = array[startingIndex++];
        var granularity = array[startingIndex++];
        var width = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.polylinePositions = positions;
            scratchOptions.shapePositions = shape;
            scratchOptions.cornerType = cornerType;
            scratchOptions.granularity = granularity;
            scratchOptions.width = width;
            return new PolylineVolumeOutlineGeometry(scratchOptions);
        }

        result._positions = positions;
        result._shape = shape;
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._cornerType = cornerType;
        result._granularity = granularity;
        result._width = width;

        return result;
    };

    var brScratch = new BoundingRectangle();

    /**
     * Computes the geometric representation of the outline of a polyline with a volume, including its vertices, indices, and a bounding sphere.
     *
     * @param {PolylineVolumeOutlineGeometry} polylineVolumeOutlineGeometry A description of the polyline volume outline.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    PolylineVolumeOutlineGeometry.createGeometry = function(polylineVolumeOutlineGeometry) {
        var positions = polylineVolumeOutlineGeometry._positions;
        var cleanPositions = arrayRemoveDuplicates(positions, Cartesian3.equalsEpsilon);
        var shape2D = polylineVolumeOutlineGeometry._shape;
        shape2D = PolylineVolumeGeometryLibrary.removeDuplicatesFromShape(shape2D);

        if (cleanPositions.length < 2 || shape2D.length < 3) {
            return undefined;
        }

        if (PolygonPipeline.computeWindingOrder2D(shape2D) === WindingOrder.CLOCKWISE) {
            shape2D.reverse();
        }
        var boundingRectangle = BoundingRectangle.fromPoints(shape2D, brScratch);

        var computedPositions = PolylineVolumeGeometryLibrary.computePositions(cleanPositions, shape2D, boundingRectangle, polylineVolumeOutlineGeometry, false);
        return computeAttributes(computedPositions, shape2D, polylineVolumeOutlineGeometry._width);
    };

    return PolylineVolumeOutlineGeometry;
});
