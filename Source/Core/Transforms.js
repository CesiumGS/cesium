/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Iau2006XysData',
        './Iau2006XysSample',
        './Math',
        './Matrix3',
        './Matrix4',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './TimeConstants',
        './Ellipsoid',
        './JulianDate',
        './EarthOrientationParameters',
        './EarthOrientationParametersSample',
        '../ThirdParty/when'
    ],
    function(
        defaultValue,
        DeveloperError,
        Iau2006XysData,
        Iau2006XysSample,
        CesiumMath,
        Matrix3,
        Matrix4,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        TimeConstants,
        Ellipsoid,
        JulianDate,
        EarthOrientationParameters,
        EarthOrientationParametersSample,
        when) {
    "use strict";

    /**
     * Contains functions for transforming positions to various reference frames.
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
     * @memberof Transforms
     *
     * @param {Cartesian3} origin The center point of the local reference frame.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @exception {DeveloperError} origin is required.
     *
     * @example
     * // Get the transform from local east-north-up at cartographic (0.0, 0.0) to Earth's fixed frame.
     * var ellipsoid = Ellipsoid.WGS84;
     * var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
     * var transform = Transforms.eastNorthUpToFixedFrame(center);
     */
    Transforms.eastNorthUpToFixedFrame = function(origin, ellipsoid, result) {
        if (typeof origin === 'undefined') {
            throw new DeveloperError('origin is required.');
        }

        // If x and y are zero, assume origin is at a pole, which is a special case.
        if (CesiumMath.equalsEpsilon(origin.x, 0.0, CesiumMath.EPSILON14) &&
            CesiumMath.equalsEpsilon(origin.y, 0.0, CesiumMath.EPSILON14)) {
            var sign = CesiumMath.sign(origin.z);
            if (typeof result === 'undefined') {
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

        normal.cross(tangent, bitangent);

        if (typeof result === 'undefined') {
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
     * @memberof Transforms
     *
     * @param {Cartesian3} origin The center point of the local reference frame.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
     *
     * @exception {DeveloperError} origin is required.
     *
     * @example
     * // Get the transform from local north-east-down at cartographic (0.0, 0.0) to Earth's fixed frame.
     * var ellipsoid = Ellipsoid.WGS84;
     * var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
     * var transform = Transforms.northEastDownToFixedFrame(center);
     */
    Transforms.northEastDownToFixedFrame = function(origin, ellipsoid, result) {
        if (typeof origin === 'undefined') {
            throw new DeveloperError('origin is required.');
        }

        if (CesiumMath.equalsEpsilon(origin.x, 0.0, CesiumMath.EPSILON14) &&
            CesiumMath.equalsEpsilon(origin.y, 0.0, CesiumMath.EPSILON14)) {
            // The poles are special cases.  If x and y are zero, assume origin is at a pole.
            var sign = CesiumMath.sign(origin.z);
            if (typeof result === 'undefined') {
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

        normal.cross(tangent, bitangent);

        if (typeof result === 'undefined') {
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

    var gmstConstant0 = 6 * 3600 + 41 * 60 + 50.54841;
    var gmstConstant1 = 8640184.812866;
    var gmstConstant2 = 0.093104;
    var gmstConstant3 = -6.2E-6;
    var rateCoef = 1.1772758384668e-19;
    var wgs84WRPrecessing = 7.2921158553E-5;
    var twoPiOverSecondsInDay = CesiumMath.TWO_PI / 86400.0;

    /**
     * Computes a rotation matrix to transform a point or vector from True Equator Mean Equinox (TEME) axes to the
     * pseudo-fixed axes at a given time.  This method treats the UT1 time standard as equivalent to UTC.
     *
     * @memberof Transforms
     *
     * @param {JulianDate} date The time at which to compute the rotation matrix.
     * @param {Matrix3} [result] The object onto which to store the result.
     * @return {Matrix3} The modified result parameter or a new Matrix3 instance if none was provided.
     *
     * @exception {DeveloperError} date is required.
     *
     * @example
     * //Set the view to in the inertial frame.
     * function updateAndRender() {
     *     var now = new JulianDate();
     *     scene.initializeFrame();
     *     scene.setSunPosition(Simon1994PlanetaryPositions.ComputeSunPositionInEarthInertialFrame(now));
     *     scene.getCamera().transform = Matrix4.fromRotationTranslation(Transforms.computeTemeToPseudoFixedMatrix(now), Cartesian3.ZERO);
     *     scene.render();
     *     requestAnimationFrame(updateAndRender);
     * }
     * updateAndRender();
     */
    Transforms.computeTemeToPseudoFixedMatrix = function (date, result) {
        if (typeof date === 'undefined') {
            throw new DeveloperError('date is required.');
        }

        // GMST is actually computed using UT1.  We're using UTC as an approximation of UT1.
        // We do not want to use the function like convertTaiToUtc in JulianDate because
        // we explicitly do not want to fail when inside the leap second.

        var dateInUtc = date.addSeconds(-date.getTaiMinusUtc());
        var utcDayNumber = dateInUtc.getJulianDayNumber();
        var utcSecondsIntoDay = dateInUtc.getSecondsOfDay();

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

        if (typeof result === 'undefined') {
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
     * @memberof Transforms
     *
     * @see Transforms.computeIcrfToFixedMatrix
     * @see Transforms.computeFixedToIcrfMatrix
     */
    Transforms.iau2006XysData = new Iau2006XysData();

    /**
     * The source of Earth Orientation Parameters (EOP) data, used for computing the transformation
     * between the Fixed and ICRF axes.  By default, zero values are used for all EOP values,
     * yielding a reasonable but not completely accurate representation of the ICRF axes.
     * @type {EarthOrientationParameters}
     *
     * @memberof Transforms
     *
     * @see Transforms.computeIcrfToFixedMatrix
     * @see Transforms.computeFixedToIcrfMatrix
     */
    Transforms.earthOrientationParameters = EarthOrientationParameters.NONE;

    var ttMinusTai = 32.184;
    var j2000ttDays = 2451545.0;

    /**
     * Preloads the data necessary to transform between the ICRF and Fixed axes, in either
     * direction, over a given interval.  This function returns a promise that, when resolved,
     * indicates that the preload has completed.
     *
     * @memberof Transforms
     *
     * @param {TimeInterval} timeInterval The interval to preload.
     * @returns {Promise} A promise that, when resolved, indicates that the preload has completed
     *          and evaluation of the transformation between the fixed and ICRF axes will
     *          no longer return undefined for a time inside the interval.
     *
     * @see Transforms.computeIcrfToFixedMatrix
     * @see Transforms.computeFixedToIcrfMatrix
     * @see when
     *
     * @example
     * var interval = new TimeInterval(...);
     * when(preloadIcrfFixed(interval), function() {
     *     // the data is now loaded
     * });
     */
    Transforms.preloadIcrfFixed = function(timeInterval) {
        var startDayTT = timeInterval.start.getJulianDayNumber();
        var startSecondTT = timeInterval.start.getSecondsOfDay() + ttMinusTai;
        var stopDayTT = timeInterval.stop.getJulianDayNumber();
        var stopSecondTT = timeInterval.stop.getSecondsOfDay() + ttMinusTai;

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
     * @memberof Transforms
     *
     * @param {JulianDate} date The time at which to compute the rotation matrix.
     * @param {Matrix3} [result] The object onto which to store the result.  If this parameter is
     *                  not specified, a new instance is created and returned.
     * @return {Matrix3} The rotation matrix, or undefined if the data necessary to do the
     *                   transformation is not yet loaded.
     *
     * @exception {DeveloperError} date is required.
     *
     * @see Transforms.preloadIcrfFixed
     *
     * @example
     * //Set the view to the inertial frame.
     * function updateAndRender() {
     *     var now = new JulianDate();
     *     scene.initializeFrame();
     *     scene.setSunPosition(Simon1994PlanetaryPositions.ComputeSunPositionInEarthInertialFrame(now));
     *     var icrfToFixed = Transforms.computeIcrfToFixedMatrix(now);
     *     if (typeof icrfToFixed !== 'undefined') {
     *         scene.getCamera().transform = Matrix4.fromRotationTranslation(icrfToFixed, Cartesian3.ZERO);
     *     }
     *     scene.render();
     *     requestAnimationFrame(updateAndRender);
     * }
     * updateAndRender();
     */
    Transforms.computeIcrfToFixedMatrix = function(date, result) {
        if (typeof date === 'undefined') {
            throw new DeveloperError('date is required.');
        }

        var fixedToIcrfMtx = Transforms.computeFixedToIcrfMatrix(date, result);
        if (typeof fixedToIcrfMtx === 'undefined') {
            return undefined;
        }

        return fixedToIcrfMtx.transpose(result);
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
     * @memberof Transforms
     *
     * @param {JulianDate} date The time at which to compute the rotation matrix.
     * @param {Matrix3} [result] The object onto which to store the result.  If this parameter is
     *                  not specified, a new instance is created and returned.
     * @return {Matrix3} The rotation matrix, or undefined if the data necessary to do the
     *                   transformation is not yet loaded.
     *
     * @exception {DeveloperError} date is required.
     *
     * @see Transforms.preloadIcrfFixed
     *
     * @example
     * // Transform a point from the ICRF axes to the Fixed axes.
     * var now = new JulianDate();
     * var pointInFixed = new Cartesian3(...);
     * var fixedToIcrf = Transforms.computeIcrfToFixedMatrix(now);
     * var pointInInertial;
     * if (typeof fixedToIcrf !== 'undefined') {
     *     pointInInertial = fixedToIcrf.multiplyByVector(pointInFixed);
     * }
     */
    Transforms.computeFixedToIcrfMatrix = function(date, result) {
        if (typeof date === 'undefined') {
            throw new DeveloperError('date is required.');
        }

        // Compute pole wander
        var eop = Transforms.earthOrientationParameters.compute(date, eopScratch);
        if (typeof eop === 'undefined') {
            return undefined;
        }

        // There is no external conversion to Terrestrial Time (TT).
        // So use International Atomic Time (TAI) and convert using offsets.
        // Here we are assuming that dayTT and secondTT are positive
        var dayTT = date.getJulianDayNumber();
        // It's possible here that secondTT could roll over 86400
        // This does not seem to affect the precision (unit tests check for this)
        var secondTT = date.getSecondsOfDay() + ttMinusTai;

        var xys = Transforms.iau2006XysData.computeXysRadians(dayTT, secondTT, xysScratch);
        if (typeof xys === 'undefined') {
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
        var matrixQ = rotation1.multiply(rotation2, rotation1Scratch);

        // Similar to TT conversions above
        // It's possible here that secondTT could roll over 86400
        // This does not seem to affect the precision (unit tests check for this)
        var dateUt1day = date.getJulianDayNumber();
        var dateUt1sec = date.getSecondsOfDay() - date.getTaiMinusUtc() + eop.ut1MinusUtc;

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
        var pfToIcrf = matrixQ.multiply(earthRotation, rotation1Scratch);

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

        return pfToIcrf.multiply(fToPfMtx, result);
    };

    var pointToWindowCoordinatesTemp = new Cartesian4();

    /**
     * Transform a point from model coordinates to window coordinates.
     *
     * @memberof Transforms
     *
     * @param {Matrix4} modelViewProjectionMatrix The 4x4 model-view-projection matrix.
     * @param {Matrix4} viewportTransformation The 4x4 viewport transformation.
     * @param {Cartesian3} point The point to transform.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @return {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
     *
     * @exception {DeveloperError} modelViewProjectionMatrix is required.
     * @exception {DeveloperError} viewportTransformation is required.
     * @exception {DeveloperError} point is required.
     *
     * @see UniformState#getModelViewProjection
     * @see czm_modelViewProjection
     * @see UniformState#getViewportTransformation
     * @see czm_viewportTransformation
     */
    Transforms.pointToWindowCoordinates = function (modelViewProjectionMatrix, viewportTransformation, point, result) {
        if (typeof modelViewProjectionMatrix === 'undefined') {
            throw new DeveloperError('modelViewProjectionMatrix is required.');
        }

        if (typeof viewportTransformation === 'undefined') {
            throw new DeveloperError('viewportTransformation is required.');
        }

        if (typeof point === 'undefined') {
            throw new DeveloperError('point is required.');
        }

        var tmp = pointToWindowCoordinatesTemp;

        Matrix4.multiplyByPoint(modelViewProjectionMatrix, point, tmp);
        Cartesian4.multiplyByScalar(tmp, 1.0 / tmp.w, tmp);
        Matrix4.multiplyByVector(viewportTransformation, tmp, tmp);
        return Cartesian2.fromCartesian4(tmp, result);
    };

    return Transforms;
});
