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
     * @param {Number} [nearDistance=0.0] The lower bound of the camera range.
     * @param {Number} [nearValue=0.0] The value at the lower bound of the camera range.
     * @param {Number} [farDistance=0.0] The upper bound of the camera range.
     * @param {Number} [farValue=0.0] The value at the upper bound of the camera range.
     */
    var NearFarScalar = function(nearDistance, nearValue, farDistance, farValue) {
        /**
         * The lower bound of the camera range.
         * @type {Number}
         * @default 0.0
         */
        this.nearDistance = defaultValue(nearDistance, 0.0);
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
        this.farDistance = defaultValue(farDistance, 1.0);
        /**
         * The value at the upper bound of the camera range.
         * @type {Number}
         * @default 1.0
         */
        this.farValue = defaultValue(farValue, 0.0);
    };


    /**
     * Creates a NearFarScalar from four consecutive elements in an array.
     * @memberof NearFarScalar
     *
     * @param {Array} values The array whose four consecutive elements correspond to the nearDistance, nearValue, farDistance, farValue components, respectively.
     * @param {Number} [offset=0] The offset into the array of the first element, which corresponds to the nearDistance component.
     * @param {NearFarScalar} [result] The object onto which to store the result.
     *
     * @return {NearFarScalar} The modified result parameter or a new NearFarScalar instance if one was not provided.
     *
     * @exception {DeveloperError} values is required.
     * @exception {DeveloperError} offset + 4 is greater than the length of the array.
     *
     * @example
     * // Create a NearFarScalar with (1.0e4, 2.0, 1.0e7, 0.0)
     * var v = [1.0e4, 2.0, 1.0e7, 0.0];
     * var nearFarScale = NearFarScalar.fromArray(v);
     *
     * // Create a NearFarScalar.fromArray with (1.0e4, 2.0, 1.0e7, 0.0) using an offset into an array
     * var v2 = [0.0, 0.0, 0.0, 0.0, 1.0e4, 2.0, 1.0e7, 0.0];
     * var nearFarScale = NearFarScalar.fromArray.fromArray(v2, 4);
     */
    NearFarScalar.fromArray = function(values, offset, result) {
        if (!defined(values)) {
            throw new DeveloperError('values is required.');
        }

        if (offset + 4 > values.length) {
            throw new DeveloperError('offset + 4 is greater than the length of the array.');
        }

        offset = defaultValue(offset, 0);

        if (!defined(result)) {
            result = new NearFarScalar();
        }

        result.nearDistance = values[offset + 0];
        result.nearValue = values[offset + 1];
        result.farDistance = values[offset + 2];
        result.farValue = values[offset + 3];
        return result;
    };

    /**
     * Creates a NearFarScalar instance from nearDistance, nearValue, farDistance, farValue values.
     * @memberof NearFarScalar
     *
     * @param {Number} The lower bound of the camera range.
     * @param {Number} The value at the lower bound of the camera range.
     * @param {Number} The upper bound of the camera range.
     * @param {Number} The value at the upper bound of the camera range.
     * @param {NearFarScalar} [result] The object onto which to store the result.
     * @return {NearFarScalar} The modified result parameter or a new NearFarScalar instance if one was not provided.
     */
    NearFarScalar.fromElements = function(nearDistance, nearValue, farDistance, farValue, result) {
        if (!defined(result)) {
            return new NearFarScalar(nearDistance, nearValue, farDistance, farValue);
        }

        result.nearDistance = nearDistance;
        result.nearValue = nearValue;
        result.farDistance = farDistance;
        result.farValue = farValue;
        return result;
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
            return new NearFarScalar(nearFarScalar.nearDistance,
                                     nearFarScalar.nearValue,
                                     nearFarScalar.farDistance,
                                     nearFarScalar.farValue);
        }

        result.nearDistance = nearFarScalar.nearDistance;
        result.nearValue = nearFarScalar.nearValue;
        result.farDistance = nearFarScalar.farDistance;
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
                (left.nearDistance === right.nearDistance) &&
                (left.nearValue === right.nearValue) &&
                (left.farDistance === right.farDistance) &&
                (left.farValue === right.farValue));
    };

    /**
     * Compares the provided NearFarScalar with this NearFarScalar componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     * @memberof NearFarScalar
     *
     * @param {Extent} [other] The NearFarScalar to compare.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if the NearFarScalar are within the provided epsilon, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    NearFarScalar.equalsEpsilon = function(left, right, epsilon) {
        if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon is required and must be a number.');
        }
        return defined(left) &&
               defined(right) &&
               (Math.abs(left.nearDistance - right.nearDistance) <= epsilon) &&
               (Math.abs(left.nearValue - right.nearValue) <= epsilon) &&
               (Math.abs(left.farDistance - right.farDistance) <= epsilon) &&
               (Math.abs(left.farValue - right.farValue) <= epsilon);
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

    /**
     * Compares this NearFarScalar against the provided NearFarScalar componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     * @memberof NearFarScalar
     *
     * @param {NearFarScalar} [right] The right hand side NearFarScalar.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    NearFarScalar.prototype.equalsEpsilon = function(right, epsilon) {
        return NearFarScalar.equalsEpsilon(this, right, epsilon);
    };

    return NearFarScalar;
});
