/*global define*/
define([
        './defaultValue',
        './defined',
        './DeveloperError',
        './Cartesian3',
        './Intersect',
        './Matrix3',
        './BoundingRectangle'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        Cartesian3,
        Intersect,
        Matrix3,
        BoundingRectangle) {
    "use strict";

    /**
     * Creates an instance of an ObjectOrientedBoundingBox.
     * An ObjectOrientedBoundingBox model of an object or set of objects, is a closed volume (a cuboid), which completely contains the object or the set of objects.
     * It is oriented, so it can provide an optimum fit, it can bound more tightly.
     * @alias ObjectOrientedBoundingBox
     * @constructor
     *
     * @param {Matrix3} [rotation=Matrix3.IDENTITY] The transformation matrix, to rotate the box to the right position.
     * @param {Cartesian3} [translation=Cartesian3.ZERO] The position of the box.
     * @param {Cartesian3} [scale=Cartesian3.ZERO] The scale of the box.
     *
     * @see BoundingSphere
     */
    var ObjectOrientedBoundingBox = function(rotation, translation, scale) {
        /**
         * The transformation matrix, to rotate the box to the right position.
         * @type {Matrix3}
         * @default {@link Matrix3.IDENTITY}
         */
        this.rotation = Matrix3.clone(defaultValue(rotation, Matrix3.IDENTITY));
        /**
         * The position of the box.
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.translation = Cartesian3.clone(defaultValue(translation, Cartesian3.ZERO));
        /**
         * The scale of the box.
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.scale = Cartesian3.clone(defaultValue(scale, Cartesian3.ZERO));
    };

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchCartesian4 = new Cartesian3();
    var scratchCartesian5 = new Cartesian3();
    var scratchCartesian6 = new Cartesian3();
    var scratchCovarianceResult = new Matrix3();
    var scratchEigenResult = {
            unitary : new Matrix3(),
            diagonal : new Matrix3()
    };
    /**
     * Computes an instance of an ObjectOrientedBoundingBox of the given positions. The box is determined using the covariance matrix.
     * First we build the covariance matrix, then we compute the center, rotation and the minimal edge lengths of the OBB.
     * This is an implementation of Stefan Gottschalk's Collision Queries using Oriented Bounding Boxes solution (PHD thesis).
     * Reference: http://gamma.cs.unc.edu/users/gottschalk/main.pdf
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {Array} positions List of {@link Cartesian3} points that the bounding box will enclose.
     * @param {ObjectOrientedBoundingBox} [result] The object onto which to store the result.
     * @return {ObjectOrientedBoundingBox} The modified result parameter or a new ObjectOrientedBoundingBox instance if one was not provided.
     *
     * @example
     * // Compute an object oriented bounding box enclosing two points.
     * var box = ObjectOrientedBoundingBox.fromPoints([new Cartesian3(2, 0, 0), new Cartesian3(-2, 0, 0)]);
     */
    ObjectOrientedBoundingBox.fromPoints = function(positions, result) {
        if (!defined(result)) {
            result = new ObjectOrientedBoundingBox();
        }

        if (!defined(positions) || positions.length === 0) {
            result.tranformMatrix = Matrix3.IDENTITY;
            result.translation = Cartesian3.ZERO;
            result.scale = Cartesian3.ZERO;
            return result;
        }

        var meanPoint = Cartesian3.clone(Cartesian3.ZERO, scratchCartesian1);

        var length = positions.length;
        for ( var i = 0; i < length; i++) {
            Cartesian3.add(meanPoint, positions[i], meanPoint);
        }
        Cartesian3.multiplyByScalar(meanPoint, 1.0 / length, meanPoint);

        var exx = 0.0;
        var exy = 0.0;
        var exz = 0.0;
        var eyy = 0.0;
        var eyz = 0.0;
        var ezz = 0.0;

        var meanPointXX = meanPoint.x * meanPoint.x;
        var meanPointXY = meanPoint.x * meanPoint.y;
        var meanPointXZ = meanPoint.x * meanPoint.z;
        var meanPointYY = meanPoint.y * meanPoint.y;
        var meanPointYZ = meanPoint.y * meanPoint.z;
        var meanPointZZ = meanPoint.z * meanPoint.z;
        var p;

        for (i = 0; i < length; i++) {
            p = positions[i];
            exx += p.x * p.x - meanPointXX;
            exy += p.x * p.y - meanPointXY;
            exz += p.x * p.z - meanPointXZ;
            eyy += p.y * p.y - meanPointYY;
            eyz += p.y * p.z - meanPointYZ;
            ezz += p.z * p.z - meanPointZZ;
        }

        var covarianceMatrix = scratchCovarianceResult;
        covarianceMatrix[0] = exx;
        covarianceMatrix[1] = exy;
        covarianceMatrix[2] = exz;
        covarianceMatrix[3] = exy;
        covarianceMatrix[4] = eyy;
        covarianceMatrix[5] = eyz;
        covarianceMatrix[6] = exz;
        covarianceMatrix[7] = eyz;
        covarianceMatrix[8] = ezz;

        var eigenDecomposition = Matrix3.getEigenDecomposition(covarianceMatrix, scratchEigenResult);
        var unitaryMatrix = eigenDecomposition.unitary;

        //eigenvectors of covMatrix
        var v1 = Matrix3.getColumn(unitaryMatrix, 0, scratchCartesian1);
        var v2 = Matrix3.getColumn(unitaryMatrix, 1, scratchCartesian2);
        var v3 = Matrix3.getColumn(unitaryMatrix, 2, scratchCartesian3);

        //normalized eigenvectors
        var r = Cartesian3.normalize(v1, v1);
        var u = Cartesian3.normalize(v2, v2);
        var f = Cartesian3.normalize(v3, v3);

        Matrix3.setRow(result.rotation, 0, r, result.rotation);
        Matrix3.setRow(result.rotation, 1, u, result.rotation);
        Matrix3.setRow(result.rotation, 2, f, result.rotation);

        p = positions[0];
        var tempPoint = Matrix3.multiplyByVector(result.rotation, p, scratchCartesian4);
        var maxPoint = Cartesian3.clone(tempPoint, scratchCartesian5);
        var minPoint = Cartesian3.clone(tempPoint, scratchCartesian6);

        for (i = 1; i < length; i++) {
            p = positions[i];
            Matrix3.multiplyByVector(result.rotation, p, tempPoint);
            Cartesian3.getMinimumByComponent(minPoint, tempPoint, minPoint);
            Cartesian3.getMaximumByComponent(maxPoint, tempPoint, maxPoint);
        }

        var center = scratchCartesian4;
        Cartesian3.add(minPoint, maxPoint, center);
        Cartesian3.multiplyByScalar(center, 0.5, center);

        Matrix3.multiplyByVector(result.rotation, center, result.translation);

        Cartesian3.add(maxPoint, Cartesian3.negate(minPoint, minPoint), center);
        Cartesian3.multiplyByScalar(center, 0.5, result.scale);

        return result;
    };

    /**
     * Computes an ObjectOrientedBoundingBox from a BoundingRectangle.
     * The BoundingRectangle is placed on the XY plane.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {BoundingRectangle} boundingRectangle A bounding rectangle.
     * @param {Float} [rotation=Matrix3.IDENTITY] The rotation of the bounding box.
     * @return {ObjectOrientedBoundingBox} A new 2D ObjectOrientedBoundingBox instance if one was not provided.
     *
     * @exception {DeveloperError} boundingRectangle is missing.
     *
     * @example
     * // Compute an object oriented bounding box enclosing two points.
     * var box = ObjectOrientedBoundingBox.fromBoundingRectangle(boundingRectangle, 0.0);
     */
    ObjectOrientedBoundingBox.fromBoundingRectangle = function(boundingRectangle, rotation, result) {
        if (!defined(boundingRectangle)) {
            throw new DeveloperError('boundingRectangle is missing');
        }
        if (!defined(result)) {
            result = new ObjectOrientedBoundingBox();
        }
        if (defined(rotation)) {
            Matrix3.fromRotationZ(rotation, result.rotation);
        } else {
            Matrix3.clone(Matrix3.IDENTITY, result.rotation);
        }

        result.scale.x = boundingRectangle.width / 2;
        result.scale.y = boundingRectangle.height / 2;
        result.scale.z = 0.0;

        result.translation.x = boundingRectangle.x;
        result.translation.y = boundingRectangle.y;
        result.translation.z = 0.0;

        return result;
    };

    var scratchTransformColumn1 = new Cartesian3();
    var scratchTransformColumn2 = new Cartesian3();
    var scratchTransformColumn3 = new Cartesian3();
    var scratchAddCartesian1 = new Cartesian3();
    var scratchAddCartesian2 = new Cartesian3();
    var scratchAddCartesian3 = new Cartesian3();
    /**
     * Get the describing points of the ObjectOrientedBoundingBox.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {ObjectOrientedBoundingBox} box The bounding box.
     * @param {Cartesian3} [result] The object onto which to store the resulting points.
     * @return {Cartesian3} The object onto which to store the resulting points.
     *
     * @exception {DeveloperError} box is required.
     *
     * @example
     * var box = ObjectOrientedBoundingBox.fromBoundingRectangle(boundingRectangle, 1.57);
     * var boxPoints = ObjectOrientedBoundingBox.getDescribingPoints(box);
     */
    ObjectOrientedBoundingBox.getDescribingPoints = function(box, result) {
        if (!defined(box)) {
            throw new DeveloperError('box is required');
        }

        if (!defined(result)) {
            result = [];
        }

        var r = Cartesian3.clone(Matrix3.getColumn(box.rotation, 0, r), scratchTransformColumn1);
        var u = Cartesian3.clone(Matrix3.getColumn(box.rotation, 1, u), scratchTransformColumn2);
        var f = Cartesian3.clone(Matrix3.getColumn(box.rotation, 2, f), scratchTransformColumn3);

        function multiplyAndAdd(sign1, sign2, sign3) {
            // we are doing: result = {Cartesian} +/- {Cartesian3} +/- {Cartesian3} +/- {Cartesian3}
            Cartesian3.add(box.translation, Cartesian3.multiplyByScalar(r, box.scale.x * (sign1)), scratchAddCartesian1);
            Cartesian3.add(scratchAddCartesian1, Cartesian3.multiplyByScalar(u, box.scale.y * (sign2)), scratchAddCartesian2);
            return Cartesian3.add(scratchAddCartesian2, Cartesian3.multiplyByScalar(f, box.scale.z * (sign3)), scratchAddCartesian3);
        }

        //POINT 0
        var point = multiplyAndAdd(-1, -1, -1);
        var resultPoint = result[0];
        if (!defined(resultPoint)) {
            resultPoint = result[0] = new Cartesian3();
        }
        Cartesian3.clone(point, resultPoint);

        //POINT 1
        point = multiplyAndAdd(1, -1, -1);
        resultPoint = result[1];
        if (!defined(resultPoint)) {
            resultPoint = result[1] = new Cartesian3();
        }
        Cartesian3.clone(point, resultPoint);

        //POINT 2
        point = multiplyAndAdd(1, -1, 1);
        resultPoint = result[2];
        if (!defined(resultPoint)) {
            resultPoint = result[2] = new Cartesian3();
        }
        Cartesian3.clone(point, resultPoint);

        //POINT 3
        point = multiplyAndAdd(-1, -1, 1);
        resultPoint = result[3];
        if (!defined(resultPoint)) {
            resultPoint = result[3] = new Cartesian3();
        }
        Cartesian3.clone(point, resultPoint);

        //POINT 4
        point = multiplyAndAdd(-1, 1, -1);
        resultPoint = result[4];
        if (!defined(resultPoint)) {
            resultPoint = result[4] = new Cartesian3();
        }
        Cartesian3.clone(point, resultPoint);

        //POINT 5
        point = multiplyAndAdd(1, 1, -1);
        resultPoint = result[5];
        if (!defined(resultPoint)) {
            resultPoint = result[5] = new Cartesian3();
        }
        Cartesian3.clone(point, resultPoint);

        //POINT 6
        point = multiplyAndAdd(1, 1, 1);
        resultPoint = result[6];
        if (!defined(resultPoint)) {
            resultPoint = result[6] = new Cartesian3();
        }
        Cartesian3.clone(point, resultPoint);

        //POINT 7
        point = multiplyAndAdd(-1, 1, 1);
        resultPoint = result[7];
        if (!defined(resultPoint)) {
            resultPoint = result[7] = new Cartesian3();
        }
        Cartesian3.clone(point, resultPoint);

        return result;
    };

    /**
     * Duplicates a ObjectOrientedBoundingBox instance.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {ObjectOrientedBoundingBox} box The bounding box to duplicate.
     * @param {ObjectOrientedBoundingBox} [result] The object onto which to store the result.
     * @return {ObjectOrientedBoundingBox} The modified result parameter or a new ObjectOrientedBoundingBox instance if none was provided. (Returns undefined if box is undefined)
     */
    ObjectOrientedBoundingBox.clone = function(box, result) {
        if (!defined(box)) {
            return undefined;
        }

        if (!defined(result)) {
            return new ObjectOrientedBoundingBox(box.rotation, box.translation, box.scale);
        }

        Matrix3.clone(box.rotation, result.rotation);
        Cartesian3.clone(box.translation, result.translation);
        Cartesian3.clone(box.scale, result.scale);

        return result;
    };

    var scratchIntersectMatrix1 = new Matrix3();
    var scratchIntersectMatrix2 = new Matrix3();
    var scratchTCartesian = new Cartesian3();
    //Helper functions for collision detection.
    function testCase1(x, a, b, B, T) {
        if (Math.abs(T[x]) > (a[x] + b[0] * B[Matrix3.getElementIndex(0, x)] + b[1] * B[Matrix3.getElementIndex(1, x)] + b[2] * B[Matrix3.getElementIndex(2, x)])) {
            return 0;
        }
        return 1;
    }

    function testCase2(x, a, b, B, T) {
        if (Math.abs(T[0] * B[Matrix3.getElementIndex(0, x)] + T[1] * B[Matrix3.getElementIndex(1, x)] + T[2] * B[Matrix3.getElementIndex(2, x)]) > (b[x] + a[0] * B[Matrix3.getElementIndex(0, x)] + a[1] * B[1][x] + a[2] * B[Matrix3.getElementIndex(2, x)])) {
            return 0;
        }
        return 1;
    }

    function testCase3(i, j, a, b, B, T) {
        if (Math.abs(T[(i + 2) % 3] * B[Matrix3.getElementIndex((i + 1) % 3, j)] - T[(i + 1) % 3] * B[(i + 2) % 3][j]) > (a[(i + 1) % 3] * B[(i + 2) % 3][j] + a[(i + 2) % 3] * B[(i + 1) % 3][j] + b[(j + 1) % 3] * B[i][(j + 2) % 3] + b[(j + 2) % 3] * B[i][(j + 1) % 3])) {
            return 0;
        }
        return 1;
    }
    /**
     * Checks if two ObjectOrientedBoundingBoxes intersect.
     * This is an implementation of Stefan Gottschalk's Collision Queries using Oriented Bounding Boxes solution (PHD thesis).
     * <code>true</code> if they intersect, <code>false</code> otherwise.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {ObjectOrientedBoundingBox} left The first ObjectOrientedBoundingBox.
     * @param {ObjectOrientedBoundingBox} right The second ObjectOrientedBoundingBox.
     * @return {Boolean} <code>true</code> if they intersects each other <code>false</code> otherwise.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     */
    ObjectOrientedBoundingBox.intersect = function(left, right) {
        if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }

        var leftTransformTransposed = Matrix3.transpose(left.rotation, scratchIntersectMatrix1);
        var B = Matrix3.multiply(leftTransformTransposed, right.rotation, scratchIntersectMatrix2);
        Matrix3.abs(B, B);

        var T = [];
        var a = [];
        var b = [];
        Cartesian3.pack(Matrix3.multiplyByVector(leftTransformTransposed, Cartesian3.add(left.translation, Cartesian3.negate(right.translation, scratchTCartesian), scratchTCartesian), scratchIntersectMatrix1), T, 0);
        Cartesian3.pack(left.scale, a, 0);
        Cartesian3.pack(right.scale, b, 0);



        if (testCase1(0, a, b, B, T) === 0) {
            return false;
        }
        if (testCase1(1, a, b, B, T) === 0) {
            return false;
        }
        if (testCase1(2, a, b, B, T) === 0) {
            return false;
        }

        if (testCase2(0, a, b, B, T) === 0) {
            return false;
        }
        if (testCase2(1, a, b, B, T) === 0) {
            return false;
        }
        if (testCase2(2, a, b, B, T) === 0) {
            return false;
        }

        if (testCase3(0, 0, a, b, B, T) === 0) {
            return false;
        }
        if (testCase3(1, 0, a, b, B, T) === 0) {
            return false;
        }
        if (testCase3(2, 0, a, b, B, T) === 0) {
            return false;
        }
        if (testCase3(0, 1, a, b, B, T) === 0) {
            return false;
        }
        if (testCase3(1, 1, a, b, B, T) === 0) {
            return false;
        }
        if (testCase3(2, 1, a, b, B, T) === 0) {
            return false;
        }
        if (testCase3(0, 2, a, b, B, T) === 0) {
            return false;
        }
        if (testCase3(1, 2, a, b, B, T) === 0) {
            return false;
        }
        if (testCase3(2, 2, a, b, B, T) === 0) {
            return false;
        }

        return true;
    };

    /**
     * Compares the provided ObjectOrientedBoundingBox componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {ObjectOrientedBoundingBox} left The first ObjectOrientedBoundingBox.
     * @param {ObjectOrientedBoundingBox} right The second ObjectOrientedBoundingBox.
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    ObjectOrientedBoundingBox.equals = function(left, right) {
        return (left === right) ||
                ((defined(left)) &&
                 (defined(right)) &&
                 Cartesian3.equals(left.transformedPosition, right.transformedPosition) &&
                 Matrix3.equals(left.transformMatrix, right.transformMatrix) &&
                 Cartesian3.equals(left.extent, right.extent));
    };

    /**
     * Duplicates this ObjectOrientedBoundingBox instance.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {ObjectOrientedBoundingBox} [result] The object onto which to store the result.
     * @return {ObjectOrientedBoundingBox} The modified result parameter or a new ObjectOrientedBoundingBox instance if one was not provided.
     */
    ObjectOrientedBoundingBox.prototype.clone = function(result) {
        return ObjectOrientedBoundingBox.clone(this, result);
    };

    /**
     * Compares this ObjectOrientedBoundingBox against the provided ObjectOrientedBoundingBox componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {ObjectOrientedBoundingBox} [right] The right hand side ObjectOrientedBoundingBox.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    ObjectOrientedBoundingBox.prototype.equals = function(right) {
        return ObjectOrientedBoundingBox.equals(this, right);
    };

    /**
     * Checks if this ObjectOrientedBoundingBox intersects the provided.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {ObjectOrientedBoundingBox} right The right hand side ObjectOrientedBoundingBox.
     * @return {Boolean} <code>true</code> if this ObjectOrientedBoundingBox intersects the one provided <code>false</code> otherwise.
     */
    ObjectOrientedBoundingBox.prototype.intersect = function(right) {
        return ObjectOrientedBoundingBox.intersect(this, right);
    };

    return ObjectOrientedBoundingBox;
});
