/*global define*/
define(['./defaultValue'], function(defaultValue) {
    "use strict";

    /**
     * A color, specified using red, green, blue, and alpha values,
     * which range from <code>0</code> (no intensity) to <code>1.0</code> (full intensity).
     *
     * @constructor
     * @name Color
     *
     * @param {Number} [red=0.0] The red value, from 0.0 to 1.0.
     * @param {Number} [green=0.0] The red value, from 0.0 to 1.0.
     * @param {Number} [blue=0.0] The red value, from 0.0 to 1.0.
     * @param {Number} [alpha=1.0] The red value, from 0.0 to 1.0.
     */
    function Color(red, green, blue, alpha) {
        this.red = defaultValue(red, 0.0);
        this.green = defaultValue(green, 0.0);
        this.blue = defaultValue(blue, 0.0);
        this.alpha = defaultValue(alpha, 1.0);
    }

    /**
     * Returns a string containing a CSS color value for this color.
     *
     * @see <a href="http://www.w3.org/TR/css3-color/#rgba-color">CSS RGBA color values</a>
     */
    Color.prototype.toCSSColor = function() {
        var r = this.red * 255 | 0;
        var g = this.green * 255 | 0;
        var b = this.blue * 255 | 0;
        return 'rgba(' + r + ',' + g + ',' + b + ',' + this.alpha + ')';
    };

    return Color;
});