/*global define*/
define([
        './Cartesian3',
        './defaultValue',
        './DeveloperError',
        './freezeObject',
        './Math',
        './Matrix3'
    ], function(
        Cartesian3,
        defaultValue,
        DeveloperError,
        freezeObject,
        CesiumMath,
        Matrix3) {
    "use strict";

    /**
     * A set of 4-dimensional coordinates used to represent rotation in 3-dimensional space.
     * @alias Quaternion
     * @constructor
     *
     * @param {Number} [x=0.0] The X component.
     * @param {Number} [y=0.0] The Y component.
     * @param {Number} [z=0.0] The Z component.
     * @param {Number} [w=0.0] The W component.
     */
    var Quaternion = function(x, y, z, w) {
        /**
         * The X component.
         * @type {Number}
         * @default 0.0
         */
        this.x = defaultValue(x, 0.0);

        /**
         * The Y component.
         * @type {Number}
         * @default 0.0
         */
        this.y = defaultValue(y, 0.0);

        /**
         * The Z component.
         * @type {Number}
         * @default 0.0
         */
        this.z = defaultValue(z, 0.0);

        /**
         * The W component.
         * @type {Number}
         * @default 0.0
         */
        this.w = defaultValue(w, 0.0);
    };

    var fromAxisAngleScratch;

    /**
     * Computes a quaternion representing a rotation around an axis.
     * @memberof Quaternion
     *
     * @param {Cartesian3} axis The axis of rotation.
     * @param {Number} angle The angle in radians to rotate around the axis.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} axis is required.
     * @exception {DeveloperError} angle is required and must be a number.
     */
    Quaternion.fromAxisAngle = function(axis, angle, result) {
        if (typeof axis === 'undefined') {
            throw new DeveloperError('axis is required.');
        }
        if (typeof angle !== 'number') {
            throw new DeveloperError('angle is required and must be a number.');
        }

        var halfAngle = angle / 2.0;
        var s = Math.sin(halfAngle);
        fromAxisAngleScratch = Cartesian3.normalize(axis, fromAxisAngleScratch);

        var x = fromAxisAngleScratch.x * s;
        var y = fromAxisAngleScratch.y * s;
        var z = fromAxisAngleScratch.z * s;
        var w = Math.cos(halfAngle);
        if (typeof result === 'undefined') {
            return new Quaternion(x, y, z, w);
        }
        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    var fromRotationMatrixNext = [1, 2, 0];
    var fromRotationMatrixQuat = new Array(3);
    /**
     * Computes a Quaternion from the provided Matrix3 instance.
     * @memberof Quaternion
     *
     * @param {Matrix3} matrix The rotation matrix.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     *
     * @see Matrix3.fromQuaternion
     */
    Quaternion.fromRotationMatrix = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required.');
        }

        var root;
        var x;
        var y;
        var z;
        var w;

        var m00 = matrix[Matrix3.COLUMN0ROW0];
        var m11 = matrix[Matrix3.COLUMN1ROW1];
        var m22 = matrix[Matrix3.COLUMN2ROW2];
        var trace = m00 + m11 + m22;

        if (trace > 0.0) {
            // |w| > 1/2, may as well choose w > 1/2
            root = Math.sqrt(trace + 1.0); // 2w
            w = 0.5 * root;
            root = 0.5 / root; // 1/(4w)

            x = (matrix[Matrix3.COLUMN2ROW1] - matrix[Matrix3.COLUMN1ROW2]) * root;
            y = (matrix[Matrix3.COLUMN0ROW2] - matrix[Matrix3.COLUMN2ROW0]) * root;
            z = (matrix[Matrix3.COLUMN1ROW0] - matrix[Matrix3.COLUMN0ROW1]) * root;
        } else {
            // |w| <= 1/2
            var next = fromRotationMatrixNext;

            var i = 0;
            if (m11 > m00) {
                i = 1;
            }
            if (m22 > m00 && m22 > m11) {
                i = 2;
            }
            var j = next[i];
            var k = next[j];

            root = Math.sqrt(matrix[Matrix3.getElementIndex(i, i)] - matrix[Matrix3.getElementIndex(j, j)] - matrix[Matrix3.getElementIndex(k, k)] + 1.0);

            var quat = fromRotationMatrixQuat;
            quat[i] = 0.5 * root;
            root = 0.5 / root;
            w = (matrix[Matrix3.getElementIndex(k, j)] - matrix[Matrix3.getElementIndex(j, k)]) * root;
            quat[j] = (matrix[Matrix3.getElementIndex(j, i)] + matrix[Matrix3.getElementIndex(i, j)]) * root;
            quat[k] = (matrix[Matrix3.getElementIndex(k, i)] + matrix[Matrix3.getElementIndex(i, k)]) * root;

            x = quat[0];
            y = quat[1];
            z = quat[2];
        }

        if (typeof result === 'undefined') {
            return new Quaternion(x, y, z, w);
        }
        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Duplicates a Quaternion instance.
     * @memberof Quaternion
     *
     * @param {Quaternion} quaternion The quaternion to duplicate.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided. (Returns undefined if quaternion is undefined)
     */
    Quaternion.clone = function(quaternion, result) {
        if (typeof quaternion === 'undefined') {
            return undefined;
        }

        if (typeof result === 'undefined') {
            return new Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        }

        result.x = quaternion.x;
        result.y = quaternion.y;
        result.z = quaternion.z;
        result.w = quaternion.w;
        return result;
    };

    /**
     * Computes the conjugate of the provided quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} quaternion The quaternion to conjugate.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} quaternion is required.
     */
    Quaternion.conjugate = function(quaternion, result) {
        if (typeof quaternion === 'undefined') {
            throw new DeveloperError('quaternion is required');
        }
        if (typeof result === 'undefined') {
            return new Quaternion(-quaternion.x, -quaternion.y, -quaternion.z, quaternion.w);
        }
        result.x = -quaternion.x;
        result.y = -quaternion.y;
        result.z = -quaternion.z;
        result.w = quaternion.w;
        return result;
    };

    /**
     * Computes magnitude squared for the provided quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} quaternion The quaternion to conjugate.
     * @return {Number} The magnitude squared.
     *
     * @exception {DeveloperError} quaternion is required.
     */
    Quaternion.magnitudeSquared = function(quaternion) {
        if (typeof quaternion === 'undefined') {
            throw new DeveloperError('quaternion is required');
        }
        return quaternion.x * quaternion.x + quaternion.y * quaternion.y + quaternion.z * quaternion.z + quaternion.w * quaternion.w;
    };

    /**
     * Computes magnitude for the provided quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} quaternion The quaternion to conjugate.
     * @return {Number} The magnitude.
     *
     * @exception {DeveloperError} quaternion is required.
     */
    Quaternion.magnitude = function(quaternion) {
        if (typeof quaternion === 'undefined') {
            throw new DeveloperError('quaternion is required');
        }
        return Math.sqrt(Quaternion.magnitudeSquared(quaternion));
    };

    /**
     * Computes the normalized form of the provided quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} quaternion The quaternion to normalize.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} quaternion is required.
     */
    Quaternion.normalize = function(quaternion, result) {
        var inverseMagnitude = 1.0 / Quaternion.magnitude(quaternion);
        var x = quaternion.x * inverseMagnitude;
        var y = quaternion.y * inverseMagnitude;
        var z = quaternion.z * inverseMagnitude;
        var w = quaternion.w * inverseMagnitude;

        if (typeof result === 'undefined') {
            return new Quaternion(x, y, z, w);
        }
        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Computes the inverse of the provided quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} quaternion The quaternion to normalize.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} quaternion is required.
     */
    Quaternion.inverse = function(quaternion, result) {
        var magnitudeSquared = Quaternion.magnitudeSquared(quaternion);
        result = Quaternion.conjugate(quaternion, result);
        return Quaternion.multiplyByScalar(result, 1.0 / magnitudeSquared, result);
    };

    /**
     * Computes the componentwise sum of two quaternions.
     * @memberof Quaternion
     *
     * @param {Quaternion} left The first quaternion.
     * @param {Quaternion} right The second quaternion.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     */
    Quaternion.add = function(left, right, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required');
        }
        if (typeof result === 'undefined') {
            return new Quaternion(left.x + right.x, left.y + right.y, left.z + right.z, left.w + right.w);
        }
        result.x = left.x + right.x;
        result.y = left.y + right.y;
        result.z = left.z + right.z;
        result.w = left.w + right.w;
        return result;
    };

    /**
     * Computes the componentwise difference of two quaternions.
     * @memberof Quaternion
     *
     * @param {Quaternion} left The first quaternion.
     * @param {Quaternion} right The second quaternion.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     */
    Quaternion.subtract = function(left, right, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required');
        }
        if (typeof result === 'undefined') {
            return new Quaternion(left.x - right.x, left.y - right.y, left.z - right.z, left.w - right.w);
        }
        result.x = left.x - right.x;
        result.y = left.y - right.y;
        result.z = left.z - right.z;
        result.w = left.w - right.w;
        return result;
    };

    /**
     * Negates the provided quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} quaternion The quaternion to be negated.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} quaternion is required.
     */
    Quaternion.negate = function(quaternion, result) {
        if (typeof quaternion === 'undefined') {
            throw new DeveloperError('quaternion is required');
        }
        if (typeof result === 'undefined') {
            return new Quaternion(-quaternion.x, -quaternion.y, -quaternion.z, -quaternion.w);
        }
        result.x = -quaternion.x;
        result.y = -quaternion.y;
        result.z = -quaternion.z;
        result.w = -quaternion.w;
        return result;
    };

    /**
     * Computes the dot (scalar) product of two quaternions.
     * @memberof Quaternion
     *
     * @param {Quaternion} left The first quaternion.
     * @param {Quaternion} right The second quaternion.
     * @return {Number} The dot product.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     */
    Quaternion.dot = function(left, right) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required');
        }
        return left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w;
    };


    /**
     * Computes the product of two quaternions.
     * @memberof Quaternion
     *
     * @param {Quaternion} left The first quaternion.
     * @param {Quaternion} right The second quaternion.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     */
    Quaternion.multiply = function(left, right, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required');
        }
        var leftX = left.x;
        var leftY = left.y;
        var leftZ = left.z;
        var leftW = left.w;

        var rightX = right.x;
        var rightY = right.y;
        var rightZ = right.z;
        var rightW = right.w;

        var x = leftW * rightX + leftX * rightW + leftY * rightZ - leftZ * rightY;
        var y = leftW * rightY - leftX * rightZ + leftY * rightW + leftZ * rightX;
        var z = leftW * rightZ + leftX * rightY - leftY * rightX + leftZ * rightW;
        var w = leftW * rightW - leftX * rightX - leftY * rightY - leftZ * rightZ;

        if (typeof result === 'undefined') {
            return new Quaternion(x, y, z, w);
        }
        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Multiplies the provided quaternion componentwise by the provided scalar.
     * @memberof Quaternion
     *
     * @param {Quaternion} quaternion The quaternion to be scaled.
     * @param {Number} scalar The scalar to multiply with.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} quaternion is required.
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Quaternion.multiplyByScalar = function(quaternion, scalar, result) {
        if (typeof quaternion === 'undefined') {
            throw new DeveloperError('quaternion is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number.');
        }
        if (typeof result === 'undefined') {
            return new Quaternion(quaternion.x * scalar,  quaternion.y * scalar, quaternion.z * scalar, quaternion.w * scalar);
        }
        result.x = quaternion.x * scalar;
        result.y = quaternion.y * scalar;
        result.z = quaternion.z * scalar;
        result.w = quaternion.w * scalar;
        return result;
    };

    /**
     * Divides the provided quaternion componentwise by the provided scalar.
     * @memberof Quaternion
     *
     * @param {Quaternion} quaternion The quaternion to be divided.
     * @param {Number} scalar The scalar to divide by.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} quaternion is required.
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Quaternion.divideByScalar = function(quaternion, scalar, result) {
        if (typeof quaternion === 'undefined') {
            throw new DeveloperError('quaternion is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number.');
        }
        if (typeof result === 'undefined') {
            return new Quaternion(quaternion.x / scalar, quaternion.y / scalar, quaternion.z / scalar, quaternion.w / scalar);
        }
        result.x = quaternion.x / scalar;
        result.y = quaternion.y / scalar;
        result.z = quaternion.z / scalar;
        result.w = quaternion.w / scalar;
        return result;
    };

    /**
     * Computes the axis of rotation of the provided quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} quaternion The quaternion to use.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     *
     * @exception {DeveloperError} quaternion is required.
     */
    Quaternion.getAxis = function(quaternion, result) {
        if (typeof quaternion === 'undefined') {
            throw new DeveloperError('quaternion is required');
        }

        var w = quaternion.w;
        if (Math.abs(w - 1.0) < CesiumMath.EPSILON6) {
            if (typeof result === 'undefined') {
                return new Cartesian3();
            }
            result.x = result.y = result.z = 0;
            return result;
        }

        var scalar = 1.0 / Math.sqrt(1.0 - (w * w));
        if (typeof result === 'undefined') {
            return new Cartesian3(quaternion.x * scalar, quaternion.y * scalar, quaternion.z * scalar);
        }
        result.x = quaternion.x * scalar;
        result.y = quaternion.y * scalar;
        result.z = quaternion.z * scalar;
        return result;
    };

    /**
     * Computes the angle of rotation of the provided quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} quaternion The quaternion to use.
     * @return {Number} The angle of rotation.
     *
     * @exception {DeveloperError} quaternion is required.
     */
    Quaternion.getAngle = function(quaternion) {
        if (typeof quaternion === 'undefined') {
            throw new DeveloperError('quaternion is required');
        }

        if (Math.abs(quaternion.w - 1.0) < CesiumMath.EPSILON6) {
            return 0.0;
        }
        return 2.0 * Math.acos(quaternion.w);
    };

    var lerpScratch;
    /**
     * Computes the linear interpolation or extrapolation at t using the provided quaternions.
     * @memberof Quaternion
     *
     * @param start The value corresponding to t at 0.0.
     * @param end The value corresponding to t at 1.0.
     * @param t The point along t at which to interpolate.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} start is required.
     * @exception {DeveloperError} end is required.
     * @exception {DeveloperError} t is required and must be a number.
     */
    Quaternion.lerp = function(start, end, t, result) {
        if (typeof start === 'undefined') {
            throw new DeveloperError('start is required.');
        }
        if (typeof end === 'undefined') {
            throw new DeveloperError('end is required.');
        }
        if (typeof t !== 'number') {
            throw new DeveloperError('t is required and must be a number.');
        }
        lerpScratch = Quaternion.multiplyByScalar(end, t, lerpScratch);
        result = Quaternion.multiplyByScalar(start, 1.0 - t, result);
        return Quaternion.add(lerpScratch, result, result);
    };

    var slerpEndNegated;
    var slerpScaledP;
    var slerpScaledR;
    /**
     * Computes the spherical linear interpolation or extrapolation at t using the provided quaternions.
     * @memberof Quaternion
     *
     * @param start The value corresponding to t at 0.0.
     * @param end The value corresponding to t at 1.0.
     * @param t The point along t at which to interpolate.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} start is required.
     * @exception {DeveloperError} end is required.
     * @exception {DeveloperError} t is required and must be a number.
     */
    Quaternion.slerp = function(start, end, t, result) {
        if (typeof start === 'undefined') {
            throw new DeveloperError('start is required.');
        }
        if (typeof end === 'undefined') {
            throw new DeveloperError('end is required.');
        }
        if (typeof t !== 'number') {
            throw new DeveloperError('t is required and must be a number.');
        }

        var dot = Quaternion.dot(start, end);

        // The angle between start must be acute. Since q and -q represent
        // the same rotation, negate q to get the acute angle.
        var r = end;
        if (dot < 0.0) {
            dot = -dot;
            r = slerpEndNegated = Quaternion.negate(end, slerpEndNegated);
        }

        // dot > 0, as the dot product approaches 1, the angle between the
        // quaternions vanishes. use linear interpolation.
        if (1.0 - dot < CesiumMath.EPSILON6) {
            return Quaternion.lerp(start, r, t);
        }

        var theta = Math.acos(dot);
        slerpScaledP = Quaternion.multiplyByScalar(start, Math.sin((1 - t) * theta), slerpScaledP);
        slerpScaledR = Quaternion.multiplyByScalar(r, Math.sin(t * theta), slerpScaledR);
        result = Quaternion.add(slerpScaledP, slerpScaledR, result);
        return Quaternion.multiplyByScalar(result, 1.0 / Math.sin(theta), result);
    };

    /**
     * Compares the provided quaternions componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Quaternion
     *
     * @param {Quaternion} [left] The first quaternion.
     * @param {Quaternion} [right] The second quaternion.
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Quaternion.equals = function(left, right) {
        return (left === right) ||
               ((typeof left !== 'undefined') &&
                (typeof right !== 'undefined') &&
                (left.x === right.x) &&
                (left.y === right.y) &&
                (left.z === right.z) &&
                (left.w === right.w));
    };

    /**
     * Compares the provided quaternions componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     * @memberof Quaternion
     *
     * @param {Quaternion} [left] The first quaternion.
     * @param {Quaternion} [right] The second quaternion.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    Quaternion.equalsEpsilon = function(left, right, epsilon) {
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
     * An immutable Quaternion instance initialized to (0.0, 0.0, 0.0, 0.0).
     * @memberof Quaternion
     */
    Quaternion.ZERO = freezeObject(new Quaternion(0.0, 0.0, 0.0, 0.0));

    /**
     * An immutable Quaternion instance initialized to (0.0, 0.0, 0.0, 1.0).
     * @memberof Quaternion
     */
    Quaternion.IDENTITY = freezeObject(new Quaternion(0.0, 0.0, 0.0, 1.0));

    /**
     * Duplicates this Quaternion instance.
     * @memberof Quaternion
     *
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     */
    Quaternion.prototype.clone = function(result) {
        return Quaternion.clone(this, result);
    };

    /**
     * Computes the conjugate of this quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     */
    Quaternion.prototype.conjugate = function(result) {
        return Quaternion.conjugate(this, result);
    };

    /**
     * Computes magnitude squared for this quaternion.
     * @memberof Quaternion
     *
     * @return {Number} The magnitude squared.
     */
    Quaternion.prototype.magnitudeSquared = function() {
        return Quaternion.magnitudeSquared(this);
    };

    /**
     * Computes magnitude for this quaternion.
     * @memberof Quaternion
     *
     * @return {Number} The magnitude.
     */
    Quaternion.prototype.magnitude = function() {
        return Quaternion.magnitude(this);
    };

    /**
     * Computes the normalized form of this quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     */
    Quaternion.prototype.normalize = function(result) {
        return Quaternion.normalize(this, result);
    };

    /**
     * Computes the inverse of the provided quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     */
    Quaternion.prototype.inverse = function(result) {
        return Quaternion.inverse(this, result);
    };

    /**
     * Computes the componentwise sum of this and the provided quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} right The right hand side quaternion.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} right is required.
     */
    Quaternion.prototype.add = function(right, result) {
        return Quaternion.add(this, right, result);
    };

    /**
     * Computes the componentwise difference of this and the provided quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} right The right hand side quaternion.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.

     * @exception {DeveloperError} right is required.
     */
    Quaternion.prototype.subtract = function(right, result) {
        return Quaternion.subtract(this, right, result);
    };

    /**
     * Negates this quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     */
    Quaternion.prototype.negate = function(result) {
        return Quaternion.negate(this, result);
    };

    /**
     * Computes the dot (scalar) product of this and the provided quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} right The right hand side quaternion.
     * @return {Number} The dot product.
     *
     * @exception {DeveloperError} right is required.
     */
    Quaternion.prototype.dot = function(right) {
        return Quaternion.dot(this, right);
    };


    /**
     * Computes the product of this and the provided quaternion.
     * @memberof Quaternion
     *
     * @param {Quaternion} right The right hande side quaternion.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} right is required.
     */
    Quaternion.prototype.multiply = function(right, result) {
        return Quaternion.multiply(this, right, result);
    };

    /**
     * Multiplies this quaternion componentwise by the provided scalar.
     * @memberof Quaternion
     *
     * @param {Number} scalar The scalar to multiply with.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Quaternion.prototype.multiplyByScalar = function(scalar, result) {
        return Quaternion.multiplyByScalar(this, scalar, result);
    };

    /**
     * Divides this quaternion componentwise by the provided scalar.
     * @memberof Quaternion
     *
     * @param {Number} scalar The scalar to divide by.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Quaternion.prototype.divideByScalar = function(scalar, result) {
        return Quaternion.divideByScalar(this, scalar, result);
    };

    /**
     * Computes the axis of rotation of this quaternion.
     * @memberof Quaternion
     *
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     */
    Quaternion.prototype.getAxis = function(result) {
        return Quaternion.getAxis(this, result);
    };

    /**
     * Computes the angle of rotation of this quaternion.
     * @memberof Quaternion
     *
     * @return {Number} The angle of rotation.
     */
    Quaternion.prototype.getAngle = function() {
        return Quaternion.getAngle(this);
    };

    /**
     * Computes the linear interpolation or extrapolation at t using the provided quaternions.
     * This quaternion is assumed to be t at 0.0.
     * @memberof Quaternion
     *
     * @param end The value corresponding to t at 1.0.
     * @param t The point along t at which to interpolate.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} end is required.
     * @exception {DeveloperError} t is required and must be a number.
     */
    Quaternion.prototype.lerp = function(end, t, result) {
        return Quaternion.lerp(this, end, t, result);
    };

    /**
     * Computes the spherical linear interpolation or extrapolation at t using the provided quaternions.
     * This quaternion is assumed to be t at 0.0.
     * @memberof Quaternion
     *
     * @param end The value corresponding to t at 1.0.
     * @param t The point along t at which to interpolate.
     * @param {Quaternion} [result] The object onto which to store the result.
     * @return {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
     *
     * @exception {DeveloperError} end is required.
     * @exception {DeveloperError} t is required and must be a number.
     */
    Quaternion.prototype.slerp = function(end, t, result) {
        return Quaternion.slerp(this, end, t, result);
    };

    /**
     * Compares this and the provided quaternion componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Quaternion
     *
     * @param {Quaternion} [right] The right hand side quaternion.
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Quaternion.prototype.equals = function(right) {
        return Quaternion.equals(this, right);
    };

    /**
     * Compares this and the provided quaternion componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     * @memberof Quaternion
     *
     * @param {Quaternion} [right] The right hand side quaternion.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    Quaternion.prototype.equalsEpsilon = function(right, epsilon) {
        return Quaternion.equalsEpsilon(this, right, epsilon);
    };

    /**
     * Returns a string representing this quaternion in the format (x, y, z, w).
     * @memberof Quaternion
     *
     * @return {String} A string representing this Quaternion.
     */
    Quaternion.prototype.toString = function() {
        return '(' + this.x + ', ' + this.y + ', ' + this.z + ', ' + this.w + ')';
    };

    return Quaternion;
});
