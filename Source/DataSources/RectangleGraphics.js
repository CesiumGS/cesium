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
    'use strict';

    /**
     * Describes graphics for a {@link Rectangle}.
     * The rectangle conforms to the curvature of the globe and can be placed on the surface or
     * at altitude and can optionally be extruded into a volume.
     *
     * @alias RectangleGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.coordinates] The Property specifying the {@link Rectangle}.
     * @param {Property} [options.height=0] A numeric Property specifying the altitude of the rectangle relative to the ellipsoid surface.
     * @param {Property} [options.extrudedHeight] A numeric Property specifying the altitude of the rectangle's extruded face relative to the ellipsoid surface.
     * @param {Property} [options.closeTop=true] A boolean Property specifying whether the rectangle has a top cover when extruded
     * @param {Property} [options.closeBottom=true] A boolean Property specifying whether the rectangle has a bottom cover when extruded.
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the rectangle.
     * @param {Property} [options.fill=true] A boolean Property specifying whether the rectangle is filled with the provided material.
     * @param {MaterialProperty} [options.material=Color.WHITE] A Property specifying the material used to fill the rectangle.
     * @param {Property} [options.outline=false] A boolean Property specifying whether the rectangle is outlined.
     * @param {Property} [options.outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
     * @param {Property} [options.outlineWidth=1.0] A numeric Property specifying the width of the outline.
     * @param {Property} [options.rotation=0.0] A numeric property specifying the rotation of the rectangle clockwise from north.
     * @param {Property} [options.stRotation=0.0] A numeric property specifying the rotation of the rectangle texture counter-clockwise from north.
     * @param {Property} [options.granularity=Cesium.Math.RADIANS_PER_DEGREE] A numeric Property specifying the angular distance between points on the rectangle.
     *
     * @see Entity
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Rectangle.html|Cesium Sandcastle Rectangle Demo}
     */
    function RectangleGraphics(options) {
        this._show = undefined;
        this._showSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._coordinates = undefined;
        this._coordinatesSubscription = undefined;
        this._height = undefined;
        this._heightSubscription = undefined;
        this._extrudedHeight = undefined;
        this._extrudedHeightSubscription = undefined;
        this._granularity = undefined;
        this._granularitySubscription = undefined;
        this._stRotation = undefined;
        this._stRotationSubscription = undefined;
        this._rotation = undefined;
        this._rotationSubscription = undefined;
        this._closeTop = undefined;
        this._closeTopSubscription = undefined;
        this._closeBottom = undefined;
        this._closeBottomSubscription = undefined;
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

    defineProperties(RectangleGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
         * @memberof RectangleGraphics.prototype
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
         * Gets or sets the boolean Property specifying the visibility of the rectangle.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the Property specifying the {@link Rectangle}.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        coordinates : createPropertyDescriptor('coordinates'),

        /**
         * Gets or sets the Property specifying the material used to fill the rectangle.
         * @memberof RectangleGraphics.prototype
         * @type {MaterialProperty}
         * @default Color.WHITE
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the numeric Property specifying the altitude of the rectangle.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         * @default 0.0
         */
        height : createPropertyDescriptor('height'),

        /**
         * Gets or sets the numeric Property specifying the altitude of the rectangle extrusion.
         * Setting this property creates volume starting at height and ending at this altitude.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        extrudedHeight : createPropertyDescriptor('extrudedHeight'),

        /**
         * Gets or sets the numeric Property specifying the angular distance between points on the rectangle.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         * @default {CesiumMath.RADIANS_PER_DEGREE}
         */
        granularity : createPropertyDescriptor('granularity'),

        /**
         * Gets or sets the numeric property specifying the rotation of the rectangle texture counter-clockwise from north.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         * @default 0
         */
        stRotation : createPropertyDescriptor('stRotation'),

        /**
         * Gets or sets the numeric property specifying the rotation of the rectangle clockwise from north.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         * @default 0
         */
        rotation : createPropertyDescriptor('rotation'),

        /**
         * Gets or sets the boolean Property specifying whether the rectangle is filled with the provided material.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         * @default true
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Property specifying whether the rectangle is outlined.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         * @default false
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Property specifying the {@link Color} of the outline.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         * @default Color.BLACK
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the numeric Property specifying the width of the outline.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the boolean Property specifying whether the rectangle has a top cover when extruded.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         * @default true
         */
        closeTop : createPropertyDescriptor('closeTop'),

        /**
         * Gets or sets the boolean Property specifying whether the rectangle has a bottom cover when extruded.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         * @default true
         */
        closeBottom : createPropertyDescriptor('closeBottom')
    });

    /**
     * Duplicates this instance.
     *
     * @param {RectangleGraphics} [result] The object onto which to store the result.
     * @returns {RectangleGraphics} The modified result parameter or a new instance if one was not provided.
     */
    RectangleGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new RectangleGraphics(this);
        }
        result.show = this.show;
        result.coordinates = this.coordinates;
        result.material = this.material;
        result.height = this.height;
        result.extrudedHeight = this.extrudedHeight;
        result.granularity = this.granularity;
        result.stRotation = this.stRotation;
        result.rotation = this.rotation;
        result.fill = this.fill;
        result.outline = this.outline;
        result.outlineColor = this.outlineColor;
        result.outlineWidth = this.outlineWidth;
        result.closeTop = this.closeTop;
        result.closeBottom = this.closeBottom;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {RectangleGraphics} source The object to be merged into this object.
     */
    RectangleGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.coordinates = defaultValue(this.coordinates, source.coordinates);
        this.material = defaultValue(this.material, source.material);
        this.height = defaultValue(this.height, source.height);
        this.extrudedHeight = defaultValue(this.extrudedHeight, source.extrudedHeight);
        this.granularity = defaultValue(this.granularity, source.granularity);
        this.stRotation = defaultValue(this.stRotation, source.stRotation);
        this.rotation = defaultValue(this.rotation, source.rotation);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.closeTop = defaultValue(this.closeTop, source.closeTop);
        this.closeBottom = defaultValue(this.closeBottom, source.closeBottom);
    };

    return RectangleGraphics;
});
