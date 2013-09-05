/*global define*/
define(['../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event) {
    "use strict";

    /**
     * An optionally time-dynamic label.
     * @alias DynamicLabel
     * @constructor
     */
    var DynamicLabel = function() {
        /**
         * Gets or sets the string {@link Property} specifying the the label's text.
         * @type {Property}
         */
        this.text = undefined;
        /**
         * Gets or sets the string {@link Property} specifying the the label's font.
         * @type {Property}
         */
        this.font = undefined;
        /**
         * Gets or sets the {@link LabelStyle} {@link Property} specifying the the label's style.
         * @type {Property}
         */
        this.style = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the label's fill color.
         * @type {Property}
         */
        this.fillColor = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the label's outline color.
         * @type {Property}
         */
        this.outlineColor = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the label outline's width.
         * @type {Property}
         */
        this.outlineWidth = undefined;
        /**
         * Gets or sets the {@link HorizontalOrigin} {@link Property} specifying the label's horizontal origin.
         * @type {Property}
         */
        this.horizontalOrigin = undefined;
        /**
         * Gets or sets the {@link VerticalOrigin} {@link Property} specifying the label's vertical origin.
         * @type {Property}
         */
        this.verticalOrigin = undefined;
        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the label's eye offset.
         * @type {Property}
         */
        this.eyeOffset = undefined;
        /**
         * Gets or sets the {@link Cartesian2} {@link Property} specifying the label's pixel offset.
         * @type {Property}
         */
        this.pixelOffset = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the label's scale.
         * @type {Property}
         */
        this.scale = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the label's visibility.
         * @type {Property}
         */
        this.show = undefined;
    };

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
