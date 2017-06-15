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
        this.image = options.image;
        this.age = 0.0;
        this.normalizedAge = 0.0;

        this.startColor = Color.clone(defaultValue(options.startColor, Color.WHITE));
        this.endColor = Color.clone(defaultValue(options.endColor, Color.WHITE));

        this.startScale = defaultValue(options.startScale, 1.0);
        this.endScale = defaultValue(options.endScale, 1.0);

        var size = Cartesian2.clone(options.size);
        if (!defined(size)) {
            size = new Cartesian2(1.0, 1.0);
        }

        this.size = size;
    };

    var deltaScratch = new Cartesian3();

    Particle.prototype.update = function(forces, dt) {
        // Apply the velocity
        Cartesian3.multiplyByScalar(this.velocity, dt, deltaScratch);
        Cartesian3.add(this.position, deltaScratch, this.position);

        // Update any forces.
        if (defined(forces)) {
            var length = forces.length;
            for (var i = 0; i < length; ++i) {
                var force = forces[i];

                if (typeof force === 'function') {
                    // Force is just a simle callback function.
                    force(this, dt);
                } else {
                    // Call the apply function of the force.
                    force.apply(this, dt);
                }
            }
        }

        // Age the particle
        this.age += dt;

        // Compute the normalized age.
        if (this.life === Number.MAX_VALUE) {
            this.normalizedAge = 0.0;
        } else {
            this.normalizedAge = this.age / this.life;
        }

        // If this particle is older than it's lifespan then die.
        return this.age <= this.life;
    };

    return Particle;
});
