define([
        './arrayFill',
        './BoundingSphere',
        './Cartesian3',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './EllipseGeometryLibrary',
        './Ellipsoid',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './GeometryInstance',
        './GeometryOffsetAttribute',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './PolylineGeometry'
    ], function(
        arrayFill,
        BoundingSphere,
        Cartesian3,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        EllipseGeometryLibrary,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        GeometryOffsetAttribute,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        PolylineGeometry) {
    'use strict';

    function computeEllipsePositions(options) {
        return EllipseGeometryLibrary.computeEllipsePositions(options, false, true).outerPositions;
    }

    function computeEllipse(options, positions, height) {
        options.height = height;
        positions = EllipseGeometryLibrary.raisePositionsToHeight(positions, options, false);

        var length = positions.length / 3;
        var cartesianPositions = new Array(length + 1);
        for (var i = 0; i < length; ++i) {
            cartesianPositions[i] = Cartesian3.unpack(positions, i * 3);
        }
        cartesianPositions[length] =  Cartesian3.clone(cartesianPositions[0]);

        return new GeometryInstance({
            geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                positions : cartesianPositions,
                followSurface : false,
                width : options.width
            }))
        });
    }

    function addOffset(ellipseGeometry, instance, value) {
        if (!defined(ellipseGeometry._offsetAttribute)) {
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

    function addCornerOffset(ellipseGeometry, instance, topValue, bottomValue) {
        if (!defined(ellipseGeometry._offsetAttribute)) {
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
     * A description of the outline of an ellipse on an ellipsoid.
     *
     * @alias EllipseOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3} options.center The ellipse's center point in the fixed frame.
     * @param {Number} options.semiMajorAxis The length of the ellipse's semi-major axis in meters.
     * @param {Number} options.semiMinorAxis The length of the ellipse's semi-minor axis in meters.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid the ellipse will be on.
     * @param {Number} [options.height=0.0] The distance in meters between the ellipse and the ellipsoid surface.
     * @param {Number} [options.extrudedHeight] The distance in meters between the ellipse's extruded face and the ellipsoid surface.
     * @param {Number} [options.rotation=0.0] The angle from north (counter-clockwise) in radians.
     * @param {Number} [options.granularity=0.02] The angular distance between points on the ellipse in radians.
     * @param {Number} [options.numberOfVerticalLines=16] Number of lines to draw between the top and bottom surface of an extruded ellipse.
     * @param {Number} [options.width=2] The width of the outline in pixels.
     *
     * @exception {DeveloperError} semiMajorAxis and semiMinorAxis must be greater than zero.
     * @exception {DeveloperError} semiMajorAxis must be greater than or equal to the semiMinorAxis.
     * @exception {DeveloperError} granularity must be greater than zero.
     *
     * @see EllipseOutlineGeometry.createGeometry
     *
     * @example
     * var ellipse = new Cesium.EllipseOutlineGeometry({
     *   center : Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
     *   semiMajorAxis : 500000.0,
     *   semiMinorAxis : 300000.0,
     *   rotation : Cesium.Math.toRadians(60.0)
     * });
     * var geometry = Cesium.EllipseOutlineGeometry.createGeometry(ellipse);
     */
    function EllipseOutlineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var center = options.center;
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var semiMajorAxis = options.semiMajorAxis;
        var semiMinorAxis = options.semiMinorAxis;
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var width = defaultValue(options.width, 2.0);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(center)) {
            throw new DeveloperError('center is required.');
        }
        if (!defined(semiMajorAxis)) {
            throw new DeveloperError('semiMajorAxis is required.');
        }
        if (!defined(semiMinorAxis)) {
            throw new DeveloperError('semiMinorAxis is required.');
        }
        if (semiMajorAxis < semiMinorAxis) {
            throw new DeveloperError('semiMajorAxis must be greater than or equal to the semiMinorAxis.');
        }
        if (granularity <= 0.0) {
            throw new DeveloperError('granularity must be greater than zero.');
        }
        //>>includeEnd('debug');

        var height = defaultValue(options.height, 0.0);
        var extrudedHeight = defaultValue(options.extrudedHeight, height);

        this._center = Cartesian3.clone(center);
        this._semiMajorAxis = semiMajorAxis;
        this._semiMinorAxis = semiMinorAxis;
        this._ellipsoid = Ellipsoid.clone(ellipsoid);
        this._rotation = defaultValue(options.rotation, 0.0);
        this._height = Math.max(extrudedHeight, height);
        this._granularity = granularity;
        this._extrudedHeight = Math.min(extrudedHeight, height);
        this._numberOfVerticalLines = Math.max(defaultValue(options.numberOfVerticalLines, 16), 0);
        this._offsetAttribute = options.offsetAttribute;
        this._width = width;
        this._workerName = 'createEllipseOutlineGeometry';
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    EllipseOutlineGeometry.packedLength = Cartesian3.packedLength + Ellipsoid.packedLength + 9;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {EllipseOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    EllipseOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        Cartesian3.pack(value._center, array, startingIndex);
        startingIndex += Cartesian3.packedLength;

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        array[startingIndex++] = value._semiMajorAxis;
        array[startingIndex++] = value._semiMinorAxis;
        array[startingIndex++] = value._rotation;
        array[startingIndex++] = value._height;
        array[startingIndex++] = value._granularity;
        array[startingIndex++] = value._extrudedHeight;
        array[startingIndex++] = value._numberOfVerticalLines;
        array[startingIndex++] = value._width;
        array[startingIndex] = defaultValue(value._offsetAttribute, -1);

        return array;
    };

    var scratchCenter = new Cartesian3();
    var scratchEllipsoid = new Ellipsoid();
    var scratchOptions = {
        center : scratchCenter,
        ellipsoid : scratchEllipsoid,
        semiMajorAxis : undefined,
        semiMinorAxis : undefined,
        rotation : undefined,
        height : undefined,
        granularity : undefined,
        extrudedHeight : undefined,
        numberOfVerticalLines : undefined,
        offsetAttribute: undefined,
        width : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {EllipseOutlineGeometry} [result] The object into which to store the result.
     * @returns {EllipseOutlineGeometry} The modified result parameter or a new EllipseOutlineGeometry instance if one was not provided.
     */
    EllipseOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var center = Cartesian3.unpack(array, startingIndex, scratchCenter);
        startingIndex += Cartesian3.packedLength;

        var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
        startingIndex += Ellipsoid.packedLength;

        var semiMajorAxis = array[startingIndex++];
        var semiMinorAxis = array[startingIndex++];
        var rotation = array[startingIndex++];
        var height = array[startingIndex++];
        var granularity = array[startingIndex++];
        var extrudedHeight = array[startingIndex++];
        var numberOfVerticalLines = array[startingIndex++];
        var width = array[startingIndex++];
        var offsetAttribute = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.height = height;
            scratchOptions.extrudedHeight = extrudedHeight;
            scratchOptions.granularity = granularity;
            scratchOptions.rotation = rotation;
            scratchOptions.semiMajorAxis = semiMajorAxis;
            scratchOptions.semiMinorAxis = semiMinorAxis;
            scratchOptions.numberOfVerticalLines = numberOfVerticalLines;
            scratchOptions.offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
            scratchOptions.width = width;

            return new EllipseOutlineGeometry(scratchOptions);
        }

        result._center = Cartesian3.clone(center, result._center);
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._semiMajorAxis = semiMajorAxis;
        result._semiMinorAxis = semiMinorAxis;
        result._rotation = rotation;
        result._height = height;
        result._granularity = granularity;
        result._extrudedHeight = extrudedHeight;
        result._numberOfVerticalLines = numberOfVerticalLines;
        result._offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
        result._width = width;

        return result;
    };

    var verticalLineScratch = [new Cartesian3(), new Cartesian3()];
    var scratchNormal = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();

    /**
     * Computes the geometric representation of an outline of an ellipse on an ellipsoid, including its vertices, indices, and a bounding sphere.
     *
     * @param {EllipseOutlineGeometry} ellipseGeometry A description of the ellipse.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    EllipseOutlineGeometry.createGeometry = function(ellipseGeometry) {
        if ((ellipseGeometry._semiMajorAxis <= 0.0) || (ellipseGeometry._semiMinorAxis <= 0.0)) {
            return;
        }

        var height = ellipseGeometry._height;
        var extrudedHeight = ellipseGeometry._extrudedHeight;
        var extrude = !CesiumMath.equalsEpsilon(height, extrudedHeight, 0, CesiumMath.EPSILON2);
        var width = ellipseGeometry._width;
        var ellipsoid = ellipseGeometry._ellipsoid;

        ellipseGeometry._center = ellipseGeometry._ellipsoid.scaleToGeodeticSurface(ellipseGeometry._center, ellipseGeometry._center);
        var options = {
            center : ellipseGeometry._center,
            semiMajorAxis : ellipseGeometry._semiMajorAxis,
            semiMinorAxis : ellipseGeometry._semiMinorAxis,
            ellipsoid : ellipsoid,
            rotation : ellipseGeometry._rotation,
            height : height,
            granularity : ellipseGeometry._granularity,
            numberOfVerticalLines : ellipseGeometry._numberOfVerticalLines,
            width : width
        };
        var positions = computeEllipsePositions(options);

        var instance;
        var instances = [];

        if (extrude) {
            var bottomValue = ellipseGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
            var topValue = ellipseGeometry._offsetAttribute === GeometryOffsetAttribute.TOP ? 1 : bottomValue;

            var top = computeEllipse(options, positions, height);
            var bottom = computeEllipse(options, positions, extrudedHeight);

            addOffset(ellipseGeometry, top, topValue);
            addOffset(ellipseGeometry, bottom, bottomValue);
            instances.push(top, bottom);

            var length = positions.length / 3;
            var numberOfVerticalLines = defaultValue(options.numberOfVerticalLines, 16);
            numberOfVerticalLines = CesiumMath.clamp(numberOfVerticalLines, 0, length);

            if (numberOfVerticalLines > 0) {
                var numSideLines = Math.min(numberOfVerticalLines, length);
                var numSide = Math.round(length / numSideLines);

                var maxI = Math.min(numSide * numberOfVerticalLines, length);
                var verticalLine = verticalLineScratch;
                for (var i = 0; i < maxI; i += numSide) {
                    var position = Cartesian3.fromArray(positions, i * 3, verticalLine[0]);
                    ellipsoid.scaleToGeodeticSurface(position, position);

                    var extrudedPosition = Cartesian3.clone(position, verticalLine[1]);
                    var normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
                    var scaledNormal = Cartesian3.multiplyByScalar(normal, height, scratchCartesian3);
                    Cartesian3.add(position, scaledNormal, position);

                    Cartesian3.multiplyByScalar(normal, extrudedHeight, scaledNormal);
                    Cartesian3.add(extrudedPosition, scaledNormal, extrudedPosition);

                    instance =new GeometryInstance({
                        geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                            positions : verticalLine,
                            followSurface : false,
                            width : width
                        }))
                    });
                    addCornerOffset(ellipseGeometry, instance, topValue, bottomValue);
                    instances.push(instance);
                }
            }
        } else {
            instance = computeEllipse(options, positions, height);
            var offsetValue = ellipseGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
            addOffset(ellipseGeometry, instance, offsetValue);
            instances.push(instance);
        }

        return GeometryPipeline.combineInstances(instances)[0];
    };

    return EllipseOutlineGeometry;
});
