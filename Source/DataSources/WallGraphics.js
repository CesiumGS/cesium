import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import DeveloperError from '../Core/DeveloperError.js';
import Event from '../Core/Event.js';
import createMaterialPropertyDescriptor from './createMaterialPropertyDescriptor.js';
import createPropertyDescriptor from './createPropertyDescriptor.js';

    /**
     * Describes a two dimensional wall defined as a line strip and optional maximum and minimum heights.
     * The wall conforms to the curvature of the globe and can be placed along the surface or at altitude.
     *
     * @alias WallGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the wall.
     * @param {Property} [options.positions] A Property specifying the array of {@link Cartesian3} positions which define the top of the wall.
     * @param {Property} [options.minimumHeights] A Property specifying an array of heights to be used for the bottom of the wall instead of the globe surface.
     * @param {Property} [options.maximumHeights] A Property specifying an array of heights to be used for the top of the wall instead of the height of each position.
     * @param {Property} [options.granularity=Cesium.Math.RADIANS_PER_DEGREE] A numeric Property specifying the angular distance between each latitude and longitude point.
     * @param {Property} [options.fill=true] A boolean Property specifying whether the wall is filled with the provided material.
     * @param {MaterialProperty} [options.material=Color.WHITE] A Property specifying the material used to fill the wall.
     * @param {Property} [options.outline=false] A boolean Property specifying whether the wall is outlined.
     * @param {Property} [options.outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
     * @param {Property} [options.outlineWidth=1.0] A numeric Property specifying the width of the outline.
     * @param {Property} [options.shadows=ShadowMode.DISABLED] An enum Property specifying whether the wall casts or receives shadows from light sources.
     * @param {Property} [options.distanceDisplayCondition] A Property specifying at what distance from the camera that this wall will be displayed.
     *
     * @see Entity
     * @demo {@link https://sandcastle.cesium.com/index.html?src=Wall.html|Cesium Sandcastle Wall Demo}
     */
    function WallGraphics(options) {
        this._definitionChanged = new Event();
        this._show = undefined;
        this._showSubscription = undefined;
        this._positions = undefined;
        this._positionsSubscription = undefined;
        this._minimumHeights = undefined;
        this._minimumHeightsSubscription = undefined;
        this._maximumHeights = undefined;
        this._maximumHeightsSubscription = undefined;
        this._granularity = undefined;
        this._granularitySubscription = undefined;
        this._fill = undefined;
        this._fillSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
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

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    }

    Object.defineProperties(WallGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
         * @memberof WallGraphics.prototype
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
         * Gets or sets the boolean Property specifying the visibility of the wall.
         * @memberof WallGraphics.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the Property specifying the array of {@link Cartesian3} positions which define the top of the wall.
         * @memberof WallGraphics.prototype
         * @type {Property}
         */
        positions : createPropertyDescriptor('positions'),

        /**
         * Gets or sets the Property specifying an array of heights to be used for the bottom of the wall instead of the surface of the globe.
         * If defined, the array must be the same length as {@link Wall#positions}.
         * @memberof WallGraphics.prototype
         * @type {Property}
         */
        minimumHeights : createPropertyDescriptor('minimumHeights'),

        /**
         * Gets or sets the Property specifying an array of heights to be used for the top of the wall instead of the height of each position.
         * If defined, the array must be the same length as {@link Wall#positions}.
         * @memberof WallGraphics.prototype
         * @type {Property}
         */
        maximumHeights : createPropertyDescriptor('maximumHeights'),

        /**
         * Gets or sets the numeric Property specifying the angular distance between points on the wall.
         * @memberof WallGraphics.prototype
         * @type {Property}
         * @default {CesiumMath.RADIANS_PER_DEGREE}
         */
        granularity : createPropertyDescriptor('granularity'),

        /**
         * Gets or sets the boolean Property specifying whether the wall is filled with the provided material.
         * @memberof WallGraphics.prototype
         * @type {Property}
         * @default true
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Property specifying the material used to fill the wall.
         * @memberof WallGraphics.prototype
         * @type {MaterialProperty}
         * @default Color.WHITE
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the Property specifying whether the wall is outlined.
         * @memberof WallGraphics.prototype
         * @type {Property}
         * @default false
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Property specifying the {@link Color} of the outline.
         * @memberof WallGraphics.prototype
         * @type {Property}
         * @default Color.BLACK
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the numeric Property specifying the width of the outline.
         * @memberof WallGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Get or sets the enum Property specifying whether the wall
         * casts or receives shadows from light sources.
         * @memberof WallGraphics.prototype
         * @type {Property}
         * @default ShadowMode.DISABLED
         */
        shadows : createPropertyDescriptor('shadows'),

        /**
         * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this wall will be displayed.
         * @memberof WallGraphics.prototype
         * @type {Property}
         */
        distanceDisplayCondition : createPropertyDescriptor('distanceDisplayCondition')
    });

    /**
     * Duplicates this instance.
     *
     * @param {WallGraphics} [result] The object onto which to store the result.
     * @returns {WallGraphics} The modified result parameter or a new instance if one was not provided.
     */
    WallGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new WallGraphics(this);
        }
        result.show = this.show;
        result.positions = this.positions;
        result.minimumHeights = this.minimumHeights;
        result.maximumHeights = this.maximumHeights;
        result.granularity = this.granularity;
        result.fill = this.fill;
        result.material = this.material;
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
     * @param {WallGraphics} source The object to be merged into this object.
     */
    WallGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.positions = defaultValue(this.positions, source.positions);
        this.minimumHeights = defaultValue(this.minimumHeights, source.minimumHeights);
        this.maximumHeights = defaultValue(this.maximumHeights, source.maximumHeights);
        this.granularity = defaultValue(this.granularity, source.granularity);
        this.fill = defaultValue(this.fill, source.fill);
        this.material = defaultValue(this.material, source.material);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.shadows = defaultValue(this.shadows, source.shadows);
        this.distanceDisplayCondition = defaultValue(this.distanceDisplayCondition, source.distanceDisplayCondition);
    };
export default WallGraphics;
