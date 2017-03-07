/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Matrix4',
        '../Core/JulianDate',
        '../Core/Color',
        './BillboardCollection',
        './Particle'
    ], function(
        defaultValue,
        defined,
        Matrix4,
        JulianDate,
        Color,
        BillboardCollection,
        Particle) {
    "use strict";

    var ParticleSystem = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this.particles = defaultValue(options.particles, []);
        this.forces = defaultValue(options.forces, []);

        this.emitters = defaultValue(options.emitters, []);

        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));

        this._billboardCollection = undefined;

        this._previousTime = null;
    };

    function removeBillboard(system, particle) {
        system._billboardCollection.remove(particle._billboard);
    }

    function updateBillboard(system, particle) {
        var billboard = particle._billboard;
        if (!defined(billboard)) {
            billboard = particle._billboard = system._billboardCollection.add({
                image: particle.image
            });
        }
        billboard.width = particle.size.x;
        billboard.height = particle.size.y;
        billboard.position = particle.position;

        // Update the color
        var r = particle.startColor.red + particle.normalizedAge * (particle.endColor.red - particle.startColor.red);
        var g = particle.startColor.green + particle.normalizedAge * (particle.endColor.green - particle.startColor.green);
        var b = particle.startColor.blue + particle.normalizedAge * (particle.endColor.blue - particle.startColor.blue);
        var a = particle.startColor.alpha + particle.normalizedAge * (particle.endColor.alpha - particle.startColor.alpha);
        billboard.color = new Color(r,g,b,a);

        // Update the scale
        var scale = particle.startScale + particle.normalizedAge * (particle.endScale - particle.startScale);
        billboard.scale = scale;
    }

    ParticleSystem.prototype.update = function(frameState) {
        if (!defined(this._billboardCollection)) {
            this._billboardCollection = new BillboardCollection();
        }

        // Compute the frame time
        var dt = 0.0;
        if (this._previousTime) {
            dt = JulianDate.secondsDifference(frameState.time, this._previousTime);
        }

        if (dt < 0.0) {
            dt = 0.0;
        }


        var particles = this.particles;
        var emitter = this.emitter;

        // update particles and remove dead particles
        var length = particles.length;
        for (var i = 0; i < length; ++i) {
            var particle = particles[i];
            if (!particle.update(this.forces, dt)) {
                removeBillboard(this, particle);
                particles[i] = particles[length - 1];
                --i;
                --length;
            } else {
                updateBillboard(this, particle);
            }
        }
        particles.length = length;

        // emit new particles if an emitter is attached.
        // the emission counts as the particle "update"
        for (i = 0; i < this.emitters.length; i++) {
            var emitter = this.emitters[i];
            emitter.modelMatrix = this.modelMatrix;
            emitter.emit(this, dt);
        }

        this._billboardCollection.update(frameState);

        this._previousTime = JulianDate.clone(frameState.time, this._previousTime);
    };

    return ParticleSystem;
});