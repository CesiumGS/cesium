/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color'
    ],function(
        defaultValue,
        defined,
        Cartesian2,
        Cartesian3,
        Color) {
    "use strict";

    var Particle = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this.mass = defaultValue(options.mass, 1.0);
        this.position = Cartesian3.clone(defaultValue(options.position, Cartesian3.ZERO));
        this.velocity = Cartesian3.clone(defaultValue(options.velocity, Cartesian3.ZERO));
        this.life = defaultValue(options.life, Number.MAX_VALUE);
        this.image = defaultValue(options.image, null);
        this.age = 0.0;
        this.normalizedAge = 0.0;

        this.startColor = defaultValue(options.startColor, Color.clone(Color.WHITE));
        this.endColor = defaultValue(options.endColor, Color.clone(Color.WHITE));

        this.startScale = defaultValue(options.startScale);
        this.endScale = defaultValue(options.endScale);

        var size = Cartesian2.clone(options.size);
        if (!defined(size)) {
            size = new Cartesian2(1.0, 1.0);
        }

        this.size = size;
    };

    Particle.prototype.update = function(forces, dt) {

        // Apply the velocity
        var delta = new Cartesian3();
        Cartesian3.multiplyByScalar(this.velocity, dt, delta);
        Cartesian3.add(this.position, delta, this.position);

        // Update any forces.
        var length = forces.length;
        for (var i = 0; i < length; ++i) {
            var force = forces[i];

            if (typeof force === 'function') {
                // Force is just a simle callback function.
                force(this, dt);
            }
            else {
                // Call the apply function of the force.
                force.apply(this, dt);
            }
        }

        // Age the particle
        this.age += dt;

        // Compute the normalized age.
        if (this.life === Number.MAX_VALUE) {
            this.normalizedAge = 0.0;
        }
        else {
            this.normalizedAge = this.age / this.life;
        }

        // If this particle is older than it's lifespan then die.
        return this.age <= this.life;
    };

    return Particle;
});