/*global define*/
define([
        './freezeObject',
        './defaultValue',
        './DeveloperError',
        './Math',
        './Cartesian3',
        './Cartographic'
       ], function(
         freezeObject,
         defaultValue,
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
     * constants is normally used.
     * @alias Ellipsoid
     * @constructor
     * @immutable
     *
     * @param {Number} [x=0] The radius in the x direction.
     * @param {Number} [y=0] The radius in the y direction.
     * @param {Number} [z=0] The radius in the z direction.
     *
     * @exception {DeveloperError} All radii components must be greater than or equal to zero.
     *
     * @see Ellipsoid.fromCartesian3
     * @see Ellipsoid.WGS84
     * @see Ellipsoid.UNIT_SPHERE
     */
    var Ellipsoid = function(x, y, z) {
        x = defaultValue(x, 0.0);
        y = defaultValue(y, 0.0);
        z = defaultValue(z, 0.0);

        if (x < 0.0 || y < 0.0 || z < 0.0) {
            throw new DeveloperError('All radii components must be greater than or equal to zero.');
        }

        this._radii = new Cartesian3(x, y, z);

        this._radiiSquared = new Cartesian3(x * x,
                                            y * y,
                                            z * z);

        this._radiiToTheFourth = new Cartesian3(x * x * x * x,
                                                y * y * y * y,
                                                z * z * z * z);

        this._oneOverRadii = new Cartesian3(x === 0.0 ? 0.0 : 1.0 / x,
                                            y === 0.0 ? 0.0 : 1.0 / y,
                                            z === 0.0 ? 0.0 : 1.0 / z);

        this._oneOverRadiiSquared = new Cartesian3(x === 0.0 ? 0.0 : 1.0 / (x * x),
                                                   y === 0.0 ? 0.0 : 1.0 / (y * y),
                                                   z === 0.0 ? 0.0 : 1.0 / (z * z));

        this._minimumRadius = Math.min(x, y, z);

        this._maximumRadius = Math.max(x, y, z);
    };

    /**
     * Computes an Ellipsoid from a Cartesian specifying the radii in x, y, and z directions.
     *
     * @param {Cartesian3} [radii=Cartesian3.ZERO] The ellipsoid's radius in the x, y, and z directions.
     * @return {Ellipsoid} A new Ellipsoid instance.
     *
     * @exception {DeveloperError} All radii components must be greater than or equal to zero.
     *
     * @see Ellipsoid.WGS84
     * @see Ellipsoid.UNIT_SPHERE
     */
    Ellipsoid.fromCartesian3 = function(cartesian) {
        if (typeof cartesian === 'undefined') {
            return new Ellipsoid();
        }
        return new Ellipsoid(cartesian.x, cartesian.y, cartesian.z);
    };

    /**
     * An Ellipsoid instance initialized to the WGS84 standard.
     * @memberof Ellipsoid
     *
     * @see czm_getWgs84EllipsoidEC
     */
    Ellipsoid.WGS84 = freezeObject(new Ellipsoid(6378137.0, 6378137.0, 6356752.3142451793));

    /**
     * An Ellipsoid instance initialized to radii of (1.0, 1.0, 1.0).
     * @memberof Ellipsoid
     */
    Ellipsoid.UNIT_SPHERE = freezeObject(new Ellipsoid(1.0, 1.0, 1.0));

    /**
     * @memberof Ellipsoid
     * @return {Cartesian3} The radii of the ellipsoid.
     */
    Ellipsoid.prototype.getRadii = function() {
        return this._radii;
    };

    /**
     * @memberof Ellipsoid
     * @return {Cartesian3} The squared radii of the ellipsoid.
     */
    Ellipsoid.prototype.getRadiiSquared = function() {
        return this._radiiSquared;
    };

    /**
     * @memberof Ellipsoid
     * @return {Cartesian3} The radii of the ellipsoid raised to the fourth power.
     */
    Ellipsoid.prototype.getRadiiToTheFourth = function() {
        return this._radiiToTheFourth;
    };

    /**
     * @memberof Ellipsoid
     * @return {Cartesian3} One over the radii of the ellipsoid.
     */
    Ellipsoid.prototype.getOneOverRadii = function() {
        return this._oneOverRadii;
    };

    /**
     * @memberof Ellipsoid
     * @return {Cartesian3} One over the squared radii of the ellipsoid.
     */
    Ellipsoid.prototype.getOneOverRadiiSquared = function() {
        return this._oneOverRadiiSquared;
    };

    /**
     * @memberof Ellipsoid
     * @return {Cartesian3} The minimum radius of the ellipsoid.
     */
    Ellipsoid.prototype.getMinimumRadius = function() {
        return this._minimumRadius;
    };

    /**
     * @memberof Ellipsoid
     * @return {Cartesian3} The maximum radius of the ellipsoid.
     */
    Ellipsoid.prototype.getMaximumRadius = function() {
        return this._maximumRadius;
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
    Ellipsoid.prototype.geocentricSurfaceNormal = Cartesian3.normalize;

    /**
     * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
     * @memberof Ellipsoid
     *
     * @param {Cartographic} cartographic The cartographic position for which to to determine the geodetic normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} cartographic is required.
     */
    Ellipsoid.prototype.geodeticSurfaceNormalCartographic = function(cartographic, result) {
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
     * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
     * @memberof Ellipsoid
     *
     * @param {Cartesian3} cartesian The Cartesian position for which to to determine the surface normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Ellipsoid.prototype.geodeticSurfaceNormal = function(cartesian, result) {
        result = Cartesian3.multiplyComponents(cartesian, this._oneOverRadiiSquared, result);
        return Cartesian3.normalize(result, result);
    };

    var cartographicToCartesianNormal = new Cartesian3();
    var cartographicToCartesianK = new Cartesian3();

    /**
     * Converts the provided cartographic to Cartesian representation.
     * @memberof Ellipsoid
     *
     * @param {Cartographic} cartographic The cartographic position.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} cartographic is required.
     *
     * @example
     * //Create a Cartographic and determine it's Cartesian representation on a WGS84 ellipsoid.
     * var position = new Cartographic(Math.toRadians(21), Math.toRadians(78), 5000);
     * var cartesianPosition = Ellipsoid.WGS84.cartographicToCartesian(position);
     */
    Ellipsoid.prototype.cartographicToCartesian = function(cartographic, result) {
        //`cartographic is required` is thrown from geodeticSurfaceNormalCartographic.
        var n = cartographicToCartesianNormal;
        var k = cartographicToCartesianK;
        this.geodeticSurfaceNormalCartographic(cartographic, n);
        Cartesian3.multiplyComponents(this._radiiSquared, n, k);
        var gamma = Math.sqrt(Cartesian3.dot(n, k));
        Cartesian3.divideByScalar(k, gamma, k);
        Cartesian3.multiplyByScalar(n, cartographic.height, n);
        return Cartesian3.add(k, n, result);
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
     *
     * @example
     * //Convert an array of Cartographics and determine their Cartesian representation on a WGS84 ellipsoid.
     * var positions = [new Cartographic(Math.toRadians(21), Math.toRadians(78), 0),
     *                  new Cartographic(Math.toRadians(21.321), Math.toRadians(78.123), 100),
     *                  new Cartographic(Math.toRadians(21.645), Math.toRadians(78.456), 250)
     * var cartesianPositions = Ellipsoid.WGS84.cartographicArrayToCartesianArray(positions);
     */
    Ellipsoid.prototype.cartographicArrayToCartesianArray = function(cartographics, result) {
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
            result[i] = this.cartographicToCartesian(cartographics[i], result[i]);
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
     * @param {Cartesian3} cartesian The Cartesian position to convert to cartographic representation.
     * @param {Cartographic} [result] The object onto which to store the result.
     * @return {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     *
     * @example
     * //Create a Cartesian and determine it's Cartographic representation on a WGS84 ellipsoid.
     * var position = new Cartesian(17832.12, 83234.52, 952313.73);
     * var cartographicPosition = Ellipsoid.WGS84.cartesianToCartographic(position);
     */
    Ellipsoid.prototype.cartesianToCartographic = function(cartesian, result) {
        //`cartesian is required.` is thrown from scaleToGeodeticSurface
        var p = this.scaleToGeodeticSurface(cartesian, cartesianToCartographicP);
        var n = this.geodeticSurfaceNormal(p, cartesianToCartographicN);
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
     * @param {Array} cartesians An array of Cartesian positions.
     * @param {Array} [result] The object onto which to store the result.
     * @return {Array} The modified result parameter or a new Array instance if none was provided.
     *
     * @exception {DeveloperError} cartesians is required.
     *
     * @example
     * //Create an array of Cartesians and determine their Cartographic representation on a WGS84 ellipsoid.
     * var positions = [new Cartesian(17832.12, 83234.52, 952313.73),
     *                  new Cartesian(17832.13, 83234.53, 952313.73),
     *                  new Cartesian(17832.14, 83234.54, 952313.73)]
     * var cartographicPositions = Ellipsoid.WGS84.cartesianArrayToCartographicArray(positions);
     */
    Ellipsoid.prototype.cartesianArrayToCartographicArray = function(cartesians, result) {
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
            result[i] = this.cartesianToCartographic(cartesians[i], result[i]);
        }
        return result;
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
    Ellipsoid.prototype.scaleToGeodeticSurface = function(cartesian, result) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required.');
        }

        var positionX = cartesian.x;
        var positionY = cartesian.y;
        var positionZ = cartesian.z;

        var oneOverRadiiSquared = this._oneOverRadiiSquared;
        var oneOverRadiiSquaredX = oneOverRadiiSquared.x;
        var oneOverRadiiSquaredY = oneOverRadiiSquared.y;
        var oneOverRadiiSquaredZ = oneOverRadiiSquared.z;

        var radiiSquared = this._radiiSquared;
        var radiiSquaredX = radiiSquared.x;
        var radiiSquaredY = radiiSquared.y;
        var radiiSquaredZ = radiiSquared.z;

        var radiiToTheFourth = this._radiiToTheFourth;
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
     * so that it is on the surface of this ellipsoid.
     * @memberof Ellipsoid
     *
     * @param {Cartesian3} cartesian The Cartesian position to scale.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Ellipsoid.prototype.scaleToGeocentricSurface = function(cartesian, result) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required.');
        }

        var positionX = cartesian.x;
        var positionY = cartesian.y;
        var positionZ = cartesian.z;
        var oneOverRadiiSquared = this._oneOverRadiiSquared;

        var beta = 1.0 / Math.sqrt((positionX * positionX) * oneOverRadiiSquared.x +
                                   (positionY * positionY) * oneOverRadiiSquared.y +
                                   (positionZ * positionZ) * oneOverRadiiSquared.z);

        return Cartesian3.multiplyByScalar(cartesian, beta, result);
    };

    /**
     * Transforms a Cartesian X, Y, Z position to the ellipsoid-scaled space by multiplying
     * its components by the result of {@link Ellipsoid#getOneOverRadii}.
     *
     * @memberof Ellipsoid
     *
     * @param {Cartesian3} position The position to transform.
     * @param {Cartesian3} [result] The position to which to copy the result, or undefined to create and
     *        return a new instance.
     * @returns {Cartesian3} The position expressed in the scaled space.  The returned instance is the
     *          one passed as the result parameter if it is not undefined, or a new instance of it is.
     */
    Ellipsoid.prototype.transformPositionToScaledSpace = function(position, result) {
        return Cartesian3.multiplyComponents(position, this._oneOverRadii, result);
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
        return (this === right) ||
               (typeof right !== 'undefined' &&
                Cartesian3.equals(this._radii, right._radii));
    };

    /**
     * Creates a string representing this Ellipsoid in the format '(radii.x, radii.y, radii.z)'.
     * @memberof Ellipsoid
     *
     * @return {String} A string representing this ellipsoid in the format '(radii.x, radii.y, radii.z)'.
     */
    Ellipsoid.prototype.toString = function() {
        return this._radii.toString();
    };

    return Ellipsoid;
});
