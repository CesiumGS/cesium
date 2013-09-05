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
     * An optionally time-dynamic cone.
     *
     * @alias DynamicCone
     * @constructor
     */
    var DynamicCone = function() {
        /**
         * Gets or sets the numeric {@link Property} specifying the the cone's minimum clock angle.
         * @type {Property}
         */
        this.minimumClockAngle = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the cone's maximum clock angle.
         * @type {Property}
         */
        this.maximumClockAngle = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the cone's inner half-angle.
         * @type {Property}
         */
        this.innerHalfAngle = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the cone's outer half-angle.
         * @type {Property}
         */
        this.outerHalfAngle = undefined;
        /**
         * Gets or sets the {@link MaterialProperty} specifying the the cone's cap material.
         * @type {MaterialProperty}
         */
        this.capMaterial = undefined;
        /**
         * Gets or sets the {@link MaterialProperty} specifying the the cone's inner material.
         * @type {MaterialProperty}
         */
        this.innerMaterial = undefined;
        /**
         * Gets or sets the {@link MaterialProperty} specifying the the cone's outer material.
         * @type {MaterialProperty}
         */
        this.outerMaterial = undefined;
        /**
         * Gets or sets the {@link MaterialProperty} specifying the the cone's silhouette material.
         * @type {MaterialProperty}
         */
        this.silhouetteMaterial = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the color of the line formed by the intersection of the cone and other central bodies.
         * @type {Property}
         */
        this.intersectionColor = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the width of the line formed by the intersection of the cone and other central bodies.
         * @type {Property}
         */
        this.intersectionWidth = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the line formed by the intersection of the cone and other central bodies.
         * @type {Property}
         */
        this.showIntersection = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the radius of the cone's projection.
         * @type {Property}
         */
        this.radius = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the cone.
         * @type {Property}
         */
        this.show = undefined;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicCone} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicCone.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        this.show = defaultValue(this.show, source.show);
        this.innerHalfAngle = defaultValue(this.innerHalfAngle, source.innerHalfAngle);
        this.outerHalfAngle = defaultValue(this.outerHalfAngle, source.outerHalfAngle);
        this.minimumClockAngle = defaultValue(this.minimumClockAngle, source.minimumClockAngle);
        this.maximumClockAngle = defaultValue(this.maximumClockAngle, source.maximumClockAngle);
        this.radius = defaultValue(this.radius, source.radius);
        this.showIntersection = defaultValue(this.showIntersection, source.showIntersection);
        this.intersectionColor = defaultValue(this.intersectionColor, source.intersectionColor);
        this.intersectionWidth = defaultValue(this.intersectionWidth, source.intersectionWidth);
        this.capMaterial = defaultValue(this.capMaterial, source.capMaterial);
        this.innerMaterial = defaultValue(this.innerMaterial, source.innerMaterial);
        this.outerMaterial = defaultValue(this.outerMaterial, source.outerMaterial);
        this.silhouetteMaterial = defaultValue(this.silhouetteMaterial, source.silhouetteMaterial);
    };

    return DynamicCone;
});
