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

    Color.WHITE = Object.freeze(new Color(1.0, 1.0, 1.0, 1.0));

    Color.BLACK = Object.freeze(new Color(0.0, 0.0, 0.0, 1.0));

    Color.RED = Object.freeze(new Color(1.0, 0.0, 0.0, 1.0));

    Color.GREEN = Object.freeze(new Color(0.0, 1.0, 0.0, 1.0));

    Color.BLUE = Object.freeze(new Color(0.0, 0.0, 1.0, 1.0));

    Color.YELLOW = Object.freeze(new Color(1.0, 1.0, 0.0, 1.0));

    Color.MAGENTA = Object.freeze(new Color(1.0, 0.0, 1.0, 1.0));

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