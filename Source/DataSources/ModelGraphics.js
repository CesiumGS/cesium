/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createPropertyDescriptor) {
    "use strict";

    /**
     * An optionally time-dynamic model.
     *
     * @alias ModelGraphics
     * @constructor
     */
    var ModelGraphics = function() {
        this._show = undefined;
        this._showSubscription = undefined;
        this._scale = undefined;
        this._scaleSubscription = undefined;
        this._minimumPixelSize = undefined;
        this._minimumPixelSizeSubscription = undefined;
        this._uri = undefined;
        this._uriSubscription = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(ModelGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof ModelGraphics.prototype
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
         * Gets or sets the boolean {@link Property} specifying the model's visibility.
         * @memberof ModelGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),
        /**
         * Gets or sets the Number {@link Property} specifying the model's scale.
         * @memberof ModelGraphics.prototype
         * @type {Property}
         */
        scale : createPropertyDescriptor('scale'),
        /**
         * Gets or sets the Number {@link Property} specifying the model's approximate minimum pixel size regardless of zoom.
         * @memberof ModelGraphics.prototype
         * @type {Property}
         */
        minimumPixelSize : createPropertyDescriptor('minimumPixelSize'),
        /**
         * Gets or sets the string {@link Property} specifying the model's uri.
         * @memberof ModelGraphics.prototype
         * @type {Property}
         */
        uri : createPropertyDescriptor('uri')
    });

    /**
     * Duplicates a ModelGraphics instance.
     *
     * @param {ModelGraphics} [result] The object onto which to store the result.
     * @returns {ModelGraphics} The modified result parameter or a new instance if one was not provided.
     */
    ModelGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new ModelGraphics();
        }
        result.show = this.show;
        result.scale = this.scale;
        result.minimumPixelSize = this.minimumPixelSize;
        result.uri = this.uri;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {ModelGraphics} source The object to be merged into this object.
     */
    ModelGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.scale = defaultValue(this.scale, source.scale);
        this.minimumPixelSize = defaultValue(this.minimumPixelSize, source.minimumPixelSize);
        this.uri = defaultValue(this.uri, source.uri);
    };

    return ModelGraphics;
});