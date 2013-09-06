/*global define*/
define(['../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createObservableProperty'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createObservableProperty) {
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
        this._propertyAssigned = new Event();
    };

    defineProperties(DynamicLabel.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicLabel.prototype
         * @type {Event}
         */
        propertyAssigned : {
            get : function() {
                return this._propertyAssigned;
            }
        },

        /**
         * Gets or sets the string {@link Property} specifying the the label's text.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        text : createObservableProperty('text', '_text'),

        /**
         * Gets or sets the string {@link Property} specifying the the label's font.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        font : createObservableProperty('font', '_font'),

        /**
         * Gets or sets the {@link LabelStyle} {@link Property} specifying the the label's style.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        style : createObservableProperty('style', '_style'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the label's fill color.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        fillColor : createObservableProperty('fillColor', '_fillColor'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the label's outline color.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        outlineColor : createObservableProperty('outlineColor', '_outlineColor'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the label outline's width.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        outlineWidth : createObservableProperty('outlineWidth', '_outlineWidth'),

        /**
         * Gets or sets the {@link HorizontalOrigin} {@link Property} specifying the label's horizontal origin.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        horizontalOrigin : createObservableProperty('horizontalOrigin', '_horizontalOrigin'),

        /**
         * Gets or sets the {@link VerticalOrigin} {@link Property} specifying the label's vertical origin.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        verticalOrigin : createObservableProperty('verticalOrigin', '_verticalOrigin'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the label's eye offset.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        eyeOffset : createObservableProperty('eyeOffset', '_eyeOffset'),

        /**
         * Gets or sets the {@link Cartesian2} {@link Property} specifying the label's pixel offset.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        pixelOffset : createObservableProperty('pixelOffset', '_pixelOffset'),

        /**
         * Gets or sets the numeric {@link Property} specifying the label's scale.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        scale : createObservableProperty('scale', '_scale'),

        /**
         * Gets or sets the boolean {@link Property} specifying the label's visibility.
         * @memberof DynamicLabel.prototype
         * @type {Property}
         */
        show : createObservableProperty('show', '_show')
    });

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicLabel} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicLabel.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
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
    };

    return DynamicLabel;
});
