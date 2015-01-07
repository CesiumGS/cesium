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
     * An optionally time-dynamic polyline volume.
     *
     * @alias PolylineVolumeGraphics
     * @constructor
     */
    var PolylineVolumeGraphics = function(options) {
        this._show = undefined;
        this._showSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._positions = undefined;
        this._positionsSubscription = undefined;
        this._shape = undefined;
        this._shapeSubscription = undefined;
        this._granularity = undefined;
        this._granularitySubscription = undefined;
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

    defineProperties(PolylineVolumeGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof PolylineVolumeGraphics.prototype
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
         * Gets or sets the boolean {@link Property} specifying the volumes's visibility.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the volume.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {MaterialProperty}
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the positions of the line.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         */
        positions : createPropertyDescriptor('positions'),

        /**
         * Gets or sets the array of {@link Cartesian2} instances that define the shape to be extruded along the polyline.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         */
        shape : createPropertyDescriptor('shape'),

        /**
         * Gets or sets the Number {@link Property} specifying the sampling distance, in radians,
         * between each latitude and longitude point.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         */
        granularity : createPropertyDescriptor('granularity'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the volume should be filled.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the volume should be outlined.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Color {@link Property} specifying whether the color of the outline.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the Number {@link Property} specifying the width of the outline.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the {@link CornerType} {@link Property} specifying how corners are triangulated.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         */
        cornerType : createPropertyDescriptor('cornerType')
    });

    /**
     * Duplicates a PolylineVolumeGraphics instance.
     *
     * @param {PolylineVolumeGraphics} [result] The object onto which to store the result.
     * @returns {PolylineVolumeGraphics} The modified result parameter or a new instance if one was not provided.
     */
    PolylineVolumeGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new PolylineVolumeGraphics();
        }
        result.show = this.show;
        result.material = this.material;
        result.positions = this.positions;
        result.shape = this.shape;
        result.granularity = this.granularity;
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
     * @param {PolylineVolumeGraphics} source The object to be merged into this object.
     */
    PolylineVolumeGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
        this.positions = defaultValue(this.positions, source.positions);
        this.shape = defaultValue(this.shape, source.shape);
        this.granularity = defaultValue(this.granularity, source.granularity);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.cornerType = defaultValue(this.cornerType, source.cornerType);
    };

    return PolylineVolumeGraphics;
});
