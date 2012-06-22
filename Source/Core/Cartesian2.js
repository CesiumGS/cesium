/*global define*/
define(function() {
    "use strict";

    /**
     * A 2D Cartesian point.
     * <br/>
     * If either <code>x</code> or <code>y</code> is undefined, then the corresponding
     * component will be initialized to 0.0.
     *
     * @name Cartesian2
     * @constructor
     *
     * @param {Number} x The x-coordinate for the Cartesian type.
     * @param {Number} y The y-coordinate for the Cartesian type.
     *
     * @see Cartesian3
     * @see Cartesian4
     */
    function Cartesian2(x, y) {

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see Cartesian2.y
         */
        this.x = (typeof x !== 'undefined') ? x : 0.0;

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see Cartesian2.x
         */
        this.y = (typeof y !== 'undefined') ? y : 0.0;
    }

    /**
     * Returns a duplicate of a Cartesian2.
     *
     * @param {Cartesian2} cartesian The cartesian to clone.
     * @return {Cartesian2} A new Cartesian2 instance.
     */
    Cartesian2.clone = function(cartesian) {
        return new Cartesian2(cartesian.x, cartesian.y);
    };

    /**
     * An immutable Cartesian2 instance initialized to (0.0, 0.0).
     *
     * @memberof Cartesian2
     */
    Cartesian2.ZERO = Object.freeze(new Cartesian2(0.0, 0.0));

    /**
     * An immutable Cartesian2 instance initialized to (1, 0).
     *
     * @memberof Cartesian2
     */
    Cartesian2.UNIT_X = Object.freeze(new Cartesian2(1.0, 0.0));

    /**
     * An immutable Cartesian2 instance initialized to (0.0, 1.0).
     *
     * @memberof Cartesian2
     */
    Cartesian2.UNIT_Y = Object.freeze(new Cartesian2(0.0, 1.0));

    /**
     * Returns the Cartesian's squared magnitude (length).
     *
     * @memberof Cartesian2
     * @return {Number} The squared magnitude.
     */
    Cartesian2.prototype.magnitudeSquared = function() {
        return this.x * this.x + this.y * this.y;
    };

    /**
     * Returns the Cartesian's magnitude (length).
     *
     * @memberof Cartesian2
     * @return {Number} The magnitude.
     */
    Cartesian2.prototype.magnitude = function() {
        return Math.sqrt(this.magnitudeSquared());
    };

    /**
     * Returns this Cartesian normalized.
     *
     * @memberof Cartesian2
     * @return {Cartesian2} The normalized Cartesian.
     */
    Cartesian2.prototype.normalize = function() {
        var magnitude = this.magnitude();
        return new Cartesian2(this.x / magnitude, this.y / magnitude);
    };

    /**
     * Returns the dot (scalar) product of two Cartesians.
     *
     * @memberof Cartesian2
     * @param {Cartesian2} other The Cartesian to dot with this.
     * @return {Number} The dot product.
     */
    Cartesian2.prototype.dot = function(other) {
        return this.x * other.x + this.y * other.y;
    };

    /**
     * Returns the componentwise sum of two Cartesians.
     *
     * @memberof Cartesian2
     * @param {Cartesian2} other The Cartesian to sum with this.
     * @return {Cartesian2} The sum of this and other.
     */
    Cartesian2.prototype.add = function(other) {
        return new Cartesian2(this.x + other.x, this.y + other.y);
    };

    /**
     * Returns the componentwise difference of two Cartesians.
     *
     * @memberof Cartesian2
     * @param {Cartesian2} other The Cartesian to subtract from this.
     * @return {Cartesian2} The difference of this and other.
     */
    Cartesian2.prototype.subtract = function(other) {
        return new Cartesian2(this.x - other.x, this.y - other.y);
    };

    /**
     * Returns this Cartesian scaled by a scalar.
     *
     * @memberof Cartesian2
     * @param {Number} scalar The scalar that is multiplied with this.
     * @return {Cartesian2} The scaled Cartesian.
     */
    Cartesian2.prototype.multiplyWithScalar = function(scalar) {
        return new Cartesian2(this.x * scalar, this.y * scalar);
    };

    /**
     * Returns this Cartesian divided by a scalar.
     *
     * @memberof Cartesian2
     * @param {Number} scalar The scalar to use for division.
     * @return {Cartesian2} This Cartesian after division.
     */
    Cartesian2.prototype.divideByScalar = function(scalar) {
        return new Cartesian2(this.x / scalar, this.y / scalar);
    };

    /**
     * Returns this Cartesian negated.
     *
     * @memberof Cartesian2
     * @return {Cartesian2} This Cartesian negated.
     */
    Cartesian2.prototype.negate = function() {
        return new Cartesian2(-this.x, -this.y);
    };

    /**
     * Returns a version of this Cartesian containing the absolute value of each component.
     *
     * @memberof Cartesian2
     * @return {Cartesian2} The absolute value of this Cartesian.
     */
    Cartesian2.prototype.abs = function() {
        return new Cartesian2(Math.abs(this.x), Math.abs(this.y));
    };

    /**
     * Returns a duplicate of a Cartesian2 instance.
     *
     * @memberof Cartesian2
     * @return {Cartesian2} A new copy of the Cartesian2 instance received as an argument.
     */
    Cartesian2.prototype.clone = function() {
        return new Cartesian2(this.x, this.y);
    };

    /**
     * Returns true if this Cartesian equals <code>other</code> componentwise.
     *
     * @memberof Cartesian2
     * @param {Cartesian2} other The Cartesian to compare for equality.
     * @return {Boolean} <code>true</code> if the Cartesians are equal componentwise; otherwise, <code>false</code>.
     */
    Cartesian2.prototype.equals = function(other) {
        return (this.x === other.x) && (this.y === other.y);
    };

    /**
     * Returns <code>true</code> if this Cartesian equals other componentwise
     * within the specified epsilon.
     *
     * @memberof Cartesian2
     *
     * @param {Cartesian2} other The Cartesian to compare for equality.
     * @param {Number} [epsilon=0.0] The epsilon to use for equality testing.
     *
     * @return {Boolean} <code>true</code> if the Cartesians are equal within the specified epsilon; otherwise, <code>false</code>.
     */
    Cartesian2.prototype.equalsEpsilon = function(other, epsilon) {
        epsilon = epsilon || 0.0;
        return (Math.abs(this.x - other.x) <= epsilon) && (Math.abs(this.y - other.y) <= epsilon);
    };

    /**
     * Returns a string representing this instance in the format (x, y).
     *
     * @memberof Cartesian2
     * @return {String} A string representing this instance.
     */
    Cartesian2.prototype.toString = function() {
        return '(' + this.x + ', ' + this.y + ')';
    };

    return Cartesian2;
});
