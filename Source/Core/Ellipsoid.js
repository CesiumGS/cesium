/*global define*/
define([
        './Cartesian3',
        './Cartographic',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './freezeObject',
        './Math'
    ], function(
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        freezeObject,
        CesiumMath) {
    "use strict";

    function initialize(ellipsoid, x, y, z) {
        x = defaultValue(x, 0.0);
        y = defaultValue(y, 0.0);
        z = defaultValue(z, 0.0);

        //>>includeStart('debug', pragmas.debug);
        if (x < 0.0 || y < 0.0 || z < 0.0) {
            throw new DeveloperError('All radii components must be greater than or equal to zero.');
        }
        //>>includeEnd('debug');

        ellipsoid._radii = new Cartesian3(x, y, z);

        ellipsoid._radiiSquared = new Cartesian3(x * x,
                                            y * y,
                                            z * z);

        ellipsoid._radiiToTheFourth = new Cartesian3(x * x * x * x,
                                                y * y * y * y,
                                                z * z * z * z);

        ellipsoid._oneOverRadii = new Cartesian3(x === 0.0 ? 0.0 : 1.0 / x,
                                            y === 0.0 ? 0.0 : 1.0 / y,
                                            z === 0.0 ? 0.0 : 1.0 / z);

        ellipsoid._oneOverRadiiSquared = new Cartesian3(x === 0.0 ? 0.0 : 1.0 / (x * x),
                                                   y === 0.0 ? 0.0 : 1.0 / (y * y),
                                                   z === 0.0 ? 0.0 : 1.0 / (z * z));

        ellipsoid._minimumRadius = Math.min(x, y, z);

        ellipsoid._maximumRadius = Math.max(x, y, z);

        ellipsoid._centerToleranceSquared = CesiumMath.EPSILON1;
    }

    /**
     * A quadratic surface defined in Cartesian coordinates by the equation
     * <code>(x / a)^2 + (y / b)^2 + (z / c)^2 = 1</code>.  Primarily used
     * by Cesium to represent the shape of planetary bodies.
     *
     * Rather than constructing this object directly, one of the provided
     * constants is normally used.
     * @alias Ellipsoid
     * @constructor
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
        this._radii = undefined;
        this._radiiSquared = undefined;
        this._radiiToTheFourth = undefined;
        this._oneOverRadii = undefined;
        this._oneOverRadiiSquared = undefined;
        this._minimumRadius = undefined;
        this._maximumRadius = undefined;
        this._centerToleranceSquared = undefined;

        initialize(this, x, y, z);
    };

    defineProperties(Ellipsoid.prototype, {
        /**
         * Gets the radii of the ellipsoid.
         * @memberof Ellipsoid.prototype
         * @type {Cartesian3}
         */
        radii : {
            get: function() {
                return this._radii;
            }
        },
        /**
         * Gets the squared radii of the ellipsoid.
         * @memberof Ellipsoid.prototype
         * @type {Cartesian3}
         */
        radiiSquared : {
            get : function() {
                return this._radiiSquared;
            }
        },
        /**
         * Gets the radii of the ellipsoid raise to the fourth power.
         * @memberof Ellipsoid.prototype
         * @type {Cartesian3}
         */
        radiiToTheFourth : {
            get : function() {
                return this._radiiToTheFourth;
            }
        },
        /**
         * Gets one over the radii of the ellipsoid.
         * @memberof Ellipsoid.prototype
         * @type {Cartesian3}
         */
        oneOverRadii : {
            get : function() {
                return this._oneOverRadii;
            }
        },
        /**
         * Gets one over the squared radii of the ellipsoid.
         * @memberof Ellipsoid.prototype
         * @type {Cartesian3}
         */
        oneOverRadiiSquared : {
            get : function() {
                return this._oneOverRadiiSquared;
            }
        },
        /**
         * Gets the minimum radius of the ellipsoid.
         * @memberof Ellipsoid.prototype
         * @type {Number}
         */
        minimumRadius : {
            get : function() {
                return this._minimumRadius;
            }
        },
        /**
         * Gets the maximum radius of the ellipsoid.
         * @memberof Ellipsoid.prototype
         * @type {Number}
         */
        maximumRadius : {
            get : function() {
                return this._maximumRadius;
            }
        }
    });

    /**
     * Duplicates an Ellipsoid instance.
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to duplicate.
     * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
     *                    instance should be created.
     * @returns {Ellipsoid} The cloned Ellipsoid. (Returns undefined if ellipsoid is undefined)
     */
    Ellipsoid.clone = function(ellipsoid, result) {
        if (!defined(ellipsoid)) {
            return undefined;
        }
        var radii = ellipsoid._radii;

        if (!defined(result)) {
            return new Ellipsoid(radii.x, radii.y, radii.z);
        }

        Cartesian3.clone(radii, result._radii);
        Cartesian3.clone(ellipsoid._radiiSquared, result._radiiSquared);
        Cartesian3.clone(ellipsoid._radiiToTheFourth, result._radiiToTheFourth);
        Cartesian3.clone(ellipsoid._oneOverRadii, result._oneOverRadii);
        Cartesian3.clone(ellipsoid._oneOverRadiiSquared, result._oneOverRadiiSquared);
        result._minimumRadius = ellipsoid._minimumRadius;
        result._maximumRadius = ellipsoid._maximumRadius;
        result._centerToleranceSquared = ellipsoid._centerToleranceSquared;

        return result;
    };

    /**
     * Computes an Ellipsoid from a Cartesian specifying the radii in x, y, and z directions.
     *
     * @param {Cartesian3} [radii=Cartesian3.ZERO] The ellipsoid's radius in the x, y, and z directions.
     * @returns {Ellipsoid} A new Ellipsoid instance.
     *
     * @exception {DeveloperError} All radii components must be greater than or equal to zero.
     *
     * @see Ellipsoid.WGS84
     * @see Ellipsoid.UNIT_SPHERE
     */
    Ellipsoid.fromCartesian3 = function(cartesian, result) {
        if (!defined(result)) {
            result = new Ellipsoid();
        }

        if (!defined(cartesian)) {
            return result;
        }

        initialize(result, cartesian.x, cartesian.y, cartesian.z);
        return result;
    };

    /**
     * An Ellipsoid instance initialized to the WGS84 standard.
     *
     * @type {Ellipsoid}
     * @constant
     */
    Ellipsoid.WGS84 = freezeObject(new Ellipsoid(6378137.0, 6378137.0, 6356752.3142451793));

    /**
     * An Ellipsoid instance initialized to radii of (1.0, 1.0, 1.0).
     *
     * @type {Ellipsoid}
     * @constant
     */
    Ellipsoid.UNIT_SPHERE = freezeObject(new Ellipsoid(1.0, 1.0, 1.0));

    /**
     * An Ellipsoid instance initialized to a sphere with the lunar radius.
     *
     * @type {Ellipsoid}
     * @constant
     */
    Ellipsoid.MOON = freezeObject(new Ellipsoid(CesiumMath.LUNAR_RADIUS, CesiumMath.LUNAR_RADIUS, CesiumMath.LUNAR_RADIUS));

    /**
     * Duplicates an Ellipsoid instance.
     *
     * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
     *                    instance should be created.
     * @returns {Ellipsoid} The cloned Ellipsoid.
     */
    Ellipsoid.prototype.clone = function(result) {
        return Ellipsoid.clone(this, result);
    };

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    Ellipsoid.packedLength = Cartesian3.packedLength;

    /**
     * Stores the provided instance into the provided array.
     * @function
     *
     * @param {Object} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    Ellipsoid.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        Cartesian3.pack(value._radii, array, startingIndex);
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {Ellipsoid} [result] The object into which to store the result.
     */
    Ellipsoid.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var radii = Cartesian3.unpack(array, startingIndex);
        return Ellipsoid.fromCartesian3(radii, result);
    };

    /**
     * Computes the unit vector directed from the center of this ellipsoid toward the provided Cartesian position.
     * @function
     *
     * @param {Cartesian3} cartesian The Cartesian for which to to determine the geocentric normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     */
    Ellipsoid.prototype.geocentricSurfaceNormal = Cartesian3.normalize;

    /**
     * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
     *
     * @param {Cartographic} cartographic The cartographic position for which to to determine the geodetic normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     */
    Ellipsoid.prototype.geodeticSurfaceNormalCartographic = function(cartographic, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartographic)) {
            throw new DeveloperError('cartographic is required.');
        }
        //>>includeEnd('debug');

        var longitude = cartographic.longitude;
        var latitude = cartographic.latitude;
        var cosLatitude = Math.cos(latitude);

        var x = cosLatitude * Math.cos(longitude);
        var y = cosLatitude * Math.sin(longitude);
        var z = Math.sin(latitude);

        if (!defined(result)) {
            result = new Cartesian3();
        }
        result.x = x;
        result.y = y;
        result.z = z;
        return Cartesian3.normalize(result, result);
    };

    /**
     * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
     *
     * @param {Cartesian3} cartesian The Cartesian position for which to to determine the surface normal.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     */
    Ellipsoid.prototype.geodeticSurfaceNormal = function(cartesian, result) {
        if (!defined(result)) {
            result = new Cartesian3();
        }
        result = Cartesian3.multiplyComponents(cartesian, this._oneOverRadiiSquared, result);
        return Cartesian3.normalize(result, result);
    };

    var cartographicToCartesianNormal = new Cartesian3();
    var cartographicToCartesianK = new Cartesian3();

    /**
     * Converts the provided cartographic to Cartesian representation.
     *
     * @param {Cartographic} cartographic The cartographic position.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     *
     * @example
     * //Create a Cartographic and determine it's Cartesian representation on a WGS84 ellipsoid.
     * var position = new Cesium.Cartographic(Cesium.Math.toRadians(21), Cesium.Math.toRadians(78), 5000);
     * var cartesianPosition = Cesium.Ellipsoid.WGS84.cartographicToCartesian(position);
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

        if (!defined(result)) {
            result = new Cartesian3();
        }
        return Cartesian3.add(k, n, result);
    };

    /**
     * Converts the provided array of cartographics to an array of Cartesians.
     *
     * @param {Cartographic[]} cartographics An array of cartographic positions.
     * @param {Cartesian3[]} [result] The object onto which to store the result.
     * @returns {Cartesian3[]} The modified result parameter or a new Array instance if none was provided.
     *
     * @example
     * //Convert an array of Cartographics and determine their Cartesian representation on a WGS84 ellipsoid.
     * var positions = [new Cesium.Cartographic(Cesium.Math.toRadians(21), Cesium.Math.toRadians(78), 0),
     *                  new Cesium.Cartographic(Cesium.Math.toRadians(21.321), Cesium.Math.toRadians(78.123), 100),
     *                  new Cesium.Cartographic(Cesium.Math.toRadians(21.645), Cesium.Math.toRadians(78.456), 250)
     * var cartesianPositions = Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(positions);
     */
    Ellipsoid.prototype.cartographicArrayToCartesianArray = function(cartographics, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartographics)) {
            throw new DeveloperError('cartographics is required.');
        }
        //>>includeEnd('debug');

        var length = cartographics.length;
        if (!defined(result)) {
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
     * The cartesian is undefined at the center of the ellipsoid.
     *
     * @param {Cartesian3} cartesian The Cartesian position to convert to cartographic representation.
     * @param {Cartographic} [result] The object onto which to store the result.
     * @returns {Cartographic} The modified result parameter, new Cartographic instance if none was provided, or undefined if the cartesian is at the center of the ellipsoid.
     *
     * @example
     * //Create a Cartesian and determine it's Cartographic representation on a WGS84 ellipsoid.
     * var position = new Cesium.Cartesian(17832.12, 83234.52, 952313.73);
     * var cartographicPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position);
     */
    Ellipsoid.prototype.cartesianToCartographic = function(cartesian, result) {
        //`cartesian is required.` is thrown from scaleToGeodeticSurface
        var p = this.scaleToGeodeticSurface(cartesian, cartesianToCartographicP);

        if (!defined(p)) {
            return undefined;
        }

        var n = this.geodeticSurfaceNormal(p, cartesianToCartographicN);
        var h = Cartesian3.subtract(cartesian, p, cartesianToCartographicH);

        var longitude = Math.atan2(n.y, n.x);
        var latitude = Math.asin(n.z);
        var height = CesiumMath.sign(Cartesian3.dot(h, cartesian)) * Cartesian3.magnitude(h);

        if (!defined(result)) {
            return new Cartographic(longitude, latitude, height);
        }
        result.longitude = longitude;
        result.latitude = latitude;
        result.height = height;
        return result;
    };

    /**
     * Converts the provided array of cartesians to an array of cartographics.
     *
     * @param {Cartesian3[]} cartesians An array of Cartesian positions.
     * @param {Cartographic[]} [result] The object onto which to store the result.
     * @returns {Cartographic[]} The modified result parameter or a new Array instance if none was provided.
     *
     * @example
     * //Create an array of Cartesians and determine their Cartographic representation on a WGS84 ellipsoid.
     * var positions = [new Cesium.Cartesian3(17832.12, 83234.52, 952313.73),
     *                  new Cesium.Cartesian3(17832.13, 83234.53, 952313.73),
     *                  new Cesium.Cartesian3(17832.14, 83234.54, 952313.73)]
     * var cartographicPositions = Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(positions);
     */
    Ellipsoid.prototype.cartesianArrayToCartographicArray = function(cartesians, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesians)) {
            throw new DeveloperError('cartesians is required.');
        }
        //>>includeEnd('debug');

        var length = cartesians.length;
        if (!defined(result)) {
            result = new Array(length);
        } else {
            result.length = length;
        }
        for ( var i = 0; i < length; ++i) {
            result[i] = this.cartesianToCartographic(cartesians[i], result[i]);
        }
        return result;
    };

    var scaleToGeodeticSurfaceIntersection = new Cartesian3();
    var scaleToGeodeticSurfaceGradient = new Cartesian3();

    /**
     * Scales the provided Cartesian position along the geodetic surface normal
     * so that it is on the surface of this ellipsoid.  If the position is
     * at the center of the ellipsoid, this function returns undefined.
     *
     * @param {Cartesian3} cartesian The Cartesian position to scale.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter, a new Cartesian3 instance if none was provided, or undefined if the position is at the center.
     */
    Ellipsoid.prototype.scaleToGeodeticSurface = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        //>>includeEnd('debug');

        var positionX = cartesian.x;
        var positionY = cartesian.y;
        var positionZ = cartesian.z;

        var oneOverRadii = this._oneOverRadii;
        var oneOverRadiiX = oneOverRadii.x;
        var oneOverRadiiY = oneOverRadii.y;
        var oneOverRadiiZ = oneOverRadii.z;

        var x2 = positionX * positionX * oneOverRadiiX * oneOverRadiiX;
        var y2 = positionY * positionY * oneOverRadiiY * oneOverRadiiY;
        var z2 = positionZ * positionZ * oneOverRadiiZ * oneOverRadiiZ;

        // Compute the squared ellipsoid norm.
        var squaredNorm = x2 + y2 + z2;
        var ratio = Math.sqrt(1.0 / squaredNorm);

        // As an initial approximation, assume that the radial intersection is the projection point.
        var intersection = Cartesian3.multiplyByScalar(cartesian, ratio, scaleToGeodeticSurfaceIntersection);

        //* If the position is near the center, the iteration will not converge.
        if (squaredNorm < this._centerToleranceSquared) {
            return !isFinite(ratio) ? undefined : Cartesian3.clone(intersection, result);
        }

        var oneOverRadiiSquared = this._oneOverRadiiSquared;
        var oneOverRadiiSquaredX = oneOverRadiiSquared.x;
        var oneOverRadiiSquaredY = oneOverRadiiSquared.y;
        var oneOverRadiiSquaredZ = oneOverRadiiSquared.z;

        // Use the gradient at the intersection point in place of the true unit normal.
        // The difference in magnitude will be absorbed in the multiplier.
        var gradient = scaleToGeodeticSurfaceGradient;
        gradient.x = intersection.x * oneOverRadiiSquaredX * 2.0;
        gradient.y = intersection.y * oneOverRadiiSquaredY * 2.0;
        gradient.z = intersection.z * oneOverRadiiSquaredZ * 2.0;

        // Compute the initial guess at the normal vector multiplier, lambda.
        var lambda = (1.0 - ratio) * Cartesian3.magnitude(cartesian) / (0.5 * Cartesian3.magnitude(gradient));
        var correction = 0.0;

        var func;
        var denominator;
        var xMultiplier;
        var yMultiplier;
        var zMultiplier;
        var xMultiplier2;
        var yMultiplier2;
        var zMultiplier2;
        var xMultiplier3;
        var yMultiplier3;
        var zMultiplier3;

        do {
            lambda -= correction;

            xMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredX);
            yMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredY);
            zMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredZ);

            xMultiplier2 = xMultiplier * xMultiplier;
            yMultiplier2 = yMultiplier * yMultiplier;
            zMultiplier2 = zMultiplier * zMultiplier;

            xMultiplier3 = xMultiplier2 * xMultiplier;
            yMultiplier3 = yMultiplier2 * yMultiplier;
            zMultiplier3 = zMultiplier2 * zMultiplier;

            func = x2 * xMultiplier2 + y2 * yMultiplier2 + z2 * zMultiplier2 - 1.0;

            // "denominator" here refers to the use of this expression in the velocity and acceleration
            // computations in the sections to follow.
            denominator = x2 * xMultiplier3 * oneOverRadiiSquaredX + y2 * yMultiplier3 * oneOverRadiiSquaredY + z2 * zMultiplier3 * oneOverRadiiSquaredZ;

            var derivative = -2.0 * denominator;

            correction = func / derivative;
        } while (Math.abs(func) > CesiumMath.EPSILON12);

        if (!defined(result)) {
            return new Cartesian3(positionX * xMultiplier, positionY * yMultiplier, positionZ * zMultiplier);
        }
        result.x = positionX * xMultiplier;
        result.y = positionY * yMultiplier;
        result.z = positionZ * zMultiplier;
        return result;
    };

    /**
     * Scales the provided Cartesian position along the geocentric surface normal
     * so that it is on the surface of this ellipsoid.
     *
     * @param {Cartesian3} cartesian The Cartesian position to scale.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
     */
    Ellipsoid.prototype.scaleToGeocentricSurface = function(cartesian, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(cartesian)) {
            throw new DeveloperError('cartesian is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new Cartesian3();
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
     * its components by the result of {@link Ellipsoid#oneOverRadii}.
     *
     * @param {Cartesian3} position The position to transform.
     * @param {Cartesian3} [result] The position to which to copy the result, or undefined to create and
     *        return a new instance.
     * @returns {Cartesian3} The position expressed in the scaled space.  The returned instance is the
     *          one passed as the result parameter if it is not undefined, or a new instance of it is.
     */
    Ellipsoid.prototype.transformPositionToScaledSpace = function(position, result) {
        if (!defined(result)) {
            result = new Cartesian3();
        }

        return Cartesian3.multiplyComponents(position, this._oneOverRadii, result);
    };

    /**
     * Transforms a Cartesian X, Y, Z position from the ellipsoid-scaled space by multiplying
     * its components by the result of {@link Ellipsoid#radii}.
     *
     * @param {Cartesian3} position The position to transform.
     * @param {Cartesian3} [result] The position to which to copy the result, or undefined to create and
     *        return a new instance.
     * @returns {Cartesian3} The position expressed in the unscaled space.  The returned instance is the
     *          one passed as the result parameter if it is not undefined, or a new instance of it is.
     */
    Ellipsoid.prototype.transformPositionFromScaledSpace = function(position, result) {
        if (!defined(result)) {
            result = new Cartesian3();
        }

        return Cartesian3.multiplyComponents(position, this._radii, result);
    };

    /**
     * Compares this Ellipsoid against the provided Ellipsoid componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Ellipsoid} [right] The other Ellipsoid.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    Ellipsoid.prototype.equals = function(right) {
        return (this === right) ||
               (defined(right) &&
                Cartesian3.equals(this._radii, right._radii));
    };

    /**
     * Creates a string representing this Ellipsoid in the format '(radii.x, radii.y, radii.z)'.
     *
     * @returns {String} A string representing this ellipsoid in the format '(radii.x, radii.y, radii.z)'.
     */
    Ellipsoid.prototype.toString = function() {
        return this._radii.toString();
    };

    return Ellipsoid;
});
