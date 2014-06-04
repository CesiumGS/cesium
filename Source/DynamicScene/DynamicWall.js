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
     * An optionally time-dynamic two dimensional wall.
     *
     * @alias DynamicWall
     * @constructor
     */
    var DynamicWall = function() {
        this._show = undefined;
        this._showSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._minimumHeights = undefined;
        this._minimumHeightsSubscription = undefined;
        this._maximumHeights = undefined;
        this._maximumHeightsSubscription = undefined;
        this._granularity = undefined;
        this._granularitySubscription = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(DynamicWall.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicWall.prototype
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
         * Gets or sets the boolean {@link Property} specifying the wall's visibility.
         * @memberof DynamicWall.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the wall.
         * @memberof DynamicWall.prototype
         * @type {MaterialProperty}
         */
        material : createDynamicPropertyDescriptor('material'),

        /**
         * Gets or sets the Array {@link Property} specifying the bottom heights of the wall.
         * This array must be the same length as vertexPositions, containing a height for
         * each position.  If undefined, the bottom of the wall will be on the surface of the
         * ellipsoid.
         * @memberof DynamicWall.prototype
         * @type {Property}
         */
        minimumHeights : createDynamicPropertyDescriptor('minimumHeights'),

        /**
         * Gets or sets the Array {@link Property} specifying the top heights along the wall.
         * This array must be the same length as vertexPositions, containing a height for
         * each position.  If undefined, the heights from vertexPositions are used.
         * @memberof DynamicWall.prototype
         * @type {Property}
         */
        maximumHeights : createDynamicPropertyDescriptor('maximumHeights'),

        /**
         * Gets or sets the Number {@link Property} specifying the sampling distance, in radians,
         * between each latitude and longitude point.
         * @memberof DynamicWall.prototype
         * @type {Property}
         */
        granularity : createDynamicPropertyDescriptor('granularity'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the wall should be filled.
         * @memberof DynamicWall.prototype
         * @type {Property}
         */
        fill : createDynamicPropertyDescriptor('fill'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the wall should be outlined.
         * @memberof DynamicWall.prototype
         * @type {Property}
         */
        outline : createDynamicPropertyDescriptor('outline'),

        /**
         * Gets or sets the Color {@link Property} specifying whether the color of the outline.
         * @memberof DynamicWall.prototype
         * @type {Property}
         */
        outlineColor : createDynamicPropertyDescriptor('outlineColor')
    });

    /**
     * Duplicates a DynamicWall instance.
     *
     * @param {DynamicWall} [result] The object onto which to store the result.
     * @returns {DynamicWall} The modified result parameter or a new instance if one was not provided.
     */
    DynamicWall.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicWall();
        }
        result.show = this.show;
        result.material = this.material;
        result.minimumHeights = this.minimumHeights;
        result.maximumHeights = this.maximumHeights;
        result.granularity = this.granularity;
        result.fill = this.fill;
        result.outline = this.outline;
        result.outlineColor = this.outlineColor;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicWall} source The object to be merged into this object.
     */
    DynamicWall.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
        this.minimumHeights = defaultValue(this.minimumHeights, source.minimumHeights);
        this.maximumHeights = defaultValue(this.maximumHeights, source.maximumHeights);
        this.granularity = defaultValue(this.granularity, source.granularity);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
    };

    return DynamicWall;
});
