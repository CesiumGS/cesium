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
     * Describe an ellipsoid or sphere.  The center position and orientation are determined by the containing {@link Entity}.
     *
     * @alias EllipsoidGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.radii] A {@link Cartesian3} Property specifying the radii of the ellipsoid.
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the ellipsoid.
     * @param {Property} [options.fill=true] A boolean Property specifying whether the ellipsoid is filled with the provided material.
     * @param {MaterialProperty} [options.material=Color.WHITE] A Property specifying the material used to fill the ellipsoid.
     * @param {Property} [options.outline=false] A boolean Property specifying whether the ellipsoid is outlined.
     * @param {Property} [options.outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
     * @param {Property} [options.outlineWidth=1.0] A numeric Property specifying the width of the outline.
     * @param {Property} [options.subdivisions=128] A Property specifying the number of samples per outline ring, determining the granularity of the curvature.
     * @param {Property} [options.stackPartitions=64] A Property specifying the number of stacks.
     * @param {Property} [options.slicePartitions=64] A Property specifying the number of radial slices.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Spheres%20and%20Ellipsoids.html|Cesium Sandcastle Spheres and Ellipsoids Demo}
     */
    var EllipsoidGraphics = function(options) {
        this._show = undefined;
        this._showSubscription = undefined;
        this._radii = undefined;
        this._radiiSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._stackPartitions = undefined;
        this._stackPartitionsSubscription = undefined;
        this._slicePartitions = undefined;
        this._slicePartitionsSubscription = undefined;
        this._subdivisions = undefined;
        this._subdivisionsSubscription = undefined;
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
         * Gets or sets the Property specifying the material used to fill the ellipsoid.
         * @memberof EllipsoidGraphics.prototype
         * @type {MaterialProperty}
         * @default Color.WHITE
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the boolean Property specifying whether the ellipsoid is filled with the provided material.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         * @default true
         */
        fill : createPropertyDescriptor('fill'),

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
         * Gets or sets the Property specifying the number of radial slices.
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
        subdivisions : createPropertyDescriptor('subdivisions')
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
        result.material = this.material;
        result.fill = this.fill;
        result.outline = this.outline;
        result.outlineColor = this.outlineColor;
        result.outlineWidth = this.outlineWidth;
        result.stackPartitions = this.stackPartitions;
        result.slicePartitions = this.slicePartitions;
        result.subdivisions = this.subdivisions;

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
        this.material = defaultValue(this.material, source.material);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.stackPartitions = defaultValue(this.stackPartitions, source.stackPartitions);
        this.slicePartitions = defaultValue(this.slicePartitions, source.slicePartitions);
        this.subdivisions = defaultValue(this.subdivisions, source.subdivisions);
    };

    return EllipsoidGraphics;
});
