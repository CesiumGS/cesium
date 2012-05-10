/*global define*/
define(function() {
    "use strict";

    function Color(red, green, blue, alpha) {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }

    Color.prototype.toCSSColor = function() {
        var r = ((this.red * 255) | 0), g = ((this.green * 255) | 0), b = ((this.blue * 255) | 0);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + this.alpha + ')';
    };

    return Color;
});