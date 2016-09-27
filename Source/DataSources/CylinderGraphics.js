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
     * Describes a cylinder, truncated cone, or cone defined by a length, top radius, and bottom radius.
     * The center position and orientation are determined by the containing {@link Entity}.
     *
     * @alias CylinderGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.length] A numeric Property specifying the length of the cylinder.
     * @param {Property} [options.topRadius] A numeric Property specifying the radius of the top of the cylinder.
     * @param {Property} [options.bottomRadius] A numeric Property specifying the radius of the bottom of the cylinder.
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the cylinder.
     * @param {Property} [options.fill=true] A boolean Property specifying whether the cylinder is filled with the provided material.
     * @param {MaterialProperty} [options.material=Color.WHITE] A Property specifying the material used to fill the cylinder.
     * @param {Property} [options.outline=false] A boolean Property specifying whether the cylinder is outlined.
     * @param {Property} [options.outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
     * @param {Property} [options.outlineWidth=1.0] A numeric Property specifying the width of the outline.
     * @param {Property} [options.numberOfVerticalLines=16] A numeric Property specifying the number of vertical lines to draw along the perimeter for the outline.
     * @param {Property} [options.slices=128] The number of edges around the perimeter of the cylinder.
     * @param {Property} [options.shadows=ShadowMode.DISABLED] An enum Property specifying whether the cylinder casts or receives shadows from each light source.
     * @param {Property} [options.distanceDisplayCondition] A Property specifying at what distance from the camera that this cylinder will be displayed.
     */
    function CylinderGraphics(options) {
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
        this._shadows = undefined;
        this._shadowsSubscription = undefined;
        this._distanceDisplayCondition = undefined;
        this._distanceDisplayConditionSubscription = undefined;
        this._definitionChanged = new Event();

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    }

    defineProperties(CylinderGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
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
         * Gets or sets the numeric Property specifying the length of the cylinder.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        length : createPropertyDescriptor('length'),

        /**
         * Gets or sets the numeric Property specifying the radius of the top of the cylinder.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        topRadius : createPropertyDescriptor('topRadius'),

        /**
         * Gets or sets the numeric Property specifying the radius of the bottom of the cylinder.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        bottomRadius : createPropertyDescriptor('bottomRadius'),

        /**
         * Gets or sets the Property specifying the number of vertical lines to draw along the perimeter for the outline.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         * @default 16
         */
        numberOfVerticalLines : createPropertyDescriptor('numberOfVerticalLines'),

        /**
         * Gets or sets the Property specifying the number of edges around the perimeter of the cylinder.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         * @default 16
         */
        slices : createPropertyDescriptor('slices'),

        /**
         * Gets or sets the boolean Property specifying the visibility of the cylinder.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the Property specifying the material used to fill the cylinder.
         * @memberof CylinderGraphics.prototype
         * @type {MaterialProperty}
         * @default Color.WHITE
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the boolean Property specifying whether the cylinder is filled with the provided material.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         * @default true
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the boolean Property specifying whether the cylinder is outlined.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         * @default false
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Property specifying the {@link Color} of the outline.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         * @default Color.BLACK
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the numeric Property specifying the width of the outline.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Get or sets the enum Property specifying whether the cylinder
         * casts or receives shadows from each light source.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         * @default ShadowMode.DISABLED
         */
        shadows : createPropertyDescriptor('shadows'),

        /**
         * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this cylinder will be displayed.
         * @memberof CylinderGraphics.prototype
         * @type {Property}
         */
        distanceDisplayCondition : createPropertyDescriptor('distanceDisplayCondition')
    });

    /**
     * Duplicates this instance.
     *
     * @param {CylinderGraphics} [result] The object onto which to store the result.
     * @returns {CylinderGraphics} The modified result parameter or a new instance if one was not provided.
     */
    CylinderGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new CylinderGraphics(this);
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
        result.shadows = this.shadows;
        result.distanceDisplayCondition = this.distanceDisplayCondition;
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
        this.shadows = defaultValue(this.shadows, source.shadows);
        this.distanceDisplayCondition = defaultValue(this.distanceDisplayCondition, source.distanceDisplayCondition);
    };

    return CylinderGraphics;
});
