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
     * Describes a polygon defined by an hierarchy of linear rings which make up the outer shape and any nested holes.
     * The polygon conforms to the curvature of the globe and can be placed on the surface or
     * at altitude and can optionally be extruded into a volume.
     *
     * @alias PolygonGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.hierarchy] A Property specifying the {@link PolygonHierarchy}.
     * @param {Property} [options.height=0] A numeric Property specifying the altitude of the polygon relative to the ellipsoid surface.
     * @param {Property} [options.heightReference] A Property specifying what the height is relative to.
     * @param {Property} [options.extrudedHeight] A numeric Property specifying the altitude of the polygon's extruded face relative to the ellipsoid surface.
     * @param {Property} [options.extrudedHeightReference] A Property specifying what the extrudedHeight is relative to.
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the polygon.
     * @param {Property} [options.fill=true] A boolean Property specifying whether the polygon is filled with the provided material.
     * @param {MaterialProperty} [options.material=Color.WHITE] A Property specifying the material used to fill the polygon.
     * @param {Property} [options.outline=false] A boolean Property specifying whether the polygon is outlined.
     * @param {Property} [options.outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
     * @param {Property} [options.outlineWidth=1.0] A numeric Property specifying the width of the outline.
     * @param {Property} [options.stRotation=0.0] A numeric property specifying the rotation of the polygon texture counter-clockwise from north.
     * @param {Property} [options.granularity=Cesium.Math.RADIANS_PER_DEGREE] A numeric Property specifying the angular distance between each latitude and longitude point.
     * @param {Property} [options.perPositionHeight=false] A boolean specifying whether or not the the height of each position is used.
     * @param {Boolean} [options.closeTop=true] When false, leaves off the top of an extruded polygon open.
     * @param {Boolean} [options.closeBottom=true] When false, leaves off the bottom of an extruded polygon open.
     * @param {Property} [options.shadows=ShadowMode.DISABLED] An enum Property specifying whether the polygon casts or receives shadows from each light source.
     * @param {Property} [options.distanceDisplayCondition] A Property specifying at what distance from the camera that this polygon will be displayed.
     * @param {ConstantProperty} [options.zIndex=0] A property specifying the zIndex used for ordering ground geometry.  Only has an effect if the polygon is constant and neither height or extrudedHeight are specified.
     *
     * @see Entity
     * @demo {@link https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Polygon.html|Cesium Sandcastle Polygon Demo}
     */
    function PolygonGraphics(options) {
        this._show = undefined;
        this._showSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._hierarchy = undefined;
        this._hierarchySubscription = undefined;
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
        this._fill = undefined;
        this._fillSubscription = undefined;
        this._closeTop = undefined;
        this._closeTopSubscription = undefined;
        this._closeBottom = undefined;
        this._closeBottomSubscription = undefined;
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

    defineProperties(PolygonGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
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
         * Gets or sets the boolean Property specifying the visibility of the polygon.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the Property specifying the material used to fill the polygon.
         * @memberof PolygonGraphics.prototype
         * @type {MaterialProperty}
         * @default Color.WHITE
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the Property specifying the {@link PolygonHierarchy}.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        hierarchy : createPropertyDescriptor('hierarchy'),

        /**
         * Gets or sets the numeric Property specifying the constant altitude of the polygon.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         * @default 0.0
         */
        height : createPropertyDescriptor('height'),

        /**
         * Gets or sets the Property specifying the {@link HeightReference}.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         * @default HeightReference.NONE
         */
        heightReference : createPropertyDescriptor('heightReference'),

        /**
         * Gets or sets the numeric Property specifying the altitude of the polygon extrusion.
         * If {@link PolygonGraphics#perPositionHeight} is false, the volume starts at {@link PolygonGraphics#height} and ends at this altitude.
         * If {@link PolygonGraphics#perPositionHeight} is true, the volume starts at the height of each {@link PolygonGraphics#hierarchy} position and ends at this altitude.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        extrudedHeight : createPropertyDescriptor('extrudedHeight'),

        /**
         * Gets or sets the Property specifying the extruded {@link HeightReference}.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         * @default HeightReference.NONE
         */
        extrudedHeightReference : createPropertyDescriptor('extrudedHeightReference'),

        /**
         * Gets or sets the numeric Property specifying the angular distance between points on the polygon.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         * @default {CesiumMath.RADIANS_PER_DEGREE}
         */
        granularity : createPropertyDescriptor('granularity'),

        /**
         * Gets or sets the numeric property specifying the rotation of the polygon texture counter-clockwise from north.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         * @default 0
         */
        stRotation : createPropertyDescriptor('stRotation'),

        /**
         * Gets or sets the boolean Property specifying whether the polygon is filled with the provided material.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         * @default true
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Property specifying whether the polygon is outlined.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         * @default false
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Property specifying the {@link Color} of the outline.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         * @default Color.BLACK
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the numeric Property specifying the width of the outline.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the boolean specifying whether or not the the height of each position is used.
         * If true, the shape will have non-uniform altitude defined by the height of each {@link PolygonGraphics#hierarchy} position.
         * If false, the shape will have a constant altitude as specified by {@link PolygonGraphics#height}.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        perPositionHeight : createPropertyDescriptor('perPositionHeight'),

        /**
         * Gets or sets a boolean specifying whether or not the top of an extruded polygon is included.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        closeTop : createPropertyDescriptor('closeTop'),

        /**
         * Gets or sets a boolean specifying whether or not the bottom of an extruded polygon is included.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        closeBottom : createPropertyDescriptor('closeBottom'),

        /**
         * Get or sets the enum Property specifying whether the polygon
         * casts or receives shadows from each light source.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         * @default ShadowMode.DISABLED
         */
        shadows : createPropertyDescriptor('shadows'),

        /**
         * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this polygon will be displayed.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         */
        distanceDisplayCondition : createPropertyDescriptor('distanceDisplayCondition'),

        /**
         * Gets or sets the {@link ClassificationType} Property specifying whether this polygon will classify terrain, 3D Tiles, or both when on the ground.
         * @memberof PolygonGraphics.prototype
         * @type {Property}
         * @default ClassificationType.TERRAIN
         */
        classificationType : createPropertyDescriptor('classificationType'),

        /**
         * Gets or sets the zIndex Prperty specifying the ordering of ground geometry.  Only has an effect if the polygon is constant and neither height or extrudedHeight are specified.
         * @memberof PolygonGraphics.prototype
         * @type {ConstantProperty}
         * @default 0
         */
        zIndex : createPropertyDescriptor('zIndex')
    });

    /**
     * Duplicates this instance.
     *
     * @param {PolygonGraphics} [result] The object onto which to store the result.
     * @returns {PolygonGraphics} The modified result parameter or a new instance if one was not provided.
     */
    PolygonGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new PolygonGraphics(this);
        }
        result.show = this.show;
        result.material = this.material;
        result.hierarchy = this.hierarchy;
        result.height = this.height;
        result.heightReference = this.heightReference;
        result.extrudedHeight = this.extrudedHeight;
        result.extrudedHeightReference = this.extrudedHeightReference;
        result.granularity = this.granularity;
        result.stRotation = this.stRotation;
        result.fill = this.fill;
        result.outline = this.outline;
        result.outlineColor = this.outlineColor;
        result.outlineWidth = this.outlineWidth;
        result.perPositionHeight = this.perPositionHeight;
        result.closeTop = this.closeTop;
        result.closeBottom = this.closeBottom;
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
        this.heightReference = defaultValue(this.heightReference, source.heightReference);
        this.extrudedHeight = defaultValue(this.extrudedHeight, source.extrudedHeight);
        this.extrudedHeightReference = defaultValue(this.extrudedHeightReference,  source.extrudedHeightReference);
        this.granularity = defaultValue(this.granularity, source.granularity);
        this.stRotation = defaultValue(this.stRotation, source.stRotation);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.perPositionHeight = defaultValue(this.perPositionHeight, source.perPositionHeight);
        this.closeTop = defaultValue(this.closeTop, source.closeTop);
        this.closeBottom = defaultValue(this.closeBottom, source.closeBottom);
        this.shadows = defaultValue(this.shadows, source.shadows);
        this.distanceDisplayCondition = defaultValue(this.distanceDisplayCondition, source.distanceDisplayCondition);
        this.classificationType = defaultValue(this.classificationType, source.classificationType);
        this.zIndex = defaultValue(this.zIndex, source.zIndex);
    };

    return PolygonGraphics;
});
