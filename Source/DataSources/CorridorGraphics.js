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
     * An optionally time-dynamic corridor.
     *
     * @alias CorridorGraphics
     * @constructor
     */
    var CorridorGraphics = function(options) {
        this._show = undefined;
        this._showSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._positions = undefined;
        this._positionsSubscription = undefined;
        this._height = undefined;
        this._heightSubscription = undefined;
        this._extrudedHeight = undefined;
        this._extrudedHeightSubscription = undefined;
        this._granularity = undefined;
        this._granularitySubscription = undefined;
        this._width = undefined;
        this._widthSubscription = undefined;
        this._cornerType = undefined;
        this._cornerTypeSubscription = undefined;
        this._fill = undefined;
        this._fillSubscription = undefined;
        this._outline = undefined;
        this._outlineSubscription = undefined;
        this._outlineColor = undefined;
        this._outlineColorSubscription = undefined;
        this._outlineWidth = undefined;
        this._outlineWidthSubscription = undefined;
        this._definitionChanged = new Event();

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    };

    defineProperties(CorridorGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof CorridorGraphics.prototype
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
         * Gets or sets the boolean {@link Property} specifying the corridor's visibility.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the corridor.
         * @memberof CorridorGraphics.prototype
         * @type {MaterialProperty}
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the positions.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        positions : createPropertyDescriptor('positions'),

        /**
         * Gets or sets the Number {@link Property} specifying the height of the corridor.
         * If undefined, the corridor will be on the surface.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        height : createPropertyDescriptor('height'),

        /**
         * Gets or sets the Number {@link Property} specifying the extruded height of the corridor.
         * Setting this property creates a corridor shaped volume starting at height and ending
         * at the extruded height.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        extrudedHeight : createPropertyDescriptor('extrudedHeight'),

        /**
         * Gets or sets the Number {@link Property} specifying the sampling distance, in radians,
         * between each latitude and longitude point.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        granularity : createPropertyDescriptor('granularity'),

        /**
         * Gets or sets the Number {@link Property} specifying the rotation of the texture coordinates,
         * in radians. A positive rotation is counter-clockwise.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        width : createPropertyDescriptor('width'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the corridor should be filled.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the corridor should be outlined.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Color {@link Property} specifying whether the color of the outline.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the Number {@link Property} specifying the width of the outline.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the {@link CornerType} {@link Property} specifying how corners are triangulated.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        cornerType : createPropertyDescriptor('cornerType')
    });

    /**
     * Duplicates a CorridorGraphics instance.
     *
     * @param {CorridorGraphics} [result] The object onto which to store the result.
     * @returns {CorridorGraphics} The modified result parameter or a new instance if one was not provided.
     */
    CorridorGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new CorridorGraphics();
        }
        result.show = this.show;
        result.material = this.material;
        result.positions = this.positions;
        result.height = this.height;
        result.extrudedHeight = this.extrudedHeight;
        result.granularity = this.granularity;
        result.width = this.width;
        result.fill = this.fill;
        result.outline = this.outline;
        result.outlineColor = this.outlineColor;
        result.outlineWidth = this.outlineWidth;
        result.cornerType = this.cornerType;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {CorridorGraphics} source The object to be merged into this object.
     */
    CorridorGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
        this.positions = defaultValue(this.positions, source.positions);
        this.height = defaultValue(this.height, source.height);
        this.extrudedHeight = defaultValue(this.extrudedHeight, source.extrudedHeight);
        this.granularity = defaultValue(this.granularity, source.granularity);
        this.width = defaultValue(this.width, source.width);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.cornerType = defaultValue(this.cornerType, source.cornerType);
    };

    return CorridorGraphics;
});
