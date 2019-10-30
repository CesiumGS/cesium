import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import DeveloperError from '../Core/DeveloperError.js';
import Event from '../Core/Event.js';
import createMaterialPropertyDescriptor from './createMaterialPropertyDescriptor.js';
import createPropertyDescriptor from './createPropertyDescriptor.js';

    /**
     * Describes a polyline defined as the path made by an {@link Entity} as it moves over time.
     *
     * @alias PathGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the path.
     * @param {Property} [options.leadTime] A Property specifying the number of seconds in front the object to show.
     * @param {Property} [options.trailTime] A Property specifying the number of seconds behind of the object to show.
     * @param {Property} [options.width=1.0] A numeric Property specifying the width in pixels.
     * @param {Property} [options.resolution=60] A numeric Property specifying the maximum number of seconds to step when sampling the position.
     * @param {MaterialProperty} [options.material=Color.WHITE] A Property specifying the material used to draw the path.
     * @param {Property} [options.distanceDisplayCondition] A Property specifying at what distance from the camera that this path will be displayed.
     */
    function PathGraphics(options) {
        this._definitionChanged = new Event();
        this._show = undefined;
        this._showSubscription = undefined;
        this._leadTime = undefined;
        this._leadTimeSubscription = undefined;
        this._trailTime = undefined;
        this._trailTimeSubscription = undefined;
        this._width = undefined;
        this._widthSubscription = undefined;
        this._resolution = undefined;
        this._resolutionSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._distanceDisplayCondition = undefined;
        this._distanceDisplayConditionSubscription = undefined;

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    }

    defineProperties(PathGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
         * @memberof PathGraphics.prototype
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the boolean Property specifying the visibility of the path.
         * @memberof PathGraphics.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the Property specifying the number of seconds in front of the object to show.
         * @memberof PathGraphics.prototype
         * @type {Property}
         */
        leadTime : createPropertyDescriptor('leadTime'),

        /**
         * Gets or sets the Property specifying the number of seconds behind the object to show.
         * @memberof PathGraphics.prototype
         * @type {Property}
         */
        trailTime : createPropertyDescriptor('trailTime'),

        /**
         * Gets or sets the numeric Property specifying the width in pixels.
         * @memberof PathGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        width : createPropertyDescriptor('width'),

        /**
         * Gets or sets the Property specifying the maximum number of seconds to step when sampling the position.
         * @memberof PathGraphics.prototype
         * @type {Property}
         * @default 60
         */
        resolution : createPropertyDescriptor('resolution'),

        /**
         * Gets or sets the Property specifying the material used to draw the path.
         * @memberof PathGraphics.prototype
         * @type {MaterialProperty}
         * @default Color.WHITE
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this path will be displayed.
         * @memberof PathGraphics.prototype
         * @type {Property}
         */
        distanceDisplayCondition : createPropertyDescriptor('distanceDisplayCondition')
    });

    /**
     * Duplicates this instance.
     *
     * @param {PathGraphics} [result] The object onto which to store the result.
     * @returns {PathGraphics} The modified result parameter or a new instance if one was not provided.
     */
    PathGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new PathGraphics(this);
        }
        result.show = this.show;
        result.leadTime = this.leadTime;
        result.trailTime = this.trailTime;
        result.width = this.width;
        result.resolution = this.resolution;
        result.material = this.material;
        result.distanceDisplayCondition = this.distanceDisplayCondition;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {PathGraphics} source The object to be merged into this object.
     */
    PathGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.leadTime = defaultValue(this.leadTime, source.leadTime);
        this.trailTime = defaultValue(this.trailTime, source.trailTime);
        this.width = defaultValue(this.width, source.width);
        this.resolution = defaultValue(this.resolution, source.resolution);
        this.material = defaultValue(this.material, source.material);
        this.distanceDisplayCondition = defaultValue(this.distanceDisplayCondition, source.distanceDisplayCondition);
    };
export default PathGraphics;
