import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import DeveloperError from '../Core/DeveloperError.js';
import Event from '../Core/Event.js';
import createMaterialPropertyDescriptor from './createMaterialPropertyDescriptor.js';
import createPropertyDescriptor from './createPropertyDescriptor.js';

    /**
     * Describe an ellipsoid or sphere.  The center position and orientation are determined by the containing {@link Entity}.
     *
     * @alias EllipsoidGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the ellipsoid.
     * @param {Property} [options.radii] A {@link Cartesian3} Property specifying the radii of the ellipsoid.
     * @param {Property} [options.innerRadii] A {@link Cartesian3} Property specifying the inner radii of the ellipsoid.
     * @param {Property} [options.minimumClock=0.0] A Property specifying the minimum clock angle of the ellipsoid.
     * @param {Property} [options.maximumClock=2*PI] A Property specifying the maximum clock angle of the ellipsoid.
     * @param {Property} [options.minimumCone=0.0] A Property specifying the minimum cone angle of the ellipsoid.
     * @param {Property} [options.maximumCone=PI] A Property specifying the maximum cone angle of the ellipsoid.
     * @param {Property} [options.heightReference=HeightReference.NONE] A Property specifying what the height from the entity position is relative to.
     * @param {Property} [options.fill=true] A boolean Property specifying whether the ellipsoid is filled with the provided material.
     * @param {MaterialProperty} [options.material=Color.WHITE] A Property specifying the material used to fill the ellipsoid.
     * @param {Property} [options.outline=false] A boolean Property specifying whether the ellipsoid is outlined.
     * @param {Property} [options.outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
     * @param {Property} [options.outlineWidth=1.0] A numeric Property specifying the width of the outline.
     * @param {Property} [options.stackPartitions=64] A Property specifying the number of stacks.
     * @param {Property} [options.slicePartitions=64] A Property specifying the number of radial slices.
     * @param {Property} [options.subdivisions=128] A Property specifying the number of samples per outline ring, determining the granularity of the curvature.
     * @param {Property} [options.shadows=ShadowMode.DISABLED] An enum Property specifying whether the ellipsoid casts or receives shadows from each light source.
     * @param {Property} [options.distanceDisplayCondition] A Property specifying at what distance from the camera that this ellipsoid will be displayed.
     *
     * @demo {@link https://sandcastle.cesium.com/index.html?src=Spheres%20and%20Ellipsoids.html|Cesium Sandcastle Spheres and Ellipsoids Demo}
     */
    function EllipsoidGraphics(options) {
        this._definitionChanged = new Event();
        this._show = undefined;
        this._showSubscription = undefined;
        this._radii = undefined;
        this._radiiSubscription = undefined;
        this._innerRadii = undefined;
        this._innerRadiiSubscription = undefined;
        this._minimumClock = undefined;
        this._minimumClockSubscription = undefined;
        this._maximumClock = undefined;
        this._maximumClockSubscription = undefined;
        this._minimumCone = undefined;
        this._minimumConeSubscription = undefined;
        this._maximumCone = undefined;
        this._maximumConeSubscription = undefined;
        this._heightReference = undefined;
        this._heightReferenceSubscription = undefined;
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
        this._stackPartitions = undefined;
        this._stackPartitionsSubscription = undefined;
        this._slicePartitions = undefined;
        this._slicePartitionsSubscription = undefined;
        this._subdivisions = undefined;
        this._subdivisionsSubscription = undefined;
        this._shadows = undefined;
        this._shadowsSubscription = undefined;
        this._distanceDisplayCondition = undefined;
        this._distanceDisplayConditionSubscription = undefined;

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    }

    defineProperties(EllipsoidGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
         * @memberof EllipsoidGraphics.prototype
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
         * Gets or sets the boolean Property specifying the visibility of the ellipsoid.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the radii of the ellipsoid.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         */
        radii : createPropertyDescriptor('radii'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the inner radii of the ellipsoid.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default radii
         */
        innerRadii : createPropertyDescriptor('innerRadii'),

        /**
         * Gets or sets the Property specifying the minimum clock angle of the ellipsoid.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default 0.0
         */
        minimumClock : createPropertyDescriptor('minimumClock'),

        /**
         * Gets or sets the Property specifying the maximum clock angle of the ellipsoid.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default 2*PI
         */
        maximumClock : createPropertyDescriptor('maximumClock'),

        /**
         * Gets or sets the Property specifying the minimum cone angle of the ellipsoid.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default 0.0
         */
        minimumCone : createPropertyDescriptor('minimumCone'),

        /**
         * Gets or sets the Property specifying the maximum cone angle of the ellipsoid.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default PI
         */
        maximumCone : createPropertyDescriptor('maximumCone'),

        /**
         * Gets or sets the Property specifying the {@link HeightReference}.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default HeightReference.NONE
         */
        heightReference : createPropertyDescriptor('heightReference'),

        /**
         * Gets or sets the boolean Property specifying whether the ellipsoid is filled with the provided material.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default true
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Property specifying the material used to fill the ellipsoid.
         * @memberof EllipsoidGraphics.prototype
         * @type {MaterialProperty}
         * @default Color.WHITE
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the Property specifying whether the ellipsoid is outlined.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default false
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Property specifying the {@link Color} of the outline.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default Color.BLACK
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the numeric Property specifying the width of the outline.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the Property specifying the number of stacks.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default 64
         */
        stackPartitions : createPropertyDescriptor('stackPartitions'),

        /**
         * Gets or sets the Property specifying the number of radial slices per 360 degrees.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default 64
         */
        slicePartitions : createPropertyDescriptor('slicePartitions'),

        /**
         * Gets or sets the Property specifying the number of samples per outline ring, determining the granularity of the curvature.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default 128
         */
        subdivisions : createPropertyDescriptor('subdivisions'),

        /**
         * Get or sets the enum Property specifying whether the ellipsoid
         * casts or receives shadows from each light source.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default ShadowMode.DISABLED
         */
        shadows : createPropertyDescriptor('shadows'),

        /**
         * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this ellipsoid will be displayed.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         */
        distanceDisplayCondition : createPropertyDescriptor('distanceDisplayCondition')
    });

    /**
     * Duplicates this instance.
     *
     * @param {EllipsoidGraphics} [result] The object onto which to store the result.
     * @returns {EllipsoidGraphics} The modified result parameter or a new instance if one was not provided.
     */
    EllipsoidGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new EllipsoidGraphics(this);
        }
        result.show = this.show;
        result.radii = this.radii;
        result.innerRadii = this.innerRadii;
        result.minimumClock = this.minimumClock;
        result.maximumClock = this.maximumClock;
        result.minimumCone = this.minimumCone;
        result.maximumCone = this.maximumCone;
        result.heightReference = this.heightReference;
        result.fill = this.fill;
        result.material = this.material;
        result.outline = this.outline;
        result.outlineColor = this.outlineColor;
        result.outlineWidth = this.outlineWidth;
        result.stackPartitions = this.stackPartitions;
        result.slicePartitions = this.slicePartitions;
        result.subdivisions = this.subdivisions;
        result.shadows = this.shadows;
        result.distanceDisplayCondition = this.distanceDisplayCondition;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {EllipsoidGraphics} source The object to be merged into this object.
     */
    EllipsoidGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.radii = defaultValue(this.radii, source.radii);
        this.innerRadii = defaultValue(this.innerRadii, source.innerRadii);
        this.minimumClock = defaultValue(this.minimumClock, source.minimumClock);
        this.maximumClock = defaultValue(this.maximumClock, source.maximumClock);
        this.minimumCone = defaultValue(this.minimumCone, source.minimumCone);
        this.maximumCone = defaultValue(this.maximumCone, source.maximumCone);
        this.heightReference = defaultValue(this.heightReference, source.heightReference);
        this.fill = defaultValue(this.fill, source.fill);
        this.material = defaultValue(this.material, source.material);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.stackPartitions = defaultValue(this.stackPartitions, source.stackPartitions);
        this.slicePartitions = defaultValue(this.slicePartitions, source.slicePartitions);
        this.subdivisions = defaultValue(this.subdivisions, source.subdivisions);
        this.shadows = defaultValue(this.shadows, source.shadows);
        this.distanceDisplayCondition = defaultValue(this.distanceDisplayCondition, source.distanceDisplayCondition);
    };
export default EllipsoidGraphics;
