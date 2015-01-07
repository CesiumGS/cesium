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
     * An optionally time-dynamic point.
     * @alias PointGraphics
     * @constructor
     */
    var PointGraphics = function(options) {
        this._color = undefined;
        this._colorSubscription = undefined;
        this._pixelSize = undefined;
        this._pixelSizeSubscription = undefined;
        this._outlineColor = undefined;
        this._outlineColorSubscription = undefined;
        this._outlineWidth = undefined;
        this._outlineWidthSubscription = undefined;
        this._show = undefined;
        this._showSubscription = undefined;
        this._scaleByDistance = undefined;
        this._scaleByDistanceSubscription = undefined;
        this._definitionChanged = new Event();

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    };

    defineProperties(PointGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof PointGraphics.prototype
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
         * Gets or sets the {@link Color} {@link Property} specifying the the point's color.
         * @memberof PointGraphics.prototype
         * @type {Property}
         */
        color : createPropertyDescriptor('color'),

        /**
         * Gets or sets the numeric {@link Property} specifying the point's size in pixels.
         * @memberof PointGraphics.prototype
         * @type {Property}
         */
        pixelSize : createPropertyDescriptor('pixelSize'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the point's outline color.
         * @memberof PointGraphics.prototype
         * @type {Property}
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the point's outline width.
         * @memberof PointGraphics.prototype
         * @type {Property}
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the boolean {@link Property} specifying the point's visibility.
         * @memberof PointGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link NearFarScalar} {@link Property} used to scale billboards based on distance.
         * If undefined, a constant size is used.
         * @memberof PointGraphics.prototype
         * @type {Property}
         */
        scaleByDistance : createPropertyDescriptor('scaleByDistance')
    });

    /**
     * Duplicates a PointGraphics instance.
     *
     * @param {PointGraphics} [result] The object onto which to store the result.
     * @returns {PointGraphics} The modified result parameter or a new instance if one was not provided.
     */
    PointGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new PointGraphics();
        }
        result.color = this.color;
        result.pixelSize = this.pixelSize;
        result.outlineColor = this.outlineColor;
        result.outlineWidth = this.outlineWidth;
        result.show = this.show;
        result.scaleByDistance = this.scaleByDistance;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {PointGraphics} source The object to be merged into this object.
     */
    PointGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.color = defaultValue(this.color, source.color);
        this.pixelSize = defaultValue(this.pixelSize, source.pixelSize);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.show = defaultValue(this.show, source.show);
        this.scaleByDistance = defaultValue(this.scaleByDistance, source.scaleByDistance);
    };

    return PointGraphics;
});
