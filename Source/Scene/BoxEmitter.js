/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Cartesian3',
        '../Core/Math',
        './Particle'
    ], function(
        defaultValue,
        Cartesian3,
        CesiumMath,
        Particle) {
    "use strict";

    function BoxEmitter(options) {
        this.width = defaultValue(options.width, 1.0);
        this.height = defaultValue(options.height, 1.0);
        this.depth = defaultValue(options.depth, 1.0);

        this._halfWidth = this.width / 2.0;
        this._halfHeight = this.height / 2.0;
        this._halfDepth = this.depth / 2.0;
    };

    BoxEmitter.prototype.emit = function() {
        var x = CesiumMath.randomBetween(-this._halfWidth, this._halfWidth);
        var y = CesiumMath.randomBetween(-this._halfDepth, this._halfDepth);
        var z = CesiumMath.randomBetween(-this._halfHeight, this._halfHeight);
        var position = new Cartesian3(x, y, z);

        // Modify the velocity to shoot out from the center
        var velocity = new Cartesian3();
        Cartesian3.normalize(position, velocity);

        return new Particle({
            position: position,
            velocity: velocity
        });
    };

    return BoxEmitter;
});