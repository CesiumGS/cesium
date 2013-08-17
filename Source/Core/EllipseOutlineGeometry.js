/*global define*/
define([
        './defaultValue',
        './defined',
        './BoundingSphere',
        './Cartesian3',
        './ComponentDatatype',
        './IndexDatatype',
        './DeveloperError',
        './Ellipsoid',
        './EllipseGeometryLibrary',
        './GeometryAttribute',
        './GeometryAttributes',
        './Math',
        './Matrix3',
        './PrimitiveType',
        './Quaternion'
    ], function(
        defaultValue,
        defined,
        BoundingSphere,
        Cartesian3,
        ComponentDatatype,
        IndexDatatype,
        DeveloperError,
        Ellipsoid,
        EllipseGeometryLibrary,
        GeometryAttribute,
        GeometryAttributes,
        CesiumMath,
        Matrix3,
        PrimitiveType,
        Quaternion) {
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
        var indices = IndexDatatype.createTypedArray(length, length*2);
        var index = 0;
        for (var i = 0; i < length - 1; i++) {
            indices[index++] = i;
            indices[index++] = i+1;
        }
        indices[index++] = length - 1;
        indices[index++] = 0;

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
        for (var i = 0; i < length - 1; i++) {
            indices[index++] = i;
            indices[index++] = i + 1;
            indices[index++] = i + length;
            indices[index++] = i + length + 1;
        }
        indices[index++] = length - 1;
        indices[index++] = 0;
        indices[index++] = length + length - 1;
        indices[index++] = length;

        var numSide;
        if (numberOfVerticalLines > 0) {
            var numSideLines = Math.min(numberOfVerticalLines, length);
            numSide = Math.round(length/numSideLines);
        }
        var maxI = Math.min(numSide*numberOfVerticalLines, length);
        if (numberOfVerticalLines > 0) {
            for (i = 0; i < maxI; i+= numSide){
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
     *
     * A {@link Geometry} that represents geometry for the outline of an ellipse on an ellipsoid
     *
     * @alias EllipseOutlineGeometry
     * @constructor
     *
     * @param {Cartesian3} options.center The ellipse's center point in the fixed frame.
     * @param {Number} options.semiMajorAxis The length of the ellipse's semi-major axis in meters.
     * @param {Number} options.semiMinorAxis The length of the ellipse's semi-minor axis in meters.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid the ellipse will be on.
     * @param {Number} [options.height=0.0] The height above the ellipsoid.
     * @param {Number} [options.extrudedHeight] The height of the extrusion.
     * @param {Number} [options.rotation=0.0] The angle from north (clockwise) in radians. The default is zero.
     * @param {Number} [options.granularity=0.02] The angular distance between points on the ellipse in radians.
     * @param {Number} [options.numberOfVerticalLines = 16] Number of lines to draw between the top and bottom surface of an extruded ellipse.
     *
     * @exception {DeveloperError} center is required.
     * @exception {DeveloperError} semiMajorAxis is required.
     * @exception {DeveloperError} semiMinorAxis is required.
     * @exception {DeveloperError} semiMajorAxis and semiMinorAxis must be greater than zero.
     * @exception {DeveloperError} semiMajorAxis must be larger than the semiMajorAxis.
     * @exception {DeveloperError} granularity must be greater than zero.
     *
     * @example
     * // Create an ellipse.
     * var ellipsoid = Ellipsoid.WGS84;
     * var ellipse = new EllipseOutlineGeometry({
     *   ellipsoid : ellipsoid,
     *   center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883)),
     *   semiMajorAxis : 500000.0,
     *   semiMinorAxis : 300000.0,
     *   rotation : CesiumMath.toRadians(60.0)
     * });
     */
    var EllipseOutlineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var center = options.center;
        var semiMajorAxis = options.semiMajorAxis;
        var semiMinorAxis = options.semiMinorAxis;

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

        var newOptions = {
            center : center,
            semiMajorAxis : semiMajorAxis,
            semiMinorAxis : semiMinorAxis,
            ellipsoid : defaultValue(options.ellipsoid, Ellipsoid.WGS84),
            rotation : defaultValue(options.rotation, 0.0),
            height : defaultValue(options.height, 0.0),
            granularity : defaultValue(options.granularity, 0.02),
            extrudedHeight : options.extrudedHeight,
            numberOfVerticalLines : Math.max(defaultValue(options.numberOfVerticalLines, 16), 0)
        };

        if (newOptions.granularity <= 0.0) {
            throw new DeveloperError('granularity must be greater than zero.');
        }

        var extrude = (defined(newOptions.extrudedHeight) && !CesiumMath.equalsEpsilon(newOptions.height, newOptions.extrudedHeight, 1));

        var ellipseGeometry;
        if (extrude) {
            var h = newOptions.extrudedHeight;
            var height = newOptions.height;
            newOptions.extrudedHeight = Math.min(h, height);
            newOptions.height = Math.max(h, height);
            ellipseGeometry = computeExtrudedEllipse(newOptions);
        } else {
            ellipseGeometry = computeEllipse(newOptions);
        }

        /**
         * An object containing {@link GeometryAttribute} position property.
         *
         * @type GeometryAttributes
         *
         * @see Geometry#attributes
         */
        this.attributes = ellipseGeometry.attributes;

        /**
         * Index data that, along with {@link Geometry#primitiveType}, determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = ellipseGeometry.indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.LINES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = PrimitiveType.LINES;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = ellipseGeometry.boundingSphere;
    };

    return EllipseOutlineGeometry;
});