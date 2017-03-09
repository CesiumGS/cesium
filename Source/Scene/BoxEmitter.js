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

    var BoxEmitter = function(options) {
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

    BoxEmitter.prototype.emit = function() {
        var x = this.position.x + random(-this._halfWidth, this._halfWidth);
        var y = this.position.y + random(-this._halfDepth, this._halfDepth);
        var z = this.position.z + random(-this._halfHeight, this._halfHeight);
        var position = new Cartesian3(x, y, z);

        // Modify the velocity to shoot out from the center
        var velocity = new Cartesian3();
        Cartesian3.subtract(position, position, velocity);
        Cartesian3.normalize(velocity, velocity);

        return new Particle({
            position: position,
            velocity: velocity
        });
    };

    return BoxEmitter;
});