/*global define*/
define(['../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createDynamicPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createDynamicPropertyDescriptor) {
    "use strict";

    /**
     * An optionally time-dynamic ellipsoid.
     *
     * @alias DynamicEllipsoid
     * @constructor
     */
    var DynamicEllipsoid = function() {
        this._show = undefined;
        this._radii = undefined;
        this._material = undefined;
        this._stackPartitions = undefined;
        this._slicePartitions = undefined;
        this._subdivisions = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(DynamicEllipsoid.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicEllipsoid.prototype
         * @type {Event}
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the ellipsoid.
         * @memberof DynamicEllipsoid.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show', '_show'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the radii of the ellipsoid.
         * @memberof DynamicEllipsoid.prototype
         * @type {Property}
         */
        radii : createDynamicPropertyDescriptor('radii', '_radii'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the ellipsoid.
         * @memberof DynamicEllipsoid.prototype
         * @type {MaterialProperty}
         */
        material : createDynamicPropertyDescriptor('material', '_material'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the ellipsoid should be filled.
         * @memberof DynamicEllipsoid.prototype
         * @type {Property}
         */
        fill : createDynamicPropertyDescriptor('fill', '_fill'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the ellipsoid should be outlined.
         * @memberof DynamicEllipsoid.prototype
         * @type {Property}
         */
        outline : createDynamicPropertyDescriptor('outline', '_outline'),

        /**
         * Gets or sets the Color {@link Property} specifying whether the color of the outline.
         * @memberof DynamicEllipsoid.prototype
         * @type {Property}
         */
        outlineColor : createDynamicPropertyDescriptor('outlineColor', '_outlineColor'),

        /**
         * Gets or sets the Number {@link Property} specifying the number of times to partition the ellipsoid into stacks.
         * @memberof DynamicEllipsoid.prototype
         * @type {Property}
         */
        stackPartitions : createDynamicPropertyDescriptor('stackPartitions', '_stackPartitions'),

        /**
         * Gets or sets the Number {@link Property} specifying the number of times to partition the ellipsoid into radial slices.
         * @memberof DynamicEllipsoid.prototype
         * @type {Property}
         */
        slicePartitions : createDynamicPropertyDescriptor('slicePartitions', '_slicePartitions'),

        /**
         * Gets or sets the Number {@link Property} specifying the number of points per line, determining the granularity of the curvature .
         * @memberof DynamicEllipsoid.prototype
         * @type {Property}
         */
        subdivisions : createDynamicPropertyDescriptor('subdivisions', '_subdivisions')
    });

    /**
     * Duplicates a DynamicEllipsoid instance.
     * @memberof DynamicEllipsoid
     *
     * @param {DynamicEllipsoid} [result] The object onto which to store the result.
     * @returns {DynamicEllipsoid} The modified result parameter or a new instance if one was not provided.
     */
    DynamicEllipsoid.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicEllipsoid();
        }
        result.show = this.show;
        result.radii = this.radii;
        result.material = this.material;
        result.fill = this.fill;
        result.outline = this.outline;
        result.outlineColor = this.outlineColor;
        result.stackPartitions = this.stackPartitions;
        result.slicePartitions = this.slicePartitions;
        result.subdivisions = this.subdivisions;

        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     * @memberof DynamicEllipsoid
     *
     * @param {DynamicEllipsoid} source The object to be merged into this object.
     */
    DynamicEllipsoid.prototype.merge = function(source) {
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
        this.stackPartitions = defaultValue(this.stackPartitions, source.stackPartitions);
        this.slicePartitions = defaultValue(this.slicePartitions, source.slicePartitions);
        this.subdivisions = defaultValue(this.subdivisions, source.subdivisions);
    };

    return DynamicEllipsoid;
});
