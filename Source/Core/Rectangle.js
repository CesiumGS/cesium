/*global define*/
define(['./DeveloperError'], function(DeveloperError) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @name Rectangle
     *
     * @param {Number} [x=0.0] The x coordinate of the rectangle.
     * @param {Number} [y=0.0] The y coordinate of the rectangle.
     * @param {Number} [width=0.0] The width of the rectangle.
     * @param {Number} [height=0.0] The height of the rectangle.
     *
     * @constructor
     */
    function Rectangle(x, y, width, height) {
        /**
         * The x coordinate of the rectangle
         *
         * @type Number
         *
         * @see Rectangle.y
         */
        this.x = x || 0.0;

        /**
         * The y coordinate of the rectangle
         *
         * @type Number
         *
         * @see Rectangle.x
         */
        this.y = y || 0.0;

        /**
         * The width of the rectangle
         *
         * @type Number
         *
         * @see Rectangle.height
         */
        this.width = width || 0.0;

        /**
         * The height of the rectangle
         *
         * @type Number
         *
         * @see Rectangle.width
         */
        this.height = height || 0.0;
    }

    Rectangle.createAxisAlignedBoundingRectangle = function(positions) {
        if (typeof positions === 'undefined') {
            throw new DeveloperError('positions is required.');
        }

        if (typeof positions.length === 'undefined' || positions.length <= 0) {
            throw new DeveloperError('The length of positions must be greater than zero.');
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

        return new Rectangle(minimumX, minimumY, maximumX - minimumX, maximumY - minimumY);
    };

    /**
     * Returns a copy of this rectangle.
     *
     * @memberof Rectangle
     *
     * @return {Rectangle} A copy of this rectangle.
     */
    Rectangle.prototype.clone = function() {
        return new Rectangle(this.x, this.y, this.width, this.height);
    };

    /**
     * Returns <code>true</code> if this rectangle equals <code>other</code>, property for property.
     *
     * @memberof Rectangle
     *
     * @param {Rectangle} other The rectangle to compare for equality.
     *
     * @return {Boolean} <code>true</code> if the rectangles are equal; otherwise, <code>false</code>.
     */
    Rectangle.prototype.equals = function(other) {
        return (this.x === other.x) &&
               (this.y === other.y) &&
               (this.width === other.width) &&
               (this.height === other.height);
    };

    /**
     * Returns <code>true</code> if this rectangle equals <code>other</code>, property for property, within the specified epsilon.
     *
     * @memberof Rectangle
     *
     * @param {Rectangle} other The rectangle to compare for equality.
     * @param {Number} [epsilon=0.0] The epsilon to use for equality testing.
     *
     * @return {Boolean} <code>true</code> if the rectangles are equal within the specified epsilon; otherwise, <code>false</code>.
     */
    Rectangle.prototype.equalsEpsilon = function(other, epsilon) {
        epsilon = epsilon || 0.0;
        return (Math.abs(this.x - other.x) <= epsilon) &&
               (Math.abs(this.y - other.y) <= epsilon) &&
               (Math.abs(this.width - other.width) <= epsilon) &&
               (Math.abs(this.height - other.height) <= epsilon);
    };

    /**
     * Returns a string representing this rectangle in the format (x, y, width, height).
     *
     * @memberof Rectangle
     *
     * @return {String} A string representing this rectangle.
     */
    Rectangle.prototype.toString = function() {
        return '(' + this.x + ', ' + this.y + ', ' + this.width + ', ' + this.height + ')';
    };

    /**
     * DOC_TBA
     * @memberof Rectangle
     */
    Rectangle.rectangleRectangleIntersect = function(rect1, rect2) {
        return !(rect1.x > rect2.x + rect2.width ||
                 rect1.x + rect1.width < rect2.x ||
                 rect1.y + rect1.height < rect2.y ||
                 rect1.y > rect2.y + rect2.height);
    };

    return Rectangle;
});
