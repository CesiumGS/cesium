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
     * Describes a polyline. The first two positions define a line segment,
     * and each additional position defines a line segment from the previous position. The segments
     * can be linear connected points, great arcs, or clamped to terrain.
     *
     * @alias PolylineGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.positions] A Property specifying the array of {@link Cartesian3} positions that define the line strip.
     * @param {Property} [options.followSurface=true] A boolean Property specifying whether the line segments should be great arcs or linearly connected.
     * @param {Property} [options.clampToGround=false] A boolean Property specifying whether the Polyline should be clamped to the ground.
     * @param {Property} [options.width=1.0] A numeric Property specifying the width in pixels.
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the polyline.
     * @param {MaterialProperty} [options.material=Color.WHITE] A Property specifying the material used to draw the polyline.
     * @param {MaterialProperty} [options.depthFailMaterial] A property specifiying the material used to draw the polyline when it is below the terrain.
     * @param {Property} [options.granularity=Cesium.Math.RADIANS_PER_DEGREE] A numeric Property specifying the angular distance between each latitude and longitude if followSurface is true.
     * @param {Property} [options.shadows=ShadowMode.DISABLED] An enum Property specifying whether the polyline casts or receives shadows from each light source.
     * @param {Property} [options.distanceDisplayCondition] A Property specifying at what distance from the camera that this polyline will be displayed.
     * @param {Property} [options.zIndex=0] A Property specifying the zIndex used for ordering ground geometry. Only has an effect if `clampToGround` is true and polylines on terrain is supported.
     *
     * @see Entity
     * @demo {@link https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Polyline.html|Cesium Sandcastle Polyline Demo}
     */
    function PolylineGraphics(options) {
        this._show = undefined;
        this._showSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._depthFailMaterial = undefined;
        this._depthFailMaterialSubscription = undefined;
        this._positions = undefined;
        this._positionsSubscription = undefined;
        this._followSurface = undefined;
        this._followSurfaceSubscription = undefined;
        this._clampToGround = undefined;
        this._clampToGroundSubscription = undefined;
        this._granularity = undefined;
        this._granularitySubscription = undefined;
        this._widthSubscription = undefined;
        this._width = undefined;
        this._widthSubscription = undefined;
        this._shadows = undefined;
        this._shadowsSubscription = undefined;
        this._distanceDisplayCondition = undefined;
        this._distanceDisplayConditionSubscription = undefined;
        this._zIndex = undefined;
        this._zIndexSubscription = undefined;

        this._definitionChanged = new Event();

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    }

    defineProperties(PolylineGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
         * @memberof PolylineGraphics.prototype
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
         * Gets or sets the boolean Property specifying the visibility of the polyline.
         * @memberof PolylineGraphics.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the Property specifying the material used to draw the polyline.
         * @memberof PolylineGraphics.prototype
         * @type {MaterialProperty}
         * @default Color.WHITE
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the Property specifying the material used to draw the polyline when it fails the depth test.
         * <p>
         * Requires the EXT_frag_depth WebGL extension to render properly. If the extension is not supported,
         * there may be artifacts.
         * </p>
         * @memberof PolylineGraphics.prototype
         * @type {MaterialProperty}
         * @default undefined
         */
        depthFailMaterial : createMaterialPropertyDescriptor('depthFailMaterial'),

        /**
         * Gets or sets the Property specifying the array of {@link Cartesian3}
         * positions that define the line strip.
         * @memberof PolylineGraphics.prototype
         * @type {Property}
         */
        positions : createPropertyDescriptor('positions'),

        /**
         * Gets or sets the numeric Property specifying the width in pixels.
         * @memberof PolylineGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        width : createPropertyDescriptor('width'),

        /**
         * Gets or sets the boolean Property specifying whether the line segments
         * should be great arcs or linearly connected.
         * @memberof PolylineGraphics.prototype
         * @type {Property}
         * @default true
         */
        followSurface : createPropertyDescriptor('followSurface'),

        /**
         * Gets or sets the boolean Property specifying whether the polyline
         * should be clamped to the ground.
         * @memberof PolylineGraphics.prototype
         * @type {Property}
         * @default false
         */
        clampToGround : createPropertyDescriptor('clampToGround'),

        /**
         * Gets or sets the numeric Property specifying the angular distance between each latitude and longitude if followSurface is true and clampToGround is false.
         * @memberof PolylineGraphics.prototype
         * @type {Property}
         * @default Cesium.Math.RADIANS_PER_DEGREE
         */
        granularity : createPropertyDescriptor('granularity'),

        /**
         * Get or sets the enum Property specifying whether the polyline
         * casts or receives shadows from each light source.
         * @memberof PolylineGraphics.prototype
         * @type {Property}
         * @default ShadowMode.DISABLED
         */
        shadows : createPropertyDescriptor('shadows'),

        /**
         * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this polyline will be displayed.
         * @memberof PolylineGraphics.prototype
         * @type {Property}
         */
        distanceDisplayCondition : createPropertyDescriptor('distanceDisplayCondition'),

        /**
         * Gets or sets the zIndex Property specifying the ordering of the polyline. Only has an effect if `clampToGround` is true and polylines on terrain is supported.
         * @memberof RectangleGraphics.prototype
         * @type {ConstantProperty}
         * @default 0
         */
        zIndex : createPropertyDescriptor('zIndex')
    });

    /**
     * Duplicates this instance.
     *
     * @param {PolylineGraphics} [result] The object onto which to store the result.
     * @returns {PolylineGraphics} The modified result parameter or a new instance if one was not provided.
     */
    PolylineGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new PolylineGraphics(this);
        }
        result.show = this.show;
        result.material = this.material;
        result.depthFailMaterial = this.depthFailMaterial;
        result.positions = this.positions;
        result.width = this.width;
        result.followSurface = this.followSurface;
        result.clampToGround = this.clampToGround;
        result.granularity = this.granularity;
        result.shadows = this.shadows;
        result.distanceDisplayCondition = this.distanceDisplayCondition;
        result.zIndex = this.zIndex;

        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {PolylineGraphics} source The object to be merged into this object.
     */
    PolylineGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
        this.depthFailMaterial = defaultValue(this.depthFailMaterial, source.depthFailMaterial);
        this.positions = defaultValue(this.positions, source.positions);
        this.width = defaultValue(this.width, source.width);
        this.followSurface = defaultValue(this.followSurface, source.followSurface);
        this.clampToGround = defaultValue(this.clampToGround, source.clampToGround);
        this.granularity = defaultValue(this.granularity, source.granularity);
        this.shadows = defaultValue(this.shadows, source.shadows);
        this.distanceDisplayCondition = defaultValue(this.distanceDisplayCondition, source.distanceDisplayCondition);
        this.zIndex = defaultValue(this.zIndex, source.zIndex);
    };

    return PolylineGraphics;
});
