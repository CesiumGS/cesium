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
     * Describes a corridor, which is a shape defined by a centerline and width that
     * conforms to the curvature of the globe. It can be placed on the surface or at altitude
     * and can optionally be extruded into a volume.
     *
     * @alias CorridorGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.positions] A Property specifying the array of {@link Cartesian3} positions that define the centerline of the corridor.
     * @param {Property} [options.width] A numeric Property specifying the distance between the edges of the corridor.
     * @param {Property} [options.cornerType=CornerType.ROUNDED] A {@link CornerType} Property specifying the style of the corners.
     * @param {Property} [options.height=0] A numeric Property specifying the altitude of the corridor relative to the ellipsoid surface.
     * @param {Property} [options.heightReference] A Property specifying what the height is relative to.
     * @param {Property} [options.extrudedHeight] A numeric Property specifying the altitude of the corridor's extruded face relative to the ellipsoid surface.
     * @param {Property} [options.extrudedHeightReference] A Property specifying what the extrudedHeight is relative to.
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the corridor.
     * @param {Property} [options.fill=true] A boolean Property specifying whether the corridor is filled with the provided material.
     * @param {MaterialProperty} [options.material=Color.WHITE] A Property specifying the material used to fill the corridor.
     * @param {Property} [options.outline=false] A boolean Property specifying whether the corridor is outlined.
     * @param {Property} [options.outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
     * @param {Property} [options.outlineWidth=1.0] A numeric Property specifying the width of the outline.
     * @param {Property} [options.granularity=Cesium.Math.RADIANS_PER_DEGREE] A numeric Property specifying the distance between each latitude and longitude.
     * @param {Property} [options.shadows=ShadowMode.DISABLED] An enum Property specifying whether the corridor casts or receives shadows from each light source.
     * @param {Property} [options.distanceDisplayCondition] A Property specifying at what distance from the camera that this corridor will be displayed.
     * @param {ConstantProperty} [options.zIndex] A Property specifying the zIndex of the corridor, used for ordering.  Only has an effect if height and extrudedHeight are undefined, and if the corridor is static.
     *
     * @see Entity
     * @demo {@link https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Corridor.html|Cesium Sandcastle Corridor Demo}
     */
    function CorridorGraphics(options) {
        this._show = undefined;
        this._showSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._positions = undefined;
        this._positionsSubscription = undefined;
        this._height = undefined;
        this._heightSubscription = undefined;
        this._heightReference = undefined;
        this._heightReferenceSubscription = undefined;
        this._extrudedHeight = undefined;
        this._extrudedHeightSubscription = undefined;
        this._extrudedHeightReference = undefined;
        this._extrudedHeightReferenceSubscription = undefined;
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
        this._shadows = undefined;
        this._shadowsSubscription = undefined;
        this._distanceDisplayCondition = undefined;
        this._distanceDisplayConditionSubscription = undefined;
        this._classificationType = undefined;
        this._classificationTypeSubscription = undefined;
        this._zIndex = undefined;
        this._zIndexSubscription = undefined;
        this._definitionChanged = new Event();

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    }

    defineProperties(CorridorGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
         * @memberof CorridorGraphics.prototype
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the boolean Property specifying the visibility of the corridor.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the Property specifying the material used to fill the corridor.
         * @memberof CorridorGraphics.prototype
         * @type {MaterialProperty}
         * @default Color.WHITE
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets a Property specifying the array of {@link Cartesian3} positions that define the centerline of the corridor.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        positions : createPropertyDescriptor('positions'),

        /**
         * Gets or sets the numeric Property specifying the altitude of the corridor.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         * @default 0.0
         */
        height : createPropertyDescriptor('height'),

        /**
         * Gets or sets the Property specifying the {@link HeightReference}.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         * @default HeightReference.NONE
         */
        heightReference : createPropertyDescriptor('heightReference'),

        /**
         * Gets or sets the numeric Property specifying the altitude of the corridor extrusion.
         * Setting this property creates a corridor shaped volume starting at height and ending
         * at this altitude.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        extrudedHeight : createPropertyDescriptor('extrudedHeight'),

        /**
         * Gets or sets the Property specifying the extruded {@link HeightReference}.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         * @default HeightReference.NONE
         */
        extrudedHeightReference : createPropertyDescriptor('extrudedHeightReference'),

        /**
         * Gets or sets the numeric Property specifying the sampling distance between each latitude and longitude point.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         * @default {CesiumMath.RADIANS_PER_DEGREE}
         */
        granularity : createPropertyDescriptor('granularity'),

        /**
         * Gets or sets the numeric Property specifying the width of the corridor.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        width : createPropertyDescriptor('width'),

        /**
         * Gets or sets the boolean Property specifying whether the corridor is filled with the provided material.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         * @default true
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Property specifying whether the corridor is outlined.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         * @default false
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Property specifying the {@link Color} of the outline.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         * @default Color.BLACK
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the numeric Property specifying the width of the outline.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the {@link CornerType} Property specifying how corners are styled.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         * @default CornerType.ROUNDED
         */
        cornerType : createPropertyDescriptor('cornerType'),

        /**
         * Get or sets the enum Property specifying whether the corridor
         * casts or receives shadows from each light source.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         * @default ShadowMode.DISABLED
         */
        shadows : createPropertyDescriptor('shadows'),

        /**
         * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this corridor will be displayed.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         */
        distanceDisplayCondition : createPropertyDescriptor('distanceDisplayCondition'),

        /**
         * Gets or sets the {@link ClassificationType} Property specifying whether this corridor will classify terrain, 3D Tiles, or both when on the ground.
         * @memberof CorridorGraphics.prototype
         * @type {Property}
         * @default ClassificationType.TERRAIN
         */
        classificationType : createPropertyDescriptor('classificationType'),

        /**
         * Gets or sets the zIndex Property specifying the ordering of the corridor.  Only has an effect if the coridor is static and neither height or exturdedHeight are specified.
         * @memberof CorridorGraphics.prototype
         * @type {ConstantProperty}
         * @default 0
         */
        zIndex: createPropertyDescriptor('zIndex')
    });

    /**
     * Duplicates this instance.
     *
     * @param {CorridorGraphics} [result] The object onto which to store the result.
     * @returns {CorridorGraphics} The modified result parameter or a new instance if one was not provided.
     */
    CorridorGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new CorridorGraphics(this);
        }
        result.show = this.show;
        result.material = this.material;
        result.positions = this.positions;
        result.height = this.height;
        result.heightReference = this.heightReference;
        result.extrudedHeight = this.extrudedHeight;
        result.extrudedHeightReference = this.extrudedHeightReference;
        result.granularity = this.granularity;
        result.width = this.width;
        result.fill = this.fill;
        result.outline = this.outline;
        result.outlineColor = this.outlineColor;
        result.outlineWidth = this.outlineWidth;
        result.cornerType = this.cornerType;
        result.shadows = this.shadows;
        result.distanceDisplayCondition = this.distanceDisplayCondition;
        result.classificationType = this.classificationType;
        result.zIndex = this.zIndex;
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
        this.heightReference = defaultValue(this.heightReference, source.heightReference);
        this.extrudedHeight = defaultValue(this.extrudedHeight, source.extrudedHeight);
        this.extrudedHeightReference = defaultValue(this.extrudedHeightReference,  source.extrudedHeightReference);
        this.granularity = defaultValue(this.granularity, source.granularity);
        this.width = defaultValue(this.width, source.width);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.cornerType = defaultValue(this.cornerType, source.cornerType);
        this.shadows = defaultValue(this.shadows, source.shadows);
        this.distanceDisplayCondition = defaultValue(this.distanceDisplayCondition, source.distanceDisplayCondition);
        this.classificationType = defaultValue(this.classificationType, source.classificationType);
        this.zIndex = defaultValue(this.zIndex, source.zIndex);
    };

    return CorridorGraphics;
});
