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
     * A time-dynamic path representing the visualization of a moving object.
     * @alias DynamicPath
     * @constructor
     */
    var DynamicPath = function() {
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the path's color.
         * @type {Property}
         */
        this.color = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the path's outline color.
         * @type {Property}
         */
        this.outlineColor = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the path's outline width.
         * @type {Property}
         */
        this.outlineWidth = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the path's visibility.
         * @type {Property}
         */
        this.show = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the path's width.
         * @type {Property}
         */
        this.width = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the maximum step size, in seconds, to take when sampling the position.
         * @type {Property}
         */
        this.resolution = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the number of seconds in front of the object to show.
         * @type {Property}
         */
        this.leadTime = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the number of seconds behind the object to show.
         * @type {Property}
         */
        this.trailTime = undefined;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicPath} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicPath.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        this.color = defaultValue(this.color, source.color);
        this.width = defaultValue(this.width, source.width);
        this.resolution = defaultValue(this.resolution, source.resolution);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.show = defaultValue(this.show, source.show);
        this.leadTime = defaultValue(this.leadTime, source.leadTime);
        this.trailTime = defaultValue(this.trailTime, source.trailTime);
    };

    return DynamicPath;
});
