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
     * Describes a polyline volume defined as a line strip and corresponding two dimensional shape which is extruded along it.
     * The resulting volume conforms to the curvature of the globe.
     *
     * @alias PolylineVolumeGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.positions] A Property specifying the array of {@link Cartesian3} positions which define the line strip.
     * @param {Property} [options.shape] A Property specifying the array of {@link Cartesian2} positions which define the shape to be extruded.
     * @param {Property} [options.cornerType=CornerType.ROUNDED] A {@link CornerType} Property specifying the style of the corners.
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the volume.
     * @param {Property} [options.fill=true] A boolean Property specifying whether the volume is filled with the provided material.
     * @param {MaterialProperty} [options.material=Color.WHITE] A Property specifying the material used to fill the volume.
     * @param {Property} [options.outline=false] A boolean Property specifying whether the volume is outlined.
     * @param {Property} [options.outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
     * @param {Property} [options.outlineWidth=1.0] A numeric Property specifying the width of the outline.
     * @param {Property} [options.granularity=Cesium.Math.RADIANS_PER_DEGREE] A numeric Property specifying the angular distance between each latitude and longitude point.
     *
     * @see Entity
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Polyline%20Volume.html|Cesium Sandcastle Polyline Volume Demo}
     */
    function PolylineVolumeGraphics(options) {
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
    }

    defineProperties(PolylineVolumeGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
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
         * Gets or sets the boolean Property specifying the visibility of the volume.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the Property specifying the material used to fill the volume.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {MaterialProperty}
         * @default Color.WHITE
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the Property specifying the array of {@link Cartesian3} positions which define the line strip.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         */
        positions : createPropertyDescriptor('positions'),

        /**
         * Gets or sets the Property specifying the array of {@link Cartesian2} positions which define the shape to be extruded.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         */
        shape : createPropertyDescriptor('shape'),

        /**
         * Gets or sets the numeric Property specifying the angular distance between points on the volume.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         * @default {CesiumMath.RADIANS_PER_DEGREE}
         */
        granularity : createPropertyDescriptor('granularity'),

        /**
         * Gets or sets the boolean Property specifying whether the volume is filled with the provided material.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         * @default true
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Property specifying whether the volume is outlined.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         * @default false
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Property specifying the {@link Color} of the outline.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         * @default Color.BLACK
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the numeric Property specifying the width of the outline.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the {@link CornerType} Property specifying the style of the corners.
         * @memberof PolylineVolumeGraphics.prototype
         * @type {Property}
         * @default CornerType.ROUNDED
         */
        cornerType : createPropertyDescriptor('cornerType')
    });

    /**
     * Duplicates this instance.
     *
     * @param {PolylineVolumeGraphics} [result] The object onto which to store the result.
     * @returns {PolylineVolumeGraphics} The modified result parameter or a new instance if one was not provided.
     */
    PolylineVolumeGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new PolylineVolumeGraphics(this);
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
