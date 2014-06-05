/*global define*/
define([
        '../Core/defaultValue',
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
     * An optionally time-dynamic polyline.
     * @alias DynamicPolyline
     * @constructor
     */
    var DynamicPolyline = function() {
        this._show = undefined;
        this._showSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._width = undefined;
        this._widthSubscription = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(DynamicPolyline.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicPolyline.prototype
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
         * Gets or sets the boolean {@link Property} specifying the line's visibility.
         * @memberof DynamicPolyline.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the polyline.
         * @memberof DynamicPolyline.prototype
         * @type {MaterialProperty}
         */
        material : createDynamicPropertyDescriptor('material'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the line's width.
         * @memberof DynamicPolyline.prototype
         * @type {Property}
         */
        width : createDynamicPropertyDescriptor('width')
    });

    /**
     * Duplicates a DynamicPolyline instance.
     *
     * @param {DynamicPolyline} [result] The object onto which to store the result.
     * @returns {DynamicPolyline} The modified result parameter or a new instance if one was not provided.
     */
    DynamicPolyline.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicPolyline();
        }
        result.show = this.show;
        result.material = this.material;
        result.width = this.width;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicPolyline} source The object to be merged into this object.
     */
    DynamicPolyline.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
        this.width = defaultValue(this.width, source.width);
    };

    return DynamicPolyline;
});
