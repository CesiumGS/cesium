/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createPropertyDescriptor) {
    "use strict";

    /**
     * An optionally time-dynamic two dimensional wall.
     *
     * @alias WallGraphics
     * @constructor
     */
    var WallGraphics = function() {
        this._show = undefined;
        this._showSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._positions = undefined;
        this._positionsSubscription = undefined;
        this._minimumHeights = undefined;
        this._minimumHeightsSubscription = undefined;
        this._maximumHeights = undefined;
        this._maximumHeightsSubscription = undefined;
        this._granularity = undefined;
        this._granularitySubscription = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(WallGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof WallGraphics.prototype
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
         * @memberof WallGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the wall.
         * @memberof WallGraphics.prototype
         * @type {MaterialProperty}
         */
        material : createPropertyDescriptor('material'),

        /**
         * Gets or sets the vertex positions.
         * @memberof WallGraphics.prototype
         * @type {Property}
         */
        positions : createPropertyDescriptor('positions'),

        /**
         * Gets or sets the Array {@link Property} specifying the bottom heights of the wall.
         * This array must be the same length as positions, containing a height for
         * each position.  If undefined, the bottom of the wall will be on the surface of the
         * ellipsoid.
         * @memberof WallGraphics.prototype
         * @type {Property}
         */
        minimumHeights : createPropertyDescriptor('minimumHeights'),

        /**
         * Gets or sets the Array {@link Property} specifying the top heights along the wall.
         * This array must be the same length as positions, containing a height for
         * each position.  If undefined, the heights from positions are used.
         * @memberof WallGraphics.prototype
         * @type {Property}
         */
        maximumHeights : createPropertyDescriptor('maximumHeights'),

        /**
         * Gets or sets the Number {@link Property} specifying the sampling distance, in radians,
         * between each latitude and longitude point.
         * @memberof WallGraphics.prototype
         * @type {Property}
         */
        granularity : createPropertyDescriptor('granularity'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the wall should be filled.
         * @memberof WallGraphics.prototype
         * @type {Property}
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the wall should be outlined.
         * @memberof WallGraphics.prototype
         * @type {Property}
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Color {@link Property} specifying whether the color of the outline.
         * @memberof WallGraphics.prototype
         * @type {Property}
         */
        outlineColor : createPropertyDescriptor('outlineColor')
    });

    /**
     * Duplicates a WallGraphics instance.
     *
     * @param {WallGraphics} [result] The object onto which to store the result.
     * @returns {WallGraphics} The modified result parameter or a new instance if one was not provided.
     */
    WallGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new WallGraphics();
        }
        result.show = this.show;
        result.material = this.material;
        result.positions = this.positions;
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
     * @param {WallGraphics} source The object to be merged into this object.
     */
    WallGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
        this.positions = defaultValue(this.positions, source.positions);
        this.minimumHeights = defaultValue(this.minimumHeights, source.minimumHeights);
        this.maximumHeights = defaultValue(this.maximumHeights, source.maximumHeights);
        this.granularity = defaultValue(this.granularity, source.granularity);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
    };

    return WallGraphics;
});
