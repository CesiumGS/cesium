/*global define*/
define(function() {
    "use strict";

    /**
     * A color, specified using red, green, blue, and alpha values,
     * which range from <code>0</code> (no intensity) to <code>1.0</code> (full intensity).
     *
     * @constructor
     * @name Color
     */
    function Color(red, green, blue, alpha) {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }

    Color.byteToFloat = function(number) {
        return number / 255.0;
    };

    Color.floatToByte = function(number) {
        return number === 1.0 ? 255.0 : (number * 256.0) | 0;
    };

    Color.equals = function(lhs, rhs) {
        return lhs.red === rhs.red &&
               lhs.green === rhs.green &&
               lhs.blue === rhs.blue &&
               lhs.alpha === rhs.alpha;
    };

    Color.equalsEpsilon = function(lhs, rhs, epsilon) {
        return (Math.abs(lhs.red - rhs.red) < epsilon) &&
               (Math.abs(lhs.green - rhs.green) < epsilon) &&
               (Math.abs(lhs.blue - rhs.blue) < epsilon) &&
               (Math.abs(lhs.alpha - rhs.alpha) < epsilon);
    };

    Color.prototype.equals = function(other) {
        return this.red === other.red &&
               this.green === other.green &&
               this.blue === other.blue &&
               this.alpha === other.alpha;
    };

    Color.prototype.equalsEpsilon = function(other, epsilon) {
        return (Math.abs(this.red - other.red) < epsilon) &&
               (Math.abs(this.green - other.green) < epsilon) &&
               (Math.abs(this.blue - other.blue) < epsilon) &&
               (Math.abs(this.alpha - other.alpha) < epsilon);
    };

    /**
     * Returns a string containing a CSS color value for this color.
     */
    Color.prototype.toCSSColor = function() {
        var r = Color.floatToByte(this.red);
        var g = Color.floatToByte(this.green);
        var b = Color.floatToByte(this.blue);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + this.alpha + ')';
    };

    /**
     * An immutable Color instance initialized to white, RGBA (1.0, 1.0, 1.0, 1.0).
     *
     * @memberof Color
     */
    Color.WHITE = Object.freeze(new Color(1.0, 1.0, 1.0, 1.0));

    /**
     * An immutable Color instance initialized to black, RGBA (0.0, 0.0, 0.0, 1.0).
     *
     * @memberof Color
     */
    Color.BLACK = Object.freeze(new Color(0.0, 0.0, 0.0, 1.0));

    /**
     * An immutable Color instance initialized to red, RGBA (1.0, 0.0, 0.0, 1.0).
     *
     * @memberof Color
     */
    Color.RED = Object.freeze(new Color(1.0, 0.0, 0.0, 1.0));

    /**
     * An immutable Color instance initialized to green, RGBA (0.0, 1.0, 0.0, 1.0).
     *
     * @memberof Color
     */
    Color.GREEN = Object.freeze(new Color(0.0, 1.0, 0.0, 1.0));

    /**
     * An immutable Color instance initialized to blue, RGBA (0.0, 0.0, 1.0, 1.0).
     *
     * @memberof Color
     */
    Color.BLUE = Object.freeze(new Color(0.0, 0.0, 1.0, 1.0));

    /**
     * An immutable Color instance initialized to yellow, RGBA (1.0, 1.0, 0.0, 1.0).
     *
     * @memberof Color
     */
    Color.YELLOW = Object.freeze(new Color(1.0, 1.0, 0.0, 1.0));

    /**
     * An immutable Color instance initialized to magenta, RGBA (1.0, 0.0, 1.0, 1.0).
     *
     * @memberof Color
     */
    Color.MAGENTA = Object.freeze(new Color(1.0, 0.0, 1.0, 1.0));

    /**
     * An immutable Color instance initialized to cyan, RGBA (0.0, 1.0, 1.0, 1.0).
     *
     * @memberof Color
     */
    Color.CYAN = Object.freeze(new Color(0.0, 1.0, 1.0, 1.0));

    return Color;
});