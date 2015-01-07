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
     * An optionally time-dynamic ellipsoid.
     *
     * @alias EllipsoidGraphics
     * @constructor
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
         * Gets the event that is raised whenever a new property is assigned.
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
         * Gets or sets the boolean {@link Property} specifying the visibility of the ellipsoid.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the radii of the ellipsoid.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         */
        radii : createPropertyDescriptor('radii'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the ellipsoid.
         * @memberof EllipsoidGraphics.prototype
         * @type {MaterialProperty}
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the ellipsoid should be filled.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the ellipsoid should be outlined.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Color {@link Property} specifying whether the color of the outline.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the Number {@link Property} specifying the width of the outline.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the Number {@link Property} specifying the number of times to partition the ellipsoid into stacks.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         */
        stackPartitions : createPropertyDescriptor('stackPartitions'),

        /**
         * Gets or sets the Number {@link Property} specifying the number of times to partition the ellipsoid into radial slices.
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         */
        slicePartitions : createPropertyDescriptor('slicePartitions'),

        /**
         * Gets or sets the Number {@link Property} specifying the number of points per line, determining the granularity of the curvature .
         * @memberof EllipsoidGraphics.prototype
         * @type {Property}
         */
        subdivisions : createPropertyDescriptor('subdivisions')
    });

    /**
     * Duplicates a EllipsoidGraphics instance.
     *
     * @param {EllipsoidGraphics} [result] The object onto which to store the result.
     * @returns {EllipsoidGraphics} The modified result parameter or a new instance if one was not provided.
     */
    EllipsoidGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new EllipsoidGraphics();
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
