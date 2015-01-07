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
     * An optionally time-dynamic cylinder.
     *
     * @alias CylinderGraphics
     * @constructor
     */
    var CylinderGraphics = function(options) {
        this._length = undefined;
        this._lengthSubscription = undefined;
        this._topRadius = undefined;
        this._topRadiusSubscription = undefined;
        this._bottomRadius = undefined;
        this._bottomRadiusSubscription = undefined;
        this._numberOfVerticalLines = undefined;
        this._numberOfVerticalLinesSubscription = undefined;
        this._slices = undefined;
        this._slicesSubscription = undefined;
        this._show = undefined;
        this._showSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
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
    defineProperties(CylinderGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof CylinderGraphics.prototype
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
         * Gets or sets the numeric {@link Property} specifying the cylinder's semi-major-axis.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        length : createPropertyDescriptor('length'),

        /**
         * Gets or sets the numeric {@link Property} specifying the cylinder's semi-minor-axis.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        topRadius : createPropertyDescriptor('topRadius'),

        /**
         * Gets or sets the numeric {@link Property} specifying the cylinder's bottomRadius.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        bottomRadius : createPropertyDescriptor('bottomRadius'),

        /**
         * Gets or sets the Number {@link Property} specifying the number of vertical lines
         * to use when outlining the cylinder.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        numberOfVerticalLines : createPropertyDescriptor('numberOfVerticalLines'),

        /**
         * Gets or sets the Number {@link Property} specifying the sampling distance, in radians,
         * between each latitude and longitude point.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        slices : createPropertyDescriptor('slices'),

        /**
         * Gets or sets the boolean {@link Property} specifying the polygon's visibility.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the polygon.
         * @memberof CylinderGraphics.prototype
         * @type {MaterialProperty}
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the cylinder should be filled.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the cylinder should be outlined.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Color {@link Property} specifying the color of the outline.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the Number {@link Property} specifying the width of the outline.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        outlineWidth : createPropertyDescriptor('outlineWidth')
    });

    /**
     * Duplicates a CylinderGraphics instance.
     *
     * @param {CylinderGraphics} [result] The object onto which to store the result.
     * @returns {CylinderGraphics} The modified result parameter or a new instance if one was not provided.
     */
    CylinderGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new CylinderGraphics();
        }
        result.bottomRadius = this.bottomRadius;
        result.length = this.length;
        result.topRadius = this.topRadius;
        result.show = this.show;
        result.material = this.material;
        result.numberOfVerticalLines = this.numberOfVerticalLines;
        result.slices = this.slices;
        result.fill = this.fill;
        result.outline = this.outline;
        result.outlineColor = this.outlineColor;
        result.outlineWidth = this.outlineWidth;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {CylinderGraphics} source The object to be merged into this object.
     */
    CylinderGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.bottomRadius = defaultValue(this.bottomRadius, source.bottomRadius);
        this.length = defaultValue(this.length, source.length);
        this.topRadius = defaultValue(this.topRadius, source.topRadius);
        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
        this.numberOfVerticalLines = defaultValue(this.numberOfVerticalLines, source.numberOfVerticalLines);
        this.slices = defaultValue(this.slices, source.slices);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
    };

    return CylinderGraphics;
});
