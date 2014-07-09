/*global define*/
define([
        './Cartesian3',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Matrix3'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        DeveloperError,
        Matrix3) {
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
     * @see ObjectOrientedBoundingBox.fromPoints
     * @see ObjectOrientedBoundingBox.fromBoundingRectangle
     * @see BoundingSphere
     * @see BoundingRectangle
     *
     * @example
     * // Create an ObjectOrientedBoundingBox using a transformation matrix, a position where the box will be translated, and a scale.
     * var rotation = Cesium.Matrix3.clone(Cesium.Matrix3.IDENTITY);
     * var translation = new Cesium.Cartesian3(1,0,0);
     * var scale = new Cesium.Cartesian3(0,5,0);
     *
     * var oobb = new Cesium.ObjectOrientedBoundingBox(rotation, translation, scale);
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
    var scratchCovarianceResult = new Matrix3();
    var scratchEigenResult = {
        unitary : new Matrix3(),
        diagonal : new Matrix3()
    };

    /**
     * Computes an instance of an ObjectOrientedBoundingBox of the given positions.
     * This is an implementation of Stefan Gottschalk's Collision Queries using Oriented Bounding Boxes solution (PHD thesis).
     * Reference: http://gamma.cs.unc.edu/users/gottschalk/main.pdf
     *
     * @param {Cartesian3[]} positions List of {@link Cartesian3} points that the bounding box will enclose.
     * @param {ObjectOrientedBoundingBox} [result] The object onto which to store the result.
     * @returns {ObjectOrientedBoundingBox} The modified result parameter or a new ObjectOrientedBoundingBox instance if one was not provided.
     *
     * @example
     * // Compute an object oriented bounding box enclosing two points.
     * var box = Cesium.ObjectOrientedBoundingBox.fromPoints([new Cesium.Cartesian3(2, 0, 0), new Cesium.Cartesian3(-2, 0, 0)]);
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

        var i;
        var length = positions.length;

        var meanPoint = Cartesian3.clone(positions[0], scratchCartesian1);
        for (i = 1; i < length; i++) {
            Cartesian3.add(meanPoint, positions[i], meanPoint);
        }
        var invLength = 1.0 / length;
        Cartesian3.multiplyByScalar(meanPoint, invLength, meanPoint);

        var exx = 0.0;
        var exy = 0.0;
        var exz = 0.0;
        var eyy = 0.0;
        var eyz = 0.0;
        var ezz = 0.0;
        var p;

        for (i = 0; i < length; i++) {
            p = Cartesian3.subtract(positions[i], meanPoint, scratchCartesian2);
            exx += p.x * p.x;
            exy += p.x * p.y;
            exz += p.x * p.z;
            eyy += p.y * p.y;
            eyz += p.y * p.z;
            ezz += p.z * p.z;
        }

        exx *= invLength;
        exy *= invLength;
        exz *= invLength;
        eyy *= invLength;
        eyz *= invLength;
        ezz *= invLength;

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

        var eigenDecomposition = Matrix3.computeEigenDecomposition(covarianceMatrix, scratchEigenResult);
        var rotation = Matrix3.transpose(eigenDecomposition.unitary, result.rotation);

        p = Cartesian3.subtract(positions[0], meanPoint, scratchCartesian2);
        var tempPoint = Matrix3.multiplyByVector(rotation, p, scratchCartesian3);
        var maxPoint = Cartesian3.clone(tempPoint, scratchCartesian4);
        var minPoint = Cartesian3.clone(tempPoint, scratchCartesian5);

        for (i = 1; i < length; i++) {
            p = Cartesian3.subtract(positions[i], meanPoint, p);
            Matrix3.multiplyByVector(rotation, p, tempPoint);
            Cartesian3.minimumByComponent(minPoint, tempPoint, minPoint);
            Cartesian3.maximumByComponent(maxPoint, tempPoint, maxPoint);
        }

        var center = Cartesian3.add(minPoint, maxPoint, scratchCartesian3);
        Cartesian3.multiplyByScalar(center, 0.5, center);
        Matrix3.multiplyByVector(rotation, center, center);
        Cartesian3.add(meanPoint, center, result.translation);

        var scale = Cartesian3.subtract(maxPoint, minPoint, scratchCartesian3);
        Cartesian3.multiplyByScalar(scale, 0.5, result.scale);

        return result;
    };

    /**
     * Computes an ObjectOrientedBoundingBox from a BoundingRectangle.
     * The BoundingRectangle is placed on the XY plane.
     *
     * @param {BoundingRectangle} boundingRectangle A bounding rectangle.
     * @param {Number} [rotation=0.0] The rotation of the bounding box in radians.
     * @returns {ObjectOrientedBoundingBox} The modified result parameter or a new ObjectOrientedBoundingBox instance if one was not provided.
     *
     * @example
     * // Compute an object oriented bounding box enclosing two points.
     * var box = Cesium.ObjectOrientedBoundingBox.fromBoundingRectangle(boundingRectangle, 0.0);
     */
    ObjectOrientedBoundingBox.fromBoundingRectangle = function(boundingRectangle, rotation, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(boundingRectangle)) {
            throw new DeveloperError('boundingRectangle is required');
        }
        //>>includeEnd('debug');

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
     *
     * @param {ObjectOrientedBoundingBox} box The bounding box to duplicate.
     * @param {ObjectOrientedBoundingBox} [result] The object onto which to store the result.
     * @returns {ObjectOrientedBoundingBox} The modified result parameter or a new ObjectOrientedBoundingBox instance if none was provided. (Returns undefined if box is undefined)
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
     *
     * @param {ObjectOrientedBoundingBox} left The first ObjectOrientedBoundingBox.
     * @param {ObjectOrientedBoundingBox} right The second ObjectOrientedBoundingBox.
     * @returns {Boolean} <code>true</code> if they intersects each other <code>false</code> otherwise.
     */
    ObjectOrientedBoundingBox.intersect = function(left, right) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(left)) {
            throw new DeveloperError('left is required');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required');
        }
        //>>includeEnd('debug');

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
     *
     * @param {ObjectOrientedBoundingBox} left The first ObjectOrientedBoundingBox.
     * @param {ObjectOrientedBoundingBox} right The second ObjectOrientedBoundingBox.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    ObjectOrientedBoundingBox.equals = function(left, right) {
        return (left === right) ||
                ((defined(left)) &&
                 (defined(right)) &&
                 Cartesian3.equals(left.transformedPosition, right.transformedPosition) &&
                 Matrix3.equals(left.transformMatrix, right.transformMatrix) &&
                 Cartesian3.equals(left.rectangle, right.rectangle));
    };

    /**
     * Duplicates this ObjectOrientedBoundingBox instance.
     *
     * @param {ObjectOrientedBoundingBox} [result] The object onto which to store the result.
     * @returns {ObjectOrientedBoundingBox} The modified result parameter or a new ObjectOrientedBoundingBox instance if one was not provided.
     */
    ObjectOrientedBoundingBox.prototype.clone = function(result) {
        return ObjectOrientedBoundingBox.clone(this, result);
    };

    /**
     * Compares this ObjectOrientedBoundingBox against the provided ObjectOrientedBoundingBox componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {ObjectOrientedBoundingBox} [right] The right hand side ObjectOrientedBoundingBox.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    ObjectOrientedBoundingBox.prototype.equals = function(right) {
        return ObjectOrientedBoundingBox.equals(this, right);
    };

    return ObjectOrientedBoundingBox;
});
