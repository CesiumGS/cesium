/*global define*/
define([
        './Cartesian3',
        './Cartesian4',
        './defaultValue',
        './DeveloperError',
        './freezeObject',
        './Math',
        './Matrix3',
        './RuntimeError'
    ], function(
        Cartesian3,
        Cartesian4,
        defaultValue,
        DeveloperError,
        freezeObject,
        CesiumMath,
        Matrix3,
        RuntimeError) {
    "use strict";

    /**
     * A 4x4 matrix, indexable as a column-major order array.
     * Constructor parameters are in row-major order for code readability.
     * @alias Matrix4
     * @constructor
     *
     * @param {Number} [column0Row0=0.0] The value for column 0, row 0.
     * @param {Number} [column1Row0=0.0] The value for column 1, row 0.
     * @param {Number} [column2Row0=0.0] The value for column 2, row 0.
     * @param {Number} [column3Row0=0.0] The value for column 3, row 0.
     * @param {Number} [column0Row1=0.0] The value for column 0, row 1.
     * @param {Number} [column1Row1=0.0] The value for column 1, row 1.
     * @param {Number} [column2Row1=0.0] The value for column 2, row 1.
     * @param {Number} [column3Row1=0.0] The value for column 3, row 1.
     * @param {Number} [column0Row2=0.0] The value for column 0, row 2.
     * @param {Number} [column1Row2=0.0] The value for column 1, row 2.
     * @param {Number} [column2Row2=0.0] The value for column 2, row 2.
     * @param {Number} [column3Row2=0.0] The value for column 3, row 2.
     * @param {Number} [column0Row3=0.0] The value for column 0, row 3.
     * @param {Number} [column1Row3=0.0] The value for column 1, row 3.
     * @param {Number} [column2Row3=0.0] The value for column 2, row 3.
     * @param {Number} [column3Row3=0.0] The value for column 3, row 3.
     *
     * @see Matrix4.fromColumnMajorArray
     * @see Matrix4.fromRowMajorArray
     * @see Matrix4.fromRotationTranslation
     * @see Matrix4.fromTranslation
     * @see Matrix4.fromScale
     * @see Matrix4.fromUniformScale
     * @see Matrix4.fromCamera
     * @see Matrix4.computePerspectiveFieldOfView
     * @see Matrix4.computeOrthographicOffCenter
     * @see Matrix4.computePerspectiveOffCenter
     * @see Matrix4.computeInfinitePerspectiveOffCenter
     * @see Matrix4.computeViewportTransformation
     * @see Matrix2
     * @see Matrix3
     */
    var Matrix4 = function(column0Row0, column1Row0, column2Row0, column3Row0,
                           column0Row1, column1Row1, column2Row1, column3Row1,
                           column0Row2, column1Row2, column2Row2, column3Row2,
                           column0Row3, column1Row3, column2Row3, column3Row3) {
        this[0] = defaultValue(column0Row0, 0.0);
        this[1] = defaultValue(column0Row1, 0.0);
        this[2] = defaultValue(column0Row2, 0.0);
        this[3] = defaultValue(column0Row3, 0.0);
        this[4] = defaultValue(column1Row0, 0.0);
        this[5] = defaultValue(column1Row1, 0.0);
        this[6] = defaultValue(column1Row2, 0.0);
        this[7] = defaultValue(column1Row3, 0.0);
        this[8] = defaultValue(column2Row0, 0.0);
        this[9] = defaultValue(column2Row1, 0.0);
        this[10] = defaultValue(column2Row2, 0.0);
        this[11] = defaultValue(column2Row3, 0.0);
        this[12] = defaultValue(column3Row0, 0.0);
        this[13] = defaultValue(column3Row1, 0.0);
        this[14] = defaultValue(column3Row2, 0.0);
        this[15] = defaultValue(column3Row3, 0.0);
    };

    /**
     * Duplicates a Matrix4 instance.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to duplicate.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix4.clone = function(values, result) {
        if (typeof values === 'undefined') {
            throw new DeveloperError('values is required');
        }
        if (typeof result === 'undefined') {
            return new Matrix4(values[0], values[4], values[8], values[12],
                               values[1], values[5], values[9], values[13],
                               values[2], values[6], values[10], values[14],
                               values[3], values[7], values[11], values[15]);
        }
        result[0] = values[0];
        result[1] = values[1];
        result[2] = values[2];
        result[3] = values[3];
        result[4] = values[4];
        result[5] = values[5];
        result[6] = values[6];
        result[7] = values[7];
        result[8] = values[8];
        result[9] = values[9];
        result[10] = values[10];
        result[11] = values[11];
        result[12] = values[12];
        result[13] = values[13];
        result[14] = values[14];
        result[15] = values[15];
        return result;
    };

    /**
     * Computes a Matrix4 instance from a column-major order array.
     * @memberof Matrix4
     * @function
     *
     * @param {Array} values The column-major order array.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} values is required.
     */
    Matrix4.fromColumnMajorArray = Matrix4.clone;

    /**
     * Computes a Matrix4 instance from a row-major order array.
     * The resulting matrix will be in column-major order.
     * @memberof Matrix4
     *
     * @param {Array} values The row-major order array.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} values is required.
     */
    Matrix4.fromRowMajorArray = function(values, result) {
        if (typeof values === 'undefined') {
            throw new DeveloperError('values is required.');
        }
        if (typeof result === 'undefined') {
            return new Matrix4(values[0], values[1], values[2], values[3],
                               values[4], values[5], values[6], values[7],
                               values[8], values[9], values[10], values[11],
                               values[12], values[13], values[14], values[15]);
        }
        result[0] = values[0];
        result[1] = values[4];
        result[2] = values[8];
        result[3] = values[12];
        result[4] = values[1];
        result[5] = values[5];
        result[6] = values[9];
        result[7] = values[13];
        result[8] = values[2];
        result[9] = values[6];
        result[10] = values[10];
        result[11] = values[14];
        result[12] = values[3];
        result[13] = values[7];
        result[14] = values[11];
        result[15] = values[15];
        return result;
    };

    /**
     * Computes a Matrix4 instance from a Matrix3 representing the rotation
     * and a Cartesian3 representing the translation.
     * @memberof Matrix4
     *
     * @param {Matrix3} rotation The upper left portion of the matrix representing the rotation.
     * @param {Cartesian3} translation The upper right portion of the matrix representing the translation.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} rotation is required.
     * @exception {DeveloperError} translation is required.
     */
    Matrix4.fromRotationTranslation = function(rotation, translation, result) {
        if (typeof rotation === 'undefined') {
            throw new DeveloperError('rotation is required.');
        }
        if (typeof translation === 'undefined') {
            throw new DeveloperError('translation is required.');
        }
        if (typeof result === 'undefined') {
            return new Matrix4(rotation[0], rotation[3], rotation[6], translation.x,
                               rotation[1], rotation[4], rotation[7], translation.y,
                               rotation[2], rotation[5], rotation[8], translation.z,
                                       0.0,         0.0,         0.0,           1.0);
        }

        result[0] = rotation[0];
        result[1] = rotation[1];
        result[2] = rotation[2];
        result[3] = 0.0;
        result[4] = rotation[3];
        result[5] = rotation[4];
        result[6] = rotation[5];
        result[7] = 0.0;
        result[8] = rotation[6];
        result[9] = rotation[7];
        result[10] = rotation[8];
        result[11] = 0.0;
        result[12] = translation.x;
        result[13] = translation.y;
        result[14] = translation.z;
        result[15] = 1.0;
        return result;
    };

    /**
     * Creates a Matrix4 instance from a Cartesian3 representing the translation.
     * @memberof Matrix4
     *
     * @param {Cartesian3} translation The upper right portion of the matrix representing the translation.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @see Matrix4.multiplyByTranslation
     *
     * @exception {DeveloperError} translation is required.
     */
    Matrix4.fromTranslation = function(translation, result) {
        return Matrix4.fromRotationTranslation(Matrix3.IDENTITY, translation, result);
    };

    /**
     * Computes a Matrix4 instance representing a non-uniform scale.
     * @memberof Matrix4
     *
     * @param {Cartesian3} scale The x, y, and z scale factors.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} scale is required.
     *
     * @example
     * // Creates
     * //   [7.0, 0.0, 0.0, 0.0]
     * //   [0.0, 8.0, 0.0, 0.0]
     * //   [0.0, 0.0, 9.0, 0.0]
     * //   [0.0, 0.0, 0.0, 1.0]
     * var m = Matrix4.fromScale(new Cartesian3(7.0, 8.0, 9.0));
     */
    Matrix4.fromScale = function(scale, result) {
        if (typeof scale === 'undefined') {
            throw new DeveloperError('scale is required.');
        }
        if (typeof result === 'undefined') {
            return new Matrix4(
                scale.x, 0.0,     0.0,     0.0,
                0.0,     scale.y, 0.0,     0.0,
                0.0,     0.0,     scale.z, 0.0,
                0.0,     0.0,     0.0,     1.0);
        }

        result[0] = scale.x;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = scale.y;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = 0.0;
        result[9] = 0.0;
        result[10] = scale.z;
        result[11] = 0.0;
        result[12] = 0.0;
        result[13] = 0.0;
        result[14] = 0.0;
        result[15] = 1.0;
        return result;
    };

    /**
     * Computes a Matrix4 instance representing a uniform scale.
     * @memberof Matrix4
     *
     * @param {Number} scale The uniform scale factor.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} scale is required.
     *
     * @example
     * // Creates
     * //   [2.0, 0.0, 0.0, 0.0]
     * //   [0.0, 2.0, 0.0, 0.0]
     * //   [0.0, 0.0, 2.0, 0.0]
     * //   [0.0, 0.0, 0.0, 1.0]
     * var m = Matrix4.fromScale(2.0);
     */
    Matrix4.fromUniformScale = function(scale, result) {
        if (typeof scale !== 'number') {
            throw new DeveloperError('scale is required.');
        }
        if (typeof result === 'undefined') {
            return new Matrix4(scale, 0.0,   0.0,   0.0,
                               0.0,   scale, 0.0,   0.0,
                               0.0,   0.0,   scale, 0.0,
                               0.0,   0.0,   0.0,   1.0);
        }

        result[0] = scale;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = scale;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = 0.0;
        result[9] = 0.0;
        result[10] = scale;
        result[11] = 0.0;
        result[12] = 0.0;
        result[13] = 0.0;
        result[14] = 0.0;
        result[15] = 1.0;
        return result;
    };

    var fromCameraF = new Cartesian3();
    var fromCameraS = new Cartesian3();
    var fromCameraU = new Cartesian3();

    /**
     * Computes a Matrix4 instance from a Camera.
     * @memberof Matrix4
     *
     * @param {Camera} camera The camera to use.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} camera is required.
     * @exception {DeveloperError} camera.eye is required.
     * @exception {DeveloperError} camera.target is required.
     * @exception {DeveloperError} camera.up is required.
     */
    Matrix4.fromCamera = function(camera, result) {
        if (typeof camera === 'undefined') {
            throw new DeveloperError('camera is required.');
        }

        var eye = camera.eye;
        var target = camera.target;
        var up = camera.up;

        if (typeof eye === 'undefined') {
            throw new DeveloperError('camera.eye is required.');
        }
        if (typeof target === 'undefined') {
            throw new DeveloperError('camera.target is required.');
        }
        if (typeof up === 'undefined') {
            throw new DeveloperError('camera.up is required.');
        }

        Cartesian3.subtract(target, eye, fromCameraF).normalize(fromCameraF);
        Cartesian3.cross(fromCameraF, up, fromCameraS).normalize(fromCameraS);
        Cartesian3.cross(fromCameraS, fromCameraF, fromCameraU).normalize(fromCameraU);

        var sX = fromCameraS.x;
        var sY = fromCameraS.y;
        var sZ = fromCameraS.z;
        var fX = fromCameraF.x;
        var fY = fromCameraF.y;
        var fZ = fromCameraF.z;
        var uX = fromCameraU.x;
        var uY = fromCameraU.y;
        var uZ = fromCameraU.z;
        var eyeX = eye.x;
        var eyeY = eye.y;
        var eyeZ = eye.z;
        var t0 = sX * -eyeX + sY * -eyeY+ sZ * -eyeZ;
        var t1 = uX * -eyeX + uY * -eyeY+ uZ * -eyeZ;
        var t2 = fX * eyeX + fY * eyeY + fZ * eyeZ;

        //The code below this comment is an optimized
        //version of the commented lines.
        //Rather that create two matrices and then multiply,
        //we just bake in the multiplcation as part of creation.
        //var rotation = new Matrix4(
        //                sX,  sY,  sZ, 0.0,
        //                uX,  uY,  uZ, 0.0,
        //               -fX, -fY, -fZ, 0.0,
        //                0.0,  0.0,  0.0, 1.0);
        //var translation = new Matrix4(
        //                1.0, 0.0, 0.0, -eye.x,
        //                0.0, 1.0, 0.0, -eye.y,
        //                0.0, 0.0, 1.0, -eye.z,
        //                0.0, 0.0, 0.0, 1.0);
        //return rotation.multiply(translation);
        if (typeof result === 'undefined') {
            return new Matrix4(
                    sX,   sY,  sZ, t0,
                    uX,   uY,  uZ, t1,
                   -fX,  -fY, -fZ, t2,
                    0.0, 0.0, 0.0, 1.0);
        }
        result[0] = sX;
        result[1] = uX;
        result[2] = -fX;
        result[3] = 0.0;
        result[4] = sY;
        result[5] = uY;
        result[6] = -fY;
        result[7] = 0.0;
        result[8] = sZ;
        result[9] = uZ;
        result[10] = -fZ;
        result[11] = 0.0;
        result[12] = t0;
        result[13] = t1;
        result[14] = t2;
        result[15] = 1.0;
        return result;

    };

     /**
      * Computes a Matrix4 instance representing a perspective transformation matrix.
      * @memberof Matrix4
      *
      * @param {Number} fovY The field of view along the Y axis in radians.
      * @param {Number} aspectRatio The aspect ratio.
      * @param {Number} near The distance to the near plane in meters.
      * @param {Number} far The distance to the far plane in meters.
      * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
      * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
      *
      * @exception {DeveloperError} fovY must be in [0, PI).
      * @exception {DeveloperError} aspectRatio must be greater than zero.
      * @exception {DeveloperError} near must be greater than zero.
      * @exception {DeveloperError} far must be greater than zero.
      */
    Matrix4.computePerspectiveFieldOfView = function(fovY, aspectRatio, near, far, result) {
        if (fovY <= 0.0 || fovY > Math.PI) {
            throw new DeveloperError('fovY must be in [0, PI).');
        }

        if (aspectRatio <= 0.0) {
            throw new DeveloperError('aspectRatio must be greater than zero.');
        }

        if (near <= 0.0) {
            throw new DeveloperError('near must be greater than zero.');
        }

        if (far <= 0.0) {
            throw new DeveloperError('far must be greater than zero.');
        }

        var bottom = Math.tan(fovY * 0.5);

        var column1Row1 = 1.0 / bottom;
        var column0Row0 = column1Row1 / aspectRatio;
        var column2Row2 = (far + near) / (near - far);
        var column3Row2 = (2.0 * far * near) / (near - far);

        if (typeof result === 'undefined') {
            return new Matrix4(column0Row0,         0.0,         0.0,         0.0,
                                       0.0, column1Row1,         0.0,         0.0,
                                       0.0,         0.0, column2Row2, column3Row2,
                                       0.0,         0.0,        -1.0,         0.0);
         }

        result[0] = column0Row0;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = column1Row1;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = 0.0;
        result[9] = 0.0;
        result[10] = column2Row2;
        result[11] = -1.0;
        result[12] = 0.0;
        result[13] = 0.0;
        result[14] = column3Row2;
        result[15] = 0.0;
        return result;
    };

    /**
    * Computes a Matrix4 instance representing an orthographic transformation matrix.
    * @memberof Matrix4
    *
    * @param {Number} left The number of meters to the left of the camera that will be in view.
    * @param {Number} right The number of meters to the right of the camera that will be in view.
    * @param {Number} bottom The number of meters below of the camera that will be in view.
    * @param {Number} top The number of meters above of the camera that will be in view.
    * @param {Number} near The distance to the near plane in meters.
    * @param {Number} far The distance to the far plane in meters.
    * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
    * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
    *
    * @exception {DeveloperError} left is required.
    * @exception {DeveloperError} right is required.
    * @exception {DeveloperError} bottom is required.
    * @exception {DeveloperError} top is required.
    * @exception {DeveloperError} near is required.
    * @exception {DeveloperError} far is required.
    */
    Matrix4.computeOrthographicOffCenter = function(left, right, bottom, top, near, far, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required.');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required.');
        }
        if (typeof bottom === 'undefined') {
            throw new DeveloperError('bottom is required.');
        }
        if (typeof top === 'undefined') {
            throw new DeveloperError('top is required.');
        }
        if (typeof near === 'undefined') {
            throw new DeveloperError('near is required.');
        }
        if (typeof far === 'undefined') {
            throw new DeveloperError('far is required.');
        }

        var a = 1.0 / (right - left);
        var b = 1.0 / (top - bottom);
        var c = 1.0 / (far - near);

        var tx = -(right + left) * a;
        var ty = -(top + bottom) * b;
        var tz = -(far + near) * c;
        a *= 2.0;
        b *= 2.0;
        c *= -2.0;

        if (typeof result === 'undefined') {
            return new Matrix4(  a, 0.0, 0.0, tx,
                               0.0,   b, 0.0, ty,
                               0.0, 0.0,   c, tz,
                               0.0, 0.0, 0.0, 1.0);
        }

        result[0] = a;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = b;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = 0.0;
        result[9] = 0.0;
        result[10] = c;
        result[11] = 0.0;
        result[12] = tx;
        result[13] = ty;
        result[14] = tz;
        result[15] = 1.0;
        return result;
    };

    /**
     * Computes a Matrix4 instance representing an off center perspective transformation.
     * @memberof Matrix4
     *
     * @param {Number} left The number of meters to the left of the camera that will be in view.
     * @param {Number} right The number of meters to the right of the camera that will be in view.
     * @param {Number} bottom The number of meters below of the camera that will be in view.
     * @param {Number} top The number of meters above of the camera that will be in view.
     * @param {Number} near The distance to the near plane in meters.
     * @param {Number} far The distance to the far plane in meters.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     * @exception {DeveloperError} bottom is required.
     * @exception {DeveloperError} top is required.
     * @exception {DeveloperError} near is required.
     * @exception {DeveloperError} far is required.
     */
    Matrix4.computePerspectiveOffCenter = function(left, right, bottom, top, near, far, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required.');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required.');
        }
        if (typeof bottom === 'undefined') {
            throw new DeveloperError('bottom is required.');
        }
        if (typeof top === 'undefined') {
            throw new DeveloperError('top is required.');
        }
        if (typeof near === 'undefined') {
            throw new DeveloperError('near is required.');
        }
        if (typeof far === 'undefined') {
            throw new DeveloperError('far is required.');
        }

        var column0Row0 = 2.0 * near / (right - left);
        var column1Row1 = 2.0 * near / (top - bottom);
        var column2Row0 = (right + left) / (right - left);
        var column2Row1 = (top + bottom) / (top - bottom);
        var column2Row2 = -(far + near) / (far - near);
        var column2Row3 = -1.0;
        var column3Row2 = -2.0 * far * near / (far - near);

        if (typeof result === 'undefined') {
            return new Matrix4(column0Row0, 0.0,         column2Row0, 0.0,
                                       0.0, column1Row1, column2Row1, 0.0,
                                       0.0, 0.0,         column2Row2, column3Row2,
                                       0.0, 0.0,         column2Row3, 0.0);
        }

        result[0] = column0Row0;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = column1Row1;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = column2Row0;
        result[9] = column2Row1;
        result[10] = column2Row2;
        result[11] = column2Row3;
        result[12] = 0.0;
        result[13] = 0.0;
        result[14] = column3Row2;
        result[15] = 0.0;
        return result;
    };

    /**
     * Computes a Matrix4 instance representing an infinite off center perspective transformation.
     * @memberof Matrix4
     *
     * @param {Number} left The number of meters to the left of the camera that will be in view.
     * @param {Number} right The number of meters to the right of the camera that will be in view.
     * @param {Number} bottom The number of meters below of the camera that will be in view.
     * @param {Number} top The number of meters above of the camera that will be in view.
     * @param {Number} near The distance to the near plane in meters.
     * @param {Number} far The distance to the far plane in meters.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     * @exception {DeveloperError} bottom is required.
     * @exception {DeveloperError} top is required.
     * @exception {DeveloperError} near is required.
     */
    Matrix4.computeInfinitePerspectiveOffCenter = function(left, right, bottom, top, near, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required.');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required.');
        }
        if (typeof bottom === 'undefined') {
            throw new DeveloperError('bottom is required.');
        }
        if (typeof top === 'undefined') {
            throw new DeveloperError('top is required.');
        }
        if (typeof near === 'undefined') {
            throw new DeveloperError('near is required.');
        }

        var column0Row0 = 2.0 * near / (right - left);
        var column1Row1 = 2.0 * near / (top - bottom);
        var column2Row0 = (right + left) / (right - left);
        var column2Row1 = (top + bottom) / (top - bottom);
        var column2Row2 = -1.0;
        var column2Row3 = -1.0;
        var column3Row2 = -2.0 * near;

        if (typeof result === 'undefined') {
            return new Matrix4(column0Row0, 0.0,         column2Row0, 0.0,
                                       0.0, column1Row1, column2Row1, 0.0,
                                       0.0, 0.0,         column2Row2, column3Row2,
                                       0.0, 0.0,         column2Row3, 0.0);
        }

        result[0] = column0Row0;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = column1Row1;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = column2Row0;
        result[9] = column2Row1;
        result[10] = column2Row2;
        result[11] = column2Row3;
        result[12] = 0.0;
        result[13] = 0.0;
        result[14] = column3Row2;
        result[15] = 0.0;
        return result;
    };

    /**
     * Computes a Matrix4 instance that transforms from normalized device coordinates to window coordinates.
     * @memberof Matrix4
     *
     * @param {Object}[viewport = { x : 0.0, y : 0.0, width : 0.0, height : 0.0 }] The viewport's corners as shown in Example 1.
     * @param {Number}[nearDepthRange = 0.0] The near plane distance in window coordinates.
     * @param {Number}[farDepthRange = 1.0] The far plane distance in window coordinates.
     * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
     * @returns The modified result parameter, or a new Matrix4 instance if one was not provided.
     *
     * @see czm_viewportTransformation
     * @see Context#getViewport
     *
     * @example
     * // Example 1.  Create viewport transformation using an explicit viewport and depth range.
     * var m = Matrix4.computeViewportTransformation({
     *     x : 0.0,
     *     y : 0.0,
     *     width : 1024.0,
     *     height : 768.0
     * }, 0.0, 1.0);
     *
     * // Example 2.  Create viewport transformation using the context's viewport.
     * var m = Matrix4.computeViewportTransformation(context.getViewport());
     */
    Matrix4.computeViewportTransformation = function(viewport, nearDepthRange, farDepthRange, result) {
        viewport = defaultValue(viewport, defaultValue.EMPTY_OBJECT);
        var x = defaultValue(viewport.x, 0.0);
        var y = defaultValue(viewport.y, 0.0);
        var width = defaultValue(viewport.width, 0.0);
        var height = defaultValue(viewport.height, 0.0);
        nearDepthRange = defaultValue(nearDepthRange, 0.0);
        farDepthRange = defaultValue(farDepthRange, 1.0);

        var halfWidth = width * 0.5;
        var halfHeight = height * 0.5;
        var halfDepth = (farDepthRange - nearDepthRange) * 0.5;

        var column0Row0 = halfWidth;
        var column1Row1 = halfHeight;
        var column2Row2 = halfDepth;
        var column3Row0 = x + halfWidth;
        var column3Row1 = y + halfHeight;
        var column3Row2 = nearDepthRange + halfDepth;
        var column3Row3 = 1.0;

        if (typeof result === 'undefined') {
            return new Matrix4(column0Row0, 0.0,         0.0,         column3Row0,
                               0.0,         column1Row1, 0.0,         column3Row1,
                               0.0,         0.0,         column2Row2, column3Row2,
                               0.0,         0.0,         0.0,         column3Row3);
        }
        result[0] = column0Row0;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = column1Row1;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = 0.0;
        result[9] = 0.0;
        result[10] = column2Row2;
        result[11] = 0.0;
        result[12] = column3Row0;
        result[13] = column3Row1;
        result[14] = column3Row2;
        result[15] = column3Row3;
        return result;
    };

    /**
     * Computes an Array from the provided Matrix4 instance.
     * The array will be in column-major order.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to use..
     * @param {Array} [result] The Array onto which to store the result.
     * @return {Array} The modified Array parameter or a new Array instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix4.toArray = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof result === 'undefined') {
            return [matrix[0], matrix[1], matrix[2], matrix[3],
                    matrix[4], matrix[5], matrix[6], matrix[7],
                    matrix[8], matrix[9], matrix[10], matrix[11],
                    matrix[12], matrix[13], matrix[14], matrix[15]];
        }
        result[0] = matrix[0];
        result[1] = matrix[1];
        result[2] = matrix[2];
        result[3] = matrix[3];
        result[4] = matrix[4];
        result[5] = matrix[5];
        result[6] = matrix[6];
        result[7] = matrix[7];
        result[8] = matrix[8];
        result[9] = matrix[9];
        result[10] = matrix[10];
        result[11] = matrix[11];
        result[12] = matrix[12];
        result[13] = matrix[13];
        result[14] = matrix[14];
        result[15] = matrix[15];
        return result;
    };

    /**
     * Computes the array index of the element at the provided row and column.
     * @memberof Matrix4
     *
     * @param {Number} row The zero-based index of the row.
     * @param {Number} column The zero-based index of the column.
     * @return {Number} The index of the element at the provided row and column.
     *
     * @exception {DeveloperError} row is required and must be 0, 1, 2, or 3.
     * @exception {DeveloperError} column is required and must be 0, 1, 2, or 3.
     *
     * @example
     * var myMatrix = new Matrix4();
     * var column1Row0Index = Matrix4.getElementIndex(1, 0);
     * var column1Row0 = myMatrix[column1Row0Index]
     * myMatrix[column1Row0Index] = 10.0;
     */
    Matrix4.getElementIndex = function(column, row) {
        if (typeof row !== 'number' || row < 0 || row > 3) {
            throw new DeveloperError('row is required and must be 0, 1, 2, or 3.');
        }
        if (typeof column !== 'number' || column < 0 || column > 3) {
            throw new DeveloperError('column is required and must be 0, 1, 2, or 3.');
        }
        return column * 4 + row;
    };

    /**
     * Retrieves a copy of the matrix column at the provided index as a Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to retrieve.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.getColumn = function(matrix, index, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required.');
        }

        if (typeof index !== 'number' || index < 0 || index > 3) {
            throw new DeveloperError('index is required and must be 0, 1, 2, or 3.');
        }

        var startIndex = index * 4;
        var x = matrix[startIndex];
        var y = matrix[startIndex + 1];
        var z = matrix[startIndex + 2];
        var w = matrix[startIndex + 3];

        if (typeof result === 'undefined') {
            return new Cartesian4(x, y, z, w);
        }
        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the column to set.
     * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified column.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.setColumn = function(matrix, index, cartesian, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof index !== 'number' || index < 0 || index > 3) {
            throw new DeveloperError('index is required and must be 0, 1, 2, or 3.');
        }
        result = Matrix4.clone(matrix, result);
        var startIndex = index * 4;
        result[startIndex] = cartesian.x;
        result[startIndex + 1] = cartesian.y;
        result[startIndex + 2] = cartesian.z;
        result[startIndex + 3] = cartesian.w;
        return result;
    };

    /**
     * Retrieves a copy of the matrix row at the provided index as a Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the row to retrieve.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.getRow = function(matrix, index, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required.');
        }

        if (typeof index !== 'number' || index < 0 || index > 3) {
            throw new DeveloperError('index is required and must be 0, 1, 2, or 3.');
        }

        var x = matrix[index];
        var y = matrix[index + 4];
        var z = matrix[index + 8];
        var w = matrix[index + 12];

        if (typeof result === 'undefined') {
            return new Cartesian4(x, y, z, w);
        }
        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    /**
     * Computes a new matrix that replaces the specified row in the provided matrix with the provided Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Number} index The zero-based index of the row to set.
     * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified row.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.setRow = function(matrix, index, cartesian, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }
        if (typeof index !== 'number' || index < 0 || index > 3) {
            throw new DeveloperError('index is required and must be 0, 1, 2, or 3.');
        }

        result = Matrix4.clone(matrix, result);
        result[index] = cartesian.x;
        result[index + 4] = cartesian.y;
        result[index + 8] = cartesian.z;
        result[index + 12] = cartesian.w;
        return result;
    };

    /**
     * Computes the product of two matrices.
     * @memberof Matrix4
     *
     * @param {Matrix4} left The first matrix.
     * @param {Matrix4} right The second matrix.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     */
    Matrix4.multiply = function(left, right, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required');
        }
        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required');
        }

        var left0 = left[0];
        var left1 = left[1];
        var left2 = left[2];
        var left3 = left[3];
        var left4 = left[4];
        var left5 = left[5];
        var left6 = left[6];
        var left7 = left[7];
        var left8 = left[8];
        var left9 = left[9];
        var left10 = left[10];
        var left11 = left[11];
        var left12 = left[12];
        var left13 = left[13];
        var left14 = left[14];
        var left15 = left[15];

        var right0 = right[0];
        var right1 = right[1];
        var right2 = right[2];
        var right3 = right[3];
        var right4 = right[4];
        var right5 = right[5];
        var right6 = right[6];
        var right7 = right[7];
        var right8 = right[8];
        var right9 = right[9];
        var right10 = right[10];
        var right11 = right[11];
        var right12 = right[12];
        var right13 = right[13];
        var right14 = right[14];
        var right15 = right[15];

        var column0Row0 = left0 * right0 + left4 * right1 + left8 * right2 + left12 * right3;
        var column0Row1 = left1 * right0 + left5 * right1 + left9 * right2 + left13 * right3;
        var column0Row2 = left2 * right0 + left6 * right1 + left10 * right2 + left14 * right3;
        var column0Row3 = left3 * right0 + left7 * right1 + left11 * right2 + left15 * right3;

        var column1Row0 = left0 * right4 + left4 * right5 + left8 * right6 + left12 * right7;
        var column1Row1 = left1 * right4 + left5 * right5 + left9 * right6 + left13 * right7;
        var column1Row2 = left2 * right4 + left6 * right5 + left10 * right6 + left14 * right7;
        var column1Row3 = left3 * right4 + left7 * right5 + left11 * right6 + left15 * right7;

        var column2Row0 = left0 * right8 + left4 * right9 + left8 * right10 + left12 * right11;
        var column2Row1 = left1 * right8 + left5 * right9 + left9 * right10 + left13 * right11;
        var column2Row2 = left2 * right8 + left6 * right9 + left10 * right10 + left14 * right11;
        var column2Row3 = left3 * right8 + left7 * right9 + left11 * right10 + left15 * right11;

        var column3Row0 = left0 * right12 + left4 * right13 + left8 * right14 + left12 * right15;
        var column3Row1 = left1 * right12 + left5 * right13 + left9 * right14 + left13 * right15;
        var column3Row2 = left2 * right12 + left6 * right13 + left10 * right14 + left14 * right15;
        var column3Row3 = left3 * right12 + left7 * right13 + left11 * right14 + left15 * right15;

        if (typeof result === 'undefined') {
            return new Matrix4(column0Row0, column1Row0, column2Row0, column3Row0,
                               column0Row1, column1Row1, column2Row1, column3Row1,
                               column0Row2, column1Row2, column2Row2, column3Row2,
                               column0Row3, column1Row3, column2Row3, column3Row3);
        }
        result[0] = column0Row0;
        result[1] = column0Row1;
        result[2] = column0Row2;
        result[3] = column0Row3;
        result[4] = column1Row0;
        result[5] = column1Row1;
        result[6] = column1Row2;
        result[7] = column1Row3;
        result[8] = column2Row0;
        result[9] = column2Row1;
        result[10] = column2Row2;
        result[11] = column2Row3;
        result[12] = column3Row0;
        result[13] = column3Row1;
        result[14] = column3Row2;
        result[15] = column3Row3;
        return result;
    };

    /**
     * Multiplies a transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
     * by an implicit translation matrix defined by a {@link Cartesian3}.  This is an optimization
     * for <code>Matrix4.multiply(m, Matrix4.fromTranslation(position), m);</code> with less allocations and arithmetic operations.
     *
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix on the left-hand side.
     * @param {Cartesian3} translation The translation on the right-hand side.
     * @param {Matrix4} [result] The object onto which to store the result.
     *
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} translation is required.
     *
     * @see Matrix4#fromTranslation
     *
     * @example
     * // Instead of Matrix4.multiply(m, Matrix4.fromTranslation(position), m);
     * Matrix4.multiplyByTranslation(m, position, m);
     */
    Matrix4.multiplyByTranslation = function(matrix, translation, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof translation === 'undefined') {
            throw new DeveloperError('translation is required');
        }

        var x = translation.x;
        var y = translation.y;
        var z = translation.z;

        var tx = (x * matrix[0]) + (y * matrix[4]) + (z * matrix[8]) + matrix[12];
        var ty = (x * matrix[1]) + (y * matrix[5]) + (z * matrix[9]) + matrix[13];
        var tz = (x * matrix[2]) + (y * matrix[6]) + (z * matrix[10]) + matrix[14];

        if (typeof result === 'undefined') {
            return new Matrix4(matrix[0], matrix[4], matrix[8], tx,
                               matrix[1], matrix[5], matrix[9], ty,
                               matrix[2], matrix[6], matrix[10], tz,
                               matrix[3], matrix[7], matrix[11], matrix[15]);
        }

        result[0] = matrix[0];
        result[1] = matrix[1];
        result[2] = matrix[2];
        result[3] = matrix[3];
        result[4] = matrix[4];
        result[5] = matrix[5];
        result[6] = matrix[6];
        result[7] = matrix[7];
        result[8] = matrix[8];
        result[9] = matrix[9];
        result[10] = matrix[10];
        result[11] = matrix[11];
        result[12] = tx;
        result[13] = ty;
        result[14] = tz;
        result[15] = matrix[15];
        return result;
    };

    /**
     * Multiplies a transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
     * by an implicit uniform scale matrix.  This is an optimization
     * for <code>Matrix4.multiply(m, Matrix4.fromScale(scale), m);</code> with less allocations and arithmetic operations.
     *
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix on the left-hand side.
     * @param {Number} scale The uniform scale on the right-hand side.
     * @param {Matrix4} [result] The object onto which to store the result.
     *
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} scale is required.
     *
     * @see Matrix4#fromUniformScale
     *
     * @example
     * // Instead of Matrix4.multiply(m, Matrix4.fromUniformScale(scale), m);
     * Matrix4.multiplyByUniformScale(m, scale, m);
     */
    Matrix4.multiplyByUniformScale = function(matrix, scale, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof scale !== 'number') {
            throw new DeveloperError('scale is required');
        }

        if (scale === 1.0) {
            return Matrix4.clone(matrix, result);
        }

        if (typeof result === 'undefined') {
            return new Matrix4(
                scale * matrix[0], scale * matrix[4], scale * matrix[8],  matrix[12],
                scale * matrix[1], scale * matrix[5], scale * matrix[9],  matrix[13],
                scale * matrix[2], scale * matrix[6], scale * matrix[10], matrix[14],
                0.0,               0.0,               0.0,                1.0);
        }

        result[0] = scale * matrix[0];
        result[1] = scale * matrix[1];
        result[2] = scale * matrix[2];
        result[3] = 0.0;
        result[4] = scale * matrix[4];
        result[5] = scale * matrix[5];
        result[6] = scale * matrix[6];
        result[7] = 0.0;
        result[8] = scale * matrix[8];
        result[9] = scale * matrix[9];
        result[10] = scale * matrix[10];
        result[11] = 0.0;
        result[12] = matrix[12];
        result[13] = matrix[13];
        result[14] = matrix[14];
        result[15] = 1.0;
        return result;
    };

    /**
     * Computes the product of a matrix and a column vector.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Cartesian4} cartesian The vector.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} cartesian is required.
     */
    Matrix4.multiplyByVector = function(matrix, cartesian, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }

        var vX = cartesian.x;
        var vY = cartesian.y;
        var vZ = cartesian.z;
        var vW = cartesian.w;

        var x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12] * vW;
        var y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13] * vW;
        var z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14] * vW;
        var w = matrix[3] * vX + matrix[7] * vY + matrix[11] * vZ + matrix[15] * vW;

        if (typeof result === 'undefined') {
            return new Cartesian4(x, y, z, w);
        }
        result.x = x;
        result.y = y;
        result.z = z;
        result.w = w;
        return result;
    };

    var scratchPoint = new Cartesian4(0.0, 0.0, 0.0, 1.0);

    /**
     * Computes the product of a matrix and a {@link Cartesian3}.  This is equivalent to calling {@link Matrix4.multiplyByVector}
     * with a {@link Cartesian4} with a <code>w</code> component of one.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Cartesian3} cartesian The point.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     *
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} matrix is required.
     *
     * @example
     * Cartesian3 p = new Cartesian3(1.0, 2.0, 3.0);
     * Matrix4.multiplyByPoint(matrix, p, result);
     * // A shortcut for
     * //   Cartesian3 p = ...
     * //   Matrix4.multiplyByVector(matrix, new Cartesian4(p.x, p.y, p.z, 1.0), result);
     */
    Matrix4.multiplyByPoint = function(matrix, cartesian, result) {
        if (typeof cartesian === 'undefined') {
            throw new DeveloperError('cartesian is required');
        }

        scratchPoint.x = cartesian.x;
        scratchPoint.y = cartesian.y;
        scratchPoint.z = cartesian.z;
        // scratchPoint.w is one.  See above.

        return Matrix4.multiplyByVector(matrix, scratchPoint, result);
    };

    /**
     * Computes the product of a matrix and a scalar.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix.
     * @param {Number} scalar The number to multiply by.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Matrix4.multiplyByScalar = function(matrix, scalar, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof scalar !== 'number') {
            throw new DeveloperError('scalar is required and must be a number');
        }

        if (typeof result === 'undefined') {
            return new Matrix4(matrix[0] * scalar, matrix[4] * scalar, matrix[8] * scalar, matrix[12] * scalar,
                               matrix[1] * scalar, matrix[5] * scalar, matrix[9] * scalar, matrix[13] * scalar,
                               matrix[2] * scalar, matrix[6] * scalar, matrix[10] * scalar, matrix[14] * scalar,
                               matrix[3] * scalar, matrix[7] * scalar, matrix[11] * scalar, matrix[15] * scalar);
        }
        result[0] = matrix[0] * scalar;
        result[1] = matrix[1] * scalar;
        result[2] = matrix[2] * scalar;
        result[3] = matrix[3] * scalar;
        result[4] = matrix[4] * scalar;
        result[5] = matrix[5] * scalar;
        result[6] = matrix[6] * scalar;
        result[7] = matrix[7] * scalar;
        result[8] = matrix[8] * scalar;
        result[9] = matrix[9] * scalar;
        result[10] = matrix[10] * scalar;
        result[11] = matrix[11] * scalar;
        result[12] = matrix[12] * scalar;
        result[13] = matrix[13] * scalar;
        result[14] = matrix[14] * scalar;
        result[15] = matrix[15] * scalar;
        return result;
    };

    /**
     * Computes a negated copy of the provided matrix.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to negate.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix4.negate = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }

        if (typeof result === 'undefined') {
            return new Matrix4(-matrix[0], -matrix[4], -matrix[8], -matrix[12],
                               -matrix[1], -matrix[5], -matrix[9], -matrix[13],
                               -matrix[2], -matrix[6], -matrix[10], -matrix[14],
                               -matrix[3], -matrix[7], -matrix[11], -matrix[15]);
        }
        result[0] = -matrix[0];
        result[1] = -matrix[1];
        result[2] = -matrix[2];
        result[3] = -matrix[3];
        result[4] = -matrix[4];
        result[5] = -matrix[5];
        result[6] = -matrix[6];
        result[7] = -matrix[7];
        result[8] = -matrix[8];
        result[9] = -matrix[9];
        result[10] = -matrix[10];
        result[11] = -matrix[11];
        result[12] = -matrix[12];
        result[13] = -matrix[13];
        result[14] = -matrix[14];
        result[15] = -matrix[15];
        return result;
    };

    /**
     * Computes the transpose of the provided matrix.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to transpose.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix4.transpose = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof result === 'undefined') {
            return new Matrix4(matrix[0], matrix[1], matrix[2], matrix[3],
                               matrix[4], matrix[5], matrix[6], matrix[7],
                               matrix[8], matrix[9], matrix[10], matrix[11],
                               matrix[12], matrix[13], matrix[14], matrix[15]);
        }

        var matrix1 = matrix[1];
        var matrix2 = matrix[2];
        var matrix3 = matrix[3];
        var matrix6 = matrix[6];
        var matrix7 = matrix[7];
        var matrix11 = matrix[11];

        result[0] = matrix[0];
        result[1] = matrix[4];
        result[2] = matrix[8];
        result[3] = matrix[12];
        result[4] = matrix1;
        result[5] = matrix[5];
        result[6] = matrix[9];
        result[7] = matrix[13];
        result[8] = matrix2;
        result[9] = matrix6;
        result[10] = matrix[10];
        result[11] = matrix[14];
        result[12] = matrix3;
        result[13] = matrix7;
        result[14] = matrix11;
        result[15] = matrix[15];
        return result;
    };

    /**
     * Compares the provided matrices componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Matrix4
     *
     * @param {Matrix4} [left] The first matrix.
     * @param {Matrix4} [right] The second matrix.
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    Matrix4.equals = function(left, right) {
        return (left === right) ||
               (typeof left !== 'undefined' &&
                typeof right !== 'undefined' &&
                left[0] === right[0] &&
                left[1] === right[1] &&
                left[2] === right[2] &&
                left[3] === right[3] &&
                left[4] === right[4] &&
                left[5] === right[5] &&
                left[6] === right[6] &&
                left[7] === right[7] &&
                left[8] === right[8] &&
                left[9] === right[9] &&
                left[10] === right[10] &&
                left[11] === right[11] &&
                left[12] === right[12] &&
                left[13] === right[13] &&
                left[14] === right[14] &&
                left[15] === right[15]);
    };

    /**
     * Compares the provided matrices componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     * @memberof Matrix4
     *
     * @param {Matrix4} [left] The first matrix.
     * @param {Matrix4} [right] The second matrix.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    Matrix4.equalsEpsilon = function(left, right, epsilon) {
        if (typeof epsilon !== 'number') {
            throw new DeveloperError('epsilon is required and must be a number');
        }

        return (left === right) ||
                (typeof left !== 'undefined' &&
                typeof right !== 'undefined' &&
                Math.abs(left[0] - right[0]) <= epsilon &&
                Math.abs(left[1] - right[1]) <= epsilon &&
                Math.abs(left[2] - right[2]) <= epsilon &&
                Math.abs(left[3] - right[3]) <= epsilon &&
                Math.abs(left[4] - right[4]) <= epsilon &&
                Math.abs(left[5] - right[5]) <= epsilon &&
                Math.abs(left[6] - right[6]) <= epsilon &&
                Math.abs(left[7] - right[7]) <= epsilon &&
                Math.abs(left[8] - right[8]) <= epsilon &&
                Math.abs(left[9] - right[9]) <= epsilon &&
                Math.abs(left[10] - right[10]) <= epsilon &&
                Math.abs(left[11] - right[11]) <= epsilon &&
                Math.abs(left[12] - right[12]) <= epsilon &&
                Math.abs(left[13] - right[13]) <= epsilon &&
                Math.abs(left[14] - right[14]) <= epsilon &&
                Math.abs(left[15] - right[15]) <= epsilon);
    };

    /**
     * Gets the translation portion of the provided matrix, assuming the matrix is a affine transformation matrix.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     *
     * @see Cartesian3
     */
    Matrix4.getTranslation = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof result === 'undefined') {
            return new Cartesian3(matrix[12], matrix[13], matrix[14]);
        }
        result.x = matrix[12];
        result.y = matrix[13];
        result.z = matrix[14];
        return result;
    };

    /**
     * Gets the upper left 3x3 rotation matrix of the provided matrix, assuming the matrix is a affine transformation matrix.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to use.
     * @param {Matrix3} [result] The object onto which to store the result.
     * @return {Matrix3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     *
     * @see Matrix3
     */
    Matrix4.getRotation = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }
        if (typeof result === 'undefined') {
            return new Matrix3(matrix[0], matrix[4], matrix[8],
                               matrix[1], matrix[5], matrix[9],
                               matrix[2], matrix[6], matrix[10]);
        }
        result[0] = matrix[0];
        result[1] = matrix[1];
        result[2] = matrix[2];
        result[3] = matrix[4];
        result[4] = matrix[5];
        result[5] = matrix[6];
        result[6] = matrix[8];
        result[7] = matrix[9];
        result[8] = matrix[10];
        return result;
    };

     /**
      * Computes the inverse of the provided matrix using Cramers Rule.
      * If the determinant is zero, the matrix can not be inverted, and an exception is thrown.
      * If the matrix is an affine transformation matrix, it is more efficient
      * to invert it with {@link #inverseTransformation}.
      * @memberof Matrix4
      *
      * @param {Matrix4} matrix The matrix to invert.
      * @param {Matrix4} [result] The object onto which to store the result.
      * @return {Matrix4} The modified result parameter or a new Cartesian3 instance if one was not provided.
      *
      * @exception {DeveloperError} matrix is required.
      * @exception {RuntimeError} matrix is not invertible because its determinate is zero.
      */
    Matrix4.inverse = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }

        //
        // Ported from:
        //   ftp://download.intel.com/design/PentiumIII/sml/24504301.pdf
        //
        var src0 = matrix[0];
        var src1 = matrix[4];
        var src2 = matrix[8];
        var src3 = matrix[12];
        var src4 = matrix[1];
        var src5 = matrix[5];
        var src6 = matrix[9];
        var src7 = matrix[13];
        var src8 = matrix[2];
        var src9 = matrix[6];
        var src10 = matrix[10];
        var src11 = matrix[14];
        var src12 = matrix[3];
        var src13 = matrix[7];
        var src14 = matrix[11];
        var src15 = matrix[15];

        // calculate pairs for first 8 elements (cofactors)
        var tmp0 = src10 * src15;
        var tmp1 = src11 * src14;
        var tmp2 = src9 * src15;
        var tmp3 = src11 * src13;
        var tmp4 = src9 * src14;
        var tmp5 = src10 * src13;
        var tmp6 = src8 * src15;
        var tmp7 = src11 * src12;
        var tmp8 = src8 * src14;
        var tmp9 = src10 * src12;
        var tmp10 = src8 * src13;
        var tmp11 = src9 * src12;

        // calculate first 8 elements (cofactors)
        var dst0 = (tmp0 * src5 + tmp3 * src6 + tmp4 * src7) - (tmp1 * src5 + tmp2 * src6 + tmp5 * src7);
        var dst1 = (tmp1 * src4 + tmp6 * src6 + tmp9 * src7) - (tmp0 * src4 + tmp7 * src6 + tmp8 * src7);
        var dst2 = (tmp2 * src4 + tmp7 * src5 + tmp10 * src7) - (tmp3 * src4 + tmp6 * src5 + tmp11 * src7);
        var dst3 = (tmp5 * src4 + tmp8 * src5 + tmp11 * src6) - (tmp4 * src4 + tmp9 * src5 + tmp10 * src6);
        var dst4 = (tmp1 * src1 + tmp2 * src2 + tmp5 * src3) - (tmp0 * src1 + tmp3 * src2 + tmp4 * src3);
        var dst5 = (tmp0 * src0 + tmp7 * src2 + tmp8 * src3) - (tmp1 * src0 + tmp6 * src2 + tmp9 * src3);
        var dst6 = (tmp3 * src0 + tmp6 * src1 + tmp11 * src3) - (tmp2 * src0 + tmp7 * src1 + tmp10 * src3);
        var dst7 = (tmp4 * src0 + tmp9 * src1 + tmp10 * src2) - (tmp5 * src0 + tmp8 * src1 + tmp11 * src2);

        // calculate pairs for second 8 elements (cofactors)
        tmp0 = src2 * src7;
        tmp1 = src3 * src6;
        tmp2 = src1 * src7;
        tmp3 = src3 * src5;
        tmp4 = src1 * src6;
        tmp5 = src2 * src5;
        tmp6 = src0 * src7;
        tmp7 = src3 * src4;
        tmp8 = src0 * src6;
        tmp9 = src2 * src4;
        tmp10 = src0 * src5;
        tmp11 = src1 * src4;

        // calculate second 8 elements (cofactors)
        var dst8 = (tmp0 * src13 + tmp3 * src14 + tmp4 * src15) - (tmp1 * src13 + tmp2 * src14 + tmp5 * src15);
        var dst9 = (tmp1 * src12 + tmp6 * src14 + tmp9 * src15) - (tmp0 * src12 + tmp7 * src14 + tmp8 * src15);
        var dst10 = (tmp2 * src12 + tmp7 * src13 + tmp10 * src15) - (tmp3 * src12 + tmp6 * src13 + tmp11 * src15);
        var dst11 = (tmp5 * src12 + tmp8 * src13 + tmp11 * src14) - (tmp4 * src12 + tmp9 * src13 + tmp10 * src14);
        var dst12 = (tmp2 * src10 + tmp5 * src11 + tmp1 * src9) - (tmp4 * src11 + tmp0 * src9 + tmp3 * src10);
        var dst13 = (tmp8 * src11 + tmp0 * src8 + tmp7 * src10) - (tmp6 * src10 + tmp9 * src11 + tmp1 * src8);
        var dst14 = (tmp6 * src9 + tmp11 * src11 + tmp3 * src8) - (tmp10 * src11 + tmp2 * src8 + tmp7 * src9);
        var dst15 = (tmp10 * src10 + tmp4 * src8 + tmp9 * src9) - (tmp8 * src9 + tmp11 * src10 + tmp5 * src8);

        // calculate determinant
        var det = src0 * dst0 + src1 * dst1 + src2 * dst2 + src3 * dst3;

        if (Math.abs(det) < CesiumMath.EPSILON20) {
            throw new RuntimeError('matrix is not invertible because its determinate is zero.');
        }

        // calculate matrix inverse
        det = 1.0 / det;
        if (typeof result === 'undefined') {
            return new Matrix4(dst0 * det, dst4 * det, dst8 * det, dst12 * det,
                               dst1 * det, dst5 * det, dst9 * det, dst13 * det,
                               dst2 * det, dst6 * det, dst10 * det, dst14 * det,
                               dst3 * det, dst7 * det, dst11 * det, dst15 * det);
        }

        result[0] = dst0 * det;
        result[1] = dst1 * det;
        result[2] = dst2 * det;
        result[3] = dst3 * det;
        result[4] = dst4 * det;
        result[5] = dst5 * det;
        result[6] = dst6 * det;
        result[7] = dst7 * det;
        result[8] = dst8 * det;
        result[9] = dst9 * det;
        result[10] = dst10 * det;
        result[11] = dst11 * det;
        result[12] = dst12 * det;
        result[13] = dst13 * det;
        result[14] = dst14 * det;
        result[15] = dst15 * det;
        return result;
    };

    /**
     * Computes the inverse of the provided matrix assuming it is
     * an affine transformation matrix, where the upper left 3x3 elements
     * are a rotation matrix, and the upper three elements in the fourth
     * column are the translation.  The bottom row is assumed to be [0, 0, 0, 1].
     * The matrix is not verified to be in the proper form.
     * This method is faster than computing the inverse for a general 4x4
     * matrix using {@link #inverse}.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to invert.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Cartesian3 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix4.inverseTransformation = function(matrix, result) {
        if (typeof matrix === 'undefined') {
            throw new DeveloperError('matrix is required');
        }

        //This function is an optimized version of the below 4 lines.
        //var rT = Matrix3.transpose(Matrix4.getRotation(matrix));
        //var rTN = Matrix3.negate(rT);
        //var rTT = Matrix3.multiplyByVector(rTN, Matrix4.getTranslation(matrix));
        //return Matrix4.fromRotationTranslation(rT, rTT, result);

        var matrix0 = matrix[0];
        var matrix1 = matrix[1];
        var matrix2 = matrix[2];
        var matrix4 = matrix[4];
        var matrix5 = matrix[5];
        var matrix6 = matrix[6];
        var matrix8 = matrix[8];
        var matrix9 = matrix[9];
        var matrix10 = matrix[10];

        var vX = matrix[12];
        var vY = matrix[13];
        var vZ = matrix[14];

        var x = -matrix0 * vX - matrix1 * vY - matrix2 * vZ;
        var y = -matrix4 * vX - matrix5 * vY - matrix6 * vZ;
        var z = -matrix8 * vX - matrix9 * vY - matrix10 * vZ;

        if (typeof result === 'undefined') {
            return new Matrix4(matrix0, matrix1, matrix2,  x,
                               matrix4, matrix5, matrix6,  y,
                               matrix8, matrix9, matrix10, z,
                               0.0,         0.0,      0.0, 1.0);
        }
        result[0] = matrix0;
        result[1] = matrix4;
        result[2] = matrix8;
        result[3] = 0.0;
        result[4] = matrix1;
        result[5] = matrix5;
        result[6] = matrix9;
        result[7] = 0.0;
        result[8] = matrix2;
        result[9] = matrix6;
        result[10] = matrix10;
        result[11] = 0.0;
        result[12] = x;
        result[13] = y;
        result[14] = z;
        result[15] = 1.0;
        return result;
    };

    /**
     * An immutable Matrix4 instance initialized to the identity matrix.
     * @memberof Matrix4
     */
    Matrix4.IDENTITY = freezeObject(new Matrix4(1.0, 0.0, 0.0, 0.0,
                                                0.0, 1.0, 0.0, 0.0,
                                                0.0, 0.0, 1.0, 0.0,
                                                0.0, 0.0, 0.0, 1.0));

    /**
     * The index into Matrix4 for column 0, row 0.
     * @memberof Matrix4
     */
    Matrix4.COLUMN0ROW0 = 0;

    /**
     * The index into Matrix4 for column 0, row 1.
     * @memberof Matrix4
     */
    Matrix4.COLUMN0ROW1 = 1;

    /**
     * The index into Matrix4 for column 0, row 2.
     * @memberof Matrix4
     */
    Matrix4.COLUMN0ROW2 = 2;

    /**
     * The index into Matrix4 for column 0, row 3.
     * @memberof Matrix4
     */
    Matrix4.COLUMN0ROW3 = 3;

    /**
     * The index into Matrix4 for column 1, row 0.
     * @memberof Matrix4
     */
    Matrix4.COLUMN1ROW0 = 4;

    /**
     * The index into Matrix4 for column 1, row 1.
     * @memberof Matrix4
     */
    Matrix4.COLUMN1ROW1 = 5;

    /**
     * The index into Matrix4 for column 1, row 2.
     * @memberof Matrix4
     */
    Matrix4.COLUMN1ROW2 = 6;

    /**
     * The index into Matrix4 for column 1, row 3.
     * @memberof Matrix4
     */
    Matrix4.COLUMN1ROW3 = 7;

    /**
     * The index into Matrix4 for column 2, row 0.
     * @memberof Matrix4
     */
    Matrix4.COLUMN2ROW0 = 8;

    /**
     * The index into Matrix4 for column 2, row 1.
     * @memberof Matrix4
     */
    Matrix4.COLUMN2ROW1 = 9;

    /**
     * The index into Matrix4 for column 2, row 2.
     * @memberof Matrix4
     */
    Matrix4.COLUMN2ROW2 = 10;

    /**
     * The index into Matrix4 for column 2, row 3.
     * @memberof Matrix4
     */
    Matrix4.COLUMN2ROW3 = 11;

    /**
     * The index into Matrix4 for column 3, row 0.
     * @memberof Matrix4
     */
    Matrix4.COLUMN3ROW0 = 12;

    /**
     * The index into Matrix4 for column 3, row 1.
     * @memberof Matrix4
     */
    Matrix4.COLUMN3ROW1 = 13;

    /**
     * The index into Matrix4 for column 3, row 2.
     * @memberof Matrix4
     */
    Matrix4.COLUMN3ROW2 = 14;

    /**
     * The index into Matrix4 for column 3, row 3.
     * @memberof Matrix4
     */
    Matrix4.COLUMN3ROW3 = 15;

    /**
     * Duplicates the provided Matrix4 instance.
     * @memberof Matrix4
     *
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     */
    Matrix4.prototype.clone = function(result) {
        return Matrix4.clone(this, result);
    };

    /**
     * Computes an Array from this Matrix4 instance.
     * @memberof Matrix4
     *
     * @param {Array} [result] The Array onto which to store the result.
     * @return {Array} The modified Array parameter or a new Array instance if one was not provided.
     */
    Matrix4.prototype.toArray = function(result) {
        return Matrix4.toArray(this, result);
    };

    /**
     * Retrieves a copy of the matrix column at the provided index as a Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Number} index The zero-based index of the column to retrieve.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     *
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.prototype.getColumn = function(index, result) {
        return Matrix4.getColumn(this, index, result);
    };

    /**
     * Computes a new matrix that replaces the specified column in this matrix with the provided Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Number} index The zero-based index of the column to set.
     * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified column.
     *
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.prototype.setColumn = function(index, cartesian, result) {
        return Matrix4.setColumn(this, index, cartesian, result);
    };

    /**
     * Retrieves a copy of the matrix row at the provided index as a Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Number} index The zero-based index of the row to retrieve.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     *
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.prototype.getRow = function(index, result) {
        return Matrix4.getRow(this, index, result);
    };

    /**
     * Computes a new matrix that replaces the specified row in this matrix with the provided Cartesian4 instance.
     * @memberof Matrix4
     *
     * @param {Number} index The zero-based index of the row to set.
     * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified row.
     *
     * @exception {DeveloperError} cartesian is required.
     * @exception {DeveloperError} index is required and must be 0, 1, 2, or 3.
     *
     * @see Cartesian4
     */
    Matrix4.prototype.setRow = function(index, cartesian, result) {
        return Matrix4.setRow(this, index, cartesian, result);
    };

    /**
     * Computes the product of this matrix and the provided matrix.
     * @memberof Matrix4
     *
     * @param {Matrix4} right The right hand side matrix.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} right is required.
     */
    Matrix4.prototype.multiply = function(right, result) {
        return Matrix4.multiply(this, right, result);
    };

    /**
     * Multiplies this matrix, assuming it is a transformation matrix (with a bottom row of
     * <code>[0.0, 0.0, 0.0, 1.0]</code>), by an implicit translation matrix defined by a {@link Cartesian3}.
     *
     * @memberof Matrix4
     *
     * @param {Cartesian3} translation The translation on the right-hand side of the multiplication.
     * @param {Matrix4} [result] The object onto which to store the result.
     *
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} translation is required.
     */
    Matrix4.prototype.multiplyByTranslation = function(translation, result) {
        return Matrix4.multiplyByTranslation(this, translation, result);
    };

    /**
     * Multiplies this matrix, assuming it is a transformation matrix (with a bottom row of
     * <code>[0.0, 0.0, 0.0, 1.0]</code>), by an implicit uniform scale matrix.
     *
     * @memberof Matrix4
     *
     * @param {Number} scale The scale on the right-hand side of the multiplication.
     * @param {Matrix4} [result] The object onto which to store the result.
     *
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} scale is required.
     */
    Matrix4.prototype.multiplyByUniformScale = function(scale, result) {
        return Matrix4.multiplyByUniformScale(this, scale, result);
    };

    /**
     * Computes the product of this matrix and a column vector.
     * @memberof Matrix4
     *
     * @param {Cartesian4} cartesian The vector.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Matrix4.prototype.multiplyByVector = function(cartesian, result) {
        return Matrix4.multiplyByVector(this, cartesian, result);
    };

    /**
     * Computes the product of a matrix and a {@link Cartesian3}.  This is equivalent to calling {@link Matrix4#multiplyByVector}
     * with a {@link Cartesian4} with a <code>w</code> component of one.
     * @memberof Matrix4
     *
     * @param {Cartesian3} cartesian The point.
     * @param {Cartesian4} [result] The object onto which to store the result.
     * @return {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     *
     * @exception {DeveloperError} cartesian is required.
     */
    Matrix4.prototype.multiplyByPoint = function(cartesian, result) {
        return Matrix4.multiplyByPoint(this, cartesian, result);
    };

    /**
     * Computes the product of this matrix and a scalar.
     * @memberof Matrix4
     *
     * @param {Number} scalar The number to multiply by.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Cartesian4 instance if one was not provided.
     *
     * @exception {DeveloperError} scalar is required and must be a number.
     */
    Matrix4.prototype.multiplyByScalar = function(scalar, result) {
        return Matrix4.multiplyByScalar(this, scalar, result);
    };
    /**
     * Computes a negated copy of this matrix.
     * @memberof Matrix4
     *
     * @param {Matrix4} matrix The matrix to negate.
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     *
     * @exception {DeveloperError} matrix is required.
     */
    Matrix4.prototype.negate = function(result) {
        return Matrix4.negate(this, result);
    };

    /**
     * Computes the transpose of this matrix.
     * @memberof Matrix4
     *
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
     */
    Matrix4.prototype.transpose = function(result) {
        return Matrix4.transpose(this, result);
    };

    /**
     * Compares this matrix to the provided matrix componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof Matrix4
     *
     * @param {Matrix4} [right] The right hand side matrix.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    Matrix4.prototype.equals = function(right) {
        return Matrix4.equals(this, right);
    };

    /**
     * Compares this matrix to the provided matrix componentwise and returns
     * <code>true</code> if they are within the provided epsilon,
     * <code>false</code> otherwise.
     * @memberof Matrix4
     *
     * @param {Matrix4} [right] The right hand side matrix.
     * @param {Number} epsilon The epsilon to use for equality testing.
     * @return {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} epsilon is required and must be a number.
     */
    Matrix4.prototype.equalsEpsilon = function(right, epsilon) {
        return Matrix4.equalsEpsilon(this, right, epsilon);
    };

    /**
     * Computes a string representing this Matrix with each row being
     * on a separate line and in the format '(column0, column1, column2, column3)'.
     * @memberof Matrix4
     *
     * @return {String} A string representing the provided Matrix with each row being on a separate line and in the format '(column0, column1, column2, column3)'.
     */
    Matrix4.prototype.toString = function() {
        return '(' + this[0] + ', ' + this[4] + ', ' + this[8] + ', ' + this[12] +')\n' +
               '(' + this[1] + ', ' + this[5] + ', ' + this[9] + ', ' + this[13] +')\n' +
               '(' + this[2] + ', ' + this[6] + ', ' + this[10] + ', ' + this[14] +')\n' +
               '(' + this[3] + ', ' + this[7] + ', ' + this[11] + ', ' + this[15] +')';
    };

    /**
     * Gets the translation portion of this matrix, assuming the matrix is a affine transformation matrix.
     * @memberof Matrix4
     *
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @return {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     *
     * @see Cartesian3
     */
    Matrix4.prototype.getTranslation = function(result) {
        return Matrix4.getTranslation(this, result);
    };

    /**
     * Gets the upper left 3x3 rotation matrix of this matrix, assuming the matrix is a affine transformation matrix.
     * @memberof Matrix4
     *
     * @param {Matrix3} [result] The object onto which to store the result.
     * @return {Matrix3} The modified result parameter or a new Cartesian3 instance if one was not provided.
     *
     * @see Matrix3
     */
    Matrix4.prototype.getRotation = function(result) {
        return Matrix4.getRotation(this, result);
    };

    /**
     * Computes the inverse of this matrix using Cramers Rule.
     * If the determinant is zero, the matrix can not be inverted, and an exception is thrown.
     * If the matrix is an affine transformation matrix, it is more efficient
     * to invert it with {@link #inverseTransformation}.
     * @memberof Matrix4
     *
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Cartesian3 instance if one was not provided.
     *
     * @exception {RuntimeError} matrix is not invertible because its determinate is zero.
     */
    Matrix4.prototype.inverse = function(result) {
        return Matrix4.inverse(this, result);
    };

    /**
     * Computes the inverse of this matrix assuming it is
     * an affine transformation matrix, where the upper left 3x3 elements
     * are a rotation matrix, and the upper three elements in the fourth
     * column are the translation.  The bottom row is assumed to be [0, 0, 0, 1].
     * The matrix is not verified to be in the proper form.
     * This method is faster than computing the inverse for a general 4x4
     * matrix using {@link #inverse}.
     * @memberof Matrix4
     *
     * @param {Matrix4} [result] The object onto which to store the result.
     * @return {Matrix4} The modified result parameter or a new Cartesian3 instance if one was not provided.
     */
    Matrix4.prototype.inverseTransformation = function(result) {
        return Matrix4.inverseTransformation(this, result);
    };

    return Matrix4;
});
