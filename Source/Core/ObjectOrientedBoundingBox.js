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
            result.transformedPosition = new Cartesian3();
            result.extent = new Cartesian3();
        }

        if (!defined(positions) || positions.length === 0) {
            return result;
        }

        var meanPoint = new Cartesian3();

        var length = positions.length;
        for ( var i = 0; i < length; i++) {
            var p = positions[i];
            meanPoint = Cartesian3.add(meanPoint, Cartesian3.multiplyByScalar(p, 1/length));
        }
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

        var eigenDecomposition = Matrix3.getEigenDecomposition(covarianceMatrix);
        var unitaryMatrix = eigenDecomposition.unitary;

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
            minPoint = Cartesian3.getMinimumByComponent(minPoint, tempPoint);
            maxPoint = Cartesian3.getMaximumByComponent(maxPoint, tempPoint);
        }

        var center = new Cartesian3((minPoint.x+maxPoint.x)*0.5, (minPoint.y+maxPoint.y)*0.5, (minPoint.z+maxPoint.z)*0.5);

        result.transformedPosition = new Cartesian3(Cartesian3.dot(Matrix3.getRow(result.transformMatrix, 0), center), Cartesian3.dot(Matrix3.getRow(result.transformMatrix, 1), center), Cartesian3.dot(Matrix3.getRow(result.transformMatrix, 2), center))

        result.extent = new Cartesian3((maxPoint.x-minPoint.x)*0.5, (maxPoint.y-minPoint.y)*0.5, (maxPoint.z-minPoint.z)*0.5);

        return result;
    };


    /**
     * Get the describing points of the ObjectOrientedBoundingBox.
     * @memberof ObjectOrientedBoundingBox
     *
     * @param {ObjectOrientedBoundingBox} box The bounding box.
     * @param {Cartesian3} [result] The object onto which to store the resulting points.
     * @return {Cartesian3} The object onto which to store the resulting points.
     */
    ObjectOrientedBoundingBox.getDescribingPoints = function(box, result) {
        if (!defined(box)) {
            return undefined;
        }

        if (!defined(result)) {
          var result = [];
        }

        var r = Matrix3.getColumn(box.transformMatrix, 0, r);
        var u = Matrix3.getColumn(box.transformMatrix, 1, u);
        var f = Matrix3.getColumn(box.transformMatrix, 2, f);

        var point = Cartesian3.add(Cartesian3.add(Cartesian3.add(box.transformedPosition,Cartesian3.multiplyByScalar(r, box.extent.x*(-1))),Cartesian3.multiplyByScalar(u, box.extent.y*(-1))),Cartesian3.multiplyByScalar(f, box.extent.z*(-1)));
        result.push(point);
        point = Cartesian3.add(Cartesian3.add(Cartesian3.add(box.transformedPosition,Cartesian3.multiplyByScalar(r, box.extent.x*(1))),Cartesian3.multiplyByScalar(u, box.extent.y*(-1))),Cartesian3.multiplyByScalar(f, box.extent.z*(-1)));
        result.push(point);
        point = Cartesian3.add(Cartesian3.add(Cartesian3.add(box.transformedPosition,Cartesian3.multiplyByScalar(r, box.extent.x*(1))),Cartesian3.multiplyByScalar(u, box.extent.y*(-1))),Cartesian3.multiplyByScalar(f, box.extent.z*(1)));
        result.push(point);
        point = Cartesian3.add(Cartesian3.add(Cartesian3.add(box.transformedPosition,Cartesian3.multiplyByScalar(r, box.extent.x*(-1))),Cartesian3.multiplyByScalar(u, box.extent.y*(-1))),Cartesian3.multiplyByScalar(f, box.extent.z*(1)));
        result.push(point);
        point = Cartesian3.add(Cartesian3.add(Cartesian3.add(box.transformedPosition,Cartesian3.multiplyByScalar(r, box.extent.x*(-1))),Cartesian3.multiplyByScalar(u, box.extent.y*(1))),Cartesian3.multiplyByScalar(f, box.extent.z*(-1)));
        result.push(point);
        point = Cartesian3.add(Cartesian3.add(Cartesian3.add(box.transformedPosition,Cartesian3.multiplyByScalar(r, box.extent.x*(1))),Cartesian3.multiplyByScalar(u, box.extent.y*(1))),Cartesian3.multiplyByScalar(f, box.extent.z*(-1)));
        result.push(point);
        point = Cartesian3.add(Cartesian3.add(Cartesian3.add(box.transformedPosition,Cartesian3.multiplyByScalar(r, box.extent.x*(1))),Cartesian3.multiplyByScalar(u, box.extent.y*(1))),Cartesian3.multiplyByScalar(f, box.extent.z*(1)));
        result.push(point);
        point = Cartesian3.add(Cartesian3.add(Cartesian3.add(box.transformedPosition,Cartesian3.multiplyByScalar(r, box.extent.x*(-1))),Cartesian3.multiplyByScalar(u, box.extent.y*(1))),Cartesian3.multiplyByScalar(f, box.extent.z*(1)));
        result.push(point);

        return result;
    };

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
           var result = new ObjectOrientedBoundingBox();
        }

        result.transformMatrix = box.transformMatrix;
        result.transformedPosition = box.transformedPosition;
        result.extent = box.extent;

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
                Cartesian3.equals(left.transformedPosition, right.transformedPosition) &&
                Matrix3.equals(left.transformMatrix, right.transformMatrix) &&
                Cartesian3.equals(left.extent, right.extent));
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

        return undefined;
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
