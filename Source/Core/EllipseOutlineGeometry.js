/*global define*/
define([
        './defaultValue',
        './BoundingSphere',
        './Cartesian3',
        './ComponentDatatype',
        './IndexDatatype',
        './DeveloperError',
        './Ellipsoid',
        './GeometryAttribute',
        './GeometryAttributes',
        './Math',
        './Matrix3',
        './PrimitiveType',
        './Quaternion'
    ], function(
        defaultValue,
        BoundingSphere,
        Cartesian3,
        ComponentDatatype,
        IndexDatatype,
        DeveloperError,
        Ellipsoid,
        GeometryAttribute,
        GeometryAttributes,
        CesiumMath,
        Matrix3,
        PrimitiveType,
        Quaternion) {
    "use strict";

    var rotAxis = new Cartesian3();
    var tempVec = new Cartesian3();
    var unitQuat = new Quaternion();
    var rotMtx = new Matrix3();

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();

    var scratchNormal = new Cartesian3();

    var unitPosScratch = new Cartesian3();
    var eastVecScratch = new Cartesian3();
    var northVecScratch = new Cartesian3();

    function pointOnEllipsoid(theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, result) {
        var azimuth = theta + rotation;

        Cartesian3.multiplyByScalar(eastVec, Math.cos(azimuth), rotAxis);
        Cartesian3.multiplyByScalar(northVec, Math.sin(azimuth), tempVec);
        Cartesian3.add(rotAxis, tempVec, rotAxis);

        var cosThetaSquared = Math.cos(theta);
        cosThetaSquared = cosThetaSquared * cosThetaSquared;

        var sinThetaSquared = Math.sin(theta);
        sinThetaSquared = sinThetaSquared * sinThetaSquared;

        var radius = ab / Math.sqrt(bSqr * cosThetaSquared + aSqr * sinThetaSquared);
        var angle = radius / mag;

        // Create the quaternion to rotate the position vector to the boundary of the ellipse.
        Quaternion.fromAxisAngle(rotAxis, angle, unitQuat);
        Matrix3.fromQuaternion(unitQuat, rotMtx);

        Matrix3.multiplyByVector(rotMtx, unitPos, result);
        Cartesian3.normalize(result, result);
        Cartesian3.multiplyByScalar(result, mag, result);
        return result;
    }

    function raisePositionsToHeight(positions, options, extrude) {
        var ellipsoid = options.ellipsoid;
        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        var size = (extrude) ? positions.length / 3 * 2 : positions.length / 3;

        var finalPositions = new Float64Array(size * 3);
        var normal = scratchNormal;

        var length = positions.length;
        var bottomOffset = (extrude) ? length : 0;
        for ( var i = 0; i < length; i += 3) {
            var i1 = i + 1;
            var i2 = i + 2;
            var position = Cartesian3.fromArray(positions, i, scratchCartesian1);
            var extrudedPosition;

            position = ellipsoid.scaleToGeodeticSurface(position, position);
            extrudedPosition = position.clone(scratchCartesian2);
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);
            var scaledNormal = Cartesian3.multiplyByScalar(normal, height, scratchCartesian3);
            position = Cartesian3.add(position, scaledNormal, position);

            if (extrude) {
                scaledNormal = Cartesian3.multiplyByScalar(normal, extrudedHeight, scaledNormal);
                extrudedPosition = Cartesian3.add(extrudedPosition, scaledNormal, extrudedPosition);

                finalPositions[i + bottomOffset] = extrudedPosition.x;
                finalPositions[i1 + bottomOffset] = extrudedPosition.y;
                finalPositions[i2 + bottomOffset] = extrudedPosition.z;
            }

            finalPositions[i] = position.x;
            finalPositions[i1] = position.y;
            finalPositions[i2] = position.z;
        }

        var attributes = new GeometryAttributes({
            position: new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : finalPositions
            })
        });

        return attributes;
    }

    function computeEllipsePositions(options) {
        var semiMinorAxis = options.semiMinorAxis;
        var semiMajorAxis = options.semiMajorAxis;
        var rotation = options.rotation;
        var center = options.center;
        var granularity = options.granularity;

        var MAX_ANOMALY_LIMIT = 2.31;

        var aSqr = semiMinorAxis * semiMinorAxis;
        var bSqr = semiMajorAxis * semiMajorAxis;
        var ab = semiMajorAxis * semiMinorAxis;

        var mag = center.magnitude();

        var unitPos = Cartesian3.normalize(center, unitPosScratch);
        var eastVec = Cartesian3.cross(Cartesian3.UNIT_Z, center, eastVecScratch);
        eastVec = Cartesian3.normalize(eastVec, eastVec);
        var northVec = Cartesian3.cross(unitPos, eastVec, northVecScratch);

        // The number of points in the first quadrant
        var numPts = 1 + Math.ceil(CesiumMath.PI_OVER_TWO / granularity);
        var deltaTheta = MAX_ANOMALY_LIMIT / (numPts - 1);

        var position = scratchCartesian1;
        var reflectedPosition = scratchCartesian2;

        var outerLeft = [];
        var outerRight = [];

        var i;

        // Compute points in the 'northern' half of the ellipse
        var theta = CesiumMath.PI_OVER_TWO;
        for (i = 0; i < numPts && theta > 0; ++i) {
            position = pointOnEllipsoid(theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, position);
            reflectedPosition = pointOnEllipsoid(Math.PI - theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, reflectedPosition);

            outerRight.unshift(position.x, position.y, position.z);
            if (i !== 0) {
                outerLeft.push(reflectedPosition.x, reflectedPosition.y, reflectedPosition.z);
            }

            theta = CesiumMath.PI_OVER_TWO - (i + 1) * deltaTheta;
        }

        // Set numPts if theta reached zero
        numPts = i;

        // Compute points in the 'southern' half of the ellipse
        for (i = numPts; i > 0; --i) {
            theta = CesiumMath.PI_OVER_TWO - (i - 1) * deltaTheta;

            position = pointOnEllipsoid(-theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, position);
            reflectedPosition = pointOnEllipsoid(theta + Math.PI, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, reflectedPosition);

            outerRight.unshift(position.x, position.y, position.z);
            if (i !== 1) {
                outerLeft.push(reflectedPosition.x, reflectedPosition.y, reflectedPosition.z);
            }
        }

        return outerRight.concat(outerLeft);
    }

    var boundingSphereCenter = new Cartesian3();
    function computeEllipse(options) {
        var center = options.center;
        boundingSphereCenter = Cartesian3.multiplyByScalar(options.ellipsoid.geodeticSurfaceNormal(center, boundingSphereCenter), options.height, boundingSphereCenter);
        boundingSphereCenter = Cartesian3.add(center, boundingSphereCenter, boundingSphereCenter);
        var boundingSphere = new BoundingSphere(boundingSphereCenter, options.semiMajorAxis);
        var positions = computeEllipsePositions(options);
        var attributes = raisePositionsToHeight(positions, options, false);

        var indices = IndexDatatype.createTypedArray(positions.length / 3, positions.length/3*2);
        var index = 0;
        for (var i = 0; i < positions.length/3 - 1; i++) {
            indices[index++] = i;
            indices[index++] = i+1;
        }
        indices[index++] = positions.length/3 - 1;
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
        var countSideLines = defaultValue(options.countSideLines, 10);
        countSideLines = Math.max(countSideLines, 0);

        var center = options.center;
        var ellipsoid = options.ellipsoid;
        var semiMajorAxis = options.semiMajorAxis;
        var scaledNormal = Cartesian3.multiplyByScalar(ellipsoid.geodeticSurfaceNormal(center, scratchCartesian1), options.height, scratchCartesian1);
        topBoundingSphere.center = Cartesian3.add(center, scaledNormal, topBoundingSphere.center);
        topBoundingSphere.radius = semiMajorAxis;

        scaledNormal = Cartesian3.multiplyByScalar(ellipsoid.geodeticSurfaceNormal(center, scaledNormal), options.extrudedHeight, scaledNormal);
        bottomBoundingSphere.center = Cartesian3.add(center, scaledNormal, bottomBoundingSphere.center);
        bottomBoundingSphere.radius = semiMajorAxis;

        var positions = computeEllipsePositions(options);
        var attributes = raisePositionsToHeight(positions, options, true);
        positions = attributes.position.values;
        var boundingSphere = BoundingSphere.union(topBoundingSphere, bottomBoundingSphere);
        var length = positions.length/3;
        var indices = IndexDatatype.createTypedArray(length, length * 2 + countSideLines * 2);

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
        if (countSideLines > 0) {
            var numSideLines = Math.min(countSideLines, length);
            numSide = Math.round(length/numSideLines);
        }
        var maxI = Math.min(numSide*10, length);
        if (countSideLines > 0) {
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
     * A {@link Geometry} that represents geometry for an ellipse on an ellipsoid
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
     * @param {Boolean} [options.sideLinesCount = 10] Number of lines to draw between the top and bottom surface of an extruded ellipse.
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

        if (typeof center === 'undefined') {
            throw new DeveloperError('center is required.');
        }

        if (typeof semiMajorAxis === 'undefined') {
            throw new DeveloperError('semiMajorAxis is required.');
        }

        if (typeof semiMinorAxis === 'undefined') {
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
            countSideLines : Math.max(defaultValue(options.countSideLines, 10), 0)
        };

        if (newOptions.granularity <= 0.0) {
            throw new DeveloperError('granularity must be greater than zero.');
        }

        var extrude = (typeof newOptions.extrudedHeight !== 'undefined' && !CesiumMath.equalsEpsilon(newOptions.height, newOptions.extrudedHeight, 1));

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