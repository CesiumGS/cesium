/*global define*/
define([
        './DeveloperError',
        './Cartesian3',
        './Intersect'
    ], function(
        DeveloperError,
        Cartesian3,
        Intersect) {
    "use strict";

    /**
     * Creates an instance of an AxisAlignedBoundingBox from the minimum and maximum points along the x-, y-, and z-axes.
     *
     * @alias AxisAlignedBoundingBox
     *
     * @constructor
     *
     * @param {Cartesian3} minimumPoint The minimum point along the x-, y-, and z-axes.
     * @param {Cartesian3} maximumPoint The maximum point along the x-, y-, and z-axes.
     *
     * @exception {DeveloperError} minimumPoint is required.
     * @exception {DeveloperError} maximumPoint is required.
     *
     * @see BoundingSphere
     */
    var AxisAlignedBoundingBox = function(minimumPoint, maximumPoint) {
        if (typeof minimumPoint === 'undefined') {
            throw new DeveloperError('minimumPoint is required');
        }

        if (typeof maximumPoint === 'undefined') {
            throw new DeveloperError('maximumPoint is required.');
        }

        /**
         * The minimum point defining the bounding box.
         *
         * @type {Cartesian3}
         */
        this.minimum = Cartesian3.clone(minimumPoint);

        /**
         * The maximum point defining the bounding box.
         *
         * @type {Cartesian3}
         */
        this.maximum = Cartesian3.clone(maximumPoint);

        var center = this.minimum.add(this.maximum);

        /**
         * The center point of the bounding box.
         *
         * @type {Cartesian3}
         */
        this.center = center.multiplyByScalar(0.5, center);
    };

    /**
     * Duplicates a AxisAlignedBoundingBox instance.
     * @memberof AxisAlignedBoundingBox
     *
     * @param {AxisAlignedBoundingBox} sphere The bounding box to duplicate.
     * @param {AxisAlignedBoundingBox} [result] The object onto which to store the result.
     * @return {AxisAlignedBoundingBox} The modified result parameter or a new AxisAlignedBoundingBox instance if none was provided.
     *
     * @exception {DeveloperError} box is required.
     */
    AxisAlignedBoundingBox.clone = function(box, result) {
        if (typeof box === 'undefined') {
            throw new DeveloperError('box is required');
        }

        if (typeof result === 'undefined') {
            return new AxisAlignedBoundingBox(box.minimum, box.maximum);
        }

        result.minimum = Cartesian3.clone(box.minimum, result.minimum);
        result.maximum = Cartesian3.clone(box.maximum, result.maximum);
        result.center = Cartesian3.clone(box.center, result.center);
        return result;
    };

    /**
     * Compares the provided AxisAlignedBoundingBox componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof AxisAlignedBoundingBox
     *
     * @param {AxisAlignedBoundingBox} [left] The first AxisAlignedBoundingBox.
     * @param {AxisAlignedBoundingBox} [right] The second AxisAlignedBoundingBox.
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    AxisAlignedBoundingBox.equals = function(left, right) {
        return (left === right) ||
               ((typeof left !== 'undefined') &&
                (typeof right !== 'undefined') &&
                Cartesian3.equals(left.center, right.center) &&
                Cartesian3.equals(left.minimum, right.minimum) &&
                Cartesian3.equals(left.maximum, right.maximum));
    };

    /**
     * Creates an instance of an AxisAlignedBoundingBox. The box is determined by finding the points spaced the
     * farthest apart on the x-, y-, and z-axes.
     *
     * @memberof AxisAlignedBoundingBox
     *
     * @param {Array} positions List of points that the bounding box will enclose.  Each point must have a <code>x</code>, <code>y</code>, and <code>z</code> properties.
     *
     * @exception {DeveloperError} <code>positions</code> is required.
     * @exception {DeveloperError} At least one position is required.
     * @param {AxisAlignedBoundingBox} [result] The object onto which to store the result.
     *
     * @return {AxisAlignedBoundingBox} The axis-aligned bounding box constructed from {@link positions}.
     *
     * @example
     * // Compute an axis aligned bounding box enclosing two points.
     * var box = AxisAlignedBoundingBox.fromPoints([new Cartesian3(2, 0, 0), new Cartesian3(-2, 0, 0)]);
     */
    AxisAlignedBoundingBox.fromPoints = function(positions, result) {
        if (typeof positions === 'undefined') {
            throw new DeveloperError('positions is required.');
        }

        var length = positions.length;
        if (length < 1) {
            throw new DeveloperError('At least one position is required.');
        }

        if (typeof result === 'undefined') {
            result = new AxisAlignedBoundingBox(Cartesian3.ZERO, Cartesian3.ZERO);
        }

        var minimumX = positions[0].x;
        var minimumY = positions[0].y;
        var minimumZ = positions[0].z;

        var maximumX = positions[0].x;
        var maximumY = positions[0].y;
        var maximumZ = positions[0].z;

        for ( var i = 1; i < length; i++) {
            var p = positions[i];
            var x = p.x;
            var y = p.y;
            var z = p.z;

            minimumX = Math.min(x, minimumX);
            maximumX = Math.max(x, maximumX);
            minimumY = Math.min(y, minimumY);
            maximumY = Math.max(y, maximumY);
            minimumZ = Math.min(z, minimumZ);
            maximumZ = Math.max(z, maximumZ);
        }

        result.minimum = new Cartesian3(minimumX, minimumY, minimumZ);
        result.maximum = new Cartesian3(maximumX, maximumY, maximumZ);

        var center = result.minimum.add(result.maximum);
        result.center = center.multiplyByScalar(0.5, center);

        return result;
    };

    var intersectScratch = new Cartesian3();

    /**
     * Determines which side of a plane a box is located.
     *
     * @memberof AxisAlignedBoundingBox
     *
     * @param {AxisAlignedBoundingBox} box The bounding box to test.
     * @param {Cartesian4} plane The coefficients of the plane in the for ax + by + cz + d = 0 where the coefficients a, b, c, and d are the components x, y, z, and w of the {Cartesian4}, respectively.
     *
     * @return {Intersect} {Intersect.INSIDE} if the entire box is on the side of the plane the normal is pointing, {Intersect.OUTSIDE} if the entire box is on the opposite side, and {Intersect.INTERSETING} if the box intersects the plane.
     *
     * @exception {DeveloperError} box is required.
     * @exception {DeveloperError} plane is required.
     */
    AxisAlignedBoundingBox.intersect = function(box, plane) {
        if (typeof box === 'undefined') {
            throw new DeveloperError('box is required.');
        }

        if (typeof plane === 'undefined') {
            throw new DeveloperError('plane is required.');
        }

        var max = box.maximum;
        var min = box.minimum;
        var center = box.center;
        intersectScratch = Cartesian3.subtract(max, min, intersectScratch);
        var h = Cartesian3.multiplyByScalar(intersectScratch, 0.5, intersectScratch); //The positive half diagonal
        var e = h.x * Math.abs(plane.x) + h.y * Math.abs(plane.y) + h.z * Math.abs(plane.z);
        var s = Cartesian3.dot(center, plane) + plane.w; //signed distance from center
        if (s - e > 0) {
            return Intersect.INSIDE;
        }

        if (s + e < 0) {
            //Not in front because normals point inwards
            return Intersect.OUTSIDE;
        }

        return Intersect.INTERSECTING;
    };

    /**
     * Duplicates this AxisAlignedBoundingBox instance.
     * @memberof AxisAlignedBoundingBox
     *
     * @param {AxisAlignedBoundingBox} [result] The object onto which to store the result.
     * @return {AxisAlignedBoundingBox} The modified result parameter or a new AxisAlignedBoundingBox instance if none was provided.
     */
    AxisAlignedBoundingBox.prototype.clone = function(result) {
        return AxisAlignedBoundingBox.clone(this, result);
    };

    /**
     * Determines which side of a plane the box is located.
     *
     * @memberof AxisAlignedBoundingBox
     *
     * @param {Cartesian4} plane The coefficients of the plane in the for ax + by + cz + d = 0 where the coefficients a, b, c, and d are the components x, y, z, and w of the {Cartesian4}, respectively.
     *
     * @return {Intersect} {Intersect.INSIDE} if the entire box is on the side of the plane the normal is pointing, {Intersect.OUTSIDE} if the entire box is on the opposite side, and {Intersect.INTERSETING} if the box intersects the plane.
     *
     * @exception {DeveloperError} plane is required.
     */
    AxisAlignedBoundingBox.prototype.intersect = function(plane) {
        if (typeof plane === 'undefined') {
            throw new DeveloperError('plane is required.');
        }

        return AxisAlignedBoundingBox.intersect(this, plane);
    };

    /**
     * Compares this AxisAlignedBoundingBox against the provided AxisAlignedBoundingBox componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof AxisAlignedBoundingBox
     *
     * @param {AxisAlignedBoundingBox} [right] The right hand side AxisAlignedBoundingBox.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    AxisAlignedBoundingBox.prototype.equals = function(right) {
        return AxisAlignedBoundingBox.equals(this, right);
    };

    return AxisAlignedBoundingBox;
});
