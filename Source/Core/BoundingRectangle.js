/*global define*/
define([
        './Cartesian2',
        './Cartographic',
        './DeveloperError',
        './Extent',
        './Math'
    ], function(
        Cartesian2,
        Cartographic,
        DeveloperError,
        Extent,
        CesiumMath) {
    "use strict";

    /**
     * A bounding rectangle given by a corner, width and height.
     *
     * @alias BoundingRectangle
     * @constructor
     *
     * @param {Number} x The x coordinate of the rectangle.
     * @param {Number} y The y coordinate of the rectangle.
     * @param {Number} width The width of the rectangle.
     * @param {Number} height The height of the rectangle.
     *
     * @exception {DeveloperError} x is required.
     * @exception {DeveloperError} y is required.
     * @exception {DeveloperError} width is required to be greater than or equal to zero.
     * @exception {DeveloperError} height is required to be greater than or equal to zero.
     */
    var BoundingRectangle = function(x, y, width, height) {
        if (typeof x === 'undefined') {
            throw new DeveloperError('x is required.');
        }

        if (typeof y === 'undefined') {
            throw new DeveloperError('y is required.');
        }

        if (typeof width === 'undefined' || width < 0.0) {
            throw new DeveloperError('width is required and must be greater than zero.');
        }

        if (typeof height === 'undefined' || height < 0.0) {
            throw new DeveloperError('height is required and must be greater than zero.');
        }

        /**
         * The x coordinate of the rectangle.
         *
         * @type Number
         */
        this.x = x;

        /**
         * The y coordinate of the rectangle.
         *
         * @type Number
         */
        this.y = y;

        /**
         * The width of the rectangle.
         *
         * @type Number
         */
        this.width = width;

        /**
         * The height of the rectangle.
         *
         * @type Number
         */
        this.height = height;
    };

    /**
     * Creates a bounding rectangle that contains both the left and right bounding rectangles.
     * @memberof BoundingRectangle
     *
     * @param {BoundingRectangle} left A rectangle to enclose in bounding rectangle.
     * @param {BoundingRectangle} right A rectangle to enclose in a bounding rectangle.
     * @param {BoundingRectangle} [result] The object onto which to store the result.
     *
     * @exception {DeveloperError} left is required.
     * @exception {DeveloperError} right is required.
     *
     * @return {BoundingRectangle} A rectangle that encloses both left and right bounding rectangles.
     */
    BoundingRectangle.expand = function(left, right, result) {
        if (typeof left === 'undefined') {
            throw new DeveloperError('left is required.');
        }

        if (typeof right === 'undefined') {
            throw new DeveloperError('right is required.');
        }

        if (typeof result === 'undefined') {
            result = new BoundingRectangle(1.0, 1.0, 1.0, 1.0);
        }

        var center1 = new Cartesian2(2.0 * left.x + left.width * 0.5, 2.0 * left.y + left.height * 0.5);
        var center2 = new Cartesian2(2.0 * right.x + right.width * 0.5, 2.0 * right.y + right.height * 0.5);
        var center = center1.add(center2).multiplyByScalar(0.5);
        var corner = new Cartesian2(Math.min(left.x, right.x), Math.min(left.y, right.y));
        var halfDimensions = center.subtract(corner);

        result.x = corner.x;
        result.y = corner.y;
        result.width = halfDimensions.x * 2.0;
        result.height = halfDimensions.y * 2.0;
        return result;
    };

    /**
     * Duplicates a BoundingRectangle instance.
     * @memberof BoundingRectangle
     *
     * @param {BoundingRectangle} rect The bounding rectangle to duplicate.
     * @param {BoundingRectangle} [result] The object onto which to store the result.
     * @return {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if none was provided.
     *
     * @exception {DeveloperError} rect is required.
     */
    BoundingRectangle.clone = function(rect, result) {
        if (typeof rect === 'undefined') {
            throw new DeveloperError('rect is required');
        }

        if (typeof result === 'undefined') {
            return new BoundingRectangle(rect.x, rect.y, rect.width, rect.height);
        }

        result.x = rect.x;
        result.y = rect.y;
        result.width = rect.width;
        result.height = rect.height;
        return result;
    };

    /**
     * Compares the provided BoundingRectangles componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof BoundingRectangle
     *
     * @param {BoundingRectangle} [left] The first BoundingRectangle.
     * @param {BoundingRectangle} [right] The second BoundingRectangle.
     * @return {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    BoundingRectangle.equals = function(left, right) {
        return (left === right) ||
               ((typeof left !== 'undefined') &&
                (typeof right !== 'undefined') &&
                (left.x === right.x) &&
                (left.y === right.y) &&
                (left.width === right.width) &&
                (left.height === right.height));
    };

    /**
     * Computes a bounding rectangle enclosing the list of 2D points.
     *
     * @memberof BoundingRectangle
     *
     * @param {Array} positions List of points that the bounding rectangle will enclose.  Each point must have <code>x</code> and <code>y</code> properties.
     *
     * @exception {DeveloperError} positions is required.
     * @exception {DeveloperError} positions must have a length greater than one.
     *
     * @return {BoundingRectangle} A bounding rectangle computed from the positions. The rectangle is oriented with the corner at the bottom left.
     */
    BoundingRectangle.fromPoints = function(positions) {
        if (typeof positions === 'undefined') {
            throw new DeveloperError('positions is required.');
        }

        if (typeof positions.length === 'undefined' || positions.length <= 1) {
            throw new DeveloperError('positions must have a length greater than one.');
        }

        var length = positions.length;

        var minimumX = positions[0].x;
        var minimumY = positions[0].y;

        var maximumX = positions[0].x;
        var maximumY = positions[0].y;

        for ( var i = 1; i < length; i++) {
            var p = positions[i];
            var x = p.x;
            var y = p.y;

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
        }

        var width = maximumX - minimumX;
        var height = maximumY - minimumY;
        return new BoundingRectangle(minimumX, minimumY, width, height);
    };

    /**
     * Creates a bounding rectangle from an extent.
     *
     * @memberof BoundingRectangle
     *
     * @param {Extent} extent The extent used to create a bounding rectangle.
     * @param {Object} projection The projection used to project the extent into 2D.
     *
     * @exception {DeveloperError} extent is required.
     * @exception {DeveloperError} projection is required.
     *
     * @returns {BoundingRectangle} The bounding rectangle containing the extent.
     */
    BoundingRectangle.fromExtent = function(extent, projection) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        if (typeof projection === 'undefined' || typeof projection.project === 'undefined') {
            throw new DeveloperError('projection is required.');
        }

        Extent.validate(extent);

        var lowerLeft = projection.project(extent.getSouthwest());
        var upperRight = projection.project(extent.getNortheast());

        var diagonal = upperRight.subtract(lowerLeft);
        return new BoundingRectangle(lowerLeft.x, lowerLeft.y, diagonal.x, diagonal.y);
    };

    /**
     * Determines if two rectangles intersect.
     *
     * @memberof BoundingRectangle
     *
     * @param {BoundingRectangle} rect1 A rectangle to check for intersection.
     * @param {BoundingRectangle} rect2 The other rectangle to check for intersection.
     *
     * @return {Boolean} <code>true</code> if the rectangles intersect, <code>false</code> otherwise.
     *
     * @exception {DeveloperError} rect1 is required.
     * @exception {DeveloperError} rect2 is required.
     */
    BoundingRectangle.rectangleIntersect = function(rect1, rect2) {
        if (typeof rect1 === 'undefined') {
            throw new DeveloperError('rect1 is required.');
        }

        if (typeof rect2 === 'undefined') {
            throw new DeveloperError('rect2 is required.');
        }

        return !(rect1.x > rect2.x + rect2.width ||
                 rect1.x + rect1.width < rect2.x ||
                 rect1.y + rect1.height < rect2.y ||
                 rect1.y > rect2.y + rect2.height);
    };

    /**
     * Creates a bounding rectangle that contains both this bounding rectangle and the argument rectangle.
     * @memberof BoundingRectangle
     *
     * @param {BoundingRectangle} rectangle The rectangle to enclose in this bounding rectangle.
     * @param {BoundingRectangle} [result] The object onto which to store the result.
     *
     * @exception {DeveloperError} rectangle is required.
     *
     * @return {BoundingRectangle} A rectangle that encloses both this rectangle and the argument rectangle.
     */
    BoundingRectangle.prototype.expand = function(rectangle, result) {
        if (typeof rectangle === 'undefined') {
            throw new DeveloperError('rectangle is required.');
        }

        return BoundingRectangle.expand(this, rectangle, result);
    };

    /**
     * Duplicates this BoundingRectangle instance.
     * @memberof BoundingRectangle
     *
     * @param {BoundingRectangle} [result] The object onto which to store the result.
     * @return {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if none was provided.
     */
    BoundingRectangle.prototype.clone = function(result) {
        return BoundingRectangle.clone(this, result);
    };

    /**
     * Compares this BoundingRectangle against the provided BoundingRectangle componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof BoundingRectangle
     *
     * @param {BoundingRectangle} [right] The right hand side BoundingRectangle.
     * @return {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    BoundingRectangle.prototype.equals = function(right) {
        return BoundingRectangle.equals(this, right);
    };

    return BoundingRectangle;
});
