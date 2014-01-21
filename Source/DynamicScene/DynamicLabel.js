/*global define*/
define(['../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createDynamicPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createDynamicPropertyDescriptor) {
    "use strict";

    /**
     * An optionally time-dynamic label.
     * @alias DynamicLabel
     * @constructor
     */
    var DynamicLabel = function() {
        this._text = undefined;
        this._font = undefined;
        this._style = undefined;
        this._fillColor = undefined;
        this._outlineColor = undefined;
        this._outlineWidth = undefined;
        this._horizontalOrigin = undefined;
        this._verticalOrigin = undefined;
        this._eyeOffset = undefined;
        this._pixelOffset = undefined;
        this._scale = undefined;
        this._show = undefined;
        this._translucencyByDistance = undefined;
        this._pixelOffsetScaleByDistance = undefined;
        this._propertyChanged = new Event();
    };

    defineProperties(DynamicLabel.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicLabel.prototype
         * @type {Event}
         */
        propertyChanged : {
            get : function() {
                return this._propertyChanged;
            }
        },

        /**
         * Gets or sets the string {@link Property} specifying the the label's text.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        text : createDynamicPropertyDescriptor('text', '_text'),

        /**
         * Gets or sets the string {@link Property} specifying the the label's font.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        font : createDynamicPropertyDescriptor('font', '_font'),

        /**
         * Gets or sets the {@link LabelStyle} {@link Property} specifying the the label's style.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        style : createDynamicPropertyDescriptor('style', '_style'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the label's fill color.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        fillColor : createDynamicPropertyDescriptor('fillColor', '_fillColor'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the label's outline color.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        outlineColor : createDynamicPropertyDescriptor('outlineColor', '_outlineColor'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the label outline's width.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        outlineWidth : createDynamicPropertyDescriptor('outlineWidth', '_outlineWidth'),

        /**
         * Gets or sets the {@link HorizontalOrigin} {@link Property} specifying the label's horizontal origin.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        horizontalOrigin : createDynamicPropertyDescriptor('horizontalOrigin', '_horizontalOrigin'),

        /**
         * Gets or sets the {@link VerticalOrigin} {@link Property} specifying the label's vertical origin.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        verticalOrigin : createDynamicPropertyDescriptor('verticalOrigin', '_verticalOrigin'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the label's eye offset.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        eyeOffset : createDynamicPropertyDescriptor('eyeOffset', '_eyeOffset'),

        /**
         * Gets or sets the {@link Cartesian2} {@link Property} specifying the label's pixel offset.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        pixelOffset : createDynamicPropertyDescriptor('pixelOffset', '_pixelOffset'),

        /**
         * Gets or sets the numeric {@link Property} specifying the label's scale.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        scale : createDynamicPropertyDescriptor('scale', '_scale'),

        /**
         * Gets or sets the boolean {@link Property} specifying the label's visibility.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show', '_show'),

        /**
         * Gets or sets the {@link NearFarScalar} {@link Property} used to set translucency based on distance.
         * If undefined, a constant size is used.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        translucencyByDistance : createDynamicPropertyDescriptor('translucencyByDistance', '_translucencyByDistance'),

        /**
         * Gets or sets the {@link NearFarScalar} {@link Property} used to set pixel offset scaling based on distance.
         * If undefined, no additional scale is applied to the pixel offset
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        pixelOffsetScaleByDistance : createDynamicPropertyDescriptor('pixelOffsetScaleByDistance', '_pixelOffsetScaleByDistance')

    });

    /**
     * Duplicates a DynamicLabel instance.
     * @memberof DynamicLabel
     *
     * @param {DynamicLabel} [result] The object onto which to store the result.
     * @returns {DynamicLabel} The modified result parameter or a new instance if one was not provided.
     */
    DynamicLabel.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicLabel();
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
     * @memberof DynamicLabel
     *
     * @param {DynamicLabel} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicLabel.prototype.merge = function(source) {
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

    return DynamicLabel;
});
