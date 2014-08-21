/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/Rectangle',
        './createPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        Rectangle,
        createPropertyDescriptor) {
    "use strict";

    /**
     * An optional time-dynamic imagery layer.
     *
     * @alias ImageryLayerGraphics
     * @constructor
     */
    var ImageryLayerGraphics = function() {
        this._show = undefined;
        this._showSubscription = undefined;
        this._zIndex = undefined;
        this._zIndexSubscription = undefined;
        this._alpha = undefined;
        this._alphaSubscription = undefined;
        this._brightness = undefined;
        this._brightnessSubscription = undefined;
        this._contrast = undefined;
        this._contrastSubscription = undefined;
        this._hue = undefined;
        this._hueSubscription = undefined;
        this._saturation = undefined;
        this._saturationSubscription = undefined;
        this._gamma = undefined;
        this._gammaSubscription = undefined;
        this._rectangle = undefined;
        this._rectangleSubscription = undefined;

        this._imageryProvider = undefined;
        this._imageryProviderSubscription = undefined;

        this._definitionChanged = new Event();
    };

    defineProperties(ImageryLayerGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof ImageryLayerGraphics.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the boolean {@link Property} specifying the layer's visibility.
         * @memberof ImageryLayerGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the numeric {@link Property} specifying the layer's z-index.
         * @memberof ImageryLayerGraphics.prototype
         * @type {Property}
         */
        zIndex : createPropertyDescriptor('zIndex'),

        /**
         * Gets or sets the numeric {@link Property} specifying the layer's alpha.
         * @memberof ImageryLayerGraphics.prototype
         * @type {Property}
         */
        alpha : createPropertyDescriptor('alpha'),

        /**
         * Gets or sets the numeric {@link Property} specifying the layer's brightness.
         * @memberof ImageryLayerGraphics.prototype
         * @type {Property}
         */
        brightness : createPropertyDescriptor('brightness'),

        /**
         * Gets or sets the numeric {@link Property} specifying the layer's contrast.
         * @memberof ImageryLayerGraphics.prototype
         * @type {Property}
         */
        contrast : createPropertyDescriptor('contrast'),

        /**
         * Gets or sets the numeric {@link Property} specifying the layer's hue.
         * @memberof ImageryLayerGraphics.prototype
         * @type {Property}
         */
        hue : createPropertyDescriptor('hue'),

        /**
         * Gets or sets the numeric {@link Property} specifying the layer's saturation.
         * @memberof ImageryLayerGraphics.prototype
         * @type {Property}
         */
        saturation : createPropertyDescriptor('saturation'),

        /**
         * Gets or sets the numeric {@link Property} specifying the layer's gamma.
         * @memberof ImageryLayerGraphics.prototype
         * @type {Property}
         */
        gamma : createPropertyDescriptor('gamma'),

        /**
         * Gets or sets the {@link Rectangle} {@link Property} specifying the geographic
         * rectangle in which to show the imagery layer.
         * @type {Property}
         */
        rectangle : createPropertyDescriptor('rectangle'),

        /**
         * Gets or sets the {@link Property} describing how tiled images for this layer
         * are obtained.
         * @type {ImageryProviderProperty}
         */
        imageryProvider : createPropertyDescriptor('imageryProvider')
    });

    /**
     * Duplicates an ImageryLayerGraphics instance.
     *
     * @param {ImageryLayerGraphics} [result] The object onto which to store the result.
     * @returns {ImageryLayerGraphics} The modified result parameter or a new instance if one was not provided.
     */
    ImageryLayerGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new ImageryLayerGraphics();
        }
        result.show = this.show;
        result.zIndex = this.zIndex;
        result.alpha = this.alpha;
        result.brightness = this.brightness;
        result.contast = this.contast;
        result.hue = this.hue;
        result.saturation = this.saturation;
        result.gamma = this.gamma;
        result.rectangle = Rectangle.clone(this.rectangle);
        result.imageryProvider = this.imageryProvider;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {ImageryLayerGraphics} source The object to be merged into this object.
     */
    ImageryLayerGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.zIndex = defaultValue(this.zIndex, source.zIndex);
        this.alpha = defaultValue(this.alpha, source.alpha);
        this.brightness = defaultValue(this.brightness, source.brightness);
        this.contast = defaultValue(this.contast, source.contast);
        this.hue = defaultValue(this.hue, source.hue);
        this.saturation = defaultValue(this.saturation, source.saturation);
        this.gamma = defaultValue(this.gamma, source.gamma);
        this.rectangle = defaultValue(this.rectangle, source.rectangle);
        this.imageryProvider = defaultValue(this.imageryProvider, source.imageryProvider);
    };

    return ImageryLayerGraphics;
});
