/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createPropertyDescriptor',
        './PropertyBag'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createPropertyDescriptor,
        PropertyBag) {
    'use strict';

    /**
     * @alias ParticleSystemGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     */
    function ParticleSystemGraphics(options) {
        this._show = undefined;
        this._showSubscription = undefined;
        this._image = undefined;
        this._imageSubscription = undefined;
        this._startScale = undefined;
        this._startScaleSubscription = undefined;
        this._endScale = undefined;
        this._endScaleSubscription = undefined;
        this._startColor = undefined;
        this._startColorSubscription = undefined;
        this._endColor = undefined;
        this._endColorSubscription = undefined;
        this._rate = undefined;
        this._rateSubscription = undefined;
        this._minWidth = undefined;
        this._minWidthSubscription = undefined;
        this._maxWidth = undefined;
        this._maxWidthSubscription = undefined;
        this._minHeight = undefined;
        this._minHeightSubscription = undefined;
        this._maxHeight = undefined;
        this._maxHeightSubscription = undefined;
        this._minSpeed = undefined;
        this._minSpeedSubscription = undefined;
        this._maxSpeed = undefined;
        this._maxSpeedSubscription = undefined;
        this._minLife = undefined;
        this._minLifeSubscription = undefined;
        this._maxLife = undefined;
        this._maxLifeSubscription = undefined;
        this._loop = undefined;
        this._loopSubscription = undefined;
        this._lifeTime = undefined;
        this._lifeTimeSubscription = undefined;
        this._emitterModelMatrix = undefined;
        this._emitterModelMatrixSubscription = undefined;
        this._bursts = undefined;
        this._burstsSubscription = undefined;
        this._forces = undefined;
        this.__forcesSubscription = undefined;

        this._definitionChanged = new Event();

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    }

    defineProperties(ParticleSystemGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the boolean Property specifying the visibility of the model.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),


        /**
         * The particle emitter for this particle system.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default new CircleEmitter({radius: 0.5});
         */
        emitter : createPropertyDescriptor('emitter'),

        /**
         * Gets or sets the Property specifying the Image, URI, or Canvas to use for the particle system.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         */
        image : createPropertyDescriptor('image'),

        /**
         * The scale of a particle at the beginning of it's lifetime.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        startScale: createPropertyDescriptor('startScale'),

        /**
         * The scale of a particle at the end of it's lifetime.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        endScale: createPropertyDescriptor('endScale'),

        /**
         * The color of a particle at the beginning of it's lifetime.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default Color.WHITE
         */
        startColor: createPropertyDescriptor('startColor'),

        /**
         * The color of a particle at the end of it's lifetime.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default Color.WHITE
         */
        endColor: createPropertyDescriptor('endColor'),

        /**
         * The number of particles to emit per second.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 5.0
         */
        rate: createPropertyDescriptor('rate'),

        /**
         * The minimum width of a particle billboard.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 16.0
         */
        minWidth: createPropertyDescriptor('minWidth'),

        /**
         * The maximum width of a particle billboard.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 16.0
         */
        maxWidth: createPropertyDescriptor('maxWidth'),

        /**
         * The minimum height of a particle billboard.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 16.0
         */
        minHeight: createPropertyDescriptor('minHeight'),

        /**
         * The maximum height of a particle billboard.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 16.0
         */
        maxHeight: createPropertyDescriptor('maxHeight'),

        /**
         * The minimum speed of a particle.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 5.0
         */
        minSpeed: createPropertyDescriptor('minSpeed'),

        /**
         * The maximum speed of a particle.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 5.0
         */
        maxSpeed: createPropertyDescriptor('maxSpeed'),

        /**
         * Whether the particle system should loop when it's complete.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default true
         */
        loop: createPropertyDescriptor('loop'),

        /**
         * The lifetime of the particle system.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default Number.MAX_VALUE
         */
        lifeTime: createPropertyDescriptor('lifeTime'),

        /**
         * The model matrix of the emitter in the particle system.  This positions the emitter locally within the particle system.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default Matrix4.IDENTITY
         */
        emitterModelMatrix: createPropertyDescriptor("emitterModelMatrix"),

        /**
         * An array of bursts that specify the time to burst particles as well as the min and max number of particles to emit.  For example:
        *  bursts: [
        *      {time: 5.0, min: 300, max: 500},
        *      {time: 10.0, min: 50, max: 100},
        *      {time: 15.0, min: 200, max: 300}
        *  ],
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         */
        bursts: createPropertyDescriptor('bursts'),

        /**
         * The minimum life in seconds of a particle
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 5.0
         */
        minLife: createPropertyDescriptor("minLife"),

        /**
         * The maximum life in seconds of a particle
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 5.0
         */
        maxLife: createPropertyDescriptor("maxLife"),

        /**
         * An array of callbacks that apply a force to a given particle over time.
         * Callbacks can either be functions with the signature (particle, time delta) or
         * objects with an apply function with same signature.
         */
        forces: createPropertyDescriptor("forces")
    });

    /**
     * Duplicates this instance.
     *
     * @param {ParticleSystemGraphics} [result] The object onto which to store the result.
     * @returns {ParticleSystemGraphics} The modified result parameter or a new instance if one was not provided.
     */
    ParticleSystemGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new ParticleSystemGraphics(this);
        }

        result.show = this.show;
        result.emitter = this.emitter;
        result.image = this.image;
        result.startScale = this.startScale;
        result.endScale = this.endScale;
        result.startColor = this.startColor;
        result.endColor = this.endColor;
        result.rate = this.rate;
        result.minWidth = this.minWidth;
        result.maxWidth = this.maxWidth;
        result.minHeight = this.minHeight;
        result.maxHeight = this.maxHeight;
        result.minSpeed = this.minSpeed;
        result.maxSpeed = this.maxSpeed;
        result.minLife = this.minLife;
        result.maxLife = this.maxLife;
        result.loop = this.loop;
        result.lifeTime = this.lifeTime;
        result.emitterModelMatrix = this.emitterModelMatrix;
        result.bursts = this.bursts;
        result.forces = this.forces;

        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {ParticleSystemGraphics} source The object to be merged into this object.
     */
    ParticleSystemGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.emitter = defaultValue(this.emitter, source.emitter);
        this.image = defaultValue(this.image, source.image);
        this.startScale = defaultValue(this.startScale, source.startScale);
        this.endScale = defaultValue(this.endScale, source.endScale);
        this.startColor = defaultValue(this.startColor, source.startColor);
        this.endColor = defaultValue(this.endColor, source.endColor);
        this.rate = defaultValue(this.rate, source.rate);
        this.minWidth = defaultValue(this.minWidth, source.minWidth);
        this.maxWidth = defaultValue(this.maxWidth, source.maxWidth);
        this.minHeight = defaultValue(this.minHeight, source.minHeight);
        this.maxHeight = defaultValue(this.maxHeight, source.maxHeight);
        this.minSpeed = defaultValue(this.minSpeed, source.minSpeed);
        this.maxSpeed = defaultValue(this.maxSpeed, source.maxSpeed);
        this.minLife = defaultValue(this.minLife, source.minLife);
        this.maxLife = defaultValue(this.maxLife, source.maxLife);
        this.loop = defaultValue(this.loop, source.loop);
        this.lifeTime = defaultValue(this.lifeTime, source.lifeTime);
        this.emitterModelMatrix = defaultValue(this.emitterModelMatrix, source.emitterModelMatrix);
        this.bursts = defaultValue(this.bursts, source.bursts);
        this.forces = defaultValue(this.forces, source.forces);
    };

    return ParticleSystemGraphics;
});
