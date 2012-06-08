/*global define*/
define(['./Cartesian2'], function(Cartesian2) {
    "use strict";

    /**
     * A 3D Cartesian point.
     * <br/>
     * If either <code>x</code>, <code>y</code>, or <code>z</code> is undefined, then the corresponding
     * component will be initialized to 0.0.
     *
     * @name Cartesian3
     * @constructor
     *
     * @param {Number} x The x-coordinate for the Cartesian type.
     * @param {Number} y The y-coordinate for the Cartesian type.
     * @param {Number} z The z-coordinate for the Cartesian type.
     *
     * @see Cartesian2
     * @see Cartesian4
     */
    function Cartesian3(x, y, z) {
       /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see Cartesian3.y
         * @see Cartesian3.z
         */
        this.x = (typeof x !== 'undefined') ? x : 0.0;

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see Cartesian3.x
         * @see Cartesian3.z
         */
        this.y = (typeof y !== 'undefined') ? y : 0.0;

        /**
         * DOC_TBA
         *
         * @type Number
         *
         * @see Cartesian3.x
         * @see Cartesian3.y
         */
        this.z = (typeof z !== 'undefined') ? z : 0.0;
    }

    /**
     * Returns a duplicate of a Cartesian3.
     *
     * @param {Cartesian3} cartesian The cartesian to clone.
     * @return {Cartesian3} A new Cartesian3 instance.
     */
    Cartesian3.clone = function(cartesian) {
        return new Cartesian3(cartesian.x, cartesian.y, cartesian.z);
    };

    /**
     * An immutable Cartesian3 instance initialized to (0.0, 0.0, 0.0).
     *
     * @memberof Cartesian3
     */
    Cartesian3.ZERO = Object.freeze(new Cartesian3(0.0, 0.0, 0.0));

    /**
     * An immutable Cartesian3 instance initialized to (1.0, 0.0, 0.0).
     *
     * @memberof Cartesian3v
     */
    Cartesian3.UNIT_X = Object.freeze(new Cartesian3(1.0, 0.0, 0.0));

    /**
     * An immutable Cartesian3 instance initialized to (0.0, 1.0, 0.0).
     *
     * @memberof Cartesian3
     */
    Cartesian3.UNIT_Y = Object.freeze(new Cartesian3(0.0, 1.0, 0.0));

    /**
     * An immutable Cartesian3 instance initialized to (0.0, 0.0, 1.0).
     *
     * @memberof Cartesian3
     */
    Cartesian3.UNIT_Z = Object.freeze(new Cartesian3(0.0, 0.0, 1.0));

    /**
     * Returns a new array, where each {@link Cartesian3}
     * element is flattened, that is, replaced with separate x, y,
     * and z elements.
     *
     * @memberof Cartesian3
     *
     * @param {Array} positions The array of Cartesian points to flatten.
     *
     * @return {Array} The flattened array.
     */
    Cartesian3.flatten = function(positions) {
        var flat = [];
        for ( var i = 0; i < positions.length; ++i) {
            flat.push(positions[i].x);
            flat.push(positions[i].y);
            flat.push(positions[i].z);
        }

        return flat;
    };

    /**
     * Returns the Cartesian's x and y components as a Cartesian2.
     *
     * @memberof Cartesian3
     * @return {Cartesian2} The Cartesian's x and y components.
     * @see Cartesian2
     */
    Cartesian3.prototype.getXY = function() {
        return new Cartesian2(this.x, this.y);
    };

    /**
     * Returns the Cartesian's squared magnitude (length).
     *
     * @memberof Cartesian3
     * @return {Number} The squared magnitude.
     */
    Cartesian3.prototype.magnitudeSquared = function() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    };

    /**
     * Returns the Cartesian's magnitude (length).
     *
     * @memberof Cartesian3
     * @return {Number} The magnitude.
     */
    Cartesian3.prototype.magnitude = function() {
        return Math.sqrt(this.magnitudeSquared());
    };

    /**
     * Returns this Cartesian normalized.
     *
     * @memberof Cartesian3
     * @return {Cartesian3} The normalized Cartesian.
     */
    Cartesian3.prototype.normalize = function() {
        var magnitude = this.magnitude();
        return new Cartesian3(this.x / magnitude, this.y / magnitude, this.z / magnitude);
    };

    /**
     * Returns the cross (outer) product of two Cartesians.
     *
     * <p>
     * v.cross(u) is v x u.
     * </p>
     *
     * @memberof Cartesian3
     * @param {Cartesian3} other The Cartesian to cross with this.
     * @return {Cartesian3} The cross product.
     */
    Cartesian3.prototype.cross = function(other) {
        return new Cartesian3(
                this.y * other.z - this.z * other.y,
                this.z * other.x - this.x * other.z,
                this.x * other.y - this.y * other.x);
    };

    /**
     * Returns the dot (scalar) product of two Cartesians.
     *
     * @memberof Cartesian3
     * @param {Cartesian3} other The Cartesian to dot with this.
     * @return {Number} The dot product.
     */
    Cartesian3.prototype.dot = function(other) {
        return this.x * other.x + this.y * other.y + this.z * other.z;
    };

    /**
     * Returns the componentwise sum of two Cartesians.
     *
     * @memberof Cartesian3
     * @param {Cartesian3} other The Cartesian to sum with this.
     * @return {Cartesian3} The sum of this and other.
     */
    Cartesian3.prototype.add = function(other) {
        return new Cartesian3(this.x + other.x, this.y + other.y, this.z + other.z);
    };

    /**
     * Returns the componentwise difference of two Cartesians.
     *
     * @memberof Cartesian3
     * @param {Cartesian3} other The Cartesian to subtract from this.
     * @return {Cartesian3} The difference of this and other.
     */
    Cartesian3.prototype.subtract = function(other) {
        return new Cartesian3(this.x - other.x, this.y - other.y, this.z - other.z);
    };

    /**
     * Returns this Cartesian scaled by a scalar.
     *
     * @memberof Cartesian3
     * @param {Number} scalar The scalar that is multiplied with this.
     * @return {Cartesian3} The scaled Cartesian.
     */
    Cartesian3.prototype.multiplyWithScalar = function(scalar) {
        return new Cartesian3(this.x * scalar, this.y * scalar, this.z * scalar);
    };

    /**
     * Returns this Cartesian scaled by another Cartesian componentwise.
     *
     * @memberof Cartesian3
     * @param {Cartesian3} Cartesian The Cartesian that is multiplied with this componentwise.
     * @return {Cartesian3} The scaled Cartesian.
     */
    Cartesian3.prototype.multiplyComponents = function(Cartesian) {
        return new Cartesian3(this.x * Cartesian.x, this.y * Cartesian.y, this.z * Cartesian.z);
    };

    /**
     * Returns this Cartesian divided by a scalar.
     *
     * @memberof Cartesian3
     * @param {Number} scalar The scalar to use for division.
     * @return {Cartesian3} This Cartesian after division.
     */
    Cartesian3.prototype.divideByScalar = function(scalar) {
        return new Cartesian3(this.x / scalar, this.y / scalar, this.z / scalar);
    };

    /**
     * Returns the value of the maximum component.
     *
     * @memberof Cartesian3
     * @return {Number} The value of the maximum component.
     */
    Cartesian3.prototype.getMaximumComponent = function() {
        return Math.max(this.x, this.y, this.z);
    };

    /**
     * Returns the value of the minimum component.
     *
     * @memberof Cartesian3
     * @return {Number} The value of the minimum component.
     */
    Cartesian3.prototype.getMinimumComponent = function() {
        return Math.min(this.x, this.y, this.z);
    };

    /**
     * Returns a unit Cartesian representing the most orthogonal axis to this Cartesian.
     *
     * @memberof Cartesian3
     * @return {Cartesian3} The axis most orthogonal to this Cartesian.
     */
    Cartesian3.prototype.mostOrthogonalAxis = function() {
        var x = Math.abs(this.x);
        var y = Math.abs(this.y);
        var z = Math.abs(this.z);

        if ((x < y) && (x < z)) {
            return Cartesian3.UNIT_X;
        } else if ((y < x) && (y < z)) {
            return Cartesian3.UNIT_Y;
        } else {
            return Cartesian3.UNIT_Z;
        }
    };

    /**
     * Returns the angle, in radians, between this Cartesian and the Cartesian passed in.
     *
     * @memberof Cartesian3
     * @param {Cartesian3} cartesian The Cartesian used to compute the angle.
     * @return {Number} The angle between the two Cartesians.
     */
    Cartesian3.prototype.angleBetween = function(cartesian) {
        var c = Cartesian3.clone(cartesian);
        return Math.acos(this.normalize().dot(c.normalize()));
    };

    /**
     * Rotates this Cartesian counterclockwise around around the specified axis by the specified degrees.
     *
     * @memberof Cartesian3
     * @param {Cartesian3} axis The axis to rotate around.
     * @param {Number} theta The angle, in radians, to rotate around.
     * @return {Cartesian3} The rotated Cartesian.
     */
    Cartesian3.prototype.rotateAroundAxis = function(axis, theta) {
        var x = this.x;
        var y = this.y;
        var z = this.z;

        var u = axis.x;
        var v = axis.y;
        var w = axis.z;

        var cosTheta = Math.cos(theta);
        var sinTheta = Math.sin(theta);

        var a = Cartesian3.clone(axis);
        var ms = a.magnitudeSquared();
        var m = Math.sqrt(ms);

        return new Cartesian3(
            ((u * (u * x + v * y + w * z)) +
            (((x * (v * v + w * w)) - (u * (v * y + w * z))) * cosTheta) +
            (m * ((-w * y) + (v * z)) * sinTheta)) / ms,

            ((v * (u * x + v * y + w * z)) +
            (((y * (u * u + w * w)) - (v * (u * x + w * z))) * cosTheta) +
            (m * ((w * x) - (u * z)) * sinTheta)) / ms,

            ((w * (u * x + v * y + w * z)) +
            (((z * (u * u + v * v)) - (w * (u * x + v * y))) * cosTheta) +
            (m * (-(v * x) + (u * y)) * sinTheta)) / ms);
    };

    /**
     * Returns this Cartesian negated.
     *
     * @memberof Cartesian3
     * @return {Cartesian3} This Cartesian negated.
     */
    Cartesian3.prototype.negate = function() {
        return new Cartesian3(-this.x, -this.y, -this.z);
    };

    /**
     * Returns a version of this Cartesian containing the absolute value of each component.
     *
     * @memberof Cartesian3
     * @return {Cartesian3} The absolute value of this Cartesian.
     */
    Cartesian3.prototype.abs = function() {
        return new Cartesian3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
    };

    /**
     * Returns the linear interpolation between this Cartesian and another Cartesian at value t.
     *
     * @memberof Cartesian3
     * @param {Cartesian} Cartesian The value to interpolate with this.
     * @param {Number} t A value in [0, 1] used to interpolate the two Cartesians.
     * @returns {Cartesian} The interpolated Cartesian at t.
     */
    Cartesian3.prototype.lerp = function(Cartesian, t) {
        var c = new Cartesian3(Cartesian.x, Cartesian.y, Cartesian.z);
        return this.multiplyWithScalar(1.0 - t).add(c.multiplyWithScalar(t));
    };

    /**
     * Returns a duplicate of a Cartesian3 instance.
     *
     * @memberof Cartesian3
     * @return {Cartesian3} A new copy of the Cartesian3 instance received as an argument.
     */
    Cartesian3.prototype.clone = function() {
        return new Cartesian3(this.x, this.y, this.z);
    };

    /**
     * Returns true if this Cartesian equals other componentwise.
     *
     * @memberof Cartesian3
     * @param {Cartesian3} other The Cartesian to compare for equality.
     * @return {Boolean} <code>true</code> if the Cartesians are equal componentwise; otherwise, <code>false</code>.
     */
    Cartesian3.prototype.equals = function(other) {
        return (this.x === other.x) && (this.y === other.y) && (this.z === other.z);
    };

    /**
     * Returns <code>true</code> if this Cartesian equals other componentwise within the specified epsilon.
     *
     * @memberof Cartesian3
     *
     * @param {Cartesian3} other The Cartesian to compare for equality.
     * @param {Number} [epsilon=0.0] The epsilon to use for equality testing.
     *
     * @return {Boolean} <code>true</code> if the Cartesians are equal within the specified epsilon; otherwise, <code>false</code>.
     */
    Cartesian3.prototype.equalsEpsilon = function(other, epsilon) {
        epsilon = epsilon || 0.0;
        return (Math.abs(this.x - other.x) <= epsilon) &&
               (Math.abs(this.y - other.y) <= epsilon) &&
               (Math.abs(this.z - other.z) <= epsilon);
    };

    /**
     * Returns a string representing this instance in the format (x, y, z).
     *
     * @memberof Cartesian3
     * @return {String} A string representing this instance.
     */
    Cartesian3.prototype.toString = function() {
        return '(' + this.x + ', ' + this.y + ', ' + this.z + ')';
    };

    return Cartesian3;
});
