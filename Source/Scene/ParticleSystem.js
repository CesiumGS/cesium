define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Check',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/Event',
        '../Core/JulianDate',
        '../Core/Math',
        '../Core/Matrix4',
        './BillboardCollection',
        './CircleEmitter',
        './Particle'
    ], function(
        Cartesian2,
        Cartesian3,
        Check,
        Color,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        Event,
        JulianDate,
        CesiumMath,
        Matrix4,
        BillboardCollection,
        CircleEmitter,
        Particle) {
    'use strict';

    /**
     * A ParticleSystem manages the updating and display of a collection of particles.
     *
     * @alias ParticleSystem
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Boolean} [options.show=true] Whether to display the particle system.
     * @param {ParticleSystem~applyForce[]} [options.forces] An array of force callbacks.
     * @param {ParticleEmitter} [options.emitter=new CircleEmitter(0.5)] The particle emitter for this system.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the particle system from model to world coordinates.
     * @param {Matrix4} [options.emitterModelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the particle system emitter within the particle systems local coordinate system.
     * @param {Color} [options.startColor=Color.WHITE] The color of a particle when it is born.
     * @param {Color} [options.endColor=Color.WHITE] The color of a particle when it dies.
     * @param {Number} [options.startScale=1.0] The scale of the particle when it is born.
     * @param {Number} [options.endScale=1.0] The scale of the particle when it dies.
     * @param {Number} [options.rate=5] The number of particles to emit per second.
     * @param {ParticleBurst[]} [options.bursts] An array of {@link ParticleBurst}, emitting bursts of particles at periodic times.
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
         * @type {ParticleSystem~applyForce[]}
         * @default undefined
         */
        this.forces = options.forces;

        /**
         * Whether the particle system should loop it's bursts when it is complete.
         * @type {Boolean}
         * @default true
         */
        this.loop = defaultValue(options.loop, true);

        /**
         * The URI, HTMLImageElement, or HTMLCanvasElement to use for the billboard.
         * @type {Object}
         * @default undefined
         */
        this.image = defaultValue(options.image, undefined);

        var emitter = options.emitter;
        if (!defined(emitter)) {
            emitter = new CircleEmitter(0.5);
        }
        this._emitter = emitter;

        this._bursts = options.bursts;

        this._modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this._emitterModelMatrix = Matrix4.clone(defaultValue(options.emitterModelMatrix, Matrix4.IDENTITY));
        this._matrixDirty = true;
        this._combinedMatrix = new Matrix4();

        this._startColor = Color.clone(defaultValue(options.startColor, Color.WHITE));
        this._endColor = Color.clone(defaultValue(options.endColor, Color.WHITE));

        this._startScale = defaultValue(options.startScale, 1.0);
        this._endScale = defaultValue(options.endScale, 1.0);

        this._rate = defaultValue(options.rate, 5);

        this._minimumSpeed = defaultValue(options.speed, defaultValue(options.minimumSpeed, 1.0));
        this._maximumSpeed = defaultValue(options.speed, defaultValue(options.maximumSpeed, 1.0));

        this._minimumLife = defaultValue(options.life, defaultValue(options.minimumLife, 5.0));
        this._maximumLife = defaultValue(options.life, defaultValue(options.maximumLife, 5.0));

        this._minimumMass = defaultValue(options.mass, defaultValue(options.minimumMass, 1.0));
        this._maximumMass = defaultValue(options.mass, defaultValue(options.maximumMass, 1.0));

        this._minimumWidth = defaultValue(options.width, defaultValue(options.minimumWidth, 1.0));
        this._maximumWidth = defaultValue(options.width, defaultValue(options.maximumWidth, 1.0));

        this._minimumHeight = defaultValue(options.height, defaultValue(options.minimumHeight, 1.0));
        this._maximumHeight = defaultValue(options.height, defaultValue(options.maximumHeight, 1.0));

        this._lifeTime = defaultValue(options.lifeTime, Number.MAX_VALUE);

        this._billboardCollection = undefined;
        this._particles = [];

        // An array of available particles that we can reuse instead of allocating new.
        this._particlePool = [];

        this._previousTime = undefined;
        this._currentTime = 0.0;
        this._carryOver = 0.0;

        this._complete = new Event();
        this._isComplete = false;

        this._updateParticlePool = true;
        this._particleEstimate = 0;
    }

    defineProperties(ParticleSystem.prototype, {
        /**
         * The particle emitter for this
         * @memberof ParticleSystem.prototype
         * @type {ParticleEmitter}
         * @default CricleEmitter
         */
        emitter : {
            get : function() {
                return this._emitter;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.defined('value', value);
                //>>includeEnd('debug');
                this._emitter = value;
            }
        },
        /**
         * An array of {@link ParticleBurst}, emitting bursts of particles at periodic times.
         * @type {ParticleBurst[]}
         * @default undefined
         */
        bursts : {
            get : function() {
                return this._bursts;
            },
            set : function(value) {
                this._bursts = value;
                this._updateParticlePool = true;
            }
        },
        /**
         * The 4x4 transformation matrix that transforms the particle system from model to world coordinates.
         * @memberof ParticleSystem.prototype
         * @type {Matrix4}
         * @default Matrix4.IDENTITY
         */
        modelMatrix : {
            get : function() {
                return this._modelMatrix;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.defined('value', value);
                //>>includeEnd('debug');
                this._matrixDirty = this._matrixDirty || !Matrix4.equals(this._modelMatrix, value);
                Matrix4.clone(value, this._modelMatrix);
            }
        },
        /**
         * The 4x4 transformation matrix that transforms the particle system emitter within the particle systems local coordinate system.
         * @memberof ParticleSystem.prototype
         * @type {Matrix4}
         * @default Matrix4.IDENTITY
         */
        emitterModelMatrix : {
            get : function() {
                return this._emitterModelMatrix;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.defined('value', value);
                //>>includeEnd('debug');
                this._matrixDirty = this._matrixDirty || !Matrix4.equals(this._emitterModelMatrix, value);
                Matrix4.clone(value, this._emitterModelMatrix);
            }
        },
        /**
         * The color of a particle when it is born.
         * @memberof ParticleSystem.prototype
         * @type {Color}
         * @default Color.WHITE
         */
        startColor : {
            get : function() {
                return this._startColor;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.defined('value', value);
                //>>includeEnd('debug');
                Color.clone(value, this._startColor);
            }
        },
        /**
         * The color of a particle when it dies.
         * @memberof ParticleSystem.prototype
         * @type {Color}
         * @default Color.WHITE
         */
        endColor : {
            get : function() {
                return this._endColor;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.defined('value', value);
                //>>includeEnd('debug');
                Color.clone(value, this._endColor);
            }
        },
        /**
         * The scale of the particle when it is born.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default 1.0
         */
        startScale : {
            get : function() {
                return this._startScale;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._startScale = value;
            }
        },
        /**
         * The scale of the particle when it dies.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default 1.0
         */
        endScale : {
            get : function() {
                return this._endScale;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._endScale = value;
            }
        },
        /**
         * The number of particles to emit per second.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default 5
         */
        rate : {
            get : function() {
                return this._rate;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._rate = value;
                this._updateParticlePool = true;
            }
        },
        /**
         * Sets the minimum speed in meters per second.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default 1.0
         */
        minimumSpeed : {
            get : function() {
                return this._minimumSpeed;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._minimumSpeed = value;
            }
        },
        /**
         * Sets the maximum speed in meters per second.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default 1.0
         */
        maximumSpeed : {
            get : function() {
                return this._maximumSpeed;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._maximumSpeed = value;
            }
        },
        /**
         * Sets the minimum life of particles in seconds.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default 5.0
         */
        minimumLife : {
            get : function() {
                return this._minimumLife;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._minimumLife = value;
            }
        },
        /**
         * Sets the maximum life of particles in seconds.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default 5.0
         */
        maximumLife : {
            get : function() {
                return this._maximumLife;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._maximumLife = value;
                this._updateParticlePool = true;
            }
        },
        /**
         * Sets the minimum mass of particles in kilograms.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default 1.0
         */
        minimumMass : {
            get : function() {
                return this._minimumMass;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._minimumMass = value;
            }
        },
        /**
         * Sets the maximum mass of particles in kilograms.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default 1.0
         */
        maximumMass : {
            get : function() {
                return this._maximumMass;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._maximumMass = value;
            }
        },
        /**
         * Sets the minimum width of particles in pixels.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default 1.0
         */
        minimumWidth : {
            get : function() {
                return this._minimumWidth;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._minimumWidth = value;
            }
        },
        /**
         * Sets the maximum width of particles in pixels.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default 1.0
         */
        maximumWidth : {
            get : function() {
                return this._maximumWidth;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._maximumWidth = value;
            }
        },
        /**
         * Sets the minimum height of particles in pixels.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default 1.0
         */
        minimumHeight : {
            get : function() {
                return this._minimumHeight;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._minimumHeight = value;
            }
        },
        /**
         * Sets the maximum height of particles in pixels.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default 1.0
         */
        maximumHeight : {
            get : function() {
                return this._maximumHeight;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._maximumHeight = value;
            }
        },
        /**
         * How long the particle system will emit particles, in seconds.
         * @memberof ParticleSystem.prototype
         * @type {Number}
         * @default Number.MAX_VALUE
         */
        lifeTime : {
            get : function() {
                return this._lifeTime;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number.greaterThanOrEquals('value', value, 0.0);
                //>>includeEnd('debug');
                this._lifeTime = value;
            }
        },
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

    function updateParticlePool(system) {
        var rate = system._rate;
        var life = system._maximumLife;

        var burstAmount = 0;
        var bursts = system._bursts;
        if (defined(bursts)) {
            var length = bursts.length;
            for (var i = 0; i < length; ++i) {
                burstAmount += bursts[i].maximum;
            }
        }

        var billboardCollection = system._billboardCollection;
        var image = system.image;

        var particleEstimate = Math.ceil(rate * life + burstAmount);
        var particles = system._particles;
        var particlePool = system._particlePool;
        var numToAdd = Math.max(particleEstimate - particles.length - particlePool.length, 0);

        for (var j = 0; j < numToAdd; ++j) {
            var particle = new Particle();
            particle._billboard = billboardCollection.add({
                image : image
            });
            particlePool.push(particle);
        }

        system._particleEstimate = particleEstimate;
    }

    function getOrCreateParticle(system) {
        // Try to reuse an existing particle from the pool.
        var particle = system._particlePool.pop();
        if (!defined(particle)) {
            // Create a new one
            particle = new Particle();
        }
        return particle;
    }

    function addParticleToPool(system, particle) {
        system._particlePool.push(particle);
    }

    function freeParticlePool(system) {
        var particles = system._particles;
        var particlePool = system._particlePool;
        var billboardCollection = system._billboardCollection;

        var numParticles = particles.length;
        var numInPool = particlePool.length;
        var estimate = system._particleEstimate;

        var start = numInPool - Math.max(estimate - numParticles - numInPool, 0);
        for (var i = start; i < numInPool; ++i) {
            var p = particlePool[i];
            billboardCollection.remove(p._billboard);
        }
        particlePool.length = start;
    }

    function removeBillboard(particle) {
        if (defined(particle._billboard)) {
            particle._billboard.show = false;
        }
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
        particle.startColor = Color.clone(system._startColor, particle.startColor);
        particle.endColor = Color.clone(system._endColor, particle.endColor);
        particle.startScale = system._startScale;
        particle.endScale = system._endScale;
        particle.image = system.image;
        particle.life = CesiumMath.randomBetween(system._minimumLife, system._maximumLife);
        particle.mass = CesiumMath.randomBetween(system._minimumMass, system._maximumMass);

        var width = CesiumMath.randomBetween(system._minimumWidth, system._maximumWidth);
        var height = CesiumMath.randomBetween(system._minimumHeight, system._maximumHeight);
        particle.size = Cartesian2.fromElements(width, height, particle.size);

        // Reset the normalizedAge and age in case the particle was reused.
        particle._normalizedAge = 0.0;
        particle._age = 0.0;

        var speed = CesiumMath.randomBetween(system._minimumSpeed, system._maximumSpeed);
        Cartesian3.multiplyByScalar(particle.velocity, speed, particle.velocity);

        system._particles.push(particle);
    }

    function calculateNumberToEmit(system, dt) {
        // This emitter is finished if it exceeds it's lifetime.
        if (system._isComplete) {
            return 0;
        }

        dt = CesiumMath.mod(dt, system._lifeTime);

        // Compute the number of particles to emit based on the rate.
        var v = dt * system._rate;
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
                var currentTime = system._currentTime;
                if (defined(burst) && !burst._complete && currentTime > burst.time) {
                    numToEmit += CesiumMath.randomBetween(burst.minimum, burst.maximum);
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

        if (this._updateParticlePool) {
            updateParticlePool(this);
            this._updateParticlePool = false;
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
        var emitter = this._emitter;
        var forces = this.forces;

        var i;
        var particle;

        // update particles and remove dead particles
        var length = particles.length;
        for (i = 0; i < length; ++i) {
            particle = particles[i];
            if (!particle.update(dt, forces)) {
                removeBillboard(particle);
                // Add the particle back to the pool so it can be reused.
                addParticleToPool(this, particle);
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
            if (this._matrixDirty) {
                this._combinedMatrix = Matrix4.multiply(this.modelMatrix, this.emitterModelMatrix, this._combinedMatrix);
                this._matrixDirty = false;
            }

            var combinedMatrix = this._combinedMatrix;

            for (i = 0; i < numToEmit; i++) {
                // Create a new particle.
                particle = getOrCreateParticle(this);

                // Let the emitter initialize the particle.
                this._emitter.emit(particle);

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
                updateBillboard(this, particle);
            }
        }

        this._billboardCollection.update(frameState);
        this._previousTime = JulianDate.clone(frameState.time, this._previousTime);
        this._currentTime += dt;

        if (this._lifeTime !== Number.MAX_VALUE && this._currentTime > this._lifeTime) {
            if (this.loop) {
                this._currentTime = CesiumMath.mod(this._currentTime, this._lifeTime);
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

        // free particles in the pool and release billboard GPU memory
        if (frameState.frameNumber % 120 === 0) {
            freeParticlePool(this);
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

    /**
     * A function used to apply a force to the particle on each time step.
     * @callback ParticleSystem~applyForce
     *
     * @param {Particle} particle The particle to apply the force to.
     * @param {Number} dt The time since the last update.
     *
     * @example
     * function applyGravity(particle, dt) {
     *    var position = particle.position;
     *    var gravityVector = Cesium.Cartesian3.normalize(position, new Cesium.Cartesian3());
     *    Cesium.Cartesian3.multiplyByScalar(gravityVector, GRAVITATIONAL_CONSTANT * dt, gravityVector);
     *    particle.velocity = Cesium.Cartesian3.add(particle.velocity, gravityVector, particle.velocity);
     * }
     */

    return ParticleSystem;
});
