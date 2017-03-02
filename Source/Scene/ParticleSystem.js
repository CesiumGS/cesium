/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Matrix4',
        '../Core/JulianDate',
        './BillboardCollection',
        './Particle'
    ], function(
        defaultValue,
        defined,
        Matrix4,
        JulianDate,
        BillboardCollection,
        Particle) {
    "use strict";

    var ParticleSystem = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this.particles = defaultValue(options.particles, []);
        this.forces = defaultValue(options.forces, []);
        this.emitter = options.emitter;
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this.maximumParticles = defaultValue(options.maximumParticles, 1000.0);

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
        if (defined(emitter)) {
            emitter.emit(this);
        }

        this._billboardCollection.modelMatrix = this.modelMatrix;
        this._billboardCollection.update(frameState);

        this._previousTime = JulianDate.clone(frameState.time, this._previousTime);
    };

    return ParticleSystem;
});