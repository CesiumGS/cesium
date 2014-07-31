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
     * An optionally time-dynamic polyline.
     * @alias PolylineGraphics
     * @constructor
     */
    var PolylineGraphics = function() {
        this._show = undefined;
        this._showSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._positions = undefined;
        this._positionsSubscription = undefined;
        this._followSurface = undefined;
        this._followSurfaceSubscription = undefined;
        this._granularity = undefined;
        this._granularitySubscription = undefined;
        this._widthSubscription = undefined;
        this._width = undefined;
        this._widthSubscription = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(PolylineGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof PolylineGraphics.prototype
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
         * @memberof PolylineGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the polyline.
         * @memberof PolylineGraphics.prototype
         * @type {MaterialProperty}
         */
        material : createPropertyDescriptor('material'),

        /**
         * Gets or sets the vertex positions.
         * @memberof PolylineGraphics.prototype
         * @type {Property}
         */
        positions : createPropertyDescriptor('positions'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the line's width.
         * @memberof PolylineGraphics.prototype
         * @type {Property}
         */
        width : createPropertyDescriptor('width'),

        /**
         * Gets or sets the boolean {@link Property} specifying whether or not the
         * points connecting the line should follow the curve of globe's surface.
         * @memberof PolylineGraphics.prototype
         * @type {Property}
         */
        followSurface : createPropertyDescriptor('followSurface'),

        /**
         * Gets or sets the numeric {@link Property} specifying the granularity
         * of the resulting curve when followSurface is true.
         * @memberof PolylineGraphics.prototype
         * @type {Property}
         */
        granularity : createPropertyDescriptor('granularity')
    });

    /**
     * Duplicates a PolylineGraphics instance.
     *
     * @param {PolylineGraphics} [result] The object onto which to store the result.
     * @returns {PolylineGraphics} The modified result parameter or a new instance if one was not provided.
     */
    PolylineGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new PolylineGraphics();
        }
        result.show = this.show;
        result.material = this.material;
        result.positions = this.positions;
        result.width = this.width;
        result.followSurface = this.followSurface;
        result.granularity = this.granularity;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {PolylineGraphics} source The object to be merged into this object.
     */
    PolylineGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
        this.positions = defaultValue(this.positions, source.positions);
        this.width = defaultValue(this.width, source.width);
        this.followSurface = defaultValue(this.followSurface, source.followSurface);
        this.granularity = defaultValue(this.granularity, source.granularity);
    };

    return PolylineGraphics;
});
