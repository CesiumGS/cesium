/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/DeveloperError',
        '../Core/Event',
        './createMaterialPropertyDescriptor',
        './createPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        DeveloperError,
        Event,
        createMaterialPropertyDescriptor,
        createPropertyDescriptor) {
    "use strict";

    /**
     * An optionally time-dynamic polygon.
     *
     * @alias PolygonGraphics
     * @constructor
     */
    var PolygonGraphics = function(options) {
        this._show = undefined;
        this._showSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._hierarchy = undefined;
        this._hierarchySubscription = undefined;
        this._height = undefined;
        this._heightSubscription = undefined;
        this._extrudedHeight = undefined;
        this._extrudedHeightSubscription = undefined;
        this._granularity = undefined;
        this._granularitySubscription = undefined;
        this._stRotation = undefined;
        this._stRotationSubscription = undefined;
        this._perPositionHeight = undefined;
        this._perPositionHeightSubscription = undefined;
        this._outline = undefined;
        this._outlineSubscription = undefined;
        this._outlineColor = undefined;
        this._outlineColorSubscription = undefined;
        this._outlineWidth = undefined;
        this._outlineWidthSubscription = undefined;
        this._definitionChanged = new Event();
        this._fill = undefined;
        this._fillSubscription = undefined;

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    };

    defineProperties(PolygonGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof PolygonGraphics.prototype
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
         * Gets or sets the boolean {@link Property} specifying the polygon's visibility.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the polygon.
         * @memberof PolygonGraphics.prototype
         * @type {MaterialProperty}
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the positions that define the polygon.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         * @deprecated
         */
        positions : {
            get : function() {
                deprecationWarning('PolygonGraphics.positions', 'PolygonGraphics.positions was deprecated in Cesium 1.6, use PolygonGraphics.hierarchy instead. This property will be removed in Cesium 1.9.');
                return this.hierarchy;
            },
            set : function(value) {
                deprecationWarning('PolygonGraphics.positions', 'PolygonGraphics.positions was deprecated in Cesium 1.6, use PolygonGraphics.hierarchy instead. This property will be removed in Cesium 1.9.');
                this.hierarchy = value;
            }
        },

        /**
         * Gets or sets the property specifying the {@link PolygonHierarchy}.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        hierarchy : createPropertyDescriptor('hierarchy'),

        /**
         * Gets or sets the Number {@link Property} specifying the height of the polygon.
         * If undefined, the polygon will be on the surface.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        height : createPropertyDescriptor('height'),

        /**
         * Gets or sets the Number {@link Property} specifying the extruded height of the polygon.
         * Setting this property creates a polygon shaped volume starting at height and ending
         * at the extruded height.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        extrudedHeight : createPropertyDescriptor('extrudedHeight'),

        /**
         * Gets or sets the Number {@link Property} specifying the sampling distance, in radians,
         * between each latitude and longitude point.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        granularity : createPropertyDescriptor('granularity'),

        /**
         * Gets or sets the Number {@link Property} specifying the rotation of the texture coordinates,
         * in radians. A positive rotation is counter-clockwise.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        stRotation : createPropertyDescriptor('stRotation'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the polygon should be filled.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the polygon should be outlined.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Color {@link Property} specifying whether the color of the outline.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the Number {@link Property} specifying the width of the outline.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the polygon uses per-position heights.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        perPositionHeight : createPropertyDescriptor('perPositionHeight')
    });

    /**
     * Duplicates a PolygonGraphics instance.
     *
     * @param {PolygonGraphics} [result] The object onto which to store the result.
     * @returns {PolygonGraphics} The modified result parameter or a new instance if one was not provided.
     */
    PolygonGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new PolygonGraphics();
        }
        result.show = this.show;
        result.material = this.material;
        result.hierarchy = this.hierarchy;
        result.height = this.height;
        result.extrudedHeight = this.extrudedHeight;
        result.granularity = this.granularity;
        result.stRotation = this.stRotation;
        result.fill = this.fill;
        result.outline = this.outline;
        result.outlineColor = this.outlineColor;
        result.outlineWidth = this.outlineWidth;
        result.perPositionHeight = this.perPositionHeight;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {PolygonGraphics} source The object to be merged into this object.
     */
    PolygonGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
        this.hierarchy = defaultValue(this.hierarchy, source.hierarchy);
        this.height = defaultValue(this.height, source.height);
        this.extrudedHeight = defaultValue(this.extrudedHeight, source.extrudedHeight);
        this.granularity = defaultValue(this.granularity, source.granularity);
        this.stRotation = defaultValue(this.stRotation, source.stRotation);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.perPositionHeight = defaultValue(this.perPositionHeight, source.perPositionHeight);
    };

    return PolygonGraphics;
});
