/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createMaterialPropertyDescriptor',
        './createPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createMaterialPropertyDescriptor,
        createPropertyDescriptor) {
    "use strict";

    /**
     * A time-dynamic path representing the visualization of a moving object.
     * @alias PathGraphics
     * @constructor
     */
    var PathGraphics = function(options) {
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

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    };

    defineProperties(PathGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof PathGraphics.prototype
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
         * @memberof PathGraphics.prototype
         * @type {MaterialProperty}
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the boolean {@link Property} specifying the path's visibility.
         * @memberof PathGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the path's width.
         * @memberof PathGraphics.prototype
         * @type {Property}
         */
        width : createPropertyDescriptor('width'),

        /**
         * Gets or sets the numeric {@link Property} specifying the maximum step size, in seconds, to take when sampling the position.
         * @memberof PathGraphics.prototype
         * @type {Property}
         */
        resolution : createPropertyDescriptor('resolution'),

        /**
         * Gets or sets the numeric {@link Property} specifying the number of seconds in front of the object to show.
         * @memberof PathGraphics.prototype
         * @type {Property}
         */
        leadTime : createPropertyDescriptor('leadTime'),

        /**
         * Gets or sets the numeric {@link Property} specifying the number of seconds behind the object to show.
         * @memberof PathGraphics.prototype
         * @type {Property}
         */
        trailTime : createPropertyDescriptor('trailTime')
    });

    /**
     * Duplicates a PathGraphics instance.
     *
     * @param {PathGraphics} [result] The object onto which to store the result.
     * @returns {PathGraphics} The modified result parameter or a new instance if one was not provided.
     */
    PathGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new PathGraphics();
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
     * @param {PathGraphics} source The object to be merged into this object.
     */
    PathGraphics.prototype.merge = function(source) {
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

    return PathGraphics;
});
