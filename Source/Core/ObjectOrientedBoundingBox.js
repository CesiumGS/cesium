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
     * Computes an instance of an ObjectOrientedBoundingBox of the given positions.
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

        var i;
        var length = positions.length;
        for (i = 0; i < length; i++) {
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

        var rotation = result.rotation;
        Matrix3.setRow(rotation, 0, r, rotation);
        Matrix3.setRow(rotation, 1, u, rotation);
        Matrix3.setRow(rotation, 2, f, rotation);

        p = positions[0];
        var tempPoint = Matrix3.multiplyByVector(rotation, p, scratchCartesian4);
        var maxPoint = Cartesian3.clone(tempPoint, scratchCartesian5);
        var minPoint = Cartesian3.clone(tempPoint, scratchCartesian6);

        for (i = 1; i < length; i++) {
            p = positions[i];
            Matrix3.multiplyByVector(rotation, p, tempPoint);
            Cartesian3.getMinimumByComponent(minPoint, tempPoint, minPoint);
            Cartesian3.getMaximumByComponent(maxPoint, tempPoint, maxPoint);
        }

        var center = scratchCartesian4;
        Cartesian3.add(minPoint, maxPoint, center);
        Cartesian3.multiplyByScalar(center, 0.5, center);

        Matrix3.multiplyByVector(rotation, center, result.translation);

        Cartesian3.subtract(maxPoint, minPoint, center);
        Cartesian3.multiplyByScalar(center, 0.5, result.scale);

        return result;
    };

    /**
     * Computes an ObjectOrientedBoundingBox from a BoundingRectangle.
     * The BoundingRectangle is placed on the XY plane.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {BoundingRectangle} boundingRectangle A bounding rectangle.
     * @param {Number} [rotation=0.0] The rotation of the bounding box in radians.
     * @return {ObjectOrientedBoundingBox} The modified result parameter or a new ObjectOrientedBoundingBox instance if one was not provided.
     *
     * @exception {DeveloperError} boundingRectangle is required.
     *
     * @example
     * // Compute an object oriented bounding box enclosing two points.
     * var box = ObjectOrientedBoundingBox.fromBoundingRectangle(boundingRectangle, 0.0);
     */
    ObjectOrientedBoundingBox.fromBoundingRectangle = function(boundingRectangle, rotation, result) {
        if (!defined(boundingRectangle)) {
            throw new DeveloperError('boundingRectangle is required');
        }

        if (!defined(result)) {
            result = new ObjectOrientedBoundingBox();
        }

        if (defined(rotation)) {
            Matrix3.fromRotationZ(rotation, result.rotation);
        } else {
            Matrix3.clone(Matrix3.IDENTITY, result.rotation);
        }

        var scale = result.scale;
        scale.x = boundingRectangle.width * 0.5;
        scale.y = boundingRectangle.height * 0.5;
        scale.z = 0.0;

        var translation = Matrix3.multiplyByVector(result.rotation, scale, result.translation);
        translation.x += boundingRectangle.x;
        translation.y += boundingRectangle.y;

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
    var scratchTArray = new Array(3);
    var scratchAArray = new Array(3);
    var scratchBArray = new Array(3);

    function testCase1(k, a, b, B, T) {
        var right = a[k] + b[0] * B[Matrix3.getElementIndex(0, k)] + b[1] * B[Matrix3.getElementIndex(1, k)] + b[2] * B[Matrix3.getElementIndex(2, k)];
        
        if (Math.abs(T[k]) > right) {
            return true;
        }
        return false;
    }

    function testCase2(k, a, b, B, T) {
        var left = T[0] * B[Matrix3.getElementIndex(0, k)] + T[1] * B[Matrix3.getElementIndex(1, k)] + T[2] * B[Matrix3.getElementIndex(2, k)];
        var right = b[k] + a[0] * B[Matrix3.getElementIndex(0, k)] + a[1] * B[Matrix3.getElementIndex(1, k)] + a[2] * B[Matrix3.getElementIndex(2, k)];
        
        if (Math.abs(left) > right) {
            return true;
        }
        return false;
    }

    function testCase3(i, j, a, b, B, T) {
        var left = T[(i + 2) % 3] * B[Matrix3.getElementIndex((i + 1) % 3, j)] - T[(i + 1) % 3] * B[Matrix3.getElementIndex((i + 2) % 3, j)];
        var right = a[(i + 1) % 3] * B[Matrix3.getElementIndex((i + 2) % 3, j)] + a[(i + 2) % 3] * B[Matrix3.getElementIndex((i + 1) % 3, j)];
        right += b[(j + 1) % 3] * B[Matrix3.getElementIndex(i, (j + 2) % 3)] + b[(j + 2) % 3] * B[Matrix3.getElementIndex(i, (j + 1) % 3)];
        
        if (Math.abs(left) > right) {
            return true;
        }
        return false;
    }
    
    /**
     * Checks if two ObjectOrientedBoundingBoxes intersect.
     * This is an implementation of Stefan Gottschalk's Collision Queries using Oriented Bounding Boxes solution (PHD thesis).
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
        
        var T = scratchTArray;
        var a = scratchAArray;
        var b = scratchBArray;
        
        Cartesian3.subtract(left.translation, right.translation, scratchTCartesian);
        Matrix3.multiplyByVector(leftTransformTransposed, scratchTCartesian, scratchTCartesian);
        Cartesian3.pack(scratchTCartesian, T);
        Cartesian3.pack(left.scale, a);
        Cartesian3.pack(right.scale, b);

        if (testCase1(0, a, b, B, T)) {
            return false;
        }
        if (testCase1(1, a, b, B, T)) {
            return false;
        }
        if (testCase1(2, a, b, B, T)) {
            return false;
        }

        if (testCase2(0, a, b, B, T)) {
            return false;
        }
        if (testCase2(1, a, b, B, T)) {
            return false;
        }
        if (testCase2(2, a, b, B, T)) {
            return false;
        }

        if (testCase3(0, 0, a, b, B, T)) {
            return false;
        }
        if (testCase3(1, 0, a, b, B, T)) {
            return false;
        }
        if (testCase3(2, 0, a, b, B, T)) {
            return false;
        }
        if (testCase3(0, 1, a, b, B, T)) {
            return false;
        }
        if (testCase3(1, 1, a, b, B, T)) {
            return false;
        }
        if (testCase3(2, 1, a, b, B, T)) {
            return false;
        }
        if (testCase3(0, 2, a, b, B, T)) {
            return false;
        }
        if (testCase3(1, 2, a, b, B, T)) {
            return false;
        }
        if (testCase3(2, 2, a, b, B, T)) {
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

    return ObjectOrientedBoundingBox;
});
