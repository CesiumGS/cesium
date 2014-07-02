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
     * An optionally time-dynamic label.
     * @alias LabelGraphics
     * @constructor
     */
    var LabelGraphics = function() {
        this._text = undefined;
        this._textSubscription = undefined;
        this._font = undefined;
        this._fontSubscription = undefined;
        this._style = undefined;
        this._styleSubscription = undefined;
        this._fillColor = undefined;
        this._fillColorSubscription = undefined;
        this._outlineColor = undefined;
        this._outlineColorSubscription = undefined;
        this._outlineWidth = undefined;
        this._outlineWidthSubscription = undefined;
        this._horizontalOrigin = undefined;
        this._horizontalOriginSubscription = undefined;
        this._verticalOrigin = undefined;
        this._verticalOriginSubscription = undefined;
        this._eyeOffset = undefined;
        this._eyeOffsetSubscription = undefined;
        this._pixelOffset = undefined;
        this._pixelOffsetSubscription = undefined;
        this._scale = undefined;
        this._scaleSubscription = undefined;
        this._show = undefined;
        this._showSubscription = undefined;
        this._translucencyByDistance = undefined;
        this._translucencyByDistanceSubscription = undefined;
        this._pixelOffsetScaleByDistance = undefined;
        this._pixelOffsetScaleByDistanceSubscription = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(LabelGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof LabelGraphics.prototype
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
         * Gets or sets the string {@link Property} specifying the the label's text.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        text : createPropertyDescriptor('text'),

        /**
         * Gets or sets the string {@link Property} specifying the the label's font.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        font : createPropertyDescriptor('font'),

        /**
         * Gets or sets the {@link LabelStyle} {@link Property} specifying the the label's style.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        style : createPropertyDescriptor('style'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the label's fill color.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        fillColor : createPropertyDescriptor('fillColor'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the label's outline color.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the label outline's width.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the {@link HorizontalOrigin} {@link Property} specifying the label's horizontal origin.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        horizontalOrigin : createPropertyDescriptor('horizontalOrigin'),

        /**
         * Gets or sets the {@link VerticalOrigin} {@link Property} specifying the label's vertical origin.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        verticalOrigin : createPropertyDescriptor('verticalOrigin'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the label's eye offset.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        eyeOffset : createPropertyDescriptor('eyeOffset'),

        /**
         * Gets or sets the {@link Cartesian2} {@link Property} specifying the label's pixel offset.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        pixelOffset : createPropertyDescriptor('pixelOffset'),

        /**
         * Gets or sets the numeric {@link Property} specifying the label's scale.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        scale : createPropertyDescriptor('scale'),

        /**
         * Gets or sets the boolean {@link Property} specifying the label's visibility.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link NearFarScalar} {@link Property} used to set translucency based on distance.
         * If undefined, a constant size is used.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        translucencyByDistance : createPropertyDescriptor('translucencyByDistance'),

        /**
         * Gets or sets the {@link NearFarScalar} {@link Property} used to set pixel offset scaling based on distance.
         * If undefined, no additional scale is applied to the pixel offset
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        pixelOffsetScaleByDistance : createPropertyDescriptor('pixelOffsetScaleByDistance')

    });

    /**
     * Duplicates a LabelGraphics instance.
     *
     * @param {LabelGraphics} [result] The object onto which to store the result.
     * @returns {LabelGraphics} The modified result parameter or a new instance if one was not provided.
     */
    LabelGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new LabelGraphics();
        }
        result.text = this.text;
        result.font = this.font;
        result.show = this.show;
        result.style = this.style;
        result.fillColor = this.fillColor;
        result.outlineColor = this.outlineColor;
        result.outlineWidth = this.outlineWidth;
        result.scale = this.scale;
        result.horizontalOrigin = this.horizontalOrigin;
        result.verticalOrigin = this.verticalOrigin;
        result.eyeOffset = this.eyeOffset;
        result.pixelOffset = this.pixelOffset;
        result.translucencyByDistance = this._translucencyByDistance;
        result.pixelOffsetScaleByDistance = this._pixelOffsetScaleByDistance;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {LabelGraphics} source The object to be merged into this object.
     */
    LabelGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.text = defaultValue(this.text, source.text);
        this.font = defaultValue(this.font, source.font);
        this.show = defaultValue(this.show, source.show);
        this.style = defaultValue(this.style, source.style);
        this.fillColor = defaultValue(this.fillColor, source.fillColor);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.scale = defaultValue(this.scale, source.scale);
        this.horizontalOrigin = defaultValue(this.horizontalOrigin, source.horizontalOrigin);
        this.verticalOrigin = defaultValue(this.verticalOrigin, source.verticalOrigin);
        this.eyeOffset = defaultValue(this.eyeOffset, source.eyeOffset);
        this.pixelOffset = defaultValue(this.pixelOffset, source.pixelOffset);
        this.translucencyByDistance = defaultValue(this._translucencyByDistance, source._translucencyByDistance);
        this.pixelOffsetScaleByDistance = defaultValue(this._pixelOffsetScaleByDistance, source._pixelOffsetScaleByDistance);
    };

    return LabelGraphics;
});
