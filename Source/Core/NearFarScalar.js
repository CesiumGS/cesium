/*global define*/
define([
        './defaultValue',
        './defined',
        './DeveloperError'
    ], function(
        defaultValue,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * Represents a scalar value's lower and upper bound at a near distance and far distance in eye space.
     * @alias NearFarScalar
     * @constructor
     *
     * @param {Number} [near=0.0] The lower bound of the camera range.
     * @param {Number} [nearValue=0.0] The value at the lower bound of the camera range.
     * @param {Number} [far=0.0] The upper bound of the camera range.
     * @param {Number} [farValue=0.0] The value at the upper bound of the camera range.
     */
    var NearFarScalar = function(near, nearValue, far, farValue) {
        /**
         * The lower bound of the camera range.
         * @type {Number}
         * @default 0.0
         */
        this.near = defaultValue(near, 0.0);
        /**
         * The value at the lower bound of the camera range.
         * @type {Number}
         * @default 0.0
         */
        this.nearValue = defaultValue(nearValue, 0.0);
        /**
         * The upper bound of the camera range.
         * @type {Number}
         * @default 1.0
         */
        this.far = defaultValue(far, 1.0);
        /**
         * The value at the upper bound of the camera range.
         * @type {Number}
         * @default 1.0
         */
        this.farValue = defaultValue(farValue, 0.0);
    };

    /**
     * Duplicates a NearFarScalar instance.
     * @memberof NearFarScalar
     *
     * @param {NearFarScalar} nearFarScalar The NearFarScalar to duplicate.
     * @param {NearFarScalar} [result] The object onto which to store the result.
     * @return {NearFarScalar} The modified result parameter or a new NearFarScalar instance if one was not provided. (Returns undefined if nearFarScalar is undefined)
     */
    NearFarScalar.clone = function(nearFarScalar, result) {
        if (!defined(nearFarScalar)) {
            return undefined;
        }

        if (!defined(result)) {
            return new NearFarScalar(nearFarScalar.near,
                                     nearFarScalar.nearValue,
                                     nearFarScalar.far,
                                     nearFarScalar.farValue);
        }

        result.near = nearFarScalar.near;
        result.nearValue = nearFarScalar.nearValue;
        result.far = nearFarScalar.far;
        result.farValue = nearFarScalar.farValue;
        return result;
    };

    /**
     * Compares the provided NearFarScalar and returns <code>true</code> if they are equal,
     * <code>false</code> otherwise.
     * @memberof NearFarScalar
     *
     * @param {NearFarScalar} [left] The first Extent.
     * @param {NearFarScalar} [right] The second Extent.
     *
     * @return {Boolean} <code>true</code> if left and right are equal; otherwise <code>false</code>.
     */
    NearFarScalar.equals = function(left, right) {
        return (left === right) ||
               ((defined(left)) &&
                (defined(right)) &&
                (left.near === right.near) &&
                (left.nearValue === right.nearValue) &&
                (left.far === right.far) &&
                (left.farValue === right.farValue));
    };

    /**
     * Duplicates this NearFarScalar instance.
     * @memberof NearFarScalar
     *
     * @param {NearFarScalar} [result] The object onto which to store the result.
     * @return {NearFarScalar} The modified result parameter or a new NearFarScalar instance if one was not provided.
     */
    NearFarScalar.prototype.clone = function(result) {
        return NearFarScalar.clone(this, result);
    };

    /**
     * Compares this NearFarScalar against the provided NearFarScalar componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof NearFarScalar
     *
     * @param {NearFarScalar} [right] The right hand side NearFarScalar.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    NearFarScalar.prototype.equals = function(right) {
        return NearFarScalar.equals(this, right);
    };

    return NearFarScalar;
});
