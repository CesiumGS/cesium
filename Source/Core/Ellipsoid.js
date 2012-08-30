/*global define*/
define([
        './DeveloperError',
        './Math',
        './Cartesian3',
        './Cartographic'
       ], function(
         DeveloperError,
         CesiumMath,
         Cartesian3,
         Cartographic) {
    "use strict";

    /**
     * A quadratic surface defined in Cartesian coordinates by the equation
     * <code>(x / a)^2 + (y / b)^2 + (z / c)^2 = 1</code>.  Primarily used
     * by Cesium to represent the shape of planetary bodies.
     *
     * Rather than constructing this object directly, one of the provided
     * constants is normally used.  If a custom Ellipsoid is needed,
     * consider using one of the helper constructor functions which will
     * compute all necessary values from the supplied radii.
     * @alias Ellipsoid
     * @constructor
     *
     * @param {Cartesian3} [radii=Cartesian3.ZERO] The radii of the ellipsoid.
     * @param {Cartesian3} [radiiSquared=Cartesian3.ZERO] The squared radii of the ellipsoid.
     * @param {Cartesian3} [radiiToTheFourth=Cartesian3.ZERO] The radii of the ellipsoid raised to the fourth power.
     * @param {Cartesian3} [oneOverRadii=Cartesian3.ZERO] One over the radii of the ellipsoid.
     * @param {Cartesian3} [oneOverRadiiSquared=Cartesian3.ZERO] One over the squared radii of the ellipsoid.
     * @param {Number} [minimumRadius=0.0] The minimum radius of the ellipsoid.
     * @param {Number} [maximumRadius=0.0] The maximum radius of the ellipsoid.
     *
     * @see Ellipsoid.fromRadii
     * @see Ellipsoid.fromCartesian3
     * @see Ellipsoid.WGS84
     * @see Ellipsoid.UNIT_SPHERE
     */
    var Ellipsoid = function(radii, radiiSquared, radiiToTheFourth, oneOverRadii, oneOverRadiiSquared, minimumRadius, maximumRadius) {
        /**
         * The radii of the ellipsoid.
         * @type {Cartesian3}
         */
        this.radii = Cartesian3.clone(typeof radii !== 'undefined' ? radii : Cartesian3.ZERO);

        /**
         * The squared radii of the ellipsoid.
         * @type {Cartesian3}
         */
        this.radiiSquared = Cartesian3.clone(typeof radiiSquared !== 'undefined' ? radiiSquared : Cartesian3.ZERO);

        /**
         * The radii of the ellipsoid raised to the fourth power.
         * @type {Cartesian3}
         */
        this.radiiToTheFourth = Cartesian3.clone(typeof radiiToTheFourth !== 'undefined' ? radiiToTheFourth : Cartesian3.ZERO);

        /**
         * One over the radii of the ellipsoid.
         * @type {Cartesian3}
         */
        this.oneOverRadii = Cartesian3.clone(typeof oneOverRadii !== 'undefined' ? oneOverRadii : Cartesian3.ZERO);

        /**
         * One over the squared radii of the ellipsoid.
         * @type {Cartesian3}
         */
        this.oneOverRadiiSquared = Cartesian3.clone(typeof oneOverRadiiSquared !== 'undefined' ? oneOverRadiiSquared : Cartesian3.ZERO);

        /**
         * The minimum radius of the ellipsoid.
         * @type {Number}
         */
        this.minimumRadius = typeof minimumRadius !== 'undefined' ? minimumRadius : 0.0;

        /**
         * The maximum radius of the ellipsoid.
         * @type {Number}
         */
        this.maximumRadius = typeof maximumRadius !== 'undefined' ? maximumRadius : 0.0;
    };

    /**
     * Computes an Ellipsoid from x, y, and z radii.
     *
     * @param {Number} [x=0] The radius in the x direction.
     * @param {Number} [y=0] The radius in the y direction.
     * @param {Number} [z=0] The radius in the z direction.
     * @param {Ellipsoid} [result] The object onto which to store the result.
     * @return {Ellipsoid} The modified result parameter or a new Ellipsoid instance if none was provided.
     *
     * @exception {DeveloperError} All radii components must be greater than or equal to zero.
     *
     * @see Ellipsoid.fromCartesian3
     * @see Ellipsoid.WGS84
     * @see Ellipsoid.UNIT_SPHERE
     */
    Ellipsoid.fromRadii = function(x, y, z, result) {
        x = typeof x !== 'undefined' ? x : 0;
        y = typeof y !== 'undefined' ? y : 0;
        z = typeof z !== 'undefined' ? z : 0;

        if (x < 0 || y < 0 || z < 0) {
            throw new DeveloperError('All radii components must be greater than or equal to zero.');
        }

        if (typeof result === 'undefined') {
            result = new Ellipsoid();
        }

        var radii = result.radii;
        radii.x = x;
        radii.y = y;
        radii.z = z;

        var radiiSquared = result.radiiSquared;
        radiiSquared.x = x * x;
        radiiSquared.y = y * y;
        radiiSquared.z = z * z;

        var radiiToTheFourth = result.radiiToTheFourth;
        radiiToTheFourth.x = x * x * x * x;
        radiiToTheFourth.y = y * y * y * y;
        radiiToTheFourth.z = z * z * z * z;

        var oneOverRadii = result.oneOverRadii;
        oneOverRadii.x = x === 0.0 ? 0.0 : 1.0 / x;
        oneOverRadii.y = y === 0.0 ? 0.0 : 1.0 / y;
        oneOverRadii.z = z === 0.0 ? 0.0 : 1.0 / z;

        var oneOverRadiiSquared = result.oneOverRadiiSquared;
        oneOverRadiiSquared.x = x === 0.0 ? 0.0 : 1.0 / (x * x);
        oneOverRadiiSquared.y = y === 0.0 ? 0.0 : 1.0 / (y * y);
        oneOverRadiiSquared.z = z === 0.0 ? 0.0 : 1.0 / (z * z);

        result.minimumRadius = Math.min(x, y, z);
        result.maximumRadius = Math.max(x, y, z);

        return result;
    };

    /**
     * Computes an Ellipsoid from a Cartesian specifying the radii in x, y, and z directions.
     *
     * @param {Cartesian3} [radii=Cartesian3.ZERO] The ellipsoid's radius in the x, y, and z directions.
     * @param {Ellipsoid} [result] The object onto which to store the result.
     * @return {Ellipsoid} The modified result parameter or a new Ellipsoid instance if none was provided.
     *
     * @exception {DeveloperError} All radii components must be greater than or equal to zero.
     *
     * @see Ellipsoid.fromCartesian3
     * @see Ellipsoid.WGS84
     * @see Ellipsoid.UNIT_SPHERE
     */
    Ellipsoid.fromCartesian3 = function(cartesian, result) {
        if (typeof cartesian === 'undefined') {
            return Ellipsoid.fromRadii(0.0, 0.0, 0.0, result);
        }
        return Ellipsoid.fromRadii(cartesian.x, cartesian.y, cartesian.z, result);
    };

    /**
     * Duplicates an Ellipsoid instance.
     * @memberof Ellipsoid
     *
     * @param {Ellipsoid} ellipsoid The Ellipsoid to duplicate.
     * @param {Ellipsoid} [result] The object onto which to store the result.
     * @return {Ellipsoid} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} ellipsoid is required.
     */
    Ellipsoid.clone = function(ellipsoid, result) {
        if (typeof ellipsoid === 'undefined') {
            throw new DeveloperError('ellipsoid is required.');
        }

        if (typeof result === 'undefined') {
            result = new Ellipsoid();
        }
        result.radii = Cartesian3.clone(ellipsoid.radii, result.radii);
        result.radiiSquared = Cartesian3.clone(ellipsoid.radiiSquared, result.radiiSquared);
        result.radiiToTheFourth = Cartesian3.clone(ellipsoid.radiiToTheFourth, result.radiiToTheFourth);
        result.oneOverRadii = Cartesian3.clone(ellipsoid.oneOverRadii, result.oneOverRadii);
        result.oneOverRadiiSquared = Cartesian3.clone(ellipsoid.oneOverRadiiSquared, result.oneOverRadiiSquared);
        result.minimumRadius = ellipsoid.minimumRadius;
        result.maximumRadius = ellipsoid.maximumRadius;
        return result;
    };

    /**
     * Computes the unit vector directed from the center of an ellipsoid toward the provided Cartesian position.
     * @memberof Ellipsoid
     *
     * @param {Cartesian3} cartesian The Cartesian for which to to determine the geocentric normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Ellipsoid.geocentricSurfaceNormal = Cartesian3.normalize;

    /**
     * Computes the unit vector directed from the surface of an ellipsoid toward the provided cartographic position.
     * @memberof Ellipsoid
     *
     * @param {Cartographic} cartographic The cartographic position for which to to determine the geodetic normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} cartographic is required.
     */
    Ellipsoid.geodeticSurfaceNormalCartographic = function(cartographic, result) {
        if (typeof cartographic === 'undefined') {
            throw new DeveloperError('cartographic is required.');
        }

        var longitude = cartographic.longitude;
        var latitude = cartographic.latitude;
        var cosLatitude = Math.cos(latitude);

        var x = cosLatitude * Math.cos(longitude);
        var y = cosLatitude * Math.sin(longitude);
        var z = Math.sin(latitude);

        if (typeof result === 'undefined') {
            result = new Cartesian3();
        }
        result.x = x;
        result.y = y;
        result.z = z;
        return Cartesian3.normalize(result, result);
    };

    /**
     * Computes the unit vector directed from the surface of the provided ellipsoid toward the provided Cartesian position.
     * @memberof Ellipsoid
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to use.
     * @param {Cartesian3} cartesian The Cartesian position for which to to determine the surface normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} ellipsoid is required.
     * @exception {DeveloperError} cartesian is required.
     */
    Ellipsoid.geodeticSurfaceNormal = function(ellipsoid, cartesian, result) {
        if (typeof ellipsoid === 'undefined') {
            throw new DeveloperError('ellipsoid is required.');
        }
        result = Cartesian3.multiplyComponents(cartesian, ellipsoid.oneOverRadiiSquared, result);
        return Cartesian3.normalize(result, result);
    };

    var cartographicToCartesianNormal = new Cartesian3();
    var cartographicToCartesianK = new Cartesian3();

    /**
     * Converts the provided cartographic to Cartesian representation.
     * @memberof Ellipsoid
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to use.
     * @param {Cartographic} cartographic The cartographic position.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} ellipsoid is required.
     * @exception {DeveloperError} cartographic is required.
     */
    Ellipsoid.cartographicToCartesian = function(ellipsoid, cartographic, result) {
        if (typeof ellipsoid === 'undefined') {
            throw new DeveloperError('ellipsoid is required');
        }

        //`cartographic is required` is thrown from geodeticSurfaceNormalCartographic.

        var n = cartographicToCartesianNormal;
        var k = cartographicToCartesianK;
        Ellipsoid.geodeticSurfaceNormalCartographic(cartographic, n);
        Cartesian3.multiplyComponents(ellipsoid.radiiSquared, n, k);
        var gamma = Math.sqrt(Cartesian3.dot(n, k));
        Cartesian3.divideByScalar(k, gamma, k);
        Cartesian3.multiplyByScalar(n, cartographic.height, n);
        return Cartesian3.add(k, n, result);
    };

    /**
     * Converts the provided array of cartographics to an array of Cartesians.
     * @memberof Ellipsoid
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to use.
     * @param {Array} cartographics An array of cartographic positions.
     * @param {Array} [result] The object onto which to store the result.
     * @return {Array} The modified result parameter or a new Array instance if none was provided.
     *
     * @exception {DeveloperError} ellipsoid is required.
     * @exception {DeveloperError} cartographics is required.
     */
    Ellipsoid.cartographicArrayToCartesianArray = function(ellipsoid, cartographics, result) {
        //Ellipsoid exception is thrown from cartographicToCartesian.
        if (typeof cartographics === 'undefined') {
            throw new DeveloperError('cartographics is required.');
        }

        var length = cartographics.length;
        if (typeof result === 'undefined') {
            result = new Array(length);
        } else {
            result.length = length;
        }
        for ( var i = 0; i < length; i++) {
            result[i] = Ellipsoid.cartographicToCartesian(ellipsoid, cartographics[i], result[i]);
        }
        return result;
    };

    var cartesianToCartographicN = new Cartesian3();
    var cartesianToCartographicP = new Cartesian3();
    var cartesianToCartographicH = new Cartesian3();

    /**
     * Converts the provided cartesian to cartographic representation.
     * @memberof Ellipsoid
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to use.
     * @param {Cartesian3} cartesian The Cartesian position to convert to cartographic representation.
     * @param {Cartographic} [result] The object onto which to store the result.
     * @return {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     *
     * @exception {DeveloperError} ellipsoid is required.
     * @exception {DeveloperError} cartesian is required.
     */
    Ellipsoid.cartesianToCartographic = function(ellipsoid, cartesian, result) {
        //Exceptions are thrown from geodeticSurfaceNormal
        var p = Ellipsoid.scaleToGeodeticSurface(ellipsoid, cartesian, cartesianToCartographicP);
        var n = Ellipsoid.geodeticSurfaceNormal(ellipsoid, p, cartesianToCartographicN);
        var h = Cartesian3.subtract(cartesian, p, cartesianToCartographicH);

        var longitude = Math.atan2(n.y, n.x);
        var latitude = Math.asin(n.z);
        var height = CesiumMath.sign(Cartesian3.dot(h, cartesian)) * Cartesian3.magnitude(h);

        if (typeof result === 'undefined') {
            return new Cartographic(longitude, latitude, height);
        }
        result.longitude = longitude;
        result.latitude = latitude;
        result.height = height;
        return result;
    };

    /**
     * Converts the provided array of cartesians to an array of cartographics.
     * @memberof Ellipsoid
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to use.
     * @param {Array} cartesians An array of Cartesian positions.
     * @param {Array} [result] The object onto which to store the result.
     * @return {Array} The modified result parameter or a new Array instance if none was provided.
     *
     * @exception {DeveloperError} ellipsoid is required.
     * @exception {DeveloperError} cartesians is required.
     */
    Ellipsoid.cartesianArrayToCartographicArray = function(ellipsoid, cartesians, result) {
        //Ellipsoid exception is thrown from cartesianToCartographic.
        if (typeof cartesians === 'undefined') {
            throw new DeveloperError('cartesians is required.');
        }

        var length = cartesians.length;
        if (typeof result === 'undefined') {
            result = new Array(length);
        } else {
            result.length = length;
        }
        for ( var i = 0; i < length; ++i) {
            result[i] = Ellipsoid.cartesianToCartographic(ellipsoid, cartesians[i], result[i]);
        }
        return result;
    };

    /**
     * Scales the provided Cartesian position along the geodetic surface normal
     * so that it is on the surface of the provided ellipsoid.
     * @memberof Ellipsoid
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to use.
     * @param {Cartesian3} cartesian The Cartesian position to scale.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} ellipsoid is required.
     * @exception {DeveloperError} cartesian is required.
     */
    Ellipsoid.scaleToGeodeticSurface = function(ellipsoid, cartesian, result) {
        if (typeof ellipsoid === 'undefined') {
            throw new DeveloperError('ellipsoid is required.');
        }

        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required.');
        }

        var positionX = cartesian.x;
        var positionY = cartesian.y;
        var positionZ = cartesian.z;

        var oneOverRadiiSquared = ellipsoid.oneOverRadiiSquared;
        var oneOverRadiiSquaredX = oneOverRadiiSquared.x;
        var oneOverRadiiSquaredY = oneOverRadiiSquared.y;
        var oneOverRadiiSquaredZ = oneOverRadiiSquared.z;

        var radiiSquared = ellipsoid.radiiSquared;
        var radiiSquaredX = radiiSquared.x;
        var radiiSquaredY = radiiSquared.y;
        var radiiSquaredZ = radiiSquared.z;

        var radiiToTheFourth = ellipsoid.radiiToTheFourth;
        var radiiToTheFourthX = radiiToTheFourth.x;
        var radiiToTheFourthY = radiiToTheFourth.y;
        var radiiToTheFourthZ = radiiToTheFourth.z;

        var beta = 1.0 / Math.sqrt(
                (positionX * positionX) * oneOverRadiiSquaredX +
                (positionY * positionY) * oneOverRadiiSquaredY +
                (positionZ * positionZ) * oneOverRadiiSquaredZ);

        var x = beta * positionX * oneOverRadiiSquaredX;
        var y = beta * positionY * oneOverRadiiSquaredY;
        var z = beta * positionZ * oneOverRadiiSquaredZ;

        var n = Math.sqrt(x * x + y * y + z * z);
        var alpha = (1.0 - beta) * (Cartesian3.magnitude(cartesian) / n);

        var x2 = positionX * positionX;
        var y2 = positionY * positionY;
        var z2 = positionZ * positionZ;

        var da = 0.0;
        var db = 0.0;
        var dc = 0.0;

        var s = 0.0;
        var dSdA = 1.0;

        do {
            alpha -= (s / dSdA);

            da = 1.0 + (alpha * oneOverRadiiSquaredX);
            db = 1.0 + (alpha * oneOverRadiiSquaredY);
            dc = 1.0 + (alpha * oneOverRadiiSquaredZ);

            var da2 = da * da;
            var db2 = db * db;
            var dc2 = dc * dc;

            var da3 = da * da2;
            var db3 = db * db2;
            var dc3 = dc * dc2;

            s = x2 / (radiiSquaredX * da2) + y2 / (radiiSquaredY * db2) + z2 / (radiiSquaredZ * dc2) - 1.0;

            dSdA = -2.0 * (x2 / (radiiToTheFourthX * da3) + y2 / (radiiToTheFourthY * db3) + z2 / (radiiToTheFourthZ * dc3));
        } while (Math.abs(s) > CesiumMath.EPSILON10);

        x = positionX / da;
        y = positionY / db;
        z = positionZ / dc;

        if (typeof result === 'undefined') {
            return new Cartesian3(x, y, z);
        }
        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    };

    /**
     * Scales the provided Cartesian position along the geocentric surface normal
     * so that it is on the surface of the provided ellipsoid.
     * @memberof Ellipsoid
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to use.
     * @param {Cartesian3} cartesian The Cartesian position to scale.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} ellipsoid is required.
     * @exception {DeveloperError} cartesian is required.
     */
    Ellipsoid.scaleToGeocentricSurface = function(ellipsoid, cartesian, result) {
        if (typeof ellipsoid === 'undefined') {
            throw new DeveloperError('ellipsoid is required.');
        }

        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required.');
        }

        var positionX = cartesian.x;
        var positionY = cartesian.y;
        var positionZ = cartesian.z;
        var oneOverRadiiSquared = ellipsoid.oneOverRadiiSquared;

        var beta = 1.0 / Math.sqrt((positionX * positionX) * oneOverRadiiSquared.x +
                                   (positionY * positionY) * oneOverRadiiSquared.y +
                                   (positionZ * positionZ) * oneOverRadiiSquared.z);

        return Cartesian3.multiplyByScalar(cartesian, beta, result);
    };

    /**
     * Compares the provided Ellipsoid componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Ellipsoid
     *
     * @param {Ellipsoid} [left] The first Ellipsoid.
     * @param {Ellipsoid} [right] The second Ellipsoid.
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Ellipsoid.equals = function(left, right) {
        return (left === right) ||
               (typeof left !== 'undefined' &&
                typeof right !== 'undefined' &&
                Cartesian3.equals(left.radii, right.radii) &&
                Cartesian3.equals(left.radiiSquared, right.radiiSquared) &&
                Cartesian3.equals(left.radiiToTheFourth, right.radiiToTheFourth) &&
                Cartesian3.equals(left.oneOverRadii, right.oneOverRadii) &&
                Cartesian3.equals(left.oneOverRadiiSquared, right.oneOverRadiiSquared) &&
                left.minimumRadius === right.minimumRadius &&
                left.maximumRadius === right.maximumRadius);
    };

    /**
     * An immutable Ellipsoid instance initialized to the WGS84 standard.
     * @memberof Ellipsoid
     *
     * @see czm_getWgs84EllipsoidEC
     */
    Ellipsoid.WGS84 = Object.freeze(Ellipsoid.fromRadii(6378137.0, 6378137.0, 6356752.3142451793));

    /**
     * An immutable Ellipsoid instance initialized to radii of (1.0, 1.0, 1.0).
     * @memberof Ellipsoid
     */
    Ellipsoid.UNIT_SPHERE = Object.freeze(Ellipsoid.fromRadii(1.0, 1.0, 1.0));

    /**
     * Duplicates this ellipsoid instance.
     * @memberof Ellipsoid
     *
     * @param {Ellipsoid} [result] The object onto which to store the result.
     * @return {Ellipsoid} The modified result parameter or a new Cartesian3 instance if none was provided.
     */
    Ellipsoid.prototype.clone = function(result) {
        return Ellipsoid.clone(this, result);
    };

    /**
     * Computes the unit vector directed from the center of this ellipsoid toward the provided Cartesian position.
     * @memberof Ellipsoid
     *
     * @param {Cartesian3} cartesian The Cartesian for which to to determine the geocentric normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Ellipsoid.prototype.geocentricSurfaceNormal = Ellipsoid.geocentricSurfaceNormal;

    /**
     * Computes the unit vector directed from the surface this ellipsoid toward the provided cartographic position.
     * @memberof Ellipsoid
     *
     * @param {Cartographic} cartographic The cartographic position for which to to determine the geodetic normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} cartographic is required.
     */
    Ellipsoid.prototype.geodeticSurfaceNormalCartographic = Ellipsoid.geodeticSurfaceNormalCartographic;

    /**
     * Computes the unit vector directed from the surface of this ellipsoid toward the provided Cartesian position.
     * @memberof Ellipsoid
     *
     * @param {Cartesian3} cartesian The Cartesian position for which to to determine the surface normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Ellipsoid.prototype.geodeticSurfaceNormal = function(cartesian, result) {
        return Ellipsoid.geodeticSurfaceNormal(this, cartesian, result);
    };

    /**
     * Converts the provided cartographic to Cartesian representation.
     * @memberof Ellipsoid
     *
     * @param {Cartographic} cartographic The cartographic position.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} cartographic is required.
     */
    Ellipsoid.prototype.cartographicToCartesian = function(cartographic, result) {
        return Ellipsoid.cartographicToCartesian(this, cartographic, result);
    };

    /**
     * Converts the provided array of cartographics to an array of Cartesians.
     * @memberof Ellipsoid
     *
     * @param {Array} cartographics An array of cartographic positions.
     * @param {Array} [result] The object onto which to store the result.
     * @return {Array} The modified result parameter or a new Array instance if none was provided.
     *
     * @exception {DeveloperError} cartographics is required.
     */
    Ellipsoid.prototype.cartographicArrayToCartesianArray = function(cartographics, result) {
        return Ellipsoid.cartographicArrayToCartesianArray(this, cartographics, result);
    };

    /**
     * Converts the provided cartesian to cartographic representation.
     * @memberof Ellipsoid
     *
     * @param {Cartesian3} cartesian The Cartesian position to convert to cartographic representation.
     * @param {Cartographic} [result] The object onto which to store the result.
     * @return {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Ellipsoid.prototype.cartesianToCartographic = function(cartesian, result) {
        return Ellipsoid.cartesianToCartographic(this, cartesian, result);
    };

    /**
     * Converts the provided array of cartesians to an array of cartographics.
     * @memberof Ellipsoid
     *
     * @param {Array} cartesians An array of Cartesian positions.
     * @param {Array} [result] The object onto which to store the result.
     * @return {Array} The modified result parameter or a new Array instance if none was provided.
     *
     * @exception {DeveloperError} cartesians is required.
     */
    Ellipsoid.prototype.cartesianArrayToCartographicArray = function(cartesians, result) {
        return Ellipsoid.cartesianArrayToCartographicArray(this, cartesians, result);
    };

    /**
     * Scales the provided Cartesian position along the geodetic surface normal
     * so that it is on the surface of this ellipsoid.
     * @memberof Ellipsoid
     *
     * @param {Cartesian3} cartesian The Cartesian position to scale.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Ellipsoid.prototype.scaleToGeodeticSurface = function(position, result) {
        return Ellipsoid.scaleToGeodeticSurface(this, position, result);
    };

    /**
     * Scales the provided Cartesian position along the geocentric surface normal
     * so that it is on the surface of this ellipsoid.
     * @memberof Ellipsoid
     *
     * @param {Cartesian3} cartesian The Cartesian position to scale.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Ellipsoid.prototype.scaleToGeocentricSurface = function(position, result) {
        return Ellipsoid.scaleToGeocentricSurface(this, position, result);
    };

    /**
     * Compares this Ellipsoid against the provided Ellipsoid componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Ellipsoid
     *
     * @param {Ellipsoid} [right] The other Ellipsoid.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    Ellipsoid.prototype.equals = function(right) {
        return Ellipsoid.equals(this, right);
    };

    /**
     * Creates a string representing this Ellipsoid in the format '(radii.x, radii.y, radii.z)'.
     * @memberof Ellipsoid
     *
     * @return {String} A string representing this ellipsoid in the format '(radii.x, radii.y, radii.z)'.
     */
    Ellipsoid.prototype.toString = function() {
        return this.radii.toString();
    };

    return Ellipsoid;
});
