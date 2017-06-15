/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
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
        defineProperties,
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
        if (!defined(particle)) {
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
     * @param {Boolean} [options.show=true] Whether to display the particle system.
     * @param {Array} [options.forces] An array of force callbacks.
     * @param {ParticleEmitter} [options.emitter=new CircleEmitter({radius: 0.5})] The particle emitter for this system.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the particle system from model to world coordinates.
     * @param {Matrix4} [options.emitterModelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the particle system emitter within the particle systems local coordinate system.
     * @param {Color} [options.startColor=Color.WHITE] The color of a particle when it is born.
     * @param {Color} [options.endColor=Color.WHITE] The color of a particle when it dies.
     * @param {Number} [options.startScale=1.0] The scale of the particle when it is born.
     * @param {Number} [options.endScale=1.0] The scale of the particle when it dies.
     * @param {Number} [options.rate=5] The number of particles to emit per second.
     * @param {Array} [options.bursts] An array of {@link ParticleBurst}, emitting bursts of particles at periodic times.
     * @param {Boolean} [options.loop=true] Whether the particle system should loop it's bursts when it is complete.
     * @param {Number} [options.speed] Sets the minimum and maximum speed in meters per second
     * @param {Number} [options.minimumSpeed=1.0] Sets the minimum speed in meters per second.
     * @param {Number} [options.maximumSpeed=1.0] Sets the maximum speed in meters per second.
     * @param {Number} [options.life] Sets the minimum and maximum life of particles in seconds.
     * @param {Number} [options.minimumLife=5.0] Sets the minimum life of particles in seconds.
     * @param {Number} [options.maximumLife=5.0] Sets the maximum life of particles in seconds.
     * @param {Number} [options.mass] Sets the minimum and maximum mass of particles in kilograms.
     * @param {Number} [options.minimumMass=1.0] Sets the minimum mass of particles in kilograms.
     * @param {Number} [options.maximumMass=1.0] Sets the maximum mass of particles in kilograms.
     * @param {Object} [options.image] The URI, HTMLImageElement, or HTMLCanvasElement to use for the billboard.
     * @param {Number} [options.width] Sets the minimum and maximum width of particles in pixels.
     * @param {Number} [options.minimumWidth=1.0] Sets the minimum width of particles in pixels.
     * @param {Number} [options.maximumWidth=1.0] Sets the maximum width of particles in pixels.
     * @param {Number} [options.height] Sets the minimum and maximum height of particles in pixels.
     * @param {Number} [options.minimumHeight=1.0] Sets the minimum height of particles in pixels.
     * @param {Number} [options.maximumHeight=1.0] Sets the maximum height of particles in pixels.
     * @param {Number} [options.lifeTime=Number.MAX_VALUE] How long the particle system will emit particles, in seconds.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=ParticleSystem.html|Particle Systems Demo}
     */
    function ParticleSystem(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * Whether to display the particle system.
         * @type {Boolean}
         * @default true
         */
        this.show = defaultValue(options.show, true);

        /**
         * An array of force callbacks. The callback is passed a {@link Particle} and the difference from the last time
         * @type {Array}
         * @default undefined
         */
        this.forces = options.forces;

        var emitter = options.emitter;
        if (!defined(emitter)) {
            emitter = new CircleEmitter({
                radius : 0.5
            });
        }
        /**
         * The particle emitter for this system.
         * @type {ParticleEmitter}
         * @default CricleEmitter
         */
        this.emitter = emitter;

        /**
         * The 4x4 transformation matrix that transforms the particle system from model to world coordinates.
         * @type {Matrix4}
         * @default Matrix4.IDENTITY
         */
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this._modelMatrix = new Matrix4();

        /**
         * The 4x4 transformation matrix that transforms the particle system emitter within the particle systems local coordinate system.
         * @type {Matrix4}
         * @default Matrix4.IDENTITY
         */
        this.emitterModelMatrix = Matrix4.clone(defaultValue(options.emitterModelMatrix, Matrix4.IDENTITY));
        this._emitterModelMatrix = new Matrix4();

        /**
         * The color of a particle when it is born.
         * @type {Color}
         * @default Color.WHITE
         */
        this.startColor = Color.clone(defaultValue(options.startColor, Color.WHITE));
        /**
         * The color of a particle when it dies.
         * @type {Color}
         * @default Color.WHITE
         */
        this.endColor = Color.clone(defaultValue(options.endColor, Color.WHITE));

        /**
         * The scale of the particle when it is born.
         * @param {Number} [options.endScale=1.0] The scale of the particle when it dies.
         * @type {Number}
         * @default 1.0
         */
        this.startScale = defaultValue(options.startScale, 1.0);
        /**
         * The scale of the particle when it dies.
         * @type {Number}
         * @default 1.0
         */
        this.endScale = defaultValue(options.endScale, 1.0);

        /**
         * The number of particles to emit per second.
         * @param {Array} [options.bursts] An array of {@link ParticleBurst}, emitting bursts of particles at periodic times.
         * @type {Number}
         * @default 5
         */
        this.rate = defaultValue(options.rate, 5);
        /**
         * An array of {@link ParticleBurst}, emitting bursts of particles at periodic times.
         * @type {Array}
         * @default undefined
         */
        this.bursts = options.bursts;

        /**
         * Whether the particle system should loop it's bursts when it is complete.
         * @type {Boolean}
         * @default true
         */
        this.loop = defaultValue(options.loop, true);

        /**
         * Sets the minimum speed in meters per second.
         * @type {Number}
         * @default 1.0
         */
        this.minimumSpeed = defaultValue(options.speed, defaultValue(options.minimumSpeed, 1.0));
        /**
         * Sets the maximum speed in meters per second.
         * @type {Number}
         * @default 1.0
         */
        this.maximumSpeed = defaultValue(options.speed, defaultValue(options.maximumSpeed, 1.0));

        /**
         * Sets the minimum life of particles in seconds.
         * @type {Number}
         * @default 5.0
         */
        this.minimumLife = defaultValue(options.life, defaultValue(options.minimumLife, 5.0));
        /**
         * Sets the maximum life of particles in seconds.
         * @type {Number}
         * @default 5.0
         */
        this.maximumLife = defaultValue(options.life, defaultValue(options.maximumLife, 5.0));

        /**
         * Sets the minimum mass of particles in kilograms.
         * @type {Number}
         * @default 1.0
         */
        this.minimumMass = defaultValue(options.mass, defaultValue(options.minimumMass, 1.0));
        /**
         * Sets the maximum mass of particles in kilograms.
         * @type {Number}
         * @default 1.0
         */
        this.maximumMass = defaultValue(options.mass, defaultValue(options.maximumMass, 1.0));

        /**
         * The URI, HTMLImageElement, or HTMLCanvasElement to use for the billboard.
         * @type {Object}
         * @default undefined
         */
        this.image = defaultValue(options.image, undefined);

        /**
         * Sets the minimum width of particles in pixels.
         * @type {Number}
         * @default 1.0
         */
        this.minimumWidth = defaultValue(options.width, defaultValue(options.minimumWidth, 1.0));
        /**
         * Sets the maximum width of particles in pixels.
         * @type {Number}
         * @default 1.0
         */
        this.maximumWidth = defaultValue(options.width, defaultValue(options.maximumWidth, 1.0));

        /**
         * Sets the minimum height of particles in pixels.
         * @param {Number} [options.maximumHeight=1.0] Sets the maximum height of particles in pixels.
         * @param {Number} [options.lifeTime=Number.MAX_VALUE] How long the particle system will emit particles, in seconds.
         * @type {Number}
         * @default 1.0
         */
        this.minimumHeight = defaultValue(options.height, defaultValue(options.minimumHeight, 1.0));
        /**
         * Sets the maximum height of particles in pixels.
         * @type {Number}
         * @default 1.0
         */
        this.maximumHeight = defaultValue(options.height, defaultValue(options.maximumHeight, 1.0));

        /**
         * How long the particle system will emit particles, in seconds.
         * @type {Number}
         * @default Number.MAX_VALUE
         */
        this.lifeTime = defaultValue(options.lifeTime, Number.MAX_VALUE);

        this._combinedMatrix = new Matrix4();

        this._particles = [];
        this._billboardCollection = undefined;

        this._previousTime = undefined;
        this._currentTime = 0.0;
        this._carryOver = 0.0;

        this._complete = new Event();
        this._isComplete = false;
    }

    defineProperties(ParticleSystem.prototype, {
        /**
         * Fires an event when the particle system has reached the end of its lifetime.
         * @memberof ParticleSystem.prototype
         * @type {Event}
         */
        complete : {
            get : function() {
                return this._complete;
            }
        },
        /**
         * When <code>true</code>, the particle system has reached the end of its lifetime; <code>false</code> otherwise.
         * @memberof ParticleSystem.prototype
         * @type {Boolean}
         */
        isComplete : {
            get : function() {
                return this._isComplete;
            }
        }
    });

    function removeBillboard(system, particle) {
        particle._billboard.show = false;
    }

    function updateBillboard(system, particle) {
        var billboard = particle._billboard;
        if (!defined(billboard)) {
            billboard = particle._billboard = system._billboardCollection.add({
                image : particle.image
            });
        }
        billboard.width = particle.size.x;
        billboard.height = particle.size.y;
        billboard.position = particle.position;
        billboard.show = true;

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
        particle.startColor = Color.clone(system.startColor, particle.startColor);
        particle.endColor = Color.clone(system.endColor, particle.endColor);
        particle.startScale = system.startScale;
        particle.endScale = system.endScale;
        particle.image = system.image;
        particle.life = CesiumMath.randomBetween(system.minimumLife, system.maximumLife);
        particle.mass = CesiumMath.randomBetween(system.minimumMass, system.maximumMass);

        var width = CesiumMath.randomBetween(system.minimumWidth, system.maximumWidth);
        var height = CesiumMath.randomBetween(system.minimumHeight, system.maximumHeight);
        particle.size = Cartesian2.fromElements(width, height, particle.size);

        // Reset the normalizedAge and age in case the particle was reused.
        particle._normalizedAge = 0.0;
        particle._age = 0.0;

        var speed = CesiumMath.randomBetween(system.minimumSpeed, system.maximumSpeed);
        Cartesian3.multiplyByScalar(particle.velocity, speed, particle.velocity);

        system._particles.push(particle);
    }

    function calculateNumberToEmit(system, dt) {
        // This emitter is finished if it exceeds it's lifetime.
        if (system._isComplete) {
            return 0;
        }

        // Compute the number of particles to emit based on the rate.
        var v = dt * system.rate;
        var numToEmit = Math.floor(v);
        system._carryOver += (v - numToEmit);
        if (system._carryOver > 1.0)
        {
            numToEmit++;
            system._carryOver -= 1.0;
        }

        // Apply any bursts
        if (defined(system.bursts)) {
            var length = system.bursts.length;
            for (var i = 0; i < length; i++) {
                var burst = system.bursts[i];
                if (defined(burst) && !burst._complete && system._currentTime > burst.time) {
                    var count = CesiumMath.randomBetween(burst.minimum, burst.maximum);
                    numToEmit += count;
                    burst._complete = true;
                }
            }
        }

        return numToEmit;
    }

    var rotatedVelocityScratch = new Cartesian3();

    /**
     * @private
     */
    ParticleSystem.prototype.update = function(frameState) {
        if (!this.show) {
            return;
        }

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

        var particles = this._particles;
        var emitter = this.emitter;
        var forces = this.forces;

        var i;
        var particle;

        // update particles and remove dead particles
        var length = particles.length;
        for (i = 0; i < length; ++i) {
            particle = particles[i];
            if (!particle.update(forces, dt)) {
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

        if (numToEmit > 0 && defined(emitter)) {
            // Compute the final model matrix by combining the particle systems model matrix and the emitter matrix.
            if (!Matrix4.equals(this.modelMatrix, this._modelMatrix) || !Matrix4.equals(this.emitterModelMatrix, this._emitterModelMatrix)) {
                this._combinedMatrix = Matrix4.multiply(this.modelMatrix, this.emitterModelMatrix, this._combinedMatrix);
                this._modelMatrix = Matrix4.clone(this.modelMatrix, this._modelMatrix);
                this._emitterModelMatrix = Matrix4.clone(this.emitterModelMatrix, this._emitterModelMatrix);
            }

            var combinedMatrix = this._combinedMatrix;

            for (i = 0; i < numToEmit; i++) {
                // Create a new particle.
                particle = getOrCreateParticle();

                // Let the emitter initialize the particle.
                this.emitter.emit(particle);

                //For the velocity we need to add it to the original position and then multiply by point.
                Cartesian3.add(particle.position, particle.velocity, rotatedVelocityScratch);
                Matrix4.multiplyByPoint(combinedMatrix, rotatedVelocityScratch, rotatedVelocityScratch);

                // Change the position to be in world coordinates
                particle.position = Matrix4.multiplyByPoint(combinedMatrix, particle.position, particle.position);

                // Orient the velocity in world space as well.
                Cartesian3.subtract(rotatedVelocityScratch, particle.position, particle.velocity);
                Cartesian3.normalize(particle.velocity, particle.velocity);

                // Add the particle to the system.
                addParticle(this, particle);
            }
        }

        this._billboardCollection.update(frameState);
        this._previousTime = JulianDate.clone(frameState.time, this._previousTime);
        this._currentTime += dt;

        if (this.lifeTime !== Number.MAX_VALUE && this._currentTime > this.lifeTime) {
            if (this.loop) {
                this._currentTime = this._currentTime - this.lifeTime;
                if (this.bursts) {
                    var burstLength = this.bursts.length;
                    // Reset any bursts
                    for (i = 0; i < burstLength; i++) {
                        this.bursts[i]._complete = false;
                    }
                }
            } else {
                this._isComplete = true;
                this._complete.raiseEvent(this);
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see ParticleSystem#destroy
     */
    ParticleSystem.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see ParticleSystem#isDestroyed
     */
    ParticleSystem.prototype.destroy = function() {
        this._billboardCollection = this._billboardCollection && this._billboardCollection.destroy();
        return destroyObject(this);
    };

    return ParticleSystem;
});
