/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Event',
        '../Core/Matrix4',
        '../Core/Math',
        '../Core/JulianDate',
        '../Core/Color',
        './BillboardCollection',
        './Particle',
        './CircleEmitter'
    ], function(
        defaultValue,
        defined,
        Cartesian2,
        Cartesian3,
        Event,
        Matrix4,
        CesiumMath,
        JulianDate,
        Color,
        BillboardCollection,
        Particle,
        CircleEmitter) {
    "use strict";


    // An array of available particles that we can reuse instead of allocating new.
    var particlePool = [];

    /**
     * Gets a Particle to add to the particle system, reusing Particles from the pool if possible.
     */
    function getOrCreateParticle() {
        // Try to reuse an existing particle from the pool.
        var particle = particlePool.pop();
        if (particle === undefined) {
            // Create a new one
            particle = new Particle();
        }
        return particle;
    }

    /**
     * Adds the particle to pool so it can be reused.
     */
    function addParticleToPool(particle) {
        particlePool.push(particle);
    }

    /**
     * A ParticleSystem manages the updating and display of a collection of particles.
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {ParticleEmitter} [options.emitter=new CircleEmitter({radius: 0.5})] The particle emitter for this system.
     * @param {Array} [options.forces=[]] An array of force callbacks.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the particle system from model to world coordinates.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the particle system emitter within the particle systems local coordinate system.
     * @param {Color} [options.startColor=Color.WHITE] The color of a particle when it is born.
     * @param {Color} [options.endColor=Color.WHITE] The color of a particle when it dies.
     * @param {Number} [options.startScale=1.0] The scale of the particle when it is born.
     * @param {Number} [options.endScale=1.0] The scale of the particle when it dies.
     * @param {Number} [options.rate=5] The number of particles to emit per second.
     * @param {Array} [options.bursts=undefined] An array of {@link ParticleBurst}, emitting bursts of particles at periodic times.
     * @param {Boolean} [options.loop=true] Whether the particle system should loop it's bursts when it is complete.
     * @param {Number} [options.speed=undefined] Sets the minimum and maximum speed in meters per second
     * @param {Number} [options.minimumSpeed=1.0] Sets the minimum speed in meters per second.
     * @param {Number} [options.maximumSpeed=1.0] Sets the maximum speed in meters per second.
     * @param {Number} [options.life=undefined] Sets the minimum and maximum life of particles in seconds.
     * @param {Number} [options.minimumLife=1.0] Sets the minimum life of particles in seconds.
     * @param {Number} [options.maximumLife=1.0] Sets the maximum life of particles in seconds.
     * @param {Number} [options.mass=undefined] Sets the minimum and maximum mass of particles in kilograms.
     * @param {Number} [options.minimumMass=1.0] Sets the minimum mass of particles in kilograms.
     * @param {Number} [options.maximumMass=1.0] Sets the maximum mass of particles in kilograms.
     * @param {Property} [options.image=undefined] A Property specifying the Image, URI, or Canvas to use for the billboard.
     * @param {Number} [options.width=undefined] Sets the minimum and maximum width of particles in pixels.
     * @param {Number} [options.minimumWidth=1.0] Sets the minimum width of particles in pixels.
     * @param {Number} [options.maximumWidth=1.0] Sets the maximum width of particles in pixels.
     * @param {Number} [options.height=undefined] Sets the minimum and maximum height of particles in pixels.
     * @param {Number} [options.minimumHeight=1.0] Sets the minimum height of particles in pixels.
     * @param {Number} [options.maximumHeight=1.0] Sets the maximum height of particles in pixels.
     * @param {Number} [options.lifeTime=Number.MAX_VALUE] How long the particle system will emit particles, in seconds.
     * @param {Boolean} [options.show=true] Whether to display the particle system.
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=ParticleSystem.html|Particle Systems Demo}
     */
    var ParticleSystem = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this.particles = [];
        this.forces = defaultValue(options.forces, []);

        this.emitter = defaultValue(options.emitter, new CircleEmitter({radius: 0.5}));

        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this.emitterModelMatrix = Matrix4.clone(defaultValue(options.emitterModelMatrix, Matrix4.IDENTITY));

        this.startColor = defaultValue(options.startColor, Color.clone(Color.WHITE));
        this.endColor = defaultValue(options.endColor, Color.clone(Color.WHITE));

        this.startScale = defaultValue(options.startScale, 1.0);
        this.endScale = defaultValue(options.endScale, 1.0);

        this.rate = defaultValue(options.rate, 5);
        this.bursts = options.bursts;

        this.loop = defaultValue(options.loop, true);

        var speed = options.speed;
        if (speed !== undefined) {
            this.minimumSpeed = speed;
            this.maximumSpeed = speed;
        }
        else {
            this.minimumSpeed = defaultValue(options.minimumSpeed, 1.0);
            this.maximumSpeed = defaultValue(options.maximumSpeed, 1.0);
        }

        var life = options.life;
        if (life !== undefined) {
            this.minimumLife = life;
            this.maximumLife = life;
        }
        else {
            this.minimumLife = defaultValue(options.minimumLife, 5.0);
            this.maximumLife = defaultValue(options.maximumLife, 5.0);
        }

        var mass = options.mass;
        if (mass !== undefined) {
            this.minimumMass = mass;
            this.maximumMass = mass;
        }
        else {
            this.minimumMass = defaultValue(options.minimumMass, 1.0);
            this.maximumMass = defaultValue(options.maximumMass, 1.0);
        }

        this.image = defaultValue(options.image, undefined);

        var width = options.width;
        if (width !== undefined) {
            this.minimumWidth = width;
            this.maximumWidth = width;
        }
        else {
            this.minimumWidth = defaultValue(options.minimumWidth, 1.0);
            this.maximumWidth = defaultValue(options.maximumWidth, 1.0);
        }

        var height = options.height;
        if (height !== undefined) {
            this.minimumHeight = height;
            this.maximumHeight = height;
        }
        else {
            this.minimumHeight = defaultValue(options.minimumHeight, 1.0);
            this.maximumHeight = defaultValue(options.maximumHeight, 1.0);
        }

        this.lifeTime = defaultValue(options.lifeTime, Number.MAX_VALUE);

        this.complete = new Event();
        this.isComplete = false;

        this.show = defaultValue(options.show, true);

        this.carryOver = 0.0;
        this.currentTime = 0.0;
        this._billboardCollection = undefined;
        this._previousTime = undefined;
    };

    function removeBillboard(system, particle) {
        system._billboardCollection.remove(particle._billboard);
        // Remove the billboard from the particle so it's initialized correctly if it's reused.
        particle._billboard = undefined;
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
        var r = CesiumMath.lerp(particle.startColor.red, particle.endColor.red, particle.normalizedAge);
        var g = CesiumMath.lerp(particle.startColor.green, particle.endColor.green, particle.normalizedAge);
        var b = CesiumMath.lerp(particle.startColor.blue, particle.endColor.blue, particle.normalizedAge);
        var a = CesiumMath.lerp(particle.startColor.alpha, particle.endColor.alpha, particle.normalizedAge);
        billboard.color = new Color(r,g,b,a);

        // Update the scale
        var scale = CesiumMath.lerp(particle.startScale, particle.endScale, particle.normalizedAge);
        billboard.scale = scale;
    }

    function addParticle(system, particle) {
        particle.startColor = Color.clone(system.startColor);
        particle.endColor = Color.clone(system.endColor);
        particle.startScale = system.startScale;
        particle.endScale = system.endScale;
        particle.image = system.image;
        particle.life = CesiumMath.randomBetween(system.minimumLife, system.maximumLife);
        particle.mass = CesiumMath.randomBetween(system.minimumMass, system.maximumMass);
        particle.size = new Cartesian2(CesiumMath.randomBetween(system.minimumWidth, system.maximumWidth), CesiumMath.randomBetween(system.minimumHeight, system.maximumHeight));
        // Reset the normalizedAge and age in case the particle was reused.
        particle.normalizedAge = 0.0;
        particle.age = 0.0;

        var speed = CesiumMath.randomBetween(system.minimumSpeed, system.maximumSpeed);
        Cartesian3.multiplyByScalar(particle.velocity, speed, particle.velocity);

        system.particles.push(particle);
    }

    function calculateNumberToEmit(system, dt) {
        // This emitter is finished if it exceeds it's lifetime.
        if (system.isComplete) {
            return 0;
        }

        // Compute the number of particles to emit based on the rate.
        var v = dt * system.rate;
        var numToEmit = Math.floor(v);
        system.carryOver += (v-numToEmit);
        if (system.carryOver>1.0)
        {
            numToEmit++;
            system.carryOver -= 1.0;
        }


        var i = 0;

        // Apply any bursts
        if (system.bursts) {
            var length = system.bursts.length;
            for (i = 0; i < length; i++) {
                var burst = system.bursts[i];
                if ((!defined(burst, "complete") || !burst.complete) && system.currentTime > burst.time) {
                    var count = burst.min + CesiumMath.nextRandomNumber() * burst.max;
                    numToEmit += count;
                    burst.complete = true;
                }
            }
        }

        return numToEmit;
    }

    var combinedMatrixScratch = new Matrix4();
    var rotatedVelocityScratch = new Cartesian3();

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

        var i = 0;


        var particles = this.particles;
        var emitter = this.emitter;

        var particle = null;

        // update particles and remove dead particles
        var length = particles.length;
        for (i = 0; i < length; ++i) {
            particle = particles[i];
            if (!particle.update(this.forces, dt)) {
                removeBillboard(this, particle);
                // Add the particle back to the pool so it can be reused.
                addParticleToPool(particle);
                particles[i] = particles[length - 1];
                --i;
                --length;
            } else {
                updateBillboard(this, particle);
            }
        }
        particles.length = length;

        var numToEmit = calculateNumberToEmit(this, dt);

        if (numToEmit > 0 && emitter) {

            // Compute the final model matrix by combining the particle systems model matrix and the emitter matrix.
            Matrix4.multiply(this.modelMatrix, this.emitterModelMatrix, combinedMatrixScratch);

            for (i = 0; i < numToEmit; i++) {
                // Create a new particle.
                particle = getOrCreateParticle();

                // Let the emitter initialize the particle.
                this.emitter.emit(particle);

                //For the velocity we need to add it to the original position and then multiply by point.
                Cartesian3.add(particle.position, particle.velocity, rotatedVelocityScratch);
                Matrix4.multiplyByPoint(combinedMatrixScratch, rotatedVelocityScratch, rotatedVelocityScratch);

                // Change the position to be in world coordinates
                particle.position = Matrix4.multiplyByPoint(combinedMatrixScratch, particle.position, particle.position);

                // Orient the velocity in world space as well.
                var worldVelocity = new Cartesian3();
                Cartesian3.subtract(rotatedVelocityScratch, particle.position, worldVelocity);
                Cartesian3.normalize(worldVelocity, worldVelocity);
                particle.velocity = worldVelocity;

                // Add the particle to the system.
                addParticle(this, particle);
            }
        }

        if (this.show) {
            this._billboardCollection.update(frameState);
        }

        this._previousTime = JulianDate.clone(frameState.time, this._previousTime);

        this.currentTime += dt;

        if (this.lifeTime !== Number.MAX_VALUE && this.currentTime > this.lifeTime) {
            if (this.loop) {
                this.currentTime = this.currentTime - this.lifeTime;
                var burstLength = this.bursts.length;
                // Reset any bursts
                for (i = 0; i < burstLength; i++) {
                    this.bursts[i].complete = false;
                }
            } else {
                this.isComplete = true;
                this.complete.raiseEvent(this);
            }
        }
    };

    return ParticleSystem;
});
