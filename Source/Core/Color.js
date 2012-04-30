define(function() {
    "use strict";

    function Color(red, green, blue, alpha) {
        this.r = red;
        this.g = green;
        this.b = blue;
        this.a = alpha;
    }

    Color.white = new Color(1, 1, 1, 1);

    Color.prototype.r = undefined;

    Color.prototype.g = undefined;

    Color.prototype.b = undefined;

    Color.prototype.a = undefined;

    Color.prototype.toCSSColor = function() {
        var r = ((this.r * 255) | 0), g = ((this.g * 255) | 0), b = ((this.b * 255) | 0);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + this.alpha + ')';
    };

    return Color;
});