/*global define*/
define([
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
        EllipseGeometryLibrary,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        IndexDatatype,
        CesiumMath,
        PrimitiveType) {
    "use strict";

    var scratchCartesian1 = new Cartesian3();
    var boundingSphereCenter = new Cartesian3();

    function computeEllipse(options) {
        var center = options.center;
        boundingSphereCenter = Cartesian3.multiplyByScalar(options.ellipsoid.geodeticSurfaceNormal(center, boundingSphereCenter), options.height, boundingSphereCenter);
        boundingSphereCenter = Cartesian3.add(center, boundingSphereCenter, boundingSphereCenter);
        var boundingSphere = new BoundingSphere(boundingSphereCenter, options.semiMajorAxis);
        var positions = EllipseGeometryLibrary.computeEllipsePositions(options, false, true).outerPositions;

        var attributes = new GeometryAttributes({
            position: new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : EllipseGeometryLibrary.raisePositionsToHeight(positions, options, false)
            })
        });

        var length = positions.length / 3;
        var indices = IndexDatatype.createTypedArray(length, length * 2);
        var index = 0;
        for ( var i = 0; i < length; ++i) {
            indices[index++] = i;
            indices[index++] = (i + 1) % length;
        }

        return {
            boundingSphere : boundingSphere,
            attributes : attributes,
            indices : indices
        };
    }

    var topBoundingSphere = new BoundingSphere();
    var bottomBoundingSphere = new BoundingSphere();
    function computeExtrudedEllipse(options) {
        var numberOfVerticalLines = defaultValue(options.numberOfVerticalLines, 16);
        numberOfVerticalLines = Math.max(numberOfVerticalLines, 0);

        var center = options.center;
        var ellipsoid = options.ellipsoid;
        var semiMajorAxis = options.semiMajorAxis;
        var scaledNormal = Cartesian3.multiplyByScalar(ellipsoid.geodeticSurfaceNormal(center, scratchCartesian1), options.height, scratchCartesian1);
        topBoundingSphere.center = Cartesian3.add(center, scaledNormal, topBoundingSphere.center);
        topBoundingSphere.radius = semiMajorAxis;

        scaledNormal = Cartesian3.multiplyByScalar(ellipsoid.geodeticSurfaceNormal(center, scaledNormal), options.extrudedHeight, scaledNormal);
        bottomBoundingSphere.center = Cartesian3.add(center, scaledNormal, bottomBoundingSphere.center);
        bottomBoundingSphere.radius = semiMajorAxis;

        var positions = EllipseGeometryLibrary.computeEllipsePositions(options, false, true).outerPositions;
        var attributes = new GeometryAttributes({
            position: new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : EllipseGeometryLibrary.raisePositionsToHeight(positions, options, true)
            })
        });

        positions = attributes.position.values;
        var boundingSphere = BoundingSphere.union(topBoundingSphere, bottomBoundingSphere);
        var length = positions.length/3;
        var indices = IndexDatatype.createTypedArray(length, length * 2 + numberOfVerticalLines * 2);

        length /= 2;
        var index = 0;
        var i;
        for (i = 0; i < length; ++i) {
            indices[index++] = i;
            indices[index++] = (i + 1) % length;
            indices[index++] = i + length;
            indices[index++] = ((i + 1) % length) + length;
        }

        var numSide;
        if (numberOfVerticalLines > 0) {
            var numSideLines = Math.min(numberOfVerticalLines, length);
            numSide = Math.round(length / numSideLines);
        }


        var maxI = Math.min(numSide * numberOfVerticalLines, length);
        if (numberOfVerticalLines > 0) {
            for (i = 0; i < maxI; i += numSide) {
                indices[index++] = i;
                indices[index++] = i + length;
            }
        }

        return {
            boundingSphere : boundingSphere,
            attributes : attributes,
            indices : indices
        };
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
     * @param {Number} [options.height=0.0] The height above the ellipsoid.
     * @param {Number} [options.extrudedHeight] The height of the extrusion.
     * @param {Number} [options.rotation=0.0] The angle from north (clockwise) in radians.
     * @param {Number} [options.granularity=0.02] The angular distance between points on the ellipse in radians.
     * @param {Number} [options.numberOfVerticalLines=16] Number of lines to draw between the top and bottom surface of an extruded ellipse.
     *
     * @exception {DeveloperError} semiMajorAxis and semiMinorAxis must be greater than zero.
     * @exception {DeveloperError} semiMajorAxis must be larger than the semiMajorAxis.
     * @exception {DeveloperError} granularity must be greater than zero.
     *
     * @see EllipseOutlineGeometry.createGeometry
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Ellipse%20Outline.html|Cesium Sandcastle Ellipse Outline Demo}
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
    var EllipseOutlineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var center = options.center;
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var semiMajorAxis = options.semiMajorAxis;
        var semiMinorAxis = options.semiMinorAxis;
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var height = defaultValue(options.height, 0.0);
        var extrudedHeight = options.extrudedHeight;
        var extrude = (defined(extrudedHeight) && Math.abs(height - extrudedHeight) > 1.0);

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
        if (semiMajorAxis <= 0.0 || semiMinorAxis <= 0.0) {
            throw new DeveloperError('Semi-major and semi-minor axes must be greater than zero.');
        }
        if (semiMajorAxis < semiMinorAxis) {
            throw new DeveloperError('semiMajorAxis must be larger than the semiMajorAxis.');
        }
        if (granularity <= 0.0) {
            throw new DeveloperError('granularity must be greater than zero.');
        }
        //>>includeEnd('debug');

        this._center = Cartesian3.clone(center);
        this._semiMajorAxis = semiMajorAxis;
        this._semiMinorAxis = semiMinorAxis;
        this._ellipsoid = Ellipsoid.clone(ellipsoid);
        this._rotation = defaultValue(options.rotation, 0.0);
        this._height = height;
        this._granularity = granularity;
        this._extrudedHeight = extrudedHeight;
        this._extrude = extrude;
        this._numberOfVerticalLines = Math.max(defaultValue(options.numberOfVerticalLines, 16), 0);
        this._workerName = 'createEllipseOutlineGeometry';
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    EllipseOutlineGeometry.packedLength = Cartesian3.packedLength + Ellipsoid.packedLength + 9;

    /**
     * Stores the provided instance into the provided array.
     * @function
     *
     * @param {Object} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
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
        array[startingIndex++] = defined(value._extrudedHeight) ? 1.0 : 0.0;
        array[startingIndex++] = defaultValue(value._extrudedHeight, 0.0);
        array[startingIndex++] = value._extrude ? 1.0 : 0.0;
        array[startingIndex]   = value._numberOfVerticalLines;
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
        numberOfVerticalLines : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {EllipseOutlineGeometry} [result] The object into which to store the result.
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
        var hasExtrudedHeight = array[startingIndex++];
        var extrudedHeight = array[startingIndex++];
        var extrude = array[startingIndex++] === 1.0;
        var numberOfVerticalLines = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.height = height;
            scratchOptions.extrudedHeight = hasExtrudedHeight ? extrudedHeight : undefined;
            scratchOptions.granularity = granularity;
            scratchOptions.rotation = rotation;
            scratchOptions.semiMajorAxis = semiMajorAxis;
            scratchOptions.semiMinorAxis = semiMinorAxis;
            scratchOptions.numberOfVerticalLines = numberOfVerticalLines;
            return new EllipseOutlineGeometry(scratchOptions);
        }

        result._center = Cartesian3.clone(center, result._center);
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._semiMajorAxis = semiMajorAxis;
        result._semiMinorAxis = semiMinorAxis;
        result._rotation = rotation;
        result._height = height;
        result._granularity = granularity;
        result._extrudedHeight = hasExtrudedHeight ? extrudedHeight : undefined;
        result._extrude = extrude;
        result._numberOfVerticalLines = numberOfVerticalLines;

        return result;
    };

    /**
     * Computes the geometric representation of an outline of an ellipse on an ellipsoid, including its vertices, indices, and a bounding sphere.
     *
     * @param {EllipseOutlineGeometry} ellipseGeometry A description of the ellipse.
     * @returns {Geometry} The computed vertices and indices.
     */
    EllipseOutlineGeometry.createGeometry = function(ellipseGeometry) {
        ellipseGeometry._center = ellipseGeometry._ellipsoid.scaleToGeodeticSurface(ellipseGeometry._center, ellipseGeometry._center);
        var options = {
            center : ellipseGeometry._center,
            semiMajorAxis : ellipseGeometry._semiMajorAxis,
            semiMinorAxis : ellipseGeometry._semiMinorAxis,
            ellipsoid : ellipseGeometry._ellipsoid,
            rotation : ellipseGeometry._rotation,
            height : ellipseGeometry._height,
            extrudedHeight : ellipseGeometry._extrudedHeight,
            granularity : ellipseGeometry._granularity,
            numberOfVerticalLines : ellipseGeometry._numberOfVerticalLines
        };
        var geometry;
        if (ellipseGeometry._extrude) {
            options.extrudedHeight = Math.min(ellipseGeometry._extrudedHeight, ellipseGeometry._height);
            options.height = Math.max(ellipseGeometry._extrudedHeight, ellipseGeometry._height);
            geometry = computeExtrudedEllipse(options);
        } else {
            geometry = computeEllipse(options);
        }

        return new Geometry({
            attributes : geometry.attributes,
            indices : geometry.indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : geometry.boundingSphere
        });
    };

    return EllipseOutlineGeometry;
});