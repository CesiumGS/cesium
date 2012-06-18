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
     * @name Quaternion
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
    function Quaternion(x, y, z, w) {

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
    }

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
     * Modifies the provided quaternion to be its conjugate.
     *
     * @param The quaternion to conjugate.
     *
     * @returns The same instance that is passed into it, modified to be its conjugate.
     *
     * @memberof Quaternion
     *
     */
    Quaternion.conjugate = function(quaternion) {
        quaternion.x = -quaternion.x;
        quaternion.y = -quaternion.y;
        quaternion.z = -quaternion.z;
        return quaternion;
    };

    /**
     * Returns the quaternion's norm squared.
     *
     * @memberof Quaternion
     *
     * @param The quaternion to use.
     *
     * @return {Number} The norm squared.
     *
     * @see Quaternion#norm
     */
    Quaternion.normSquared = function(quaternion) {
        return quaternion.x * quaternion.x + quaternion.y * quaternion.y + quaternion.z * quaternion.z + quaternion.w * quaternion.w;
    };

    /**
     * Returns the quaternion's norm.
     *
     * @memberof Quaternion
     *
     * @param The quaternion to use.
     *
     * @return {Number} The norm.
     *
     * @see Quaternion#normSquared
     */
    Quaternion.norm = function(quaternion) {
        return Math.sqrt(Quaternion.normSquared(quaternion));
    };

    /**
     * Modifies the provided quaternion to be normalized.
     *
     * @memberof Quaternion
     *
     * @param The quaternion to use.
     *
     * @returns {Quaternion} The same instance as the provided quaternion in its normalized form.
     */
    Quaternion.normalize = function(quaternion) {
        var inverseMagnitude = 1.0 / Quaternion.norm(quaternion);
        quaternion.x *= inverseMagnitude;
        quaternion.y *= inverseMagnitude;
        quaternion.z *= inverseMagnitude;
        quaternion.w *= inverseMagnitude;
        return quaternion;
    };

    /**
     * Modifies the provided quaternion to be its inverse.
     *
     * @memberof Quaternion
     *
     * @param The quaternion to use.
     *
     * @returns {Quaternion} The same instance as the provided quaternion modified to be its inverse..
     */
    Quaternion.inverse = function(quaternion) {
        var normSquared = Quaternion.normSquared(quaternion);
        return Quaternion.conjugate(Quaternion.multiplyWithScalar(quaternion, 1.0 / normSquared));
    };

    /**
     * Given three parameters, computes the the product of the first two quaternions,
     * and stores the result in the third.  The result is also returned.  It is safe
     * to pass either of the first two parameters as the third parameter.
     *
     * @memberof Quaternion
     *
     * @param {Quaternion} lhs The first quaternion.
     * @param {Quaternion} rhs The second quaternion.
     * @param {Quaternion} result The quaternion in which the result will be stored.
     *
     * @return {Quaternion} The third parameter, which has been modified to contain the result.
     *
     * @see Quaternion#dot
     */
    Quaternion.multiply = function(lhs, rhs, result) {
        var lhsX = lhs.x;
        var lhsY = lhs.y;
        var lhsZ = lhs.z;
        var lhsW = lhs.w;

        var rhsX = rhs.x;
        var rhsY = rhs.y;
        var rhsZ = rhs.z;
        var rhsW = rhs.w;

        result.x = lhsY * rhsZ - lhsZ * rhsY + lhsX * rhsW + lhsW * rhsX;
        result.y = lhsZ * rhsX - lhsX * rhsZ + lhsY * rhsW + lhsW * rhsY;
        result.z = lhsX * rhsY - lhsY * rhsX + lhsZ * rhsW + lhsW * rhsZ;
        result.w = lhsW * rhsW - lhsX * rhsX - lhsY * rhsY - lhsZ * rhsZ;
        return result;
    };

    /**
     * Modifies the supplied quaternion to be scaled by a scalar.
     *
     * @memberof Quaternion
     *
     * @param {Quaternion} quaternion The quaternion to scale.
     * @param {Number} scalar The scalar that is multiplied with the provided quaternion.
     *
     * @return {Quaternion} The first parameter instance, scaled by the scalar.
     *
     * @see Quaternion#divideByScalar
     */
    Quaternion.multiplyWithScalar = function(quaternion, scalar) {
        quaternion.x = quaternion.x * scalar;
        quaternion.y = quaternion.y * scalar;
        quaternion.z = quaternion.z * scalar;
        quaternion.w = quaternion.w * scalar;
        return quaternion;
    };

    /**
     * Given a unit quaternion which represents a rotation, stores the axis of rotation
     * into the supplied Cartesian.
     *
     * @memberof Quaternion
     *
     * @param {Quaternion} quaternion The unit quaternion representing the rotation.
     * @param {Cartesian3} cartesian3 The cartesian to be modified to contain the axis of rotation.
     *
     * @return {Cartesian3} The same cartesian which was passed in, now modified to contain the axis of rotation.
     *
     * @see Quaternion#getAngle
     * @see Quaternion.fromAxisAngle
     */
    Quaternion.getAxis = function(quaternion, cartesian3) {
        if (Math.abs(quaternion.w - 1.0) < CesiumMath.EPSILON6) {
            cartesian3.x = 0;
            cartesian3.y = 0;
            cartesian3.z = 0;
            return cartesian3;
        }

        var scalar = 1.0 / Math.sqrt(1.0 - (quaternion.w * quaternion.w));
        cartesian3.x = quaternion.x * scalar;
        cartesian3.y = quaternion.y * scalar;
        cartesian3.z = quaternion.z * scalar;
        return cartesian3;
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
     * @return {Quaternion} The conjugate of this quaternion.
     */
    Quaternion.prototype.conjugate = function() {
        return Quaternion.conjugate(Quaternion.clone(this));
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
        return Quaternion.normSquared(this);
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
        return Quaternion.norm(this);
    };

    /**
     * Returns this quaternion normalized.
     *
     * @memberof Quaternion
     *
     * @returns {Quaternion} This quaternion normalized.
     */
    Quaternion.prototype.normalize = function() {
        return Quaternion.normalize(Quaternion.clone(this));
    };

    /**
     * Returns the inverse of this quaternion.
     *
     * @memberof Quaternion
     *
     * @return {Quaternion} The inverse.
     */
    Quaternion.prototype.inverse = function() {
        return Quaternion.inverse(Quaternion.clone(this));
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
     *
     * @return {Quaternion} The product two quaternions, <code>this</code> and <code>other</code>.
     *
     * @see Quaternion#dot
     */
    Quaternion.prototype.multiply = function(other) {
        return Quaternion.multiply(this, other, new Quaternion());
    };

    /**
     * Returns this quaternion scaled by a scalar.
     *
     * @memberof Quaternion
     *
     * @param {Number} scalar The scalar that is multiplied with <code>this</code>.
     *
     * @return {Quaternion} This quaternion scaled by a scalar.
     *
     * @see Quaternion#divideByScalar
     */
    Quaternion.prototype.multiplyWithScalar = function(scalar) {
        return Quaternion.multiplyWithScalar(Quaternion.clone(this), scalar);
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
     * @see Quaternion#multiplyWithScalar
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
    Quaternion.prototype.getAxis = function() {
        return Quaternion.getAxis(this, new Cartesian3());
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
     * Returns the 3x3 rotation matrix from this quaternion.
     *
     * @memberof Quaternion
     *
     * @return {Matrix3} The 3x3 rotation matrix from this quaternion.
     *
     * @see Quaternion.fromRotationMatrix
     */
    Quaternion.prototype.toRotationMatrix = function() {
        var x2 = this.x * this.x;
        var xy = this.x * this.y;
        var xz = this.x * this.z;
        var xw = this.x * this.w;
        var y2 = this.y * this.y;
        var yz = this.y * this.z;
        var yw = this.y * this.w;
        var z2 = this.z * this.z;
        var zw = this.z * this.w;
        var w2 = this.w * this.w;

        var m00 = x2 - y2 - z2 + w2;
        var m01 = 2.0 * (xy + zw);
        var m02 = 2.0 * (xz - yw);

        var m10 = 2.0 * (xy - zw);
        var m11 = -x2 + y2 - z2 + w2;
        var m12 = 2.0 * (yz + xw);

        var m20 = 2.0 * (xz + yw);
        var m21 = 2.0 * (yz - xw);
        var m22 = -x2 - y2 + z2 + w2;

        return new Matrix3(
                m00, m10, m20,
                m01, m11, m21,
                m02, m12, m22);
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
        return this.multiplyWithScalar(1.0 - t).add(quaternion.multiplyWithScalar(t));
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
        var scaledP = this.multiplyWithScalar(Math.sin((1 - t) * theta));
        var scaledR = r.multiplyWithScalar(Math.sin(t * theta));
        var sum = scaledP.add(scaledR);
        var result = sum.multiplyWithScalar(1.0 / Math.sin(theta));

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
        return Quaternion.exp(this.log().multiplyWithScalar(t));
    };

    /**
     * Returns a copy of this quaternion.
     *
     * @memberof Quaternion
     *
     * @return {Quaternion} A copy of this quaternion.
     */
    Quaternion.prototype.clone = function() {
        return Quaternion.clone(this);
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

    /**
     * Creates a quaternion representing a rotation around an axis.
     *
     * @memberof Quaternion
     *
     * @param {Cartesian3} axis The axis of rotation.
     * @param {Number} angle The angle in degrees to rotate around the axis.
     *
     * @return {Quaternion} The quaternion representing the rotation.
     *
     * @see Quaternion#getAxis
     * @see Quaternion#getAngle
     * @see Matrix3.fromAxisAngle
     */
    Quaternion.fromAxisAngle = function(axis, angle) {
        var halfAngle = angle / 2.0;
        var s = Math.sin(halfAngle);
        var c = Math.cos(halfAngle);
        var nAxis = axis.magnitude() === 1.0 ? axis : axis.normalize();
        return new Quaternion(nAxis.x * s, nAxis.y * s, nAxis.z * s, c);
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
     * @see Quaternion#toRotationMatrix
     */
    Quaternion.fromRotationMatrix = function(matrix) {
        var x = 0;
        var y = 0;
        var z = 0;
        var w = 0;

        var m00 = matrix.getColumn0Row0();
        var m11 = matrix.getColumn1Row1();
        var m22 = matrix.getColumn2Row2();

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

            w = factor * (matrix.getColumn2Row1() - matrix.getColumn1Row2());

            if (w < 0.0) {
                w = -w;
                factor = -factor;
            }

            y = factor * (matrix.getColumn1Row0() + matrix.getColumn0Row1());
            z = factor * (matrix.getColumn2Row0() + matrix.getColumn0Row2());
        } else if (type === 2) {
            y = 0.5 * Math.sqrt(1.0 - m00 + m11 - m22);
            factor = 1.0 / (4.0 * y);

            w = factor * (matrix.getColumn0Row2() - matrix.getColumn2Row0());

            if (w < 0) {
                w = -w;
                factor = -factor;
            }

            x = factor * (matrix.getColumn1Row0() + matrix.getColumn0Row1());
            z = factor * (matrix.getColumn2Row1() + matrix.getColumn1Row2());
        } else if (type === 3) {
            z = 0.5 * Math.sqrt(1.0 - m00 - m11 + m22);
            factor = 1.0 / (4.0 * z);

            w = factor * (matrix.getColumn1Row0() - matrix.getColumn0Row1());

            if (w < 0) {
                w = -w;
                factor = -factor;
            }

            x = factor * (matrix.getColumn2Row0() + matrix.getColumn0Row2());
            y = factor * (matrix.getColumn2Row1() + matrix.getColumn1Row2());
        } else {
            w = 0.5 * Math.sqrt(1.0 + factor);
            factor = 1.0 / (4.0 * w);

            x = factor * (matrix.getColumn2Row1() - matrix.getColumn1Row2());
            y = factor * (matrix.getColumn0Row2() - matrix.getColumn2Row0());
            z = factor * (matrix.getColumn1Row0() - matrix.getColumn0Row1());
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
