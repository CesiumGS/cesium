/*global define*/
/**
 * @exports Core/Color
 */
define(function() {
    "use strict";

    /**
     * A color, specified using red, green, blue, and alpha values,
     * which range from <code>0</code> (no intensity) to <code>1.0</code> (full intensity).
     *
     * @constructor
     * @alias Color
     */
    var Color = function(red, green, blue, alpha) {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    };

    /**
     * Returns a string containing a CSS color value for this color.
     * @memberof Color
     */
    Color.prototype.toCSSColor = function() {
        var r = this.red * 255 | 0;
        var g = this.green * 255 | 0;
        var b = this.blue * 255 | 0;
        return 'rgba(' + r + ',' + g + ',' + b + ',' + this.alpha + ')';
    };

    return Color;
});