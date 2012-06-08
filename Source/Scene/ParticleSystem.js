/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Cartesian3'
    ], function(
        DeveloperError,
        Cartesian3) {
    "use strict";

    // TODO:  This file belongs in Core, not here.
    // TODO:  Cloth simulation abstraction built on top of particle system

    // Particle system based on:  http://www.cs.cmu.edu/~baraff/sigcourse/

    /**
     * DOC_TBA
     *
     * @name ParticleSystem
     * @constructor
     */
    function ParticleSystem() {
        this.particles = [];
        this.forces = [];
        this.time = 0.0;
    }

    ParticleSystem.prototype._clearForces = function() {
        var particles = this.particles;
        var length = particles.length;
        for ( var i = 0; i < length; ++i) {
            particles[i].force = Cartesian3.ZERO;
        }
    };

    ParticleSystem.prototype._calculateForces = function() {
        var particles = this.particles;
        var forces = this.forces;
        var length = forces.length;
        for ( var i = 0; i < length; ++i) {
            forces[i].apply(particles);
        }
    };

    /**
     * DOC_TBA
     * @memberof ParticleSystem
     */
    ParticleSystem.prototype.getDimension = function() {
        return 6 * this.particles.length; // 3 for position.  3 for velocity.
    };

    /**
     * DOC_TBA
     * @memberof ParticleSystem
     */
    ParticleSystem.prototype.calculateDerivative = function() {
        this._clearForces();
        this._calculateForces();

        var state = new Float64Array(this.getDimension());

        var particles = this.particles;
        var length = particles.length;
        var j = 0;
        for ( var i = 0; i < length; ++i) {
            var particle = particles[i];
            var velocity = particle.velocity;
            var force = particle.force;
            var oneOverMass = 1.0 / particle.mass;

            state[j + 0] = velocity.x; // xdot = v
            state[j + 1] = velocity.y;
            state[j + 2] = velocity.z;
            state[j + 3] = force.x * oneOverMass; // vdot = f / m
            state[j + 4] = force.y * oneOverMass;
            state[j + 5] = force.z * oneOverMass;
            j += 6;
        }

        return state;
    };

    /**
     * DOC_TBA
     * @memberof ParticleSystem
     */
    ParticleSystem.prototype.getState = function() {
        var state = new Float64Array(this.getDimension());

        var particles = this.particles;
        var length = particles.length;
        var j = 0;
        for ( var i = 0; i < length; ++i) {
            var particle = particles[i];
            var position = particle.position;
            var velocity = particle.velocity;
            state[j + 0] = position.x;
            state[j + 1] = position.y;
            state[j + 2] = position.z;
            state[j + 3] = velocity.x;
            state[j + 4] = velocity.y;
            state[j + 5] = velocity.z;
            j += 6;
        }

        return state;
    };

    /**
     * DOC_TBA
     * @memberof ParticleSystem
     */
    ParticleSystem.prototype.setState = function(state) {
        if (state) {
            if (state.length !== this.getDimension()) {
                throw new DeveloperError('The dimensions of the state vector does not equal the dimensions of this particle system.  Call getDimension().');
            }

            var particles = this.particles;
            var length = particles.length;
            var j = 0;
            for ( var i = 0; i < length; ++i) {
                var particle = particles[i];
                particle.position = new Cartesian3(state[j + 0], state[j + 1], state[j + 2]);
                particle.velocity = new Cartesian3(state[j + 3], state[j + 4], state[j + 5]);

                j += 6;
            }
        }
    };

    return ParticleSystem;
});