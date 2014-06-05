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
     * A time-dynamic path representing the visualization of a moving object.
     * @alias DynamicPath
     * @constructor
     */
    var DynamicPath = function() {
        this._material = undefined;
        this._materialSubscription = undefined;
        this._show = undefined;
        this._showSubscription = undefined;
        this._width = undefined;
        this._widthSubscription = undefined;
        this._resolution = undefined;
        this._resolutionSubscription = undefined;
        this._leadTime = undefined;
        this._leadTimeSubscription = undefined;
        this._trailTime = undefined;
        this._trailTimeSubscription = undefined;

        this._definitionChanged = new Event();
    };

    defineProperties(DynamicPath.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicPath.prototype
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
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the path.
         * @memberof DynamicPath.prototype
         * @type {MaterialProperty}
         */
        material : createDynamicPropertyDescriptor('material'),

        /**
         * Gets or sets the boolean {@link Property} specifying the path's visibility.
         * @memberof DynamicPath.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the path's width.
         * @memberof DynamicPath.prototype
         * @type {Property}
         */
        width : createDynamicPropertyDescriptor('width'),

        /**
         * Gets or sets the numeric {@link Property} specifying the maximum step size, in seconds, to take when sampling the position.
         * @memberof DynamicPath.prototype
         * @type {Property}
         */
        resolution : createDynamicPropertyDescriptor('resolution'),

        /**
         * Gets or sets the numeric {@link Property} specifying the number of seconds in front of the object to show.
         * @memberof DynamicPath.prototype
         * @type {Property}
         */
        leadTime : createDynamicPropertyDescriptor('leadTime'),

        /**
         * Gets or sets the numeric {@link Property} specifying the number of seconds behind the object to show.
         * @memberof DynamicPath.prototype
         * @type {Property}
         */
        trailTime : createDynamicPropertyDescriptor('trailTime')
    });

    /**
     * Duplicates a DynamicPath instance.
     *
     * @param {DynamicPath} [result] The object onto which to store the result.
     * @returns {DynamicPath} The modified result parameter or a new instance if one was not provided.
     */
    DynamicPath.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicPath();
        }
        result.material = this.material;
        result.width = this.width;
        result.resolution = this.resolution;
        result.show = this.show;
        result.leadTime = this.leadTime;
        result.trailTime = this.trailTime;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicPath} source The object to be merged into this object.
     */
    DynamicPath.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.material = defaultValue(this.material, source.material);
        this.width = defaultValue(this.width, source.width);
        this.resolution = defaultValue(this.resolution, source.resolution);
        this.show = defaultValue(this.show, source.show);
        this.leadTime = defaultValue(this.leadTime, source.leadTime);
        this.trailTime = defaultValue(this.trailTime, source.trailTime);
    };

    return DynamicPath;
});
