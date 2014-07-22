/*global define*/
define([
        './Cartesian2',
        './Cartographic',
        './defaultValue',
        './defined',
        './DeveloperError',
        './GeographicProjection',
        './Intersect',
        './Rectangle'
    ], function(
        Cartesian2,
        Cartographic,
        defaultValue,
        defined,
        DeveloperError,
        GeographicProjection,
        Intersect,
        Rectangle) {
    "use strict";

    /**
     * A bounding rectangle given by a corner, width and height.
     * @alias BoundingRectangle
     * @constructor
     *
     * @param {Number} [x=0.0] The x coordinate of the rectangle.
     * @param {Number} [y=0.0] The y coordinate of the rectangle.
     * @param {Number} [width=0.0] The width of the rectangle.
     * @param {Number} [height=0.0] The height of the rectangle.
     *
     * @see BoundingSphere
     */
    var BoundingRectangle = function(x, y, width, height) {
        /**
         * The x coordinate of the rectangle.
         * @type {Number}
         * @default 0.0
         */
        this.x = defaultValue(x, 0.0);

        /**
         * The y coordinate of the rectangle.
         * @type {Number}
         * @default 0.0
         */
        this.y = defaultValue(y, 0.0);

        /**
         * The width of the rectangle.
         * @type {Number}
         * @default 0.0
         */
        this.width = defaultValue(width, 0.0);

        /**
         * The height of the rectangle.
         * @type {Number}
         * @default 0.0
         */
        this.height = defaultValue(height, 0.0);
    };

    /**
     * Computes a bounding rectangle enclosing the list of 2D points.
     * The rectangle is oriented with the corner at the bottom left.
     *
     * @param {Cartesian2[]} positions List of points that the bounding rectangle will enclose.  Each point must have <code>x</code> and <code>y</code> properties.
     * @param {BoundingRectangle} [result] The object onto which to store the result.
     * @returns {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided.
     */
    BoundingRectangle.fromPoints = function(positions, result) {
        if (!defined(result)) {
            result = new BoundingRectangle();
        }

        if (!defined(positions) || positions.length === 0) {
            result.x = 0;
            result.y = 0;
            result.width = 0;
            result.height = 0;
            return result;
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

            minimumX = Math.min(x, minimumX);
            maximumX = Math.max(x, maximumX);
            minimumY = Math.min(y, minimumY);
            maximumY = Math.max(y, maximumY);
        }

        result.x = minimumX;
        result.y = minimumY;
        result.width = maximumX - minimumX;
        result.height = maximumY - minimumY;
        return result;
    };

    var defaultProjection = new GeographicProjection();
    var fromRectangleLowerLeft = new Cartographic();
    var fromRectangleUpperRight = new Cartographic();
    /**
     * Computes a bounding rectangle from an rectangle.
     *
     * @param {Rectangle} rectangle The valid rectangle used to create a bounding rectangle.
     * @param {Object} [projection=GeographicProjection] The projection used to project the rectangle into 2D.
     * @param {BoundingRectangle} [result] The object onto which to store the result.
     * @returns {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided.
     */
    BoundingRectangle.fromRectangle = function(rectangle, projection, result) {
        if (!defined(result)) {
            result = new BoundingRectangle();
        }

        if (!defined(rectangle)) {
            result.x = 0;
            result.y = 0;
            result.width = 0;
            result.height = 0;
            return result;
        }

        projection = defaultValue(projection, defaultProjection);

        var lowerLeft = projection.project(Rectangle.southwest(rectangle, fromRectangleLowerLeft));
        var upperRight = projection.project(Rectangle.northeast(rectangle, fromRectangleUpperRight));

        Cartesian2.subtract(upperRight, lowerLeft, upperRight);

        result.x = lowerLeft.x;
        result.y = lowerLeft.y;
        result.width = upperRight.x;
        result.height = upperRight.y;
        return result;
    };

    /**
     * Duplicates a BoundingRectangle instance.
     *
     * @param {BoundingRectangle} rectangle The bounding rectangle to duplicate.
     * @param {BoundingRectangle} [result] The object onto which to store the result.
     * @returns {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided. (Returns undefined if rectangle is undefined)
     */
    BoundingRectangle.clone = function(rectangle, result) {
        if (!defined(rectangle)) {
            return undefined;
        }

        if (!defined(result)) {
            return new BoundingRectangle(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
        }

        result.x = rectangle.x;
        result.y = rectangle.y;
        result.width = rectangle.width;
        result.height = rectangle.height;
        return result;
    };

    /**
     * Computes a bounding rectangle that is the union of the left and right bounding rectangles.
     *
     * @param {BoundingRectangle} left A rectangle to enclose in bounding rectangle.
     * @param {BoundingRectangle} right A rectangle to enclose in a bounding rectangle.
     * @param {BoundingRectangle} [result] The object onto which to store the result.
     * @returns {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided.
     */
    BoundingRectangle.union = function(left, right, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(left)) {
            throw new DeveloperError('left is required.');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new BoundingRectangle();
        }

        var lowerLeftX = Math.min(left.x, right.x);
        var lowerLeftY = Math.min(left.y, right.y);
        var upperRightX = Math.max(left.x + left.width, right.x + right.width);
        var upperRightY = Math.max(left.y + left.height, right.y + right.height);

        result.x = lowerLeftX;
        result.y = lowerLeftY;
        result.width = upperRightX - lowerLeftX;
        result.height = upperRightY - lowerLeftY;
        return result;
    };

    /**
     * Computes a bounding rectangle by enlarging the provided rectangle until it contains the provided point.
     *
     * @param {BoundingRectangle} rectangle A rectangle to expand.
     * @param {Cartesian2} point A point to enclose in a bounding rectangle.
     * @param {BoundingRectangle} [result] The object onto which to store the result.
     * @returns {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided.
     */
    BoundingRectangle.expand = function(rectangle, point, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required.');
        }
        if (!defined(point)) {
            throw new DeveloperError('point is required.');
        }
        //>>includeEnd('debug');

        result = BoundingRectangle.clone(rectangle, result);

        var width = point.x - result.x;
        var height = point.y - result.y;

        if (width > result.width) {
            result.width = width;
        } else if (width < 0) {
            result.width -= width;
            result.x = point.x;
        }

        if (height > result.height) {
            result.height = height;
        } else if (height < 0) {
            result.height -= height;
            result.y = point.y;
        }

        return result;
    };

    /**
     * Determines if two rectangles intersect.
     *
     * @param {BoundingRectangle} left A rectangle to check for intersection.
     * @param {BoundingRectangle} right The other rectangle to check for intersection.
     * @returns {Intersect} <code>Intersect.INTESECTING</code> if the rectangles intersect, <code>Intersect.OUTSIDE</code> otherwise.
     */
    BoundingRectangle.intersect = function(left, right) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(left)) {
            throw new DeveloperError('left is required.');
        }
        if (!defined(right)) {
            throw new DeveloperError('right is required.');
        }
        //>>includeEnd('debug');

        var leftX = left.x;
        var leftY = left.y;
        var rightX = right.x;
        var rightY = right.y;
        if (!(leftX > rightX + right.width ||
              leftX + left.width < rightX ||
              leftY + left.height < rightY ||
              leftY > rightY + right.height)) {
            return Intersect.INTERSECTING;
        }

        return Intersect.OUTSIDE;
    };

    /**
     * Compares the provided BoundingRectangles componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {BoundingRectangle} [left] The first BoundingRectangle.
     * @param {BoundingRectangle} [right] The second BoundingRectangle.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    BoundingRectangle.equals = function(left, right) {
        return (left === right) ||
               ((defined(left)) &&
                (defined(right)) &&
                (left.x === right.x) &&
                (left.y === right.y) &&
                (left.width === right.width) &&
                (left.height === right.height));
    };

    /**
     * Duplicates this BoundingRectangle instance.
     *
     * @param {BoundingRectangle} [result] The object onto which to store the result.
     * @returns {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided.
     */
    BoundingRectangle.prototype.clone = function(result) {
        return BoundingRectangle.clone(this, result);
    };

    /**
     * Determines if this rectangle intersects with another.
     *
     * @param {BoundingRectangle} right A rectangle to check for intersection.
     * @returns {Intersect} <code>Intersect.INTESECTING</code> if the rectangles intersect, <code>Intersect.OUTSIDE</code> otherwise.
     */
    BoundingRectangle.prototype.intersect = function(right) {
        return BoundingRectangle.intersect(this, right);
    };

    /**
     * Compares this BoundingRectangle against the provided BoundingRectangle componentwise and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {BoundingRectangle} [right] The right hand side BoundingRectangle.
     * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
     */
    BoundingRectangle.prototype.equals = function(right) {
        return BoundingRectangle.equals(this, right);
    };

    return BoundingRectangle;
});
