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
     * An optionally time-dynamic polyline.
     * @alias DynamicPolyline
     * @constructor
     */
    var DynamicPolyline = function() {
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the line's color.
         * @type {Property}
         */
        this.color = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the line's outline color.
         * @type {Property}
         */
        this.outlineColor = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the line's outline width.
         * @type {Property}
         */
        this.outlineWidth = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the line's visibility.
         * @type {Property}
         */
        this.show = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the line's width.
         * @type {Property}
         */
        this.width = undefined;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicPolyline} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicPolyline.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        this.color = defaultValue(this.color, source.color);
        this.width = defaultValue(this.width, source.width);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.show = defaultValue(this.show, source.show);
    };

    return DynamicPolyline;
});
