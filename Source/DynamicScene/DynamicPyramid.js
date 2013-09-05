/*global define*/
define(['../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event) {
    "use strict";

    /**
     * An optionally time-dynamic pyramid.
     *
     * @alias DynamicPyramid
     * @constructor
     */
    var DynamicPyramid = function() {
        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the pyramid.
         * @type {Property}
         */
        this.show = undefined;
        /**
         * A {@link Property} which returns an array of {@link Spherical} instances representing the pyramid's projection.
         * @type {Property}
         * @default undefined
         */
        this.directions = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the radius of the pyramid's projection.
         * @type {Property}
         */
        this.radius = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the line formed by the intersection of the pyramid and other central bodies.
         * @type {Property}
         */
        this.showIntersection = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the color of the line formed by the intersection of the pyramid and other central bodies.
         * @type {Property}
         */
        this.intersectionColor = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the width of the line formed by the intersection of the pyramid and other central bodies.
         * @type {Property}
         */
        this.intersectionWidth = undefined;
        /**
         * Gets or sets the {@link MaterialProperty} specifying the the pyramid's appearance.
         * @type {MaterialProperty}
         */
        this.material = undefined;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicPyramid} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicPyramid.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        this.show = defaultValue(this.show, source.show);
        this.directions = defaultValue(this.directions, source.directions);
        this.radius = defaultValue(this.radius, source.radius);
        this.showIntersection = defaultValue(this.showIntersection, source.showIntersection);
        this.intersectionColor = defaultValue(this.intersectionColor, source.intersectionColor);
        this.intersectionWidth = defaultValue(this.intersectionWidth, source.intersectionWidth);
        this.material = defaultValue(this.material, source.material);
    };

    return DynamicPyramid;
});
