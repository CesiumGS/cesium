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
     * An optionally time-dynamic Rectangle.
     *
     * @alias RectangleGraphics
     * @constructor
     */
    var RectangleGraphics = function(options) {
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
    };

    defineProperties(RectangleGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
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
         * Gets or sets the boolean {@link Property} specifying the rectangle's visibility.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link Rectangle} {@link Property} specifying the extent.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        coordinates : createPropertyDescriptor('coordinates'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the rectangle.
         * @memberof RectangleGraphics.prototype
         * @type {MaterialProperty}
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the Number {@link Property} specifying the height of the rectangle.
         * If undefined, the rectangle will be on the surface.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        height : createPropertyDescriptor('height'),

        /**
         * Gets or sets the Number {@link Property} specifying the extruded height of the rectangle.
         * Setting this property creates a rectangle shaped volume starting at height and ending
         * at the extruded height.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        extrudedHeight : createPropertyDescriptor('extrudedHeight'),

        /**
         * Gets or sets the Number {@link Property} specifying the sampling distance, in radians,
         * between each latitude and longitude point.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        granularity : createPropertyDescriptor('granularity'),

        /**
         * Gets or sets the Number {@link Property} specifying the rotation of the texture coordinates,
         * in radians. A positive rotation is counter-clockwise.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        stRotation : createPropertyDescriptor('stRotation'),

        /**
         * Gets or sets the Number {@link Property} specifying the rotation of the texture coordinates,
         * in radians. A positive rotation is counter-clockwise.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        rotation : createPropertyDescriptor('rotation'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the rectangle should be filled.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the rectangle should be outlined.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Color {@link Property} specifying whether the color of the outline.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the Number {@link Property} specifying the width of the outline.
         * @memberof EllipseGraphics.prototype
         * @type {Property}
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether an extruded rectangle should have a closed top.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        closeTop : createPropertyDescriptor('closeTop'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether an extruded rectangle should have a closed bottom.
         * @memberof RectangleGraphics.prototype
         * @type {Property}
         */
        closeBottom : createPropertyDescriptor('closeBottom')
    });

    /**
     * Duplicates a RectangleGraphics instance.
     *
     * @param {RectangleGraphics} [result] The object onto which to store the result.
     * @returns {RectangleGraphics} The modified result parameter or a new instance if one was not provided.
     */
    RectangleGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new RectangleGraphics();
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
