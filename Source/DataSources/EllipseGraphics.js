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
     * An optionally time-dynamic ellipse.
     *
     * @alias DynamicEllipse
     * @constructor
     */
    var DynamicEllipse = function() {
        this._semiMajorAxis = undefined;
        this._semiMajorAxisSubscription = undefined;
        this._semiMinorAxis = undefined;
        this._semiMinorAxisSubscription = undefined;
        this._rotation = undefined;
        this._rotationSubscription = undefined;
        this._show = undefined;
        this._showSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._height = undefined;
        this._heightSubscription = undefined;
        this._extrudedHeight = undefined;
        this._extrudedHeightSubscription = undefined;
        this._granularity = undefined;
        this._granularitySubscription = undefined;
        this._stRotation = undefined;
        this._stRotationSubscription = undefined;
        this._outline = undefined;
        this._outlineSubscription = undefined;
        this._outlineColor = undefined;
        this._outlineColorSubscription = undefined;
        this._numberOfVerticalLines = undefined;
        this._numberOfVerticalLinesSubscription = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(DynamicEllipse.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicEllipse.prototype
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
         * Gets or sets the numeric {@link Property} specifying the ellipse's semi-major-axis.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        semiMajorAxis : createDynamicPropertyDescriptor('semiMajorAxis'),

        /**
         * Gets or sets the numeric {@link Property} specifying the ellipse's semi-minor-axis.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        semiMinorAxis : createDynamicPropertyDescriptor('semiMinorAxis'),

        /**
         * Gets or sets the numeric {@link Property} specifying the ellipse's rotation.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        rotation : createDynamicPropertyDescriptor('rotation'),

        /**
         * Gets or sets the boolean {@link Property} specifying the polygon's visibility.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the polygon.
         * @memberof DynamicEllipse.prototype
         * @type {MaterialProperty}
         */
        material : createDynamicPropertyDescriptor('material'),

        /**
         * Gets or sets the Number {@link Property} specifying the height of the polygon.
         * If undefined, the polygon will be on the surface.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        height : createDynamicPropertyDescriptor('height'),

        /**
         * Gets or sets the Number {@link Property} specifying the extruded height of the polygon.
         * Setting this property creates a polygon shaped volume starting at height and ending
         * at the extruded height.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        extrudedHeight : createDynamicPropertyDescriptor('extrudedHeight'),

        /**
         * Gets or sets the Number {@link Property} specifying the sampling distance, in radians,
         * between each latitude and longitude point.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        granularity : createDynamicPropertyDescriptor('granularity'),

        /**
         * Gets or sets the Number {@link Property} specifying the rotation of the texture coordinates,
         * in radians. A positive rotation is counter-clockwise.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        stRotation : createDynamicPropertyDescriptor('stRotation'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the ellipse should be filled.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        fill : createDynamicPropertyDescriptor('fill'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the ellipse should be outlined.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        outline : createDynamicPropertyDescriptor('outline'),

        /**
         * Gets or sets the Color {@link Property} specifying whether the color of the outline.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        outlineColor : createDynamicPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the Number {@link Property} specifying the number of vertical lines
         * to use when outlining the ellipse.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        numberOfVerticalLines : createDynamicPropertyDescriptor('numberOfVerticalLines')
    });

    /**
     * Duplicates a DynamicEllipse instance.
     *
     * @param {DynamicEllipse} [result] The object onto which to store the result.
     * @returns {DynamicEllipse} The modified result parameter or a new instance if one was not provided.
     */
    DynamicEllipse.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicEllipse();
        }
        result.rotation = this.rotation;
        result.semiMajorAxis = this.semiMajorAxis;
        result.semiMinorAxis = this.semiMinorAxis;
        result.show = this.show;
        result.material = this.material;
        result.height = this.height;
        result.extrudedHeight = this.extrudedHeight;
        result.granularity = this.granularity;
        result.stRotation = this.stRotation;
        result.fill = this.fill;
        result.outline = this.outline;
        result.outlineColor = this.outlineColor;
        result.numberOfVerticalLines = this.numberOfVerticalLines;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicEllipse} source The object to be merged into this object.
     */
    DynamicEllipse.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.rotation = defaultValue(this.rotation, source.rotation);
        this.semiMajorAxis = defaultValue(this.semiMajorAxis, source.semiMajorAxis);
        this.semiMinorAxis = defaultValue(this.semiMinorAxis, source.semiMinorAxis);
        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
        this.height = defaultValue(this.height, source.height);
        this.extrudedHeight = defaultValue(this.extrudedHeight, source.extrudedHeight);
        this.granularity = defaultValue(this.granularity, source.granularity);
        this.stRotation = defaultValue(this.stRotation, source.stRotation);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.numberOfVerticalLines = defaultValue(this.numberOfVerticalLines, source.numberOfVerticalLines);
    };

    return DynamicEllipse;
});
