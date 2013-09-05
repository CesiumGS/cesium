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
     * An optionally time-dynamic billboard.
     * @alias DynamicPoint
     * @constructor
     */
    var DynamicPoint = function() {
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the point's color.
         * @type {Property}
         */
        this.color = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the point's size in pixels.
         * @type {Property}
         */
        this.pixelSize = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the point's outline color.
         * @type {Property}
         */
        this.outlineColor = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the point's outline width.
         * @type {Property}
         */
        this.outlineWidth = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the point's visibility.
         * @type {Property}
         */
        this.show = undefined;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicPoint} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicPoint.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        this.color = defaultValue(this.color, source.color);
        this.pixelSize = defaultValue(this.pixelSize, source.pixelSize);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.show = defaultValue(this.show, source.show);
    };

    return DynamicPoint;
});
