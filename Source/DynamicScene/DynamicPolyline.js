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
     * An optionally time-dynamic polyline.
     * @alias DynamicPolyline
     * @constructor
     */
    var DynamicPolyline = function() {
        this._color = undefined;
        this._outlineColor = undefined;
        this._outlineWidth = undefined;
        this._show = undefined;
        this._width = undefined;
        this._propertyAssigned = new Event();
    };

    defineProperties(DynamicPolyline.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicPolyline.prototype
         * @type {Event}
         */
        propertyAssigned : {
            get : function() {
                return this._propertyAssigned;
            }
        },

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the line's color.
         * @memberof DynamicPolyline.prototype
         * @type {Property}
         */
        color : createObservableProperty('color', '_color'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the line's outline color.
         * @memberof DynamicPolyline.prototype
         * @type {Property}
         */
        outlineColor : createObservableProperty('outlineColor', '_outlineColor'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the line's outline width.
         * @memberof DynamicPolyline.prototype
         * @type {Property}
         */
        outlineWidth : createObservableProperty('outlineWidth', '_outlineWidth'),

        /**
         * @memberof DynamicPolyline.prototype
         * Gets or sets the boolean {@link Property} specifying the line's visibility.
         * @type {Property}
         */
        show : createObservableProperty('show', '_show'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the line's width.
         * @memberof DynamicPolyline.prototype
         * @type {Property}
         */
        width : createObservableProperty('width', '_width')
    });

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
