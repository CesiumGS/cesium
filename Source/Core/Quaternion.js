/*global define*/
define([
        './Math',
        './Cartesian3',
        './Cartesian4',
        './Matrix3'
    ], function(
        CesiumMath,
        Cartesian3,
        Cartesian4,
        Matrix3) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Quaternion
     *
     * @constructor
     *
     * @param {Number} x The x-component of the Quaternion.
     * @param {Number} y The y-component of the Quaternion.
     * @param {Number} z The z-component of the Quaternion.
     * @param {Number} w The w-component of the Quaternion.
     *
     * @see Matrix3
     */
    var Quaternion = function(x, y, z, w) {

        /**
         * The x coordinate.
         *
         * @type Number
         *
         * @see Quaternion.y
         * @see Quaternion.z
         * @see Quaternion.w
         */
        this.x = (typeof x !== 'undefined') ? x : 0.0;

        /**
         * The y coordinate.
         *
         * @type Number
         *
         * @see Quaternion.x
         * @see Quaternion.z
         * @see Quaternion.w
         */
        this.y = (typeof y !== 'undefined') ? y : 0.0;

        /**
         * The z coordinate.
         *
         * @type Number
         *
         * @see Quaternion.x
         * @see Quaternion.y
         * @see Quaternion.w
         */
        this.z = (typeof z !== 'undefined') ? z : 0.0;

        /**
         * The w coordinate.
         *
         * @type Number
         *
         * @see Quaternion.x
         * @see Quaternion.y
         * @see Quaternion.z
         */
        this.w = (typeof w !== 'undefined') ? w : 0.0;
    };

    /**
     * Returns a duplicate of a Quaternion.
     *
     * @param {Quaternion} quaternion The Quaternion to clone.
     * @return {Quaternion} A new Quaternion instance.
     */
    Quaternion.clone = function(quaternion) {
        return new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    };

    /**
     * An immutable Quaternion instance initialized to (0.0, 0.0, 0.0, 0.0).
     *
     * @memberof Quaternion
     */
    Quaternion.ZERO = Object.freeze(new Quaternion(0.0, 0.0, 0.0, 0.0));

    /**
     * An immutable Quaternion instance initialized to (0.0, 0.0, 0.0, 1.0).
     *
     * @memberof Quaternion
     */
    Quaternion.IDENTITY = Object.freeze(new Quaternion(0.0, 0.0, 0.0, 1.0));

    /**
     * Returns the conjugate of this quaternion.
     *
     * @memberof Quaternion
     *
     * @param {Quaternion} [result] The object to store the result into, if undefined a new instance will be created.
     *
     * @return {Quaternion} The modified result parameter or a new instance if result was undefined.
     */
    Quaternion.prototype.conjugate = function(result) {
        if (typeof result === 'undefined') {
            result = new Quaternion();
        }
        result.x = -this.x;
        result.y = -this.y;
        result.z = -this.z;
        result.w = this.w;
        return result;
    };

    /**
     * Returns the quaternion's norm squared.
     *
     * @memberof Quaternion
     *
     * @return {Number} The norm squared.
     *
     * @see Quaternion#norm
     */
    Quaternion.prototype.normSquared = function() {
        return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    };

    /**
     * Returns the quaternion's norm.
     *
     * @memberof Quaternion
     *
     * @return {Number} The norm.
     *
     * @see Quaternion#normSquared
     */
    Quaternion.prototype.norm = function() {
        return Math.sqrt(this.normSquared());
    };

    /**
     * Returns this quaternion normalized.
     *
     * @memberof Quaternion
     *
     * @param {Quaternion} [result] The object to store the result into, if undefined a new instance will be created.
     *
     * @return {Quaternion} The modified result parameter or a new instance if result was undefined.
     */
    Quaternion.prototype.normalize = function(result) {
        if (typeof result === 'undefined') {
            result = new Quaternion();
        }
        var inverseMagnitude = 1.0 / this.norm();
        result.x = this.x * inverseMagnitude;
        result.y = this.y * inverseMagnitude;
        result.z = this.z * inverseMagnitude;
        result.w = this.w * inverseMagnitude;
        return result;
    };

    /**
     * Returns the inverse of this quaternion.
     *
     * @memberof Quaternion
     *
     * @param {Quaternion} [result] The object to store the result into, if undefined a new instance will be created.
     *
     * @return {Quaternion} The modified result parameter or a new instance if result was undefined.
     */
    Quaternion.prototype.inverse = function(result) {
        var normSquared = this.normSquared();
        return this.conjugate(result).multiplyByScalar(1.0 / normSquared, result);
    };

    /**
     * Returns the componentwise sum of two quaternions, <code>this</code> + <code>other</code>.
     *
     * @memberof Quaternion
     *
     * @param {Quaternion} other The quaternion to sum with <code>this</code>.
     *
     * @return {Quaternion} The componentwise sum of two quaternions, <code>this</code> + <code>other</code>.
     *
     * @see Quaternion#subtract
     */
    Quaternion.prototype.add = function(other) {
        return new Quaternion(this.x + other.x, this.y + other.y, this.z + other.z, this.w + other.w);
    };

    /**
     * Returns the componentwise difference of two quaternions, <code>this</code> - <code>other</code>.
     *
     * @memberof Quaternion
     *
     * @param {Quaternion} other The quaternion to subtract from </code>this</code>.
     *
     * @return {Quaternion} The componentwise difference of two quaternions, <code>this</code> - <code>other</code>.
     *
     * @see Quaternion#add
     */
    Quaternion.prototype.subtract = function(other) {
        return new Quaternion(this.x - other.x, this.y - other.y, this.z - other.z, this.w - other.w);
    };

    /**
     * Returns this quaternion negated.
     *
     * @memberof Quaternion
     *
     * @return {Quaternion} This quaternion negated.
     */
    Quaternion.prototype.negate = function() {
        return new Quaternion(-this.x, -this.y, -this.z, -this.w);
    };

    /**
     * Returns the dot (scalar) product of two quaternions, <code>this</code> dot <code>other</code>.
     *
     * @memberof Quaternion
     *
     * @param {Quaternion} other The quaternion to dot with <code>this</code>.
     *
     * @return {Number} The dot (scalar) product of two quaternions, <code>this</code> dot <code>other</code>.
     *
     * @see Quaternion#multiply
     */
    Quaternion.prototype.dot = function(other) {
        return this.x * other.x + this.y * other.y + this.z * other.z + this.w * other.w;
    };

    /**
     * Returns the product two quaternions, <code>this</code> and <code>other</code>.
     *
     * @memberof Quaternion
     *
     * @param {Quaternion} other The quaternion to multiply with <code>this</code>.
     * @param {Quaternion} [result] The object to store the result into, if undefined a new instance will be created.
     *
     * @return {Quaternion} The modified result parameter or a new instance if result was undefined.
     *
     * @see Quaternion#dot
     */
    Quaternion.prototype.multiply = function(other, result) {
        var leftX = this.x;
        var leftY = this.y;
        var leftZ = this.z;
        var leftW = this.w;

        var rightX = other.x;
        var rightY = other.y;
        var rightZ = other.z;
        var rightW = other.w;

        if (typeof result === 'undefined') {
            result = new Quaternion();
        }
        result.x = leftY * rightZ - leftZ * rightY + leftX * rightW + leftW * rightX;
        result.y = leftZ * rightX - leftX * rightZ + leftY * rightW + leftW * rightY;
        result.z = leftX * rightY - leftY * rightX + leftZ * rightW + leftW * rightZ;
        result.w = leftW * rightW - leftX * rightX - leftY * rightY - leftZ * rightZ;
        return result;
    };

    /**
     * Returns this quaternion scaled by a scalar.
     *
     * @memberof Quaternion
     *
     * @param {Number} scalar The scalar that is multiplied with <code>this</code>.
     * @param {Quaternion} [result] The object to store the result into, if undefined a new instance will be created.
     *
     * @return {Quaternion} The modified result parameter or a new instance if result was undefined.
     *
     * @see Quaternion#divideByScalar
     */
    Quaternion.prototype.multiplyByScalar = function(scalar, result) {
        if (typeof result === 'undefined') {
            result = new Quaternion();
        }
        result.x = this.x * scalar;
        result.y = this.y * scalar;
        result.z = this.z * scalar;
        result.w = this.w * scalar;
        return result;
    };

    /**
     * Returns this quaternion divided by a scalar.
     *
     * @memberof Quaternion
     *
     * @param {Number} scalar The scalar to use for division.
     *
     * @return {Quaternion} This quaternion divided by a scalar.
     *
     * @see Quaternion#multiplyByScalar
     */
    Quaternion.prototype.divideByScalar = function(scalar) {
        return new Quaternion(this.x / scalar, this.y / scalar, this.z / scalar, this.w / scalar);
    };

    /**
     * Applies the rotation represented by this quaternion to a 4D Cartesian.
     *
     * @memberof Quaternion
     *
     * @param {Cartesian4} cartesian The cartesian to rotate.
     *
     * @return {Cartesian4} The rotated cartesian.
     */
    Quaternion.prototype.rotate = function(cartesian) {
        var c = new Cartesian4.clone(cartesian);
        var result = this.multiply(c).multiply(this.conjugate());
        return new Cartesian4(result.x, result.y, result.z, result.w);
    };

    /**
     * Returns the axis of rotation if this is a unit quaternion that represents a rotation.
     *
     * @memberof Quaternion
     *
     * @return {Cartesian3} The axis of rotation.
     *
     * @see Quaternion#getAngle
     * @see Quaternion.fromAxisAngle
     */
    Quaternion.prototype.getAxis = function(result) {
        if (typeof result === 'undefined') {
            result = new Cartesian3();
        }

        var w = this.w;
        if (Math.abs(w - 1.0) < CesiumMath.EPSILON6) {
            result.x = result.y = result.z = 0;
            return result;
        }

        var scalar = 1.0 / Math.sqrt(1.0 - (w * w));
        result.x = this.x * scalar;
        result.y = this.y * scalar;
        result.z = this.z * scalar;
        return result;
    };

    /**
     * Returns the angle of rotation if this is a unit quaternion that represents a rotation.
     *
     * @memberof Quaternion
     *
     * @return {Number} The angle of rotation.
     *
     * @see Quaternion#getAxis
     * @see Quaternion.fromAxisAngle
     */
    Quaternion.prototype.getAngle = function() {
        if (Math.abs(this.w - 1.0) < CesiumMath.EPSILON6) {
            return 0.0;
        }

        return 2.0 * Math.acos(this.w);
    };

    /**
     * Computes the linear interpolation between <code>this</code> and another quaternion.
     *
     * @memberof Quaternion
     *
     * @param {Number} t The normalized amount, in the range <code>[0,1]>/code>, between the two quaternions.
     * @param {Quaternion} q The ending Quaternion.
     *
     * @return {Quaternion} The interpolated quaternion between <code>this</code> and <code>q</code>, at <code>t</code>.
     */
    Quaternion.prototype.lerp = function(t, q) {
        var quaternion = Quaternion.clone(q);
        return this.multiplyByScalar(1.0 - t).add(quaternion.multiplyByScalar(t));
    };

    /**
     * Computes the spherical linear interpolation between <code>this</code> and another quaternion.
     *
     * @memberof Quaternion
     *
     * @param {Number} t The normalized amount, in the range <code>[0,1]</code>, between the two quaternions.
     * @param {Quaternion} q The ending quaternion.
     *
     * @return {Quaternion} The interpolated quaternion between <code>this</code> and <code>q</code>, at <code>t</code>.
     */
    Quaternion.prototype.slerp = function(t, q) {
        var quaternion = Quaternion.clone(q);
        var dot = this.dot(quaternion);

        // The angle between this must be acute. Since q and -q represent
        // the same rotation, negate q to get the acute angle.
        var r = quaternion;
        if (dot < 0.0) {
            dot = -dot;
            r = quaternion.negate();
        }

        // dot > 0, as the dot product approaches 1, the angle between the
        // quaternions vanishes. use linear interpolation.
        if (1.0 - dot < CesiumMath.EPSILON6) {
            return this.lerp(t, r);
        }

        var theta = Math.acos(dot);
        var scaledP = this.multiplyByScalar(Math.sin((1 - t) * theta));
        var scaledR = r.multiplyByScalar(Math.sin(t * theta));
        var sum = scaledP.add(scaledR);
        var result = sum.multiplyByScalar(1.0 / Math.sin(theta));

        return result;
    };

    /**
     * Computes the logarithm of this quaternion.
     *
     * @memberof Quaternion
     *
     * @return {Cartesian3} The result of the logarithm.
     */
    Quaternion.prototype.log = function() {
        var theta = Math.acos(this.w);
        var thetaOverSinTheta = 0.0;
        if (theta > CesiumMath.EPSILON6) {
            thetaOverSinTheta = theta / Math.sin(theta);
        }

        return new Cartesian3(this.x * thetaOverSinTheta, this.y * thetaOverSinTheta, this.z * thetaOverSinTheta);
    };

    /**
     * Raises this quaternion to the <code>t</code> power.
     *
     * @memberof Quaternion
     *
     * @param {Number} t The degree of this quaternion to compute.
     *
     * @return {Quaternion} This quaternion raised to the <code>t</code> power.
     */
    Quaternion.prototype.power = function(t) {
        return Quaternion.exp(this.log().multiplyByScalar(t));
    };

    /**
     * Returns a copy of this quaternion.
     *
     * @memberof Quaternion
     *
     * @return {Quaternion} A copy of this quaternion.
     */
    Quaternion.prototype.clone = function() {
        return new Quaternion(this.x, this.y, this.z, this.w);
    };

    /**
     * Returns <code>true</code> if this quaternion equals <code>other</code>, componentwise.
     *
     * @param {Quaternion} other The quaternion to test for equality.
     *
     * @return {Boolean} <code>true</code> if the quaternions are equal componentwise; otherwise, <code>false</code>.
     */
    Quaternion.prototype.equals = function(other) {
        return (this.x === other.x) &&
               (this.y === other.y) &&
               (this.z === other.z) &&
               (this.w === other.w);
    };

    /**
     * Returns <code>true</code> if this quaternion equals <code>other</code>, componentwise, within the specified epsilon.
     *
     * @memberof Quaternion
     *
     * @param {Quaternion} other The quaternion to test for equality.
     * @param {Number} [epsilon=0.0] The epsilon to use for equality testing.
     *
     * @return {Boolean} <code>true</code> if the quaternions are equal within the specified epsilon; otherwise, <code>false</code>.
     */
    Quaternion.prototype.equalsEpsilon = function(other, epsilon) {
        epsilon = epsilon || 0.0;
        return (Math.abs(this.x - other.x) <= epsilon) &&
               (Math.abs(this.y - other.y) <= epsilon) &&
               (Math.abs(this.z - other.z) <= epsilon) &&
               (Math.abs(this.w - other.w) <= epsilon);
    };

    /**
     * Returns a string representing this quaternion in the format (x, y, z, w).
     *
     * @memberof Quaternion
     *
     * @return {String} A string representing this Quaternion.
     */
    Quaternion.prototype.toString = function() {
        return '(' + this.x + ', ' + this.y + ', ' + this.z + ', ' + this.w + ')';
    };

    //Cached temp variable used by Quaternion.fromAxisAngle.
    var fromAxisAngleCartesian = new Cartesian3();

    /**
     * Creates a quaternion representing a rotation around an axis.
     *
     * @memberof Quaternion
     *
     * @param {Cartesian3} axis The axis of rotation.
     * @param {Number} angle The angle in radians to rotate around the axis.
     * @param {Quaternion} [result] The object to store the result into, if undefined a new instance will be created.
     *
     * @return {Quaternion} The modified result parameter or a new instance if result was undefined.
     *
     * @see Quaternion#getAxis
     * @see Quaternion#getAngle
     * @see Matrix3.fromAxisAngle
     */
    Quaternion.fromAxisAngle = function(axis, angle, result) {
        if (typeof result === 'undefined') {
            result = new Quaternion();
        }
        var halfAngle = angle / 2.0;
        var s = Math.sin(halfAngle);
        axis.normalize(fromAxisAngleCartesian);
        result.x = fromAxisAngleCartesian.x * s;
        result.y = fromAxisAngleCartesian.y * s;
        result.z = fromAxisAngleCartesian.z * s;
        result.w = Math.cos(halfAngle);
        return result;
    };

    /**
     * Creates a Quaternion from a 3x3 rotation matrix.
     *
     * @memberof Quaternion
     *
     * @param {Matrix3} matrix The rotation matrix.
     *
     * @return {Quaternion} The quaternion representing the rotation.
     *
     * @see Matrix3.fromQuaternion
     */
    Quaternion.fromRotationMatrix = function(matrix) {
        var x = 0;
        var y = 0;
        var z = 0;
        var w = 0;

        var m00 = matrix[Matrix3.COLUMN0ROW0];
        var m11 = matrix[Matrix3.COLUMN1ROW1];
        var m22 = matrix[Matrix3.COLUMN2ROW2];

        var factor = m00 * m11 * m22;

        var type = 0;
        if (m00 > factor) {
            type = 1;
            factor = m00;
        }

        if (m11 > factor) {
            type = 2;
            factor = m11;
        }

        if (m22 > factor) {
            type = 3;
            factor = m22;
        }

        if (type === 1) {
            x = 0.5 * Math.sqrt(1.0 + m00 - m11 - m22);
            factor = 1.0 / (4.0 * x);

            w = factor * (matrix[Matrix3.COLUMN2ROW1] - matrix[Matrix3.COLUMN1ROW2]);

            if (w < 0.0) {
                w = -w;
                factor = -factor;
            }

            y = factor * (matrix[Matrix3.COLUMN1ROW0] + matrix[Matrix3.COLUMN0ROW1]);
            z = factor * (matrix[Matrix3.COLUMN2ROW0] + matrix[Matrix3.COLUMN0ROW2]);
        } else if (type === 2) {
            y = 0.5 * Math.sqrt(1.0 - m00 + m11 - m22);
            factor = 1.0 / (4.0 * y);

            w = factor * (matrix[Matrix3.COLUMN0ROW2] - matrix[Matrix3.COLUMN2ROW0]);

            if (w < 0) {
                w = -w;
                factor = -factor;
            }

            x = factor * (matrix[Matrix3.COLUMN1ROW0] + matrix[Matrix3.COLUMN0ROW1]);
            z = factor * (matrix[Matrix3.COLUMN2ROW1] + matrix[Matrix3.COLUMN1ROW2]);
        } else if (type === 3) {
            z = 0.5 * Math.sqrt(1.0 - m00 - m11 + m22);
            factor = 1.0 / (4.0 * z);

            w = factor * (matrix[Matrix3.COLUMN1ROW0] - matrix[Matrix3.COLUMN0ROW1]);

            if (w < 0) {
                w = -w;
                factor = -factor;
            }

            x = factor * (matrix[Matrix3.COLUMN2ROW0] + matrix[Matrix3.COLUMN0ROW2]);
            y = factor * (matrix[Matrix3.COLUMN2ROW1] + matrix[Matrix3.COLUMN1ROW2]);
        } else {
            w = 0.5 * Math.sqrt(1.0 + factor);
            factor = 1.0 / (4.0 * w);

            x = factor * (matrix[Matrix3.COLUMN2ROW1] - matrix[Matrix3.COLUMN1ROW2]);
            y = factor * (matrix[Matrix3.COLUMN0ROW2] - matrix[Matrix3.COLUMN2ROW0]);
            z = factor * (matrix[Matrix3.COLUMN1ROW0] - matrix[Matrix3.COLUMN0ROW1]);
        }

        return new Quaternion(x, y, z, w);
    };

    /**
     * Computes the exponential of a Quaternion.
     *
     * @memberof Quaternion
     *
     * @param {Cartesian3} cartesian The cartesian power.
     *
     * @return {Quaternion} The Quaternion representing the exponential.
     */
    Quaternion.exp = function(cartesian) {
        var c = Cartesian3.clone(cartesian);
        var theta = c.magnitude();
        var sinThetaOverTheta = 0.0;
        if (theta > CesiumMath.EPSILON6) {
            sinThetaOverTheta = Math.sin(theta) / theta;
        }

        return new Quaternion(
                cartesian.x * sinThetaOverTheta,
                cartesian.y * sinThetaOverTheta,
                cartesian.z * sinThetaOverTheta,
                Math.cos(theta));
    };

    return Quaternion;
});
