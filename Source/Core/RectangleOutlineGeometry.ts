define([
        './arrayFill',
        './BoundingSphere',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './GeometryOffsetAttribute',
        './IndexDatatype',
        './Math',
        './PolygonPipeline',
        './PrimitiveType',
        './Rectangle',
        './RectangleGeometryLibrary'
    ], function(
        arrayFill,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryOffsetAttribute,
        IndexDatatype,
        CesiumMath,
        PolygonPipeline,
        PrimitiveType,
        Rectangle,
        RectangleGeometryLibrary) {
    'use strict';

    var bottomBoundingSphere = new BoundingSphere();
    var topBoundingSphere = new BoundingSphere();
    var positionScratch = new Cartesian3();
    var rectangleScratch = new Rectangle();

    function constructRectangle(geometry, computedOptions) {
        var ellipsoid = geometry._ellipsoid;
        var size = computedOptions.size;
        var height = computedOptions.height;
        var width = computedOptions.width;
        var positions = new Float64Array(size * 3);

        var posIndex = 0;
        var row = 0;
        var col;
        var position = positionScratch;
        for (col = 0; col < width; col++) {
            RectangleGeometryLibrary.computePosition(computedOptions, ellipsoid, false, row, col, position);
            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }

        col = width - 1;
        for (row = 1; row < height; row++) {
            RectangleGeometryLibrary.computePosition(computedOptions, ellipsoid, false, row, col, position);
            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }

        row = height - 1;
        for (col = width-2; col >=0; col--){
            RectangleGeometryLibrary.computePosition(computedOptions, ellipsoid, false, row, col, position);
            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }

        col = 0;
        for (row = height - 2; row > 0; row--) {
            RectangleGeometryLibrary.computePosition(computedOptions, ellipsoid, false, row, col, position);
            positions[posIndex++] = position.x;
            positions[posIndex++] = position.y;
            positions[posIndex++] = position.z;
        }

        var indicesSize = positions.length/3 * 2;
        var indices = IndexDatatype.createTypedArray(positions.length / 3, indicesSize);

        var index = 0;
        for(var i = 0; i < (positions.length/3)-1; i++) {
            indices[index++] = i;
            indices[index++] = i+1;
        }
        indices[index++] = (positions.length/3)-1;
        indices[index++] = 0;

        var geo = new Geometry({
            attributes : new GeometryAttributes(),
            primitiveType : PrimitiveType.LINES
        });

        geo.attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : positions
        });
        geo.indices = indices;

        return geo;
    }

    function constructExtrudedRectangle(rectangleGeometry, computedOptions) {
        var surfaceHeight = rectangleGeometry._surfaceHeight;
        var extrudedHeight = rectangleGeometry._extrudedHeight;
        var ellipsoid = rectangleGeometry._ellipsoid;
        var minHeight = extrudedHeight;
        var maxHeight = surfaceHeight;
        var geo = constructRectangle(rectangleGeometry, computedOptions);

        var height = computedOptions.height;
        var width = computedOptions.width;

        var topPositions = PolygonPipeline.scaleToGeodeticHeight(geo.attributes.position.values, maxHeight, ellipsoid, false);
        var length = topPositions.length;
        var positions = new Float64Array(length*2);
        positions.set(topPositions);
        var bottomPositions = PolygonPipeline.scaleToGeodeticHeight(geo.attributes.position.values, minHeight, ellipsoid);
        positions.set(bottomPositions, length);
        geo.attributes.position.values = positions;

        var indicesSize = positions.length/3 * 2 + 8;
        var indices = IndexDatatype.createTypedArray(positions.length / 3, indicesSize);
        length = positions.length/6;
        var index = 0;
        for (var i = 0; i < length - 1; i++) {
            indices[index++] = i;
            indices[index++] =i+1;
            indices[index++] = i + length;
            indices[index++] = i + length + 1;
        }
        indices[index++] = length - 1;
        indices[index++] = 0;
        indices[index++] = length + length - 1;
        indices[index++] = length;

        indices[index++] = 0;
        indices[index++] = length;
        indices[index++] = width-1;
        indices[index++] = length + width-1;
        indices[index++] = width + height - 2;
        indices[index++] = width + height - 2 + length;
        indices[index++] =  2*width + height - 3;
        indices[index++] = 2*width + height - 3 + length;

        geo.indices = indices;

        return geo;
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
     *
     * @exception {DeveloperError} <code>options.rectangle.north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.rectangle.south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
     * @exception {DeveloperError} <code>options.rectangle.east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.rectangle.west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
     * @exception {DeveloperError} <code>options.rectangle.north</code> must be greater than <code>rectangle.south</code>.
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

        //>>includeStart('debug', pragmas.debug);
        if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required.');
        }
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
        array[startingIndex] = defaultValue(value._offsetAttribute, -1);

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
        offsetAttribute: undefined
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
        var offsetAttribute = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.granularity = granularity;
            scratchOptions.height = height;
            scratchOptions.rotation = rotation;
            scratchOptions.extrudedHeight = extrudedHeight;
            scratchOptions.offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;

            return new RectangleOutlineGeometry(scratchOptions);
        }

        result._rectangle = Rectangle.clone(rectangle, result._rectangle);
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._surfaceHeight = height;
        result._rotation = rotation;
        result._extrudedHeight = extrudedHeight;
        result._offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;

        return result;
    };

    var nwScratch = new Cartographic();
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
        var ellipsoid = rectangleGeometry._ellipsoid;
        var computedOptions = RectangleGeometryLibrary.computeOptions(rectangle, rectangleGeometry._granularity, rectangleGeometry._rotation, 0, rectangleScratch, nwScratch);
        computedOptions.size =  2 * computedOptions.width + 2 * computedOptions.height - 4;

        var geometry;
        var boundingSphere;

        if ((CesiumMath.equalsEpsilon(rectangle.north, rectangle.south, CesiumMath.EPSILON10) ||
             (CesiumMath.equalsEpsilon(rectangle.east, rectangle.west, CesiumMath.EPSILON10)))) {
            return undefined;
        }

        var surfaceHeight = rectangleGeometry._surfaceHeight;
        var extrudedHeight = rectangleGeometry._extrudedHeight;
        var extrude = !CesiumMath.equalsEpsilon(surfaceHeight, extrudedHeight, 0, CesiumMath.EPSILON2);
        var offsetValue;
        if (extrude) {
            geometry = constructExtrudedRectangle(rectangleGeometry, computedOptions);
            if (defined(rectangleGeometry._offsetAttribute)) {
                var size = geometry.attributes.position.values.length / 3;
                var offsetAttribute = new Uint8Array(size);
                if (rectangleGeometry._offsetAttribute === GeometryOffsetAttribute.TOP) {
                    offsetAttribute = arrayFill(offsetAttribute, 1, 0, size / 2);
                } else {
                    offsetValue = rectangleGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
                    offsetAttribute = arrayFill(offsetAttribute, offsetValue);
                }

                geometry.attributes.applyOffset = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                    componentsPerAttribute : 1,
                    values : offsetAttribute
                });
            }
            var topBS = BoundingSphere.fromRectangle3D(rectangle, ellipsoid, surfaceHeight, topBoundingSphere);
            var bottomBS = BoundingSphere.fromRectangle3D(rectangle, ellipsoid, extrudedHeight, bottomBoundingSphere);
            boundingSphere = BoundingSphere.union(topBS, bottomBS);
        } else {
            geometry = constructRectangle(rectangleGeometry, computedOptions);
            geometry.attributes.position.values = PolygonPipeline.scaleToGeodeticHeight(geometry.attributes.position.values, surfaceHeight, ellipsoid, false);

            if (defined(rectangleGeometry._offsetAttribute)) {
                var length = geometry.attributes.position.values.length;
                var applyOffset = new Uint8Array(length / 3);
                offsetValue = rectangleGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
                arrayFill(applyOffset, offsetValue);
                geometry.attributes.applyOffset = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                    componentsPerAttribute : 1,
                    values: applyOffset
                });
            }

            boundingSphere = BoundingSphere.fromRectangle3D(rectangle, ellipsoid, surfaceHeight);
        }

        return new Geometry({
            attributes : geometry.attributes,
            indices : geometry.indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : boundingSphere,
            offsetAttribute : rectangleGeometry._offsetAttribute
        });
    };

    return RectangleOutlineGeometry;
});
