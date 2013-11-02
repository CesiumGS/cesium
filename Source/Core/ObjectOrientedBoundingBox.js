/*global define*/
define(['./defaultValue', './defined', './DeveloperError', './Cartesian3', './Intersect', './Matrix3', './BoundingRectangle'], function(defaultValue, defined, DeveloperError, Cartesian3, Intersect, Matrix3, BoundingRectangle) {
    "use strict";

    /**
     * Creates an instance of an ObjectOrientedBoundingBox.
     * @alias ObjectOrientedBoundingBox
     * @constructor
     *
     * @param {Cartesian3} [transformMatrix=Matrix3.IDENTITY] The transformation matrix, to rotate the box to the right position.
     * @param {Cartesian3} [transformedPosition=Cartesian3.ZERO] The position of the box.
     * @param {Cartesian3} [extent=Cartesian3.ZERO] The scale of the box.
     *
     * @see BoundingSphere
     */
    var ObjectOrientedBoundingBox = function(transformMatrix, transformedPosition, extent) {
        /**
         * The transformation matrix, to rotate the box to the right position.
         * @type {Matrix3}
         * @default {@link Matrix3.IDENTITY}
         */
        this.transformMatrix = Matrix3.clone(defaultValue(transformMatrix, Matrix3.IDENTITY));
        /**
         * The position of the box.
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.transformedPosition = Cartesian3.clone(defaultValue(transformedPosition, Cartesian3.ZERO));
        /**
         * The scale of the box.
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         */
        this.extent = Cartesian3.clone(defaultValue(extent, Cartesian3.ZERO));
    };

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchCartesian4 = new Cartesian3();
    var scratchCartesian5 = new Cartesian3();
    var scratchCartesian6 = new Cartesian3();
    var scratchCovarianceResult = new Matrix3();
    var scratchEigenResult = new Matrix3();
    /**
     * Computes an instance of an ObjectOrientedBoundingBox of the given positions. The box is determined using the covariance matrix.
     * First we build the covariance matrix, then we compute the center, rotation and the minimal edge lengths of the OBB.
     * This is an implementation of Stefan Gottschalk's Collision Queries using Oriented Bounding Boxes solution (PHD thesis).
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {Array} positions List of points that the bounding box will enclose.  Each point must have a <code>x</code>, <code>y</code>, and <code>z</code> properties.
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

        var covarianceMatrix = Matrix3.clone([exx, exy, exz, exy, eyy, eyz, exz, eyz, ezz], Matrix3.clone(Matrix3.IDENTITY, scratchCovarianceResult));

        var eigenDecomposition = Matrix3.getEigenDecomposition(covarianceMatrix, scratchEigenResult);
        var unitaryMatrix = eigenDecomposition.unitary;

        //eigenvectors of covMatrix
        var v1 = Matrix3.getColumn(unitaryMatrix, 0, Cartesian3.clone(Cartesian3.ZERO, scratchCartesian1));
        var v2 = Matrix3.getColumn(unitaryMatrix, 1, Cartesian3.clone(Cartesian3.ZERO, scratchCartesian2));
        var v3 = Matrix3.getColumn(unitaryMatrix, 2, Cartesian3.clone(Cartesian3.ZERO, scratchCartesian3));

        //normalized eigenvectors
        var r = Cartesian3.normalize(v1, v1);
        var u = Cartesian3.normalize(v2, v2);
        var f = Cartesian3.normalize(v3, v3);

        result.transformMatrix = Matrix3.clone([r.x, u.x, f.x, r.y, u.y, f.y, r.z, u.z, f.z], Matrix3.clone(Matrix3.IDENTITY, result.transformMatrix));

        p = positions[0];
        var tempPoint = Cartesian3.fromArray([Cartesian3.dot(r, p), Cartesian3.dot(u, p), Cartesian3.dot(f, p)], 0, scratchCartesian4);
        var maxPoint = Cartesian3.clone(tempPoint, scratchCartesian5);
        var minPoint = Cartesian3.clone(tempPoint, scratchCartesian6);

        for (i = 1; i < length; i++) {
            p = positions[i];
            Cartesian3.fromArray([Cartesian3.dot(r, p), Cartesian3.dot(u, p), Cartesian3.dot(f, p)], 0, tempPoint);
            Cartesian3.getMinimumByComponent(minPoint, tempPoint, minPoint);
            Cartesian3.getMaximumByComponent(maxPoint, tempPoint, maxPoint);
        }

        var center = scratchCartesian4;
        Cartesian3.fromArray([(minPoint.x + maxPoint.x) * 0.5, (minPoint.y + maxPoint.y) * 0.5, (minPoint.z + maxPoint.z) * 0.5], 0, center);

        result.transformedPosition.x = Cartesian3.dot(Matrix3.getRow(result.transformMatrix, 0), center);
        result.transformedPosition.y = Cartesian3.dot(Matrix3.getRow(result.transformMatrix, 1), center);
        result.transformedPosition.z = Cartesian3.dot(Matrix3.getRow(result.transformMatrix, 2), center);

        Cartesian3.fromArray([(maxPoint.x - minPoint.x) * 0.5, (maxPoint.y - minPoint.y) * 0.5, (maxPoint.z - minPoint.z) * 0.5], 0, result.extent);

        return result;
    };

    /**
     * Computes an ObjectOrientedBoundingBox from a BoundingRectangle.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {BoundingRectangle} boundingRectangle A bounding rectangle.
     * @param {Float} rotation The rotation of the bounding box.
     * @return {ObjectOrientedBoundingBox} A new 2D ObjectOrientedBoundingBox instance if one was not provided.
     *
     * @exception {DeveloperError} boundingRectangle is missing.
     * @exception {DeveloperError} rotation is missing.
     *
     * @example
     * // Compute an object oriented bounding box enclosing two points.
     * var box = ObjectOrientedBoundingBox.fromBoundingRectangle(boundingRectangle, 0.0);
     */
    ObjectOrientedBoundingBox.fromBoundingRectangle = function(boundingRectangle, rotation, result) {
        if (!defined(boundingRectangle)) {
            throw new DeveloperError('boundingRectangle is missing');
        }
        if (!defined(rotation)) {
            throw new DeveloperError('rotation is missing');
        }
        if (!defined(result)) {
            result = new ObjectOrientedBoundingBox();
        }

        result.extent = Cartesian3.clone(Cartesian3.ZERO, result.extent);
        result.extent.x = boundingRectangle.width / 2;
        result.extent.y = boundingRectangle.height / 2;
        result.extent.z = 0.0;

        result.transformedPosition = Cartesian3.clone(Cartesian3.ZERO, result.transformedPosition);
        result.transformedPosition.x = boundingRectangle.x;
        result.transformedPosition.y = boundingRectangle.y;
        result.transformedPosition.z = 0.0;

        result.transformMatrix = Matrix3.fromRotationZ(rotation);

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
     */
    ObjectOrientedBoundingBox.getDescribingPoints = function(box, result) {
        if (!defined(box)) {
            throw new DeveloperError('box is required');
        }

        if (!defined(result)) {
            result = [];
        }

        var r = Cartesian3.clone(Matrix3.getColumn(box.transformMatrix, 0, r), scratchTransformColumn1);
        var u = Cartesian3.clone(Matrix3.getColumn(box.transformMatrix, 1, u), scratchTransformColumn2);
        var f = Cartesian3.clone(Matrix3.getColumn(box.transformMatrix, 2, f), scratchTransformColumn3);

        function multiplyAndAdd(sign1, sign2, sign3) {
            // we are doing: result = {Cartesian} +/- {Cartesian3} +/- {Cartesian3} +/- {Cartesian3}
            var tempPoint1 = Cartesian3.add(box.transformedPosition, Cartesian3.multiplyByScalar(r, box.extent.x * (sign1)), scratchAddCartesian1);
            var tempPoint2 = Cartesian3.add(tempPoint1, Cartesian3.multiplyByScalar(u, box.extent.y * (sign2)), scratchAddCartesian2);
            return Cartesian3.add(tempPoint2, Cartesian3.multiplyByScalar(f, box.extent.z * (sign3)), scratchAddCartesian3);
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
            return new ObjectOrientedBoundingBox(box.transformMatrix, box.transformedPosition, box.extent);
        }

        result.transformMatrix = Matrix3.clone(box.transformMatrix, result.transformMatrix);
        result.transformedPosition = Cartesian3.clone(box.transformedPosition, result.transformedPosition);
        result.extent = Cartesian3.clone(box.extent, result.extent);

        return result;
    };

    /**
     * Checks if two ObjectOrientedBoundingBoxes intersect.
     * This is an implementation of Stefan Gottschalk's Collision Queries using Oriented Bounding Boxes solution (PHD thesis).
     * <code>true</code> if they intersect, <code>false</code> otherwise.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {ObjectOrientedBoundingBox} [left] The first ObjectOrientedBoundingBox.
     * @param {ObjectOrientedBoundingBox} [right] The second ObjectOrientedBoundingBox.
     * @return {Boolean} <code>true</code> if they intersects each other <code>false</code> otherwise.
     */
    ObjectOrientedBoundingBox.intersect = function(left, right) {

        var leftTransformTransposed = Matrix3.transpose(left.transformMatrix);
        var Bf = Matrix3.multiply(leftTransformTransposed, right.transformMatrix);
        Bf[0] = Math.abs(Bf[0]);
        Bf[1] = Math.abs(Bf[1]);
        Bf[2] = Math.abs(Bf[2]);
        Bf[3] = Math.abs(Bf[3]);
        Bf[4] = Math.abs(Bf[4]);
        Bf[5] = Math.abs(Bf[5]);
        Bf[6] = Math.abs(Bf[6]);
        Bf[7] = Math.abs(Bf[7]);
        Bf[8] = Math.abs(Bf[8]);

        var T = [];
        var a = [];
        var b = [];
        Cartesian3.pack(Matrix3.multiplyByVector(leftTransformTransposed, Cartesian3.add(left.transformedPosition, Cartesian3.negate(right.transformedPosition))), T, 0);
        Cartesian3.pack(left.extent, a, 0);
        Cartesian3.pack(right.extent, b, 0);

        function collide(B, T, a, b) {
            function testCase1(x) {
                if (Math.abs(T[x]) > (a[x] + b[0] * Bf[Matrix3.getElementIndex(0, x)] + b[1] * Bf[Matrix3.getElementIndex(1, x)] + b[2] * Bf[Matrix3.getElementIndex(2, x)])) {
                    return 0;
                }
                return 1;
            }

            function testCase2(x) {
                if (Math.abs(T[0] * B[Matrix3.getElementIndex(0, x)] + T[1] * B[Matrix3.getElementIndex(1, x)] + T[2] * B[Matrix3.getElementIndex(2, x)]) > (b[x] + a[0] * Bf[Matrix3.getElementIndex(0, x)] + a[1] * Bf[1][x] + a[2] * Bf[Matrix3.getElementIndex(2, x)])) {
                    return 0;
                }
                return 1;
            }

            function testCase3(i, j) {
                if (Math.abs(T[(i + 2) % 3] * B[Matrix3.getElementIndex((i + 1) % 3, j)] - T[(i + 1) % 3] * B[(i + 2) % 3][j]) > (a[(i + 1) % 3] * Bf[(i + 2) % 3][j] + a[(i + 2) % 3] * Bf[(i + 1) % 3][j] + b[(j + 1) % 3] * Bf[i][(j + 2) % 3] + b[(j + 2) % 3] * Bf[i][(j + 1) % 3])) {
                    return 0;
                }
                return 1;
            }

            if (testCase1(0) === 0) {
                return false;
            }
            if (testCase1(1) === 0) {
                return false;
            }
            if (testCase1(2) === 0) {
                return false;
            }

            if (testCase2(0) === 0) {
                return false;
            }
            if (testCase2(1) === 0) {
                return false;
            }
            if (testCase2(2) === 0) {
                return false;
            }

            if (testCase3(0, 0) === 0) {
                return false;
            }
            if (testCase3(1, 0) === 0) {
                return false;
            }
            if (testCase3(2, 0) === 0) {
                return false;
            }
            if (testCase3(0, 1) === 0) {
                return false;
            }
            if (testCase3(1, 1) === 0) {
                return false;
            }
            if (testCase3(2, 1) === 0) {
                return false;
            }
            if (testCase3(0, 2) === 0) {
                return false;
            }
            if (testCase3(1, 2) === 0) {
                return false;
            }
            if (testCase3(2, 2) === 0) {
                return false;
            }

            return true;
        }

        return collide(Bf, T, a, b);
    };

    /**
     * Compares the provided ObjectOrientedBoundingBox componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {ObjectOrientedBoundingBox} [left] The first ObjectOrientedBoundingBox.
     * @param {ObjectOrientedBoundingBox} [right] The second ObjectOrientedBoundingBox.
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    ObjectOrientedBoundingBox.equals = function(left, right) {
        return (left === right) || ((defined(left)) && (defined(right)) && Cartesian3.equals(left.transformedPosition, right.transformedPosition) && Matrix3.equals(left.transformMatrix, right.transformMatrix) && Cartesian3.equals(left.extent, right.extent));
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
     * @param {ObjectOrientedBoundingBox} [right] The right hand side ObjectOrientedBoundingBox.
     * @return {Boolean} <code>true</code> if this ObjectOrientedBoundingBox intersects the one provided <code>false</code> otherwise.
     */
    ObjectOrientedBoundingBox.prototype.intersect = function(right) {
        return ObjectOrientedBoundingBox.intersect(this, right);
    };

    return ObjectOrientedBoundingBox;
});
