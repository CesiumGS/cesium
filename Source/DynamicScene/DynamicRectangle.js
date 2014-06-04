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
     * An optionally time-dynamic Rectangle.
     *
     * @alias DynamicRectangle
     * @constructor
     */
    var DynamicRectangle = function() {
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
        this._definitionChanged = new Event();
    };

    defineProperties(DynamicRectangle.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicRectangle.prototype
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
         * @memberof DynamicRectangle.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link Rectangle} {@link Property} specifying the extent.
         * @memberof DynamicRectangle.prototype
         * @type {Property}
         */
        coordinates : createDynamicPropertyDescriptor('coordinates'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the rectangle.
         * @memberof DynamicRectangle.prototype
         * @type {MaterialProperty}
         */
        material : createDynamicPropertyDescriptor('material'),

        /**
         * Gets or sets the Number {@link Property} specifying the height of the rectangle.
         * If undefined, the rectangle will be on the surface.
         * @memberof DynamicRectangle.prototype
         * @type {Property}
         */
        height : createDynamicPropertyDescriptor('height'),

        /**
         * Gets or sets the Number {@link Property} specifying the extruded height of the rectangle.
         * Setting this property creates a rectangle shaped volume starting at height and ending
         * at the extruded height.
         * @memberof DynamicRectangle.prototype
         * @type {Property}
         */
        extrudedHeight : createDynamicPropertyDescriptor('extrudedHeight'),

        /**
         * Gets or sets the Number {@link Property} specifying the sampling distance, in radians,
         * between each latitude and longitude point.
         * @memberof DynamicRectangle.prototype
         * @type {Property}
         */
        granularity : createDynamicPropertyDescriptor('granularity'),

        /**
         * Gets or sets the Number {@link Property} specifying the rotation of the texture coordinates,
         * in radians. A positive rotation is counter-clockwise.
         * @memberof DynamicRectangle.prototype
         * @type {Property}
         */
        stRotation : createDynamicPropertyDescriptor('stRotation'),

        /**
         * Gets or sets the Number {@link Property} specifying the rotation of the texture coordinates,
         * in radians. A positive rotation is counter-clockwise.
         * @memberof DynamicRectangle.prototype
         * @type {Property}
         */
        rotation : createDynamicPropertyDescriptor('rotation'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the rectangle should be filled.
         * @memberof DynamicRectangle.prototype
         * @type {Property}
         */
        fill : createDynamicPropertyDescriptor('fill'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the rectangle should be outlined.
         * @memberof DynamicRectangle.prototype
         * @type {Property}
         */
        outline : createDynamicPropertyDescriptor('outline'),

        /**
         * Gets or sets the Color {@link Property} specifying whether the color of the outline.
         * @memberof DynamicRectangle.prototype
         * @type {Property}
         */
        outlineColor : createDynamicPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether an extruded rectangle should have a closed top.
         * @memberof DynamicRectangle.prototype
         * @type {Property}
         */
        closeTop : createDynamicPropertyDescriptor('closeTop'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether an extruded rectangle should have a closed bottom.
         * @memberof DynamicRectangle.prototype
         * @type {Property}
         */
        closeBottom : createDynamicPropertyDescriptor('closeBottom')
    });

    /**
     * Duplicates a DynamicRectangle instance.
     *
     * @param {DynamicRectangle} [result] The object onto which to store the result.
     * @returns {DynamicRectangle} The modified result parameter or a new instance if one was not provided.
     */
    DynamicRectangle.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicRectangle();
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
        result.closeTop = this.closeTop;
        result.closeBottom = this.closeBottom;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicRectangle} source The object to be merged into this object.
     */
    DynamicRectangle.prototype.merge = function(source) {
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
        this.closeTop = defaultValue(this.closeTop, source.closeTop);
        this.closeBottom = defaultValue(this.closeBottom, source.closeBottom);
    };

    return DynamicRectangle;
});
