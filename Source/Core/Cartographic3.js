/*global define*/
define([
        './DeveloperError'
       ], function(
         DeveloperError) {
    "use strict";

    /**
     * A position defined by latitude, longitude, and height.
     * @alias Cartographic3
     * @constructor
     *
     * @param {Number} [longitude=0.0] The longitude, in radians.
     * @param {Number} [latitude=0.0] The latitude, in radians.
     * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
     */
    var Cartographic3 = function(longitude, latitude, height) {
        /**
         * The longitude, in radians.
         * @type Number
         */
        this.longitude = typeof longitude === 'undefined' ? 0.0 : longitude;

        /**
         * The latitude, in radians.
         * @type Number
         */
        this.latitude = typeof latitude === 'undefined' ? 0.0 : latitude;

        /**
         * The height, in meters, above the ellipsoid.
         * @type Number
         */
        this.height = typeof height === 'undefined' ? 0.0 : height;
    };

    /**
     * Duplicates a Cartographic3 instance.
     * @memberof Cartographic3
     *
     * @param {Cartographic3} cartographic The cartographic to duplicate.
     * @param {Cartographic3} [result] The object onto which to store the result.
     * @return {Cartographic3} The modified result parameter or a new Cartographic3 instance if none was provided.
     *
     * @exception {DeveloperError} cartographic is required.
     */
    Cartographic3.clone = function(cartographic, result) {
        if (typeof cartographic === 'undefined') {
            throw new DeveloperError('cartographic is required');
        }
        if (typeof result === 'undefined') {
            return new Cartographic3(cartographic.longitude, cartographic.latitude, cartographic.height);
        }
        result.longitude = cartographic.longitude;
        result.latitude = cartographic.latitude;
        result.height = cartographic.height;
        return result;
    };

    /**
     * Compares the provided cartographics componentwise and returns
     * <code>true/code> if they are equal, <code>false/code> otherwise.
     * @memberof Cartographic3
     *
     * @param {Cartographic3} [left] The first cartographic.
     * @param {Cartographic3} [right] The second cartographic.
     * @return {Boolean} <code>true/code> if left and right are equal, <code>false/code> otherwise.
     */
    Cartographic3.equals = function(left, right) {
        return (left === right) ||
                ((typeof left !== 'undefined') &&
                 (typeof right !== 'undefined') &&
                 (left.longitude === right.longitude) &&
                 (left.latitude === right.latitude) &&
                 (left.height === right.height));
    };

    /**
     * Compares the provided cartographics componentwise and returns
     * <code>true/code> if they are within the provided epsilon,
     * <code>false/code> otherwise.
     * @memberof Cartographic3
     *
     * @param {Cartographic3} [left] The first cartographic.
     * @param {Cartographic3} [right] The second cartographic.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true/code> if left and right are within the provided epsilon, <code>false/code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    Cartographic3.equalsEpsilon = function(left, right, epsilon) {
        if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon is required and must be a number.');
        }
        return (left === right) ||
               ((typeof left !== 'undefined') &&
                (typeof right !== 'undefined') &&
                (Math.abs(left.longitude - right.longitude) <= epsilon) &&
                (Math.abs(left.latitude - right.latitude) <= epsilon) &&
                (Math.abs(left.height - right.height) <= epsilon));
    };

    /**
     * Creates a string representing the provided cartographic in the format '(longitude, latitude, height)'.
     * @memberof Cartographic3
     *
     * @param {Cartographic3} cartographic The cartographic to stringify.
     * @return {String} A string representing the provided cartographic in the format '(longitude, latitude, height)'.
     *
     * @exception {DeveloperError} cartographic is required.
     */
    Cartographic3.toString = function(cartographic) {
        if (typeof cartographic === 'undefined') {
            throw new DeveloperError('cartographic is required');
        }
        return '(' + cartographic.longitude + ', ' + cartographic.latitude + ', ' + cartographic.height + ')';
    };

    /**
     * An immutable Cartographic3 instance initialized to (0.0, 0.0, 0.0).
     *
     * @memberof Cartographic3
     */
    Cartographic3.ZERO = Object.freeze(new Cartographic3(0.0, 0.0, 0.0));

    /**
     * Duplicates this instance.
     * @memberof Cartographic3
     *
     * @param {Cartographic3} [result] The object onto which to store the result.
     * @return {Cartographic3} The modified result parameter or a new Cartographic3 instance if none was provided.
     */
    Cartographic3.prototype.clone = function(result) {
        return Cartographic3.clone(this, result);
    };

    /**
     * Compares the provided against this cartographic componentwise and returns
     * <code>true/code> if they are equal, <code>false/code> otherwise.
     * @memberof Cartographic3
     *
     * @param {Cartographic3} [right] The second cartographic.
     * @return {Boolean} <code>true/code> if left and right are equal, <code>false/code> otherwise.
     */
    Cartographic3.prototype.equals = function(right) {
        return Cartographic3.equals(this, right);
    };

    /**
     * Compares the provided against this cartographic componentwise and returns
     * <code>true/code> if they are within the provided epsilon,
     * <code>false/code> otherwise.
     * @memberof Cartographic3
     *
     * @param {Cartographic3} [right] The second cartographic.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true/code> if left and right are within the provided epsilon, <code>false/code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    Cartographic3.prototype.equalsEpsilon = function(right, epsilon) {
        return Cartographic3.equalsEpsilon(this, right, epsilon);
    };

    /**
     * Creates a string representing this cartographic in the format '(longitude, latitude, height)'.
     * @memberof Cartographic3
     *
     * @return {String} A string representing the provided cartographic in the format '(longitude, latitude, height)'.
     */
    Cartographic3.prototype.toString = function() {
        return Cartographic3.toString(this);
    };

    return Cartographic3;
});
