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

        /**
         * The center point of the bounding box.
         *
         * @type {Cartesian3}
         */
        this.center = (this.minimum.add(this.maximum)).multiplyByScalar(0.5);
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

        result.minimum = box.minimum.clone();
        result.maximum = box.maximum.clone();
        result.center = box.center.clone();
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
                (left.center.equals(right.center)) &&
                (left.minimum.equals(right.minimum)) &&
                (left.maximum.equals(right.maximum)));
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
     *
     * @return {AxisAlignedBoundingBox} The axis-aligned bounding box constructed from {@link positions}.
     *
     * @example
     * // Compute an axis aligned bounding box enclosing two points.
     * var box = AxisAlignedBoundingBox.fromPoints([new Cartesian3(2, 0, 0), new Cartesian3(-2, 0, 0)]);
     */
    AxisAlignedBoundingBox.fromPoints = function(positions)
    {
        if (typeof positions === 'undefined') {
            throw new DeveloperError('positions is required.');
        }

        var length = positions.length;
        if (typeof length === 'undefined' || length < 1) {
            throw new DeveloperError('At least one position is required.');
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

            if (x < minimumX) {
                minimumX = x;
            }

            if (x > maximumX) {
                maximumX = x;
            }

            if (y < minimumY) {
                minimumY = y;
            }

            if (y > maximumY) {
                maximumY = y;
            }

            if (z < minimumZ) {
                minimumZ = z;
            }

            if (z > maximumZ) {
                maximumZ = z;
            }
        }

        var min = new Cartesian3(minimumX, minimumY, minimumZ);
        var max = new Cartesian3(maximumX, maximumY, maximumZ);

        return new AxisAlignedBoundingBox(min, max);
    };

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
            throw DeveloperError('box is required.');
        }

        if (typeof plane === 'undefined') {
            throw DeveloperError('plane is required.');
        }

        var max = box.maximum;
        var min = box.minimum;
        var center = box.center;
        var h = max.subtract(min).multiplyByScalar(0.5); //The positive half diagonal
        var e = h.x * Math.abs(plane.x) + h.y * Math.abs(plane.y) + h.z * Math.abs(plane.z);
        var s = center.dot(plane) + plane.w; //signed distance from center
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
            throw DeveloperError('plane is required.');
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
