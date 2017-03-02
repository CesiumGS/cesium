/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian2',
        '../Core/Cartesian3'
    ],function(
        defaultValue,
        defined,
        Cartesian2,
        Cartesian3) {
    "use strict";

    var Particle = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this.mass = defaultValue(options.mass, 1.0);
        this.position = Cartesian3.clone(defaultValue(options.position, Cartesian3.ZERO));
        this.velocity = Cartesian3.clone(defaultValue(options.velocity, Cartesian3.ZERO));
        this.life = defaultValue(options.life, Number.MAX_VALUE);
        this.image = defaultValue(options.image, null);

        var size = Cartesian2.clone(options.size);
        if (!defined(size)) {
            size = new Cartesian2(1.0, 1.0);
        }

        this.size = size;
    };

    Particle.prototype.update = function(forces, dt) {

        var delta = new Cartesian3();
        Cartesian3.multiplyByScalar(this.velocity, dt, delta);
        Cartesian3.add(this.position, delta, this.position);

        var length = forces.length;
        for (var i = 0; i < length; ++i) {
            forces[i](this, dt);
        }

        return --this.life > 0.0;
    };

    return Particle;
});