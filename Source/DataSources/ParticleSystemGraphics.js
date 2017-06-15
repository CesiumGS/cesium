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
     * A ParticleSystemGraphics manages the updating and display of a collection of particles.
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.show=true] A boolean Property that determines whether to display the particle system.
     * @param {Property} [options.forces] A Property that is an array of force callbacks, {@link ParticleSystem~applyForce}.
     * @param {Property} [options.emitter=new CircleEmitter(0.5)] A Property that is the particle emitter for this system.
     * @param {Property} [options.modelMatrix=Matrix4.IDENTITY] A Property that is the 4x4 transformation matrix that transforms the particle system from model to world coordinates.
     * @param {Property} [options.emitterModelMatrix=Matrix4.IDENTITY] A Property that is the 4x4 transformation matrix that transforms the particle system emitter within the particle systems local coordinate system.
     * @param {Property} [options.startColor=Color.WHITE] A Property that is the {@link Color} of a particle when it is born.
     * @param {Property} [options.endColor=Color.WHITE] A Property that is the {@link Color} of a particle when it dies.
     * @param {Property} [options.startScale=1.0] A Property that is the scale of the particle when it is born.
     * @param {Property} [options.endScale=1.0] A Property that is the scale of the particle when it dies.
     * @param {Property} [options.rate=5] A Property that is the number of particles to emit per second.
     * @param {Property} [options.bursts] A Property that is an array of {@link ParticleBurst}, emitting bursts of particles at periodic times.
     * @param {Property} [options.loop=true] A Property that determines whether the particle system should loop it's bursts when it is complete.
     * @param {Property} [options.minimumSpeed=1.0] A Property that sets the minimum speed in meters per second.
     * @param {Property} [options.maximumSpeed=1.0] A Property that sets the maximum speed in meters per second.
     * @param {Property} [options.minimumLife=5.0] A Property that sets the minimum life of particles in seconds.
     * @param {Property} [options.maximumLife=5.0] A Property that sets the maximum life of particles in seconds.
     * @param {Property} [options.minimumMass=1.0] A Property that sets the minimum mass of particles in kilograms.
     * @param {Property} [options.maximumMass=1.0] A Property that sets the maximum mass of particles in kilograms.
     * @param {Property} [options.image] A Property that is the URI, HTMLImageElement, or HTMLCanvasElement to use for the billboard.
     * @param {Property} [options.minimumWidth=1.0] A Property that sets the minimum width of particles in pixels.
     * @param {Property} [options.maximumWidth=1.0] A Property that sets the maximum width of particles in pixels.
     * @param {Property} [options.minimumHeight=1.0] A Propertyt that sets the minimum height of particles in pixels.
     * @param {Property} [options.maximumHeight=1.0] A Property that sets the maximum height of particles in pixels.
     * @param {Property} [options.lifeTime=Number.MAX_VALUE] A Property that sets how long the particle system will emit particles, in seconds.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=ParticleSystem.html|Particle Systems Demo}
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
        this._minimumWidth = undefined;
        this._minimumWidthSubscription = undefined;
        this._maximumWidth = undefined;
        this._maximumWidthSubscription = undefined;
        this._minimumHeight = undefined;
        this._minimumHeightSubscription = undefined;
        this._maximumHeight = undefined;
        this._maximumHeightSubscription = undefined;
        this._minimumSpeed = undefined;
        this._minimumSpeedSubscription = undefined;
        this._maximumSpeed = undefined;
        this._maximumSpeedSubscription = undefined;
        this._minimumLife = undefined;
        this._minimumLifeSubscription = undefined;
        this._maximumLife = undefined;
        this._maximumLifeSubscription = undefined;
        this._loop = undefined;
        this._loopSubscription = undefined;
        this._lifeTime = undefined;
        this._lifeTimeSubscription = undefined;
        this._emitterModelMatrix = undefined;
        this._emitterModelMatrixSubscription = undefined;
        this._bursts = undefined;
        this._burstsSubscription = undefined;
        this._forces = undefined;
        this._forcesSubscription = undefined;

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
         * Gets or sets the boolean Property specifying the visibility of the particle system.
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
         * The scale of a particle at the beginning of its lifetime.
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
         * The minimum width of a particle billboard in pixels.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 16.0
         */
        minimumWidth: createPropertyDescriptor('minimumWidth'),

        /**
         * The maximum width of a particle billboard in pixels.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 16.0
         */
        maximumWidth: createPropertyDescriptor('maximumWidth'),

        /**
         * The minimum height of a particle billboard in pixels.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 16.0
         */
        minimumHeight: createPropertyDescriptor('minimumHeight'),

        /**
         * The maximum height of a particle billboard in pixels.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 16.0
         */
        maximumHeight: createPropertyDescriptor('maximumHeight'),

        /**
         * The minimum speed of a particle in meters/second.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 5.0
         */
        minimumSpeed: createPropertyDescriptor('minimumSpeed'),

        /**
         * The maximum speed of a particle in meters/second.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 5.0
         */
        maximumSpeed: createPropertyDescriptor('maximumSpeed'),

        /**
         * Whether the particle system should loop when it's complete.
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default true
         */
        loop: createPropertyDescriptor('loop'),

        /**
         * The lifetime of the particle system in seconds.
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
        minimumLife: createPropertyDescriptor("minimumLife"),

        /**
         * The maximum life in seconds of a particle
         * @memberof ParticleSystemGraphics.prototype
         * @type {Property}
         * @default 5.0
         */
        maximumLife: createPropertyDescriptor("maximumLife"),

        /**
         * An array of callbacks that apply a force to each particle over time.
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
        result.minimumWidth = this.minimumWidth;
        result.maximumWidth = this.maximumWidth;
        result.minimumHeight = this.minimumHeight;
        result.maximumHeight = this.maximumHeight;
        result.minimumSpeed = this.minimumSpeed;
        result.maximumSpeed = this.maximumSpeed;
        result.minimumLife = this.minimumLife;
        result.maximumLife = this.maximumLife;
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
        this.minimumWidth = defaultValue(this.minimumWidth, source.minimumWidth);
        this.maximumWidth = defaultValue(this.maximumWidth, source.maximumWidth);
        this.minimumHeight = defaultValue(this.minimumHeight, source.minimumHeight);
        this.maximumHeight = defaultValue(this.maximumHeight, source.maximumHeight);
        this.minimumSpeed = defaultValue(this.minimumSpeed, source.minimumSpeed);
        this.maximumSpeed = defaultValue(this.maximumSpeed, source.maximumSpeed);
        this.minimumLife = defaultValue(this.minimumLife, source.minimumLife);
        this.maximumLife = defaultValue(this.maximumLife, source.maximumLife);
        this.loop = defaultValue(this.loop, source.loop);
        this.lifeTime = defaultValue(this.lifeTime, source.lifeTime);
        this.emitterModelMatrix = defaultValue(this.emitterModelMatrix, source.emitterModelMatrix);
        this.bursts = defaultValue(this.bursts, source.bursts);
        this.forces = defaultValue(this.forces, source.forces);
    };

    return ParticleSystemGraphics;
});
