define([
        './arrayFill',
        './Cartesian3',
        './Cartographic',
        './Check',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './GeometryAttribute',
        './GeometryInstance',
        './GeometryOffsetAttribute',
        './GeometryPipeline',
        './Math',
        './PolygonPipeline',
        './PolylineGeometry',
        './Rectangle',
        './RectangleGeometryLibrary'
    ], function(
        arrayFill,
        Cartesian3,
        Cartographic,
        Check,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        GeometryAttribute,
        GeometryInstance,
        GeometryOffsetAttribute,
        GeometryPipeline,
        CesiumMath,
        PolygonPipeline,
        PolylineGeometry,
        Rectangle,
        RectangleGeometryLibrary) {
    'use strict';

    var scratchNormal = new Cartesian3();

    function scaleToHeight(position, ellipsoid, height) {
        if (height === 0) {
            return;
        }

        var n = scratchNormal;
        var p = position;

        n = ellipsoid.geodeticSurfaceNormal(p, n);
        Cartesian3.multiplyByScalar(n, height, n);
        Cartesian3.add(p, n, p);
    }

    var positionScratch = new Cartesian3();

    function constructRectangle(geometry, computedOptions, rectangleHeight) {
        var ellipsoid = geometry._ellipsoid;
        var size = computedOptions.size;
        var height = computedOptions.height;
        var width = computedOptions.width;
        var positions = new Array(size + 1);

        var posIndex = 0;
        var row = 0;
        var col;
        var position = positionScratch;
        for (col = 0; col < width; col++) {
            RectangleGeometryLibrary.computePosition(computedOptions, ellipsoid, false, row, col, position);
            scaleToHeight(position, ellipsoid, rectangleHeight);
            positions[posIndex++] = Cartesian3.clone(position);
        }

        col = width - 1;
        for (row = 1; row < height; row++) {
            RectangleGeometryLibrary.computePosition(computedOptions, ellipsoid, false, row, col, position);
            scaleToHeight(position, ellipsoid, rectangleHeight);
            positions[posIndex++] = Cartesian3.clone(position);
        }

        row = height - 1;
        for (col = width-2; col >=0; col--) {
            RectangleGeometryLibrary.computePosition(computedOptions, ellipsoid, false, row, col, position);
            scaleToHeight(position, ellipsoid, rectangleHeight);
            positions[posIndex++] = Cartesian3.clone(position);
        }

        col = 0;
        for (row = height - 2; row > 0; row--) {
            RectangleGeometryLibrary.computePosition(computedOptions, ellipsoid, false, row, col, position);
            scaleToHeight(position, ellipsoid, rectangleHeight);
            positions[posIndex++] = Cartesian3.clone(position);
        }

        positions[size] = positions[0];

        return new GeometryInstance({
            geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                positions : positions,
                followSurface : false,
                width : geometry._width
            }))
        });
    }

    function addOffset(polygonGeometry, instance, value) {
        if (!defined(polygonGeometry._offsetAttribute)) {
            return;
        }

        var size = instance.geometry.attributes.position.values.length / 3;
        var offsetAttribute = new Uint8Array(size);
        offsetAttribute = arrayFill(offsetAttribute, value);
        instance.geometry.attributes.applyOffset = new GeometryAttribute({
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 1,
            values : offsetAttribute
        });
    }

    function addCornerOffset(polygonGeometry, instance, topValue, bottomValue) {
        if (!defined(polygonGeometry._offsetAttribute)) {
            return;
        }

        var size = instance.geometry.attributes.position.values.length / 3;
        var offsetAttribute = new Uint8Array(size);
        offsetAttribute = arrayFill(offsetAttribute, topValue, 0, size / 2);
        offsetAttribute = arrayFill(offsetAttribute, bottomValue, size / 2);
        instance.geometry.attributes.applyOffset = new GeometryAttribute({
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 1,
            values : offsetAttribute
        });
    }

    /**
     * A description of the outline of a a cartographic rectangle on an ellipsoid centered at the origin.
     *
     * @alias RectangleOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Rectangle} options.rectangle A cartographic rectangle with north, south, east and west properties in radians.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the rectangle lies.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.height=0.0] The distance in meters between the rectangle and the ellipsoid surface.
     * @param {Number} [options.rotation=0.0] The rotation of the rectangle, in radians. A positive rotation is counter-clockwise.
     * @param {Number} [options.extrudedHeight] The distance in meters between the rectangle's extruded face and the ellipsoid surface.
     * @param {Number} [options.width=2] The outline width in pixels.
     *
     * @exception {DeveloperError} <code>options.rectangle.north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.rectangle.south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.rectangle.east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.rectangle.west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.rectangle.north</code> must be greater than <code>rectangle.south</code>.
     * @exception {DeveloperError} <code>options.width</code> must be greater than or equal to 1.0.
     *
     * @see RectangleOutlineGeometry#createGeometry
     *
     * @example
     * var rectangle = new Cesium.RectangleOutlineGeometry({
     *   ellipsoid : Cesium.Ellipsoid.WGS84,
     *   rectangle : Cesium.Rectangle.fromDegrees(-80.0, 39.0, -74.0, 42.0),
     *   height : 10000.0
     * });
     * var geometry = Cesium.RectangleOutlineGeometry.createGeometry(rectangle);
     */
    function RectangleOutlineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var rectangle = options.rectangle;
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var rotation = defaultValue(options.rotation, 0.0);
        var width = defaultValue(options.width, 2.0);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('rectangle', rectangle);
        Check.typeOf.number.greaterThanOrEquals('width', width, 1.0);
        Rectangle.validate(rectangle);
        if (rectangle.north < rectangle.south) {
            throw new DeveloperError('options.rectangle.north must be greater than options.rectangle.south');
        }
        //>>includeEnd('debug');

        var height = defaultValue(options.height, 0.0);
        var extrudedHeight = defaultValue(options.extrudedHeight, height);

        this._rectangle = Rectangle.clone(rectangle);
        this._granularity = granularity;
        this._ellipsoid = ellipsoid;
        this._surfaceHeight = Math.max(height, extrudedHeight);
        this._rotation = rotation;
        this._extrudedHeight = Math.min(height, extrudedHeight);
        this._offsetAttribute = options.offsetAttribute;
        this._width = width;
        this._workerName = 'createRectangleOutlineGeometry';
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    RectangleOutlineGeometry.packedLength = Rectangle.packedLength + Ellipsoid.packedLength + 5;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {RectangleOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    RectangleOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }

        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        Rectangle.pack(value._rectangle, array, startingIndex);
        startingIndex += Rectangle.packedLength;

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        array[startingIndex++] = value._granularity;
        array[startingIndex++] = value._surfaceHeight;
        array[startingIndex++] = value._rotation;
        array[startingIndex++] = value._extrudedHeight;
        array[startingIndex++] = defaultValue(value._offsetAttribute, -1);
        array[startingIndex] = value._width;

        return array;
    };

    var scratchRectangle = new Rectangle();
    var scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
    var scratchOptions = {
        rectangle : scratchRectangle,
        ellipsoid : scratchEllipsoid,
        granularity : undefined,
        height : undefined,
        rotation : undefined,
        extrudedHeight : undefined,
        offsetAttribute: undefined,
        width : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {RectangleOutlineGeometry} [result] The object into which to store the result.
     * @returns {RectangleOutlineGeometry} The modified result parameter or a new Quaternion instance if one was not provided.
     */
    RectangleOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var rectangle = Rectangle.unpack(array, startingIndex, scratchRectangle);
        startingIndex += Rectangle.packedLength;

        var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
        startingIndex += Ellipsoid.packedLength;

        var granularity = array[startingIndex++];
        var height = array[startingIndex++];
        var rotation = array[startingIndex++];
        var extrudedHeight = array[startingIndex++];
        var offsetAttribute = array[startingIndex++];
        var width = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.granularity = granularity;
            scratchOptions.height = height;
            scratchOptions.rotation = rotation;
            scratchOptions.extrudedHeight = extrudedHeight;
            scratchOptions.offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
            scratchOptions.width = width;

            return new RectangleOutlineGeometry(scratchOptions);
        }

        result._rectangle = Rectangle.clone(rectangle, result._rectangle);
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._surfaceHeight = height;
        result._rotation = rotation;
        result._extrudedHeight = extrudedHeight;
        result._offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
        result._width = width;

        return result;
    };

    var rectangleScratch = new Rectangle();
    var nwScratch = new Cartographic();
    var verticalLineScratch = [new Cartesian3(), new Cartesian3()];

    /**
     * Computes the geometric representation of an outline of a rectangle, including its vertices, indices, and a bounding sphere.
     *
     * @param {RectangleOutlineGeometry} rectangleGeometry A description of the rectangle outline.
     * @returns {Geometry|undefined} The computed vertices and indices.
     *
     * @exception {DeveloperError} Rotated rectangle is invalid.
     */
    RectangleOutlineGeometry.createGeometry = function(rectangleGeometry) {
        var rectangle = rectangleGeometry._rectangle;
        var computedOptions = RectangleGeometryLibrary.computeOptions(rectangle, rectangleGeometry._granularity, rectangleGeometry._rotation, 0, rectangleScratch, nwScratch);
        computedOptions.size =  2 * computedOptions.width + 2 * computedOptions.height - 4;

        if ((CesiumMath.equalsEpsilon(rectangle.north, rectangle.south, CesiumMath.EPSILON10) ||
             (CesiumMath.equalsEpsilon(rectangle.east, rectangle.west, CesiumMath.EPSILON10)))) {
            return undefined;
        }

        var surfaceHeight = rectangleGeometry._surfaceHeight;
        var extrudedHeight = rectangleGeometry._extrudedHeight;
        var extrude = !CesiumMath.equalsEpsilon(surfaceHeight, extrudedHeight, 0, CesiumMath.EPSILON2);
        var instances = [];
        var instance;

        if (extrude) {
            var bottomValue;
            var topValue;
            if (rectangleGeometry._offsetAttribute === GeometryOffsetAttribute.TOP) {
                topValue = 1;
                bottomValue = 0;
            } else {
                bottomValue = rectangleGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
                topValue = bottomValue;
            }

            var bottom = constructRectangle(rectangleGeometry, computedOptions, extrudedHeight);
            addOffset(rectangleGeometry, bottom, bottomValue);

            var top = constructRectangle(rectangleGeometry, computedOptions, surfaceHeight);
            addOffset(rectangleGeometry, top, topValue);

            instances.push(top, bottom);

            var verticalLines = verticalLineScratch;
            var cols = [0, 0, computedOptions.width - 1, computedOptions.width - 1];
            var rows = [0, computedOptions.height - 1, 0, computedOptions.height - 1];

            var ellipsoid = rectangleGeometry._ellipsoid;
            var width = rectangleGeometry._width;

            for (var j = 0; j < 4; ++j) {
                RectangleGeometryLibrary.computePosition(computedOptions, ellipsoid, false, rows[j], cols[j], verticalLines[0]);
                Cartesian3.clone(verticalLines[0], verticalLines[1]);
                scaleToHeight(verticalLines[0], ellipsoid, surfaceHeight);

                instance = new GeometryInstance({
                    geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                        positions : verticalLines,
                        followSurface : false,
                        width : width
                    }))
                });
                addCornerOffset(rectangleGeometry, instance, topValue, bottomValue);
                instances.push(instance);
            }
        } else {
            var offsetValue = rectangleGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
            instance = constructRectangle(rectangleGeometry, computedOptions, surfaceHeight);
            addOffset(rectangleGeometry, instance, offsetValue);
            instances.push(instance);
        }

        return GeometryPipeline.combineInstances(instances)[0];
    };

    return RectangleOutlineGeometry;
});
