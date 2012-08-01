/*global define*/
define(['./DeveloperError'
       ], function(
        DeveloperError) {
    "use strict";

    /**
     * A 4D Cartesian point.
     * @alias Cartesian4
     * @constructor
     *
     * @param {Number} [x=0.0] The X component.
     * @param {Number} [y=0.0] The Y component.
     * @param {Number} [z=0.0] The Z component.
     * @param {Number} [w=0.0] The W component.
     *
     * @see Cartesian2
     * @see Cartesian3
     */
    var Cartesian4 = function(x, y, z, w) {

        /**
         * The X component.
         * @type Number
         */
        this.x = (typeof x !== 'undefined') ? x : 0.0;

        /**
         * The Y component.
         * @type Number
         */
        this.y = (typeof y !== 'undefined') ? y : 0.0;

        /**
         * The Z component.
         * @type Number
         */
        this.z = (typeof z !== 'undefined') ? z : 0.0;

        /**
         * The W component.
         * @type Number
         */
        this.w = (typeof w !== 'undefined') ? w : 0.0;
    };

    /**
     * Duplicates a Cartesian4 instance.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} cartesian The Cartesian to duplicate.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Cartesian4.clone = function(cartesian, result) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }

        if (typeof result === 'undefined') {
            return new Cartesian4(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
        }

        result.x = cartesian.x;
        result.y = cartesian.y;
        result.z = cartesian.z;
        result.w = cartesian.w;
        return result;
    };

    /**
     * Computes the value of the maximum component for the supplied Cartesian.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} The cartesian to use.
     * @return {Number} The value of the maximum component.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Cartesian4.getMaximumComponent = function(cartesian) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        return Math.max(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
    };

    /**
     * Computes the value of the minimum component for the supplied Cartesian.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} The cartesian to use.
     * @return {Number} The value of the minimum component.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Cartesian4.getMinimumComponent = function(cartesian) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        return Math.min(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
    };

    /**
     * Computes the provided Cartesian's squared magnitude.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} cartesian The Cartesian instance whose squared magnitude is to be computed.
     * @return {Number} The squared magnitude.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Cartesian4.magnitudeSquared = function(cartesian) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        return cartesian.x * cartesian.x + cartesian.y * cartesian.y + cartesian.z * cartesian.z+ cartesian.w * cartesian.w;
    };

    /**
     * Computes the Cartesian's magnitude (length).
     * @memberof Cartesian4
     *
     * @param {Cartesian4} cartesian The Cartesian instance whose magnitude is to be computed.
     * @return {Number} The magnitude.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Cartesian4.magnitude = function(cartesian) {
        return Math.sqrt(Cartesian4.magnitudeSquared(cartesian));
    };

    /**
     * Computes the normalized form of the supplied Cartesian.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} cartesian The Cartesian to be normalized.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Cartesian4.normalize = function(cartesian, result) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        var magnitude = Cartesian4.magnitude(cartesian);
        if (typeof result === 'undefined') {
            return new Cartesian4(cartesian.x / magnitude, cartesian.y / magnitude, cartesian.z / magnitude, cartesian.w / magnitude);
        }
        result.x = cartesian.x / magnitude;
        result.y = cartesian.y / magnitude;
        result.z = cartesian.z / magnitude;
        result.w = cartesian.w / magnitude;
        return result;
    };

    /**
     * Computes the dot (scalar) product of two Cartesians.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} left The first Cartesian.
     * @param {Cartesian4} right The second Cartesian.
     * @return {Number} The dot product.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     */
    Cartesian4.dot = function(left, right) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required');
        }
        return left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w;
    };

    /**
     * Computes the componentwise product of two Cartesians.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} left The first Cartesian.
     * @param {Cartesian4} right The second Cartesian.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     */
    Cartesian4.multiplyComponents = function(left, right, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required');
        }
        if (typeof result === 'undefined') {
            return new Cartesian4(left.x * right.x, left.y * right.y, left.z * right.z, left.w * right.w);
        }
        result.x = left.x * right.x;
        result.y = left.y * right.y;
        result.z = left.z * right.z;
        result.w = left.w * right.w;
        return result;
    };

    /**
     * Computes the componentwise sum of two Cartesians.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} left The first Cartesian.
     * @param {Cartesian4} right The second Cartesian.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     */
    Cartesian4.add = function(left, right, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required');
        }
        if (typeof result === 'undefined') {
            return new Cartesian4(left.x + right.x, left.y + right.y, left.z + right.z, left.w + right.w);
        }
        result.x = left.x + right.x;
        result.y = left.y + right.y;
        result.z = left.z + right.z;
        result.w = left.w + right.w;
        return result;
    };

    /**
     * Computes the componentwise difference of two Cartesians.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} left The first Cartesian.
     * @param {Cartesian4} right The second Cartesian.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     */
    Cartesian4.subtract = function(left, right, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required');
        }
        if (typeof result === 'undefined') {
            return new Cartesian4(left.x - right.x, left.y - right.y, left.z - right.z, left.w - right.w);
        }
        result.x = left.x - right.x;
        result.y = left.y - right.y;
        result.z = left.z - right.z;
        result.w = left.w - right.w;
        return result;
    };

    /**
     * Multiplies the provided Cartesian componentwise by the provided scalar.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} cartesian The Cartesian to be scaled.
     * @param {Number} scalar The scalar to multiply with.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Cartesian4.multiplyByScalar = function(cartesian, scalar, result) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number.');
        }
        if (typeof result === 'undefined') {
            return new Cartesian4(cartesian.x * scalar,  cartesian.y * scalar, cartesian.z * scalar, cartesian.w * scalar);
        }
        result.x = cartesian.x * scalar;
        result.y = cartesian.y * scalar;
        result.z = cartesian.z * scalar;
        result.w = cartesian.w * scalar;
        return result;
    };

    /**
     * Divides the provided Cartesian componentwise by the provided scalar.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} cartesian The Cartesian to be divided.
     * @param {Number} scalar The scalar to divide by.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Cartesian4.divideByScalar = function(cartesian, scalar, result) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number.');
        }
        if (typeof result === 'undefined') {
            return new Cartesian4(cartesian.x / scalar, cartesian.y / scalar, cartesian.z / scalar, cartesian.w / scalar);
        }
        result.x = cartesian.x / scalar;
        result.y = cartesian.y / scalar;
        result.z = cartesian.z / scalar;
        result.w = cartesian.w / scalar;
        return result;
    };

    /**
     * Negates the provided Cartesian.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} cartesian The Cartesian to be negated.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Cartesian4.negate = function(cartesian, result) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof result === 'undefined') {
            return new Cartesian4(-cartesian.x, -cartesian.y, -cartesian.z, -cartesian.w);
        }
        result.x = -cartesian.x;
        result.y = -cartesian.y;
        result.z = -cartesian.z;
        result.w = -cartesian.w;
        return result;
    };

    /**
     * Computes the absolute value of the provided Cartesian.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} cartesian The Cartesian whose absolute value is to be computed.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Cartesian4.abs = function(cartesian, result) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof result === 'undefined') {
            return new Cartesian4(Math.abs(cartesian.x), Math.abs(cartesian.y), Math.abs(cartesian.z), Math.abs(cartesian.w));
        }
        result.x = Math.abs(cartesian.x);
        result.y = Math.abs(cartesian.y);
        result.z = Math.abs(cartesian.z);
        result.w = Math.abs(cartesian.w);
        return result;
    };

    var lerpScratch = new Cartesian4();
    /**
     * Computes the linear interpolation or extrapolation at t using the provided cartesians.
     * @memberof Cartesian4
     *
     * @param start The value corresponding to t at 0.0.
     * @param end The value corresponding to t at 1.0.
     * @param t The point along t at which to interpolate.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} start is required.
     * @exception {DeveloperError} end is required.
     * @exception {DeveloperError} t is required and must be a number.
     */
    Cartesian4.lerp = function(start, end, t, result) {
        if (typeof start === 'undefined') {
            throw new DeveloperError('start is required.');
        }
        if (typeof end === 'undefined') {
            throw new DeveloperError('end is required.');
        }
        if (typeof t !== 'number') {
            throw new DeveloperError('t is required and must be a number.');
        }
        Cartesian4.multiplyByScalar(end, t, lerpScratch);
        result = Cartesian4.multiplyByScalar(start, 1.0 - t, result);
        return Cartesian4.add(lerpScratch, result, result);
    };

    /**
     * Compares the provided Cartesians componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} [left] The first Cartesian.
     * @param {Cartesian4} [right] The second Cartesian.
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Cartesian4.equals = function(left, right) {
        return (left === right) ||
               ((typeof left !== 'undefined') &&
                (typeof right !== 'undefined') &&
                (left.x === right.x) &&
                (left.y === right.y) &&
                (left.z === right.z) &&
                (left.w === right.w));
    };

    /**
     * Compares the provided Cartesians componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} [left] The first Cartesian.
     * @param {Cartesian4} [right] The second Cartesian.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    Cartesian4.equalsEpsilon = function(left, right, epsilon) {
        if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon is required and must be a number.');
        }
        return (left === right) ||
               ((typeof left !== 'undefined') &&
                (typeof right !== 'undefined') &&
                (Math.abs(left.x - right.x) <= epsilon) &&
                (Math.abs(left.y - right.y) <= epsilon) &&
                (Math.abs(left.z - right.z) <= epsilon) &&
                (Math.abs(left.w - right.w) <= epsilon));
    };

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 0.0).
     * @memberof Cartesian4
     */
    Cartesian4.ZERO = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 0.0));

    /**
     * An immutable Cartesian4 instance initialized to (1.0, 0.0, 0.0, 0.0).
     * @memberof Cartesian4
     */
    Cartesian4.UNIT_X = Object.freeze(new Cartesian4(1.0, 0.0, 0.0, 0.0));

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 1.0, 0.0, 0.0).
     * @memberof Cartesian4
     */
    Cartesian4.UNIT_Y = Object.freeze(new Cartesian4(0.0, 1.0, 0.0, 0.0));

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 0.0, 1.0, 0.0).
     * @memberof Cartesian4
     */
    Cartesian4.UNIT_Z = Object.freeze(new Cartesian4(0.0, 0.0, 1.0, 0.0));

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 1.0).
     * @memberof Cartesian4
     */
    Cartesian4.UNIT_W = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 1.0));

    /**
     * Computes the value of the maximum component for this Cartesian.
     * @memberof Cartesian4
     *
     * @return {Number} The value of the maximum component.
     */
    Cartesian4.prototype.getMaximumComponent = function() {
        return Cartesian4.getMaximumComponent(this);
    };

    /**
     * Computes the value of the minimum component for this Cartesian.
     * @memberof Cartesian4
     *
     * @return {Number} The value of the minimum component.
     */
    Cartesian4.prototype.getMinimumComponent = function() {
        return Cartesian4.getMinimumComponent(this);
    };

    /**
     * Duplicates this Cartesian4 instance.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     */
    Cartesian4.prototype.clone = function(result) {
        return Cartesian4.clone(this, result);
    };

    /**
     * Computes this Cartesian's squared magnitude.
     * @memberof Cartesian4
     *
     * @return {Number} The squared magnitude.
     */
    Cartesian4.prototype.magnitudeSquared = function() {
        return Cartesian4.magnitudeSquared(this);
    };

    /**
     * Computes this Cartesian's magnitude (length).
     * @memberof Cartesian4
     *
     * @return {Number} The magnitude.
     */
    Cartesian4.prototype.magnitude = function() {
        return Cartesian4.magnitude(this);
    };

    /**
     * Computes the normalized form of this Cartesian.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     */
    Cartesian4.prototype.normalize = function(result) {
        return Cartesian4.normalize(this, result);
    };

    /**
     * Computes the dot (scalar) product of this Cartesian and a supplied cartesian.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} right The right hand side Cartesian.
     * @return {Number} The dot product.
     *
     * @exception {DeveloperError} right is required.
     */
    Cartesian4.prototype.dot = function(right) {
        return Cartesian4.dot(this, right);
    };

    /**
     * Computes the componentwise product of this Cartesian and the provided Cartesian.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} right The right hand side Cartesian.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} right is required.
     */
    Cartesian4.prototype.multiplyComponents = function(right, result) {
        return Cartesian4.multiplyComponents(this, right, result);
    };

    /**
     * Computes the componentwise sum of this Cartesian and the provided Cartesian.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} right The right hand side Cartesian.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} right is required.
     */
    Cartesian4.prototype.add = function(right, result) {
        return Cartesian4.add(this, right, result);
    };

    /**
     * Computes the componentwise difference of this Cartesian and the provided Cartesian.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} right The right hand side Cartesian.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} right is required.
     */
    Cartesian4.prototype.subtract = function(right, result) {
        return Cartesian4.subtract(this, right, result);
    };

    /**
     * Multiplies this Cartesian componentwise by the provided scalar.
     * @memberof Cartesian4
     *
     * @param {Number} scalar The scalar to multiply with.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Cartesian4.prototype.multiplyByScalar = function(scalar, result) {
        return Cartesian4.multiplyByScalar(this, scalar, result);
    };

    /**
     * Divides this Cartesian componentwise by the provided scalar.
     * @memberof Cartesian4
     *
     * @param {Number} scalar The scalar to divide by.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Cartesian4.prototype.divideByScalar = function(scalar, result) {
        return Cartesian4.divideByScalar(this, scalar, result);
    };

    /**
     * Negates this Cartesian.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     */
    Cartesian4.prototype.negate = function(result) {
        return Cartesian4.negate(this, result);
    };

    /**
     * Computes the absolute value of this Cartesian.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     */
    Cartesian4.prototype.abs = function(result) {
        return Cartesian4.abs(this, result);
    };

    /**
     * Computes the linear interpolation or extrapolation at t using this Cartesian
     * and the provided cartesian.  This cartesian is assumed to be t at 0.0.
     * @memberof Cartesian4
     *
     * @param end The value corresponding to t at 1.0.
     * @param t The point along t at which to interpolate.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if none was provided.
     *
     * @exception {DeveloperError} end is required.
     * @exception {DeveloperError} t is required and must be a number.
     */
    Cartesian4.prototype.lerp = function(end, t, result) {
        return Cartesian4.lerp(this, end, t, result);
    };

    /**
     * Compares this Cartesian against the provided Cartesian componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} [right] The right hand side Cartesian.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    Cartesian4.prototype.equals = function(right) {
        return Cartesian4.equals(this, right);
    };

    /**
     * Compares this Cartesian against the provided Cartesian componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     * @memberof Cartesian4
     *
     * @param {Cartesian4} [right] The right hand side Cartesian.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    Cartesian4.prototype.equalsEpsilon = function(right, epsilon) {
        return Cartesian4.equalsEpsilon(this, right, epsilon);
    };

    /**
     * Creates a string representing this Cartesian in the format '(x, y)'.
     * @memberof Cartesian4
     *
     * @return {String} A string representing the provided Cartesian in the format '(x, y)'.
     */
    Cartesian4.prototype.toString = function() {
        return '(' + this.x + ', ' + this.y + ', ' + this.z + ', ' + this.w + ')';
    };

    return Cartesian4;
});
