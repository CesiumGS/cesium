/*global define*/
define([
        './Cartesian2',
        './Cartesian3'
    ], function(
        Cartesian2,
        Cartesian3) {
    "use strict";

    /**
     * A 4D Cartesian point.
     * <p>
     * When called with no arguments, the Cartesian is initialized to (0, 0, 0, 0).
     * When called with one numeric argument, f, the Cartesian is initialized to (f, f, f, f).
     * When called with one Cartesian3 argument, v, and one numeric argument, w, the Cartesian is initialized to (v.x, v.y, v.z, w).
     * When called with one Cartesian2 argument, v, and two numeric arguments, z and w, the Cartesian is initialized to (v.x, v.y, z, w).
     * When called with four numeric arguments; x, y, z, and w; the Cartesian is initialized to (x, y, z, w).
     * </p>
     *
     * @name Cartesian4
     * @constructor
     *
     * @param {Number} x The x-coordinate for the Cartesian type.
     * @param {Number} y The y-coordinate for the Cartesian type.
     * @param {Number} z The z-coordinate for the Cartesian type.
     * @param {Number} w The w-coordinate for the Cartesian type.
     *
     * @see Cartesian2
     * @see Cartesian3
     */
    function Cartesian4(x, y, z, w) {

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see Cartesian4.y
         * @see Cartesian4.z
         * @see Cartesian4.w
         */
        this.x = (typeof x !== 'undefined') ? x : 0.0;

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see Cartesian4.x
         * @see Cartesian4.z
         * @see Cartesian4.w
         */
        this.y = (typeof y !== 'undefined') ? y : 0.0;

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see Cartesian4.x
         * @see Cartesian4.y
         * @see Cartesian4.w
         */
        this.z = (typeof z !== 'undefined') ? z : 0.0;

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see Cartesian4.x
         * @see Cartesian4.y
         * @see Cartesian4.z
         */
        this.w = (typeof w !== 'undefined') ? w : 0.0;
    }

    /**
     * Returns a duplicate of a Cartesian4.
     *
     * @param {Cartesian4} cartesian The cartesian to clone.
     * @return {Cartesian4} A new Cartesian4 instance.
     */
    Cartesian4.clone = function(cartesian) {
        return new Cartesian4(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
    };

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 0.0).
     *
     * @memberof Cartesian4
     */
    Cartesian4.ZERO = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 0.0));

    /**
     * An immutable Cartesian4 instance initialized to (1.0, 0.0, 0.0, 0.0).
     *
     * @memberof Cartesian4
     */
    Cartesian4.UNIT_X = Object.freeze(new Cartesian4(1.0, 0.0, 0.0, 0.0));

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 1.0, 0.0, 0.0).
     *
     * @memberof Cartesian4
     */
    Cartesian4.UNIT_Y = Object.freeze(new Cartesian4(0.0, 1.0, 0.0, 0.0));

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 0.0, 1.0, 0.0).
     *
     * @memberof Cartesian4
     */
    Cartesian4.UNIT_Z = Object.freeze(new Cartesian4(0.0, 0.0, 1.0, 0.0));

    /**
     * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 1.0).
     *
     * @memberof Cartesian4
     */
    Cartesian4.UNIT_W = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 1.0));

    /**
     * Returns the Cartesian's x and y components as a Cartesian2.
     *
     * @memberof Cartesian4
     * @return {Cartesian2} The Cartesian's x and y components.
     * @see Cartesian2
     */
    Cartesian4.prototype.getXY = function() {
        return new Cartesian2(this.x, this.y);
    };

    /**
     * Returns the Cartesian's x, y, and z components as a Cartesian3.
     *
     * @memberof Cartesian4
     * @return {Cartesian3} The Cartesian's x, y, and z components.
     * @see Cartesian2
     */
    Cartesian4.prototype.getXYZ = function() {
        return new Cartesian3(this.x, this.y, this.z);
    };

    /**
     * Returns the Cartesian's squared magnitude (length).
     *
     * @memberof Cartesian4
     * @return {Number} The squared magnitude.
     */
    Cartesian4.prototype.magnitudeSquared = function() {
        return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    };

    /**
     * Returns the Cartesian's magnitude (length).
     *
     * @memberof Cartesian4
     * @return {Number} The magnitude.
     */
    Cartesian4.prototype.magnitude = function() {
        return Math.sqrt(this.magnitudeSquared());
    };

    /**
     * Returns this Cartesian normalized.
     *
     * @memberof Cartesian4
     * @return {Cartesian4} The normalized Cartesian.
     */
    Cartesian4.prototype.normalize = function() {
        var magnitude = this.magnitude();
        return new Cartesian4(this.x / magnitude, this.y / magnitude, this.z / magnitude, this.w / magnitude);
    };

    /**
     * Returns the dot (scalar) product of two Cartesians.
     *
     * @memberof Cartesian4
     * @param {Cartesian4} other The Cartesian to dot with this.
     * @return {Number} The dot product.
     */
    Cartesian4.prototype.dot = function(other) {
        return this.x * other.x + this.y * other.y + this.z * other.z + this.w * other.w;
    };

    /**
     * Returns the componentwise sum of two Cartesians.
     *
     * @memberof Cartesian4
     * @param {Cartesian4} other The Cartesian to sum with this.
     * @return {Cartesian4} The sum of this and other.
     */
    Cartesian4.prototype.add = function(other) {
        return new Cartesian4(this.x + other.x, this.y + other.y, this.z + other.z, this.w + other.w);
    };

    /**
     * Returns the componentwise difference of two Cartesians.
     *
     * @memberof Cartesian4
     * @param {Cartesian4} other The Cartesian to subtract from this.
     * @return {Cartesian4} The difference of this and other.
     */
    Cartesian4.prototype.subtract = function(other) {
        return new Cartesian4(this.x - other.x, this.y - other.y, this.z - other.z, this.w - other.w);
    };

    /**
     * Returns this Cartesian scaled by a scalar.
     *
     * @memberof Cartesian4
     * @param {Number} scalar The scalar that is multiplied with this.
     * @return {Cartesian4} The scaled Cartesian.
     */
    Cartesian4.prototype.multiplyWithScalar = function(scalar) {
        return new Cartesian4(this.x * scalar, this.y * scalar, this.z * scalar, this.w * scalar);
    };

    /**
     * Returns this Cartesian scaled by another Cartesian componentwise.
     *
     * @memberof Cartesian4
     * @param {Cartesian4} Cartesian The Cartesian that is multiplied with this componentwise.
     * @return {Cartesian4} The scaled Cartesian.
     */
    Cartesian4.prototype.multiplyComponents = function(Cartesian) {
        return new Cartesian4(this.x * Cartesian.x, this.y * Cartesian.y, this.z * Cartesian.z, this.w * Cartesian.w);
    };

    /**
     * Returns this Cartesian divided by a scalar.
     *
     * @memberof Cartesian4
     * @param {Number} scalar The scalar to use for division.
     * @return {Cartesian4} This Cartesian after division.
     */
    Cartesian4.prototype.divideByScalar = function(scalar) {
        return new Cartesian4(this.x / scalar, this.y / scalar, this.z / scalar, this.w / scalar);
    };

    /**
     * Returns the value of the maximum component.
     *
     * @memberof Cartesian4
     * @return {Number} The value of the maximum component.
     */
    Cartesian4.prototype.getMaximumComponent = function() {
        return Math.max(this.x, this.y, this.z, this.w);
    };

    /**
     * Returns the value of the minimum component.
     *
     * @memberof Cartesian4
     * @return {Number} The value of the minimum component.
     */
    Cartesian4.prototype.getMinimumComponent = function() {
        return Math.min(this.x, this.y, this.z, this.w);
    };

    /**
     * Returns a unit Cartesian representing the most orthogonal axis to this Cartesian.
     *
     * @memberof Cartesian4
     * @return {Cartesian4} The axis most orthogonal to this Cartesian.
     */
    Cartesian4.prototype.mostOrthogonalAxis = function() {
        var x = Math.abs(this.x);
        var y = Math.abs(this.y);
        var z = Math.abs(this.z);
        var w = Math.abs(this.w);

        if ((x < y) && (x < z) && (x < w)) {
            return Cartesian4.UNIT_X;
        } else if ((y < x) && (y < z) && (y < w)) {
            return Cartesian4.UNIT_Y;
        } else if ((z < x) && (z < y) && (z < w)) {
            return Cartesian4.UNIT_Z;
        } else {
            return Cartesian4.UNIT_W;
        }
    };

    /**
     * Returns this Cartesian negated.
     *
     * @memberof Cartesian4
     * @return {Cartesian4} This Cartesian negated.
     */
    Cartesian4.prototype.negate = function() {
        return new Cartesian4(-this.x, -this.y, -this.z, -this.w);
    };

    /**
     * Returns a version of this Cartesian containing the absolute value of each component.
     *
     * @memberof Cartesian4
     * @return {Cartesian4} The absolute value of this Cartesian.
     */
    Cartesian4.prototype.abs = function() {
        return new Cartesian4(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z), Math.abs(this.w));
    };

    /**
     * Returns a duplicate of a Cartesian4 instance.
     *
     * @memberof Cartesian4
     * @return {Cartesian4} A new copy of the Cartesian4 instance received as an argument.
     */
    Cartesian4.prototype.clone = function() {
        return new Cartesian4(this.x, this.y, this.z, this.w);
    };

    /**
     * Returns true if this Cartesian equals other componentwise.
     *
     * @memberof Cartesian4
     * @param {Cartesian4} other The Cartesian to compare for equality.
     * @return {Boolean} <code>true</code> if the Cartesians are equal componentwise; otherwise, <code>false</code>.
     */
    Cartesian4.prototype.equals = function(other) {
        return (this.x === other.x) &&
               (this.y === other.y) &&
               (this.z === other.z) &&
               (this.w === other.w);
    };

    /**
     * Returns <code>true</code> if this Cartesian equals other componentwise within the specified epsilon.
     *
     * @memberof Cartesian4
     *
     * @param {Cartesian4} other The Cartesian to compare for equality.
     * @param {Number} [epsilon=0.0] The epsilon to use for equality testing.
     *
     * @return {Boolean} <code>true</code> if the Cartesians are equal within the specified epsilon; otherwise, <code>false</code>.
     */
    Cartesian4.prototype.equalsEpsilon = function(other, epsilon) {
        epsilon = epsilon || 0.0;
        return (Math.abs(this.x - other.x) <= epsilon) &&
               (Math.abs(this.y - other.y) <= epsilon) &&
               (Math.abs(this.z - other.z) <= epsilon) &&
               (Math.abs(this.w - other.w) <= epsilon);
    };

    /**
     * Returns a string representing this instance in the format (x, y, z, w).
     *
     * @memberof Cartesian4
     * @return {String} A string representing this instance.
     */
    Cartesian4.prototype.toString = function() {
        return '(' + this.x + ', ' + this.y + ', ' + this.z + ', ' + this.w + ')';
    };

    return Cartesian4;
});
