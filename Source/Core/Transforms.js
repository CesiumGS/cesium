/*global define*/
define([
        '../ThirdParty/when',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './defaultValue',
        './defined',
        './DeveloperError',
        './EarthOrientationParameters',
        './EarthOrientationParametersSample',
        './Ellipsoid',
        './Iau2006XysData',
        './Iau2006XysSample',
        './JulianDate',
        './Math',
        './Matrix3',
        './Matrix4',
        './Quaternion',
        './TimeConstants'
    ], function(
        when,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        defaultValue,
        defined,
        DeveloperError,
        EarthOrientationParameters,
        EarthOrientationParametersSample,
        Ellipsoid,
        Iau2006XysData,
        Iau2006XysSample,
        JulianDate,
        CesiumMath,
        Matrix3,
        Matrix4,
        Quaternion,
        TimeConstants) {
    "use strict";

    /**
     * Contains functions for transforming positions to various reference frames.
     *
     * @exports Transforms
     */
    var Transforms = {};

    var eastNorthUpToFixedFrameNormal = new Cartesian3();
    var eastNorthUpToFixedFrameTangent = new Cartesian3();
    var eastNorthUpToFixedFrameBitangent = new Cartesian3();

    /**
     * Computes a 4x4 transformation matrix from a reference frame with an east-north-up axes
     * centered at the provided origin to the provided ellipsoid's fixed reference frame.
     * The local axes are defined as:
     * <ul>
     * <li>The <code>x</code> axis points in the local east direction.</li>
     * <li>The <code>y</code> axis points in the local north direction.</li>
     * <li>The <code>z</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
     * </ul>
     *
     * @param {Cartesian3} origin The center point of the local reference frame.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @example
     * // Get the transform from local east-north-up at cartographic (0.0, 0.0) to Earth's fixed frame.
     * var center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
     * var transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
     */
    Transforms.eastNorthUpToFixedFrame = function(origin, ellipsoid, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(origin)) {
            throw new DeveloperError('origin is required.');
        }
        //>>includeEnd('debug');

        // If x and y are zero, assume origin is at a pole, which is a special case.
        if (CesiumMath.equalsEpsilon(origin.x, 0.0, CesiumMath.EPSILON14) &&
            CesiumMath.equalsEpsilon(origin.y, 0.0, CesiumMath.EPSILON14)) {
            var sign = CesiumMath.sign(origin.z);
            if (!defined(result)) {
                return new Matrix4(
                        0.0, -sign,  0.0, origin.x,
                        1.0,   0.0,  0.0, origin.y,
                        0.0,   0.0, sign, origin.z,
                        0.0,   0.0,  0.0, 1.0);
            }
            result[0] = 0.0;
            result[1] = 1.0;
            result[2] = 0.0;
            result[3] = 0.0;
            result[4] = -sign;
            result[5] = 0.0;
            result[6] = 0.0;
            result[7] = 0.0;
            result[8] = 0.0;
            result[9] = 0.0;
            result[10] = sign;
            result[11] = 0.0;
            result[12] = origin.x;
            result[13] = origin.y;
            result[14] = origin.z;
            result[15] = 1.0;
            return result;
        }

        var normal = eastNorthUpToFixedFrameNormal;
        var tangent  = eastNorthUpToFixedFrameTangent;
        var bitangent = eastNorthUpToFixedFrameBitangent;

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        ellipsoid.geodeticSurfaceNormal(origin, normal);

        tangent.x = -origin.y;
        tangent.y = origin.x;
        tangent.z = 0.0;
        Cartesian3.normalize(tangent, tangent);

        Cartesian3.cross(normal, tangent, bitangent);

        if (!defined(result)) {
            return new Matrix4(
                    tangent.x, bitangent.x, normal.x, origin.x,
                    tangent.y, bitangent.y, normal.y, origin.y,
                    tangent.z, bitangent.z, normal.z, origin.z,
                    0.0,       0.0,         0.0,      1.0);
        }
        result[0] = tangent.x;
        result[1] = tangent.y;
        result[2] = tangent.z;
        result[3] = 0.0;
        result[4] = bitangent.x;
        result[5] = bitangent.y;
        result[6] = bitangent.z;
        result[7] = 0.0;
        result[8] = normal.x;
        result[9] = normal.y;
        result[10] = normal.z;
        result[11] = 0.0;
        result[12] = origin.x;
        result[13] = origin.y;
        result[14] = origin.z;
        result[15] = 1.0;
        return result;
    };

    var northEastDownToFixedFrameNormal = new Cartesian3();
    var northEastDownToFixedFrameTangent = new Cartesian3();
    var northEastDownToFixedFrameBitangent = new Cartesian3();

    /**
     * Computes a 4x4 transformation matrix from a reference frame with an north-east-down axes
     * centered at the provided origin to the provided ellipsoid's fixed reference frame.
     * The local axes are defined as:
     * <ul>
     * <li>The <code>x</code> axis points in the local north direction.</li>
     * <li>The <code>y</code> axis points in the local east direction.</li>
     * <li>The <code>z</code> axis points in the opposite direction of the ellipsoid surface normal which passes through the position.</li>
     * </ul>
     *
     * @param {Cartesian3} origin The center point of the local reference frame.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @example
     * // Get the transform from local north-east-down at cartographic (0.0, 0.0) to Earth's fixed frame.
     * var center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
     * var transform = Cesium.Transforms.northEastDownToFixedFrame(center);
     */
    Transforms.northEastDownToFixedFrame = function(origin, ellipsoid, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(origin)) {
            throw new DeveloperError('origin is required.');
        }
        //>>includeEnd('debug');

        if (CesiumMath.equalsEpsilon(origin.x, 0.0, CesiumMath.EPSILON14) &&
            CesiumMath.equalsEpsilon(origin.y, 0.0, CesiumMath.EPSILON14)) {
            // The poles are special cases.  If x and y are zero, assume origin is at a pole.
            var sign = CesiumMath.sign(origin.z);
            if (!defined(result)) {
                return new Matrix4(
                  -sign, 0.0,   0.0, origin.x,
                    0.0, 1.0,   0.0, origin.y,
                    0.0, 0.0, -sign, origin.z,
                    0.0, 0.0,   0.0, 1.0);
            }
            result[0] = -sign;
            result[1] = 0.0;
            result[2] = 0.0;
            result[3] = 0.0;
            result[4] = 0.0;
            result[5] = 1.0;
            result[6] = 0.0;
            result[7] = 0.0;
            result[8] = 0.0;
            result[9] = 0.0;
            result[10] = -sign;
            result[11] = 0.0;
            result[12] = origin.x;
            result[13] = origin.y;
            result[14] = origin.z;
            result[15] = 1.0;
            return result;
        }

        var normal = northEastDownToFixedFrameNormal;
        var tangent = northEastDownToFixedFrameTangent;
        var bitangent = northEastDownToFixedFrameBitangent;

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        ellipsoid.geodeticSurfaceNormal(origin, normal);

        tangent.x = -origin.y;
        tangent.y = origin.x;
        tangent.z = 0.0;
        Cartesian3.normalize(tangent, tangent);

        Cartesian3.cross(normal, tangent, bitangent);

        if (!defined(result)) {
            return new Matrix4(
                    bitangent.x, tangent.x, -normal.x, origin.x,
                    bitangent.y, tangent.y, -normal.y, origin.y,
                    bitangent.z, tangent.z, -normal.z, origin.z,
                    0.0,       0.0,         0.0,      1.0);
        }
        result[0] = bitangent.x;
        result[1] = bitangent.y;
        result[2] = bitangent.z;
        result[3] = 0.0;
        result[4] = tangent.x;
        result[5] = tangent.y;
        result[6] = tangent.z;
        result[7] = 0.0;
        result[8] = -normal.x;
        result[9] = -normal.y;
        result[10] = -normal.z;
        result[11] = 0.0;
        result[12] = origin.x;
        result[13] = origin.y;
        result[14] = origin.z;
        result[15] = 1.0;
        return result;
    };

    /**
     * Computes a 4x4 transformation matrix from a reference frame with an north-up-east axes
     * centered at the provided origin to the provided ellipsoid's fixed reference frame.
     * The local axes are defined as:
     * <ul>
     * <li>The <code>x</code> axis points in the local north direction.</li>
     * <li>The <code>y</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
     * <li>The <code>z</code> axis points in the local east direction.</li>
     * </ul>
     *
     * @param {Cartesian3} origin The center point of the local reference frame.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @example
     * // Get the transform from local north-up-east at cartographic (0.0, 0.0) to Earth's fixed frame.
     * var center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
     * var transform = Cesium.Transforms.northUpEastToFixedFrame(center);
     */
    Transforms.northUpEastToFixedFrame = function(origin, ellipsoid, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(origin)) {
            throw new DeveloperError('origin is required.');
        }
        //>>includeEnd('debug');

        // If x and y are zero, assume origin is at a pole, which is a special case.
        if (CesiumMath.equalsEpsilon(origin.x, 0.0, CesiumMath.EPSILON14) &&
            CesiumMath.equalsEpsilon(origin.y, 0.0, CesiumMath.EPSILON14)) {
            var sign = CesiumMath.sign(origin.z);
            if (!defined(result)) {
                return new Matrix4(
                       -sign, 0.0,  0.0, origin.x,
                        0.0,  0.0,  1.0, origin.y,
                        0.0,  sign, 0.0, origin.z,
                        0.0,  0.0,  0.0, 1.0);
            }
            result[0] = -sign;
            result[1] = 0.0;
            result[2] = 0.0;
            result[3] = 0.0;
            result[4] = 0.0;
            result[5] = 0.0;
            result[6] = sign;
            result[7] = 0.0;
            result[8] = 0.0;
            result[9] = 1.0;
            result[10] = 0.0;
            result[11] = 0.0;
            result[12] = origin.x;
            result[13] = origin.y;
            result[14] = origin.z;
            result[15] = 1.0;
            return result;
        }

        var normal = eastNorthUpToFixedFrameNormal;
        var tangent  = eastNorthUpToFixedFrameTangent;
        var bitangent = eastNorthUpToFixedFrameBitangent;

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        ellipsoid.geodeticSurfaceNormal(origin, normal);

        tangent.x = -origin.y;
        tangent.y = origin.x;
        tangent.z = 0.0;
        Cartesian3.normalize(tangent, tangent);

        Cartesian3.cross(normal, tangent, bitangent);

        if (!defined(result)) {
            return new Matrix4(
                    bitangent.x, normal.x, tangent.x, origin.x,
                    bitangent.y, normal.y, tangent.y, origin.y,
                    bitangent.z, normal.z, tangent.z, origin.z,
                    0.0,       0.0,         0.0,      1.0);
        }
        result[0] = bitangent.x;
        result[1] = bitangent.y;
        result[2] = bitangent.z;
        result[3] = 0.0;
        result[4] = normal.x;
        result[5] = normal.y;
        result[6] = normal.z;
        result[7] = 0.0;
        result[8] = tangent.x;
        result[9] = tangent.y;
        result[10] = tangent.z;
        result[11] = 0.0;
        result[12] = origin.x;
        result[13] = origin.y;
        result[14] = origin.z;
        result[15] = 1.0;
        return result;
    };

    var scratchHPRQuaternion = new Quaternion();
    var scratchScale = new Cartesian3(1.0, 1.0, 1.0);
    var scratchHPRMatrix4 = new Matrix4();

    /**
     * Computes a 4x4 transformation matrix from a reference frame with axes computed from the heading-pitch-roll angles
     * centered at the provided origin to the provided ellipsoid's fixed reference frame. Heading is the rotation from the local north
     * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
     * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
     *
     * @param {Cartesian3} origin The center point of the local reference frame.
     * @param {Number} heading The heading angle in radians.
     * @param {Number} pitch The pitch angle in radians.
     * @param {Number} roll The roll angle in radians.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @example
     * // Get the transform from local heading-pitch-roll at cartographic (0.0, 0.0) to Earth's fixed frame.
     * var center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
     * var heading = -Cesium.Math.PI_OVER_TWO;
     * var pitch = Cesium.Math.PI_OVER_FOUR;
     * var roll = 0.0;
     * var transform = Cesium.Transforms.headingPitchRollToFixedFrame(center, heading, pitch, roll);
     */
    Transforms.headingPitchRollToFixedFrame = function(origin, heading, pitch, roll, ellipsoid, result) {
        // checks for required parameters happen in the called functions
        var hprQuaternion = Quaternion.fromHeadingPitchRoll(heading, pitch, roll, scratchHPRQuaternion);
        var hprMatrix = Matrix4.fromTranslationQuaternionRotationScale(Cartesian3.ZERO, hprQuaternion, scratchScale, scratchHPRMatrix4);
        result = Transforms.eastNorthUpToFixedFrame(origin, ellipsoid, result);
        return Matrix4.multiply(result, hprMatrix, result);
    };

    var scratchENUMatrix4 = new Matrix4();
    var scratchHPRMatrix3 = new Matrix3();

    /**
     * Computes a quaternion from a reference frame with axes computed from the heading-pitch-roll angles
     * centered at the provided origin. Heading is the rotation from the local north
     * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
     * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
     *
     * @param {Cartesian3} origin The center point of the local reference frame.
     * @param {Number} heading The heading angle in radians.
     * @param {Number} pitch The pitch angle in radians.
     * @param {Number} roll The roll angle in radians.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @returns {Quaternion} The modified result parameter or a new Quaternion instance if none was provided.
     *
     * @example
     * // Get the quaternion from local heading-pitch-roll at cartographic (0.0, 0.0) to Earth's fixed frame.
     * var center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
     * var heading = -Cesium.Math.PI_OVER_TWO;
     * var pitch = Cesium.Math.PI_OVER_FOUR;
     * var roll = 0.0;
     * var quaternion = Cesium.Transforms.headingPitchRollQuaternion(center, heading, pitch, roll);
     */
    Transforms.headingPitchRollQuaternion = function(origin, heading, pitch, roll, ellipsoid, result) {
        // checks for required parameters happen in the called functions
        var transform = Transforms.headingPitchRollToFixedFrame(origin, heading, pitch, roll, ellipsoid, scratchENUMatrix4);
        var rotation = Matrix4.getRotation(transform, scratchHPRMatrix3);
        return Quaternion.fromRotationMatrix(rotation, result);
    };


    var gmstConstant0 = 6 * 3600 + 41 * 60 + 50.54841;
    var gmstConstant1 = 8640184.812866;
    var gmstConstant2 = 0.093104;
    var gmstConstant3 = -6.2E-6;
    var rateCoef = 1.1772758384668e-19;
    var wgs84WRPrecessing = 7.2921158553E-5;
    var twoPiOverSecondsInDay = CesiumMath.TWO_PI / 86400.0;
    var dateInUtc = new JulianDate();

    /**
     * Computes a rotation matrix to transform a point or vector from True Equator Mean Equinox (TEME) axes to the
     * pseudo-fixed axes at a given time.  This method treats the UT1 time standard as equivalent to UTC.
     *
     * @param {JulianDate} date The time at which to compute the rotation matrix.
     * @param {Matrix3} [result] The object onto which to store the result.
     * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if none was provided.
     *
     * @example
     * //Set the view to in the inertial frame.
     * scene.preRender.addEventListener(function(scene, time) {
     *    var now = Cesium.JulianDate.now();
     *    var offset = Cesium.Matrix4.multiplyByPoint(camera.transform, camera.position, new Cesium.Cartesian3());
     *    var transform = Cesium.Matrix4.fromRotationTranslation(Cesium.Transforms.computeTemeToPseudoFixedMatrix(now));
     *    var inverseTransform = Cesium.Matrix4.inverseTransformation(transform, new Cesium.Matrix4());
     *    Cesium.Matrix4.multiplyByPoint(inverseTransform, offset, offset);
     *    camera.lookAtTransform(transform, offset);
     * });
     */
    Transforms.computeTemeToPseudoFixedMatrix = function (date, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(date)) {
            throw new DeveloperError('date is required.');
        }
        //>>includeEnd('debug');

        // GMST is actually computed using UT1.  We're using UTC as an approximation of UT1.
        // We do not want to use the function like convertTaiToUtc in JulianDate because
        // we explicitly do not want to fail when inside the leap second.

        dateInUtc = JulianDate.addSeconds(date, -JulianDate.computeTaiMinusUtc(date), dateInUtc);
        var utcDayNumber = dateInUtc.dayNumber;
        var utcSecondsIntoDay = dateInUtc.secondsOfDay;

        var t;
        var diffDays = utcDayNumber - 2451545;
        if (utcSecondsIntoDay >= 43200.0) {
            t = (diffDays + 0.5) / TimeConstants.DAYS_PER_JULIAN_CENTURY;
        } else {
            t = (diffDays - 0.5) / TimeConstants.DAYS_PER_JULIAN_CENTURY;
        }

        var gmst0 = gmstConstant0 + t * (gmstConstant1 + t * (gmstConstant2 + t * gmstConstant3));
        var angle = (gmst0 * twoPiOverSecondsInDay) % CesiumMath.TWO_PI;
        var ratio = wgs84WRPrecessing + rateCoef * (utcDayNumber - 2451545.5);
        var secondsSinceMidnight = (utcSecondsIntoDay + TimeConstants.SECONDS_PER_DAY * 0.5) % TimeConstants.SECONDS_PER_DAY;
        var gha = angle + (ratio * secondsSinceMidnight);
        var cosGha = Math.cos(gha);
        var sinGha = Math.sin(gha);

        if (!defined(result)) {
            return new Matrix3(cosGha, sinGha, 0.0,
                              -sinGha, cosGha, 0.0,
                                  0.0,    0.0, 1.0);
        }
        result[0] = cosGha;
        result[1] = -sinGha;
        result[2] = 0.0;
        result[3] = sinGha;
        result[4] = cosGha;
        result[5] = 0.0;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = 1.0;
        return result;
    };

    /**
     * The source of IAU 2006 XYS data, used for computing the transformation between the
     * Fixed and ICRF axes.
     * @type {Iau2006XysData}
     *
     * @see Transforms.computeIcrfToFixedMatrix
     * @see Transforms.computeFixedToIcrfMatrix
     *
     * @private
     */
    Transforms.iau2006XysData = new Iau2006XysData();

    /**
     * The source of Earth Orientation Parameters (EOP) data, used for computing the transformation
     * between the Fixed and ICRF axes.  By default, zero values are used for all EOP values,
     * yielding a reasonable but not completely accurate representation of the ICRF axes.
     * @type {EarthOrientationParameters}
     *
     * @see Transforms.computeIcrfToFixedMatrix
     * @see Transforms.computeFixedToIcrfMatrix
     *
     * @private
     */
    Transforms.earthOrientationParameters = EarthOrientationParameters.NONE;

    var ttMinusTai = 32.184;
    var j2000ttDays = 2451545.0;

    /**
     * Preloads the data necessary to transform between the ICRF and Fixed axes, in either
     * direction, over a given interval.  This function returns a promise that, when resolved,
     * indicates that the preload has completed.
     *
     * @param {TimeInterval} timeInterval The interval to preload.
     * @returns {Promise.<undefined>} A promise that, when resolved, indicates that the preload has completed
     *          and evaluation of the transformation between the fixed and ICRF axes will
     *          no longer return undefined for a time inside the interval.
     *
     *
     * @example
     * var interval = new Cesium.TimeInterval(...);
     * when(Cesium.Transforms.preloadIcrfFixed(interval), function() {
     *     // the data is now loaded
     * });
     * 
     * @see Transforms.computeIcrfToFixedMatrix
     * @see Transforms.computeFixedToIcrfMatrix
     * @see when
     */
    Transforms.preloadIcrfFixed = function(timeInterval) {
        var startDayTT = timeInterval.start.dayNumber;
        var startSecondTT = timeInterval.start.secondsOfDay + ttMinusTai;
        var stopDayTT = timeInterval.stop.dayNumber;
        var stopSecondTT = timeInterval.stop.secondsOfDay + ttMinusTai;

        var xysPromise = Transforms.iau2006XysData.preload(startDayTT, startSecondTT, stopDayTT, stopSecondTT);
        var eopPromise = Transforms.earthOrientationParameters.getPromiseToLoad();

        return when.all([xysPromise, eopPromise]);
    };

    /**
     * Computes a rotation matrix to transform a point or vector from the International Celestial
     * Reference Frame (GCRF/ICRF) inertial frame axes to the Earth-Fixed frame axes (ITRF)
     * at a given time.  This function may return undefined if the data necessary to
     * do the transformation is not yet loaded.
     *
     * @param {JulianDate} date The time at which to compute the rotation matrix.
     * @param {Matrix3} [result] The object onto which to store the result.  If this parameter is
     *                  not specified, a new instance is created and returned.
     * @returns {Matrix3} The rotation matrix, or undefined if the data necessary to do the
     *                   transformation is not yet loaded.
     *
     *
     * @example
     * scene.preRender.addEventListener(function(scene, time) {
     *   var icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
     *   if (Cesium.defined(icrfToFixed)) {
     *     var offset = Cesium.Matrix4.multiplyByPoint(camera.transform, camera.position, new Cesium.Cartesian3());
     *     var transform = Cesium.Matrix4.fromRotationTranslation(icrfToFixed)
     *     var inverseTransform = Cesium.Matrix4.inverseTransformation(transform, new Cesium.Matrix4());
     *     Cesium.Matrix4.multiplyByPoint(inverseTransform, offset, offset);
     *     camera.lookAtTransform(transform, offset);
     *   }
     * });
     * 
     * @see Transforms.preloadIcrfFixed
     */
    Transforms.computeIcrfToFixedMatrix = function(date, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(date)) {
            throw new DeveloperError('date is required.');
        }
        //>>includeEnd('debug');
        if (!defined(result)) {
            result = new Matrix3();
        }

        var fixedToIcrfMtx = Transforms.computeFixedToIcrfMatrix(date, result);
        if (!defined(fixedToIcrfMtx)) {
            return undefined;
        }

        return Matrix3.transpose(fixedToIcrfMtx, result);
    };

    var xysScratch = new Iau2006XysSample(0.0, 0.0, 0.0);
    var eopScratch = new EarthOrientationParametersSample(0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
    var rotation1Scratch = new Matrix3();
    var rotation2Scratch = new Matrix3();

    /**
     * Computes a rotation matrix to transform a point or vector from the Earth-Fixed frame axes (ITRF)
     * to the International Celestial Reference Frame (GCRF/ICRF) inertial frame axes
     * at a given time.  This function may return undefined if the data necessary to
     * do the transformation is not yet loaded.
     *
     * @param {JulianDate} date The time at which to compute the rotation matrix.
     * @param {Matrix3} [result] The object onto which to store the result.  If this parameter is
     *                  not specified, a new instance is created and returned.
     * @returns {Matrix3} The rotation matrix, or undefined if the data necessary to do the
     *                   transformation is not yet loaded.
     *
     *
     * @example
     * // Transform a point from the ICRF axes to the Fixed axes.
     * var now = Cesium.JulianDate.now();
     * var pointInFixed = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
     * var fixedToIcrf = Cesium.Transforms.computeIcrfToFixedMatrix(now);
     * var pointInInertial = new Cesium.Cartesian3();
     * if (Cesium.defined(fixedToIcrf)) {
     *     pointInInertial = Cesium.Matrix3.multiplyByVector(fixedToIcrf, pointInFixed, pointInInertial);
     * }
     * 
     * @see Transforms.preloadIcrfFixed
     */
    Transforms.computeFixedToIcrfMatrix = function(date, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(date)) {
            throw new DeveloperError('date is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new Matrix3();
        }

        // Compute pole wander
        var eop = Transforms.earthOrientationParameters.compute(date, eopScratch);
        if (!defined(eop)) {
            return undefined;
        }

        // There is no external conversion to Terrestrial Time (TT).
        // So use International Atomic Time (TAI) and convert using offsets.
        // Here we are assuming that dayTT and secondTT are positive
        var dayTT = date.dayNumber;
        // It's possible here that secondTT could roll over 86400
        // This does not seem to affect the precision (unit tests check for this)
        var secondTT = date.secondsOfDay + ttMinusTai;

        var xys = Transforms.iau2006XysData.computeXysRadians(dayTT, secondTT, xysScratch);
        if (!defined(xys)) {
            return undefined;
        }

        var x = xys.x + eop.xPoleOffset;
        var y = xys.y + eop.yPoleOffset;

        // Compute XYS rotation
        var a = 1.0 / (1.0 + Math.sqrt(1.0 - x * x - y * y));

        var rotation1 = rotation1Scratch;
        rotation1[0] = 1.0 - a * x * x;
        rotation1[3] = -a * x * y;
        rotation1[6] = x;
        rotation1[1] = -a * x * y;
        rotation1[4] = 1 - a * y * y;
        rotation1[7] = y;
        rotation1[2] = -x;
        rotation1[5] = -y;
        rotation1[8] = 1 - a * (x * x + y * y);

        var rotation2 = Matrix3.fromRotationZ(-xys.s, rotation2Scratch);
        var matrixQ = Matrix3.multiply(rotation1, rotation2, rotation1Scratch);

        // Similar to TT conversions above
        // It's possible here that secondTT could roll over 86400
        // This does not seem to affect the precision (unit tests check for this)
        var dateUt1day = date.dayNumber;
        var dateUt1sec = date.secondsOfDay - JulianDate.computeTaiMinusUtc(date) + eop.ut1MinusUtc;

        // Compute Earth rotation angle
        // The IERS standard for era is
        //    era = 0.7790572732640 + 1.00273781191135448 * Tu
        // where
        //    Tu = JulianDateInUt1 - 2451545.0
        // However, you get much more precision if you make the following simplification
        //    era = a + (1 + b) * (JulianDayNumber + FractionOfDay - 2451545)
        //    era = a + (JulianDayNumber - 2451545) + FractionOfDay + b (JulianDayNumber - 2451545 + FractionOfDay)
        //    era = a + FractionOfDay + b (JulianDayNumber - 2451545 + FractionOfDay)
        // since (JulianDayNumber - 2451545) represents an integer number of revolutions which will be discarded anyway.
        var daysSinceJ2000 = dateUt1day - 2451545;
        var fractionOfDay = dateUt1sec / TimeConstants.SECONDS_PER_DAY;
        var era = 0.7790572732640 + fractionOfDay + 0.00273781191135448 * (daysSinceJ2000 + fractionOfDay);
        era = (era % 1.0) * CesiumMath.TWO_PI;

        var earthRotation = Matrix3.fromRotationZ(era, rotation2Scratch);

        // pseudoFixed to ICRF
        var pfToIcrf = Matrix3.multiply(matrixQ, earthRotation, rotation1Scratch);

        // Compute pole wander matrix
        var cosxp = Math.cos(eop.xPoleWander);
        var cosyp = Math.cos(eop.yPoleWander);
        var sinxp = Math.sin(eop.xPoleWander);
        var sinyp = Math.sin(eop.yPoleWander);

        var ttt = (dayTT - j2000ttDays) + secondTT / TimeConstants.SECONDS_PER_DAY;
        ttt /= 36525.0;

        // approximate sp value in rad
        var sp = -47.0e-6 * ttt * CesiumMath.RADIANS_PER_DEGREE / 3600.0;
        var cossp = Math.cos(sp);
        var sinsp = Math.sin(sp);

        var fToPfMtx = rotation2Scratch;
        fToPfMtx[0] = cosxp * cossp;
        fToPfMtx[1] = cosxp * sinsp;
        fToPfMtx[2] = sinxp;
        fToPfMtx[3] = -cosyp * sinsp + sinyp * sinxp * cossp;
        fToPfMtx[4] = cosyp * cossp + sinyp * sinxp * sinsp;
        fToPfMtx[5] = -sinyp * cosxp;
        fToPfMtx[6] = -sinyp * sinsp - cosyp * sinxp * cossp;
        fToPfMtx[7] = sinyp * cossp - cosyp * sinxp * sinsp;
        fToPfMtx[8] = cosyp * cosxp;

        return Matrix3.multiply(pfToIcrf, fToPfMtx, result);
    };

    var pointToWindowCoordinatesTemp = new Cartesian4();

    /**
     * Transform a point from model coordinates to window coordinates.
     *
     * @param {Matrix4} modelViewProjectionMatrix The 4x4 model-view-projection matrix.
     * @param {Matrix4} viewportTransformation The 4x4 viewport transformation.
     * @param {Cartesian3} point The point to transform.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
     */
    Transforms.pointToWindowCoordinates = function (modelViewProjectionMatrix, viewportTransformation, point, result) {
        result = Transforms.pointToGLWindowCoordinates(modelViewProjectionMatrix, viewportTransformation, point, result);
        result.y = 2.0 * viewportTransformation[5] - result.y;
        return result;
    };

    /**
     * @private
     */
    Transforms.pointToGLWindowCoordinates = function(modelViewProjectionMatrix, viewportTransformation, point, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(modelViewProjectionMatrix)) {
            throw new DeveloperError('modelViewProjectionMatrix is required.');
        }

        if (!defined(viewportTransformation)) {
            throw new DeveloperError('viewportTransformation is required.');
        }

        if (!defined(point)) {
            throw new DeveloperError('point is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new Cartesian2();
        }

        var tmp = pointToWindowCoordinatesTemp;

        Matrix4.multiplyByVector(modelViewProjectionMatrix, Cartesian4.fromElements(point.x, point.y, point.z, 1, tmp), tmp);
        Cartesian4.multiplyByScalar(tmp, 1.0 / tmp.w, tmp);
        Matrix4.multiplyByVector(viewportTransformation, tmp, tmp);
        return Cartesian2.fromCartesian4(tmp, result);
    };

    var normalScratch = new Cartesian3();
    var rightScratch = new Cartesian3();
    var upScratch = new Cartesian3();

    /**
     * @private
     */
    Transforms.rotationMatrixFromPositionVelocity = function(position, velocity, ellipsoid, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(position)) {
            throw new DeveloperError('position is required.');
        }

        if (!defined(velocity)) {
            throw new DeveloperError('velocity is required.');
        }
        //>>includeEnd('debug');

        var normal = defaultValue(ellipsoid, Ellipsoid.WGS84).geodeticSurfaceNormal(position, normalScratch);
        var right = Cartesian3.cross(velocity, normal, rightScratch);
        if (Cartesian3.equalsEpsilon(right, Cartesian3.ZERO, CesiumMath.EPSILON6)) {
            right = Cartesian3.clone(Cartesian3.UNIT_X, right);
        }

        var up = Cartesian3.cross(right, velocity, upScratch);
        Cartesian3.cross(velocity, up, right);
        Cartesian3.negate(right, right);

        if (!defined(result)) {
            result = new Matrix3();
        }

        result[0] = velocity.x;
        result[1] = velocity.y;
        result[2] = velocity.z;
        result[3] = right.x;
        result[4] = right.y;
        result[5] = right.z;
        result[6] = up.x;
        result[7] = up.y;
        result[8] = up.z;

        return result;
    };

    return Transforms;
});
