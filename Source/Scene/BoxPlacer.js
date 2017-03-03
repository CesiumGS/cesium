/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Cartesian3',
        '../Core/Math'
    ], function(
        defaultValue,
        Cartesian3,
        CesiumMath) {
    "use strict";

    var BoxPlacer = function(options) {
        this.position = Cartesian3.clone(defaultValue(options.position, Cartesian3.ZERO));
        this.width = defaultValue(options.width, 1.0);
        this.height = defaultValue(options.height, 1.0);
        this.depth = defaultValue(options.depth, 1.0);

        this._halfWidth = this.width / 2.0;
        this._halfHeight = this.height / 2.0;
        this._halfDepth = this.depth / 2.0;
    };

    function random(a, b) {
        return CesiumMath.nextRandomNumber() * (b - a) + a;
    }

    BoxPlacer.prototype.place = function(particle) {
        var x = this.position.x + random(-this._halfWidth, this._halfWidth);
        var y = this.position.y + random(-this._halfDepth, this._halfDepth);
        var z = this.position.z + random(-this._halfHeight, this._halfHeight);
        particle.position = new Cartesian3(x, y, z);
    };

    return BoxPlacer;
});