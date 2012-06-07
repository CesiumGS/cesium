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

    /**
     * Returns a string containing a CSS color value for this color.
     */
    Color.prototype.toCSSColor = function() {
        var r = this.red * 255 | 0;
        var g = this.green * 255 | 0;
        var b = this.blue * 255 | 0;
        return 'rgba(' + r + ',' + g + ',' + b + ',' + this.alpha + ')';
    };

    return Color;
});