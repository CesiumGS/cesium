/*global define*/
define([
        './defaultValue',
        './defined',
        './DeveloperError',
        './Cartesian3',
        './Intersect',
        './Matrix3',
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        Cartesian3,
        Intersect,
        Matrix3) {
    "use strict";

    /**
     * Creates an instance of an ObjectOrientedBoundingBox.
     * @alias ObjectOrientedBoundingBox
     * @constructor
     *
     * @see BoundingSphere
     */
    var ObjectOrientedBoundingBox = function() {
        this.transformMatrix;
        this.transformedPositions;
        this.extent;
    };

    /**
     * Computes an instance of an ObjectOrientedBoundingBox of the given positions. The box is determined //TODO
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
            result.transformMatrix = new Matrix3();
            result.transformedPositions = new Cartesian3();
            result.extent = new Cartesian3();
        }

        if (!defined(positions) || positions.length === 0) {
            return result;
        }

        var meanPoint = new Cartesian3();

        var length = positions.length;
        for ( var i = 0; i < length; i++) {
            var p = positions[i];
            meanPoint = Cartesian3.add(meanPoint, p, meanPoint);
        }
        meanPoint = Cartesian3.multiplyByScalar(meanPoint, 1/length, meanPoint);
        var exx=0.0;
        var exy=0.0;
        var exz=0.0;
        var eyy=0.0;
        var eyz=0.0;
        var ezz=0.0;

        for ( var i = 0; i < length; i++) {
            var p = positions[i];
            exx += p.x*p.x - meanPoint.x*meanPoint.x;
            exy += p.x*p.y - meanPoint.x*meanPoint.y;
            exz += p.x*p.z - meanPoint.x*meanPoint.z;
            eyy += p.y*p.y - meanPoint.y*meanPoint.y;
            eyz += p.y*p.z - meanPoint.y*meanPoint.z;
            ezz += p.z*p.z - meanPoint.z*meanPoint.z;
        }

        var covarianceMatrix = new Matrix3(exx,exy,exz,exy,eyy,eyz,exz,eyz,ezz);

        var unitaryMatrix = new Matrix3();
        var diagonalMatrix = new Matrix3(); //we don't need the eigenvalues
        Matrix3.getEigenDecomposition(covarianceMatrix, unitaryMatrix, diagonalMatrix);

        //eigenvectors of covMatrix
        var v1 = Matrix3.getColumn(unitaryMatrix, 0, v1);
        var v2 = Matrix3.getColumn(unitaryMatrix, 1, v2);
        var v3 = Matrix3.getColumn(unitaryMatrix, 2, v3);

        //normalized eigenvectors
        var r = Cartesian3.normalize(v1, r);
        var u = Cartesian3.normalize(v2, u);
        var f = Cartesian3.normalize(v3, f);

        result.transformMatrix = new Matrix3(r.x, u.x, f.x, r.y, u.y, f.y, r.z, u.z, f.z);


        var p = positions[0];
        var tempPoint = new Cartesian3(Cartesian3.dot(r, p), Cartesian3.dot(u, p), Cartesian3.dot(f, p));
        var maxPoint = tempPoint;
        var minPoint = tempPoint;


        for ( var i = 1; i < length; i++) {
            p = positions[i];
            tempPoint = new Cartesian3(Cartesian3.dot(r, p), Cartesian3.dot(u, p), Cartesian3.dot(f, p));
            minPoint = minimum(minPoint, tempPoint);
            maxPoint = maximum(maxPoint, tempPoint);
        }

        var center = new Cartesian3((minPoint.x+maxPoint.x)*0.5, (minPoint.y+maxPoint.y)*0.5, (minPoint.z+maxPoint.z)*0.5);

        result.transformedPositions = new Cartesian3(Cartesian3.dot(r, center), Cartesian3.dot(u, center), Cartesian3.dot(f, center))

        result.extent = new Cartesian3((maxPoint.x-minPoint.x)*0.5, (maxPoint.y-minPoint.y)*0.5, (maxPoint.z-minPoint.z)*0.5);

        return result;
    };

    function minimum(first, second) {


        if (first.x > second.x) {
            first.x = second.x;
        }
        if (first.y > second.y) {
            first.y = second.y;
        }
        if (first.z > second.z) {
            first.z = second.z;
        }
        return first;
    }
    function maximum(first, second) {


        if (first.x < second.x) {
            first.x = second.x;
        }
        if (first.y < second.y) {
            first.y = second.y;
        }
        if (first.z < second.z) {
            first.z = second.z;
        }
        return first;
    }


    /**
     * Duplicates a ObjectOrientedBoundingBox instance. //TODO
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
            return new ObjectOrientedBoundingBox();
        }

        return result;
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
        return (left === right) ||
               ((defined(left)) &&
                (defined(right)) &&
                Cartesian3.equals(left.center, right.center) &&
                Cartesian3.equals(left.minimum, right.minimum) &&
                Cartesian3.equals(left.maximum, right.maximum)); //TODO
    };

    var intersectScratch = new Cartesian3();
    /**
     * Determines which side of a plane a box is located. //TODO
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {ObjectOrientedBoundingBox} box The bounding box to test.
     * @param {Cartesian4} plane The coefficients of the plane in the form <code>ax + by + cz + d = 0</code>
     *                           where the coefficients a, b, c, and d are the components x, y, z, and w
     *                           of the {Cartesian4}, respectively.
     * @return {Intersect} {Intersect.INSIDE} if the entire box is on the side of the plane the normal is pointing,
     *                     {Intersect.OUTSIDE} if the entire box is on the opposite side, and {Intersect.INTERSETING}
     *                     if the box intersects the plane.
     *
     * @exception {DeveloperError} box is required.
     * @exception {DeveloperError} plane is required.
     */
    ObjectOrientedBoundingBox.intersect = function(box, plane) {
        if (!defined(box)) {
            throw new DeveloperError('box is required.');
        }

        if (!defined(plane)) {
            throw new DeveloperError('plane is required.');
        }

        intersectScratch = Cartesian3.subtract(box.maximum, box.minimum, intersectScratch);
        var h = Cartesian3.multiplyByScalar(intersectScratch, 0.5, intersectScratch); //The positive half diagonal
        var e = h.x * Math.abs(plane.x) + h.y * Math.abs(plane.y) + h.z * Math.abs(plane.z);
        var s = Cartesian3.dot(box.center, plane) + plane.w; //signed distance from center

        if (s - e > 0) {
            return Intersect.INSIDE;
        }

        if (s + e < 0) {
            //Not in front because normals point inward
            return Intersect.OUTSIDE;
        }

        return Intersect.INTERSECTING;
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
     * Determines which side of a plane this box is located.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {Cartesian4} plane The coefficients of the plane in the form <code>ax + by + cz + d = 0</code>
     *                           where the coefficients a, b, c, and d are the components x, y, z, and w
     *                           of the {Cartesian4}, respectively.
     * @return {Intersect} {Intersect.INSIDE} if the entire box is on the side of the plane the normal is pointing,
     *                     {Intersect.OUTSIDE} if the entire box is on the opposite side, and {Intersect.INTERSETING}
     *                     if the box intersects the plane.
     *
     * @exception {DeveloperError} plane is required.
     */
    ObjectOrientedBoundingBox.prototype.intersect = function(plane) {
        return ObjectOrientedBoundingBox.intersect(this, plane);
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
