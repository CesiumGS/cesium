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
     * An optionally time-dynamic cone.
     *
     * @alias DynamicCone
     * @constructor
     */
    var DynamicCone = function() {
        this._minimumClockAngle = undefined;
        this._maximumClockAngle = undefined;
        this._innerHalfAngle = undefined;
        this._outerHalfAngle = undefined;
        this._capMaterial = undefined;
        this._innerMaterial = undefined;
        this._outerMaterial = undefined;
        this._silhouetteMaterial = undefined;
        this._intersectionColor = undefined;
        this._intersectionWidth = undefined;
        this._showIntersection = undefined;
        this._radius = undefined;
        this._show = undefined;
        this._propertyChanged = new Event();
    };

    defineProperties(DynamicCone.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicCone.prototype
         * @type {Event}
         */
        propertyChanged : {
            get : function() {
                return this._propertyChanged;
            }
        },

        /**
         * Gets or sets the numeric {@link Property} specifying the the cone's minimum clock angle.
         * @memberof DynamicCone.prototype
         * @type {Property}
         */
        minimumClockAngle : createDynamicPropertyDescriptor('minimumClockAngle', '_minimumClockAngle'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the cone's maximum clock angle.
         * @memberof DynamicCone.prototype
         * @type {Property}
         */
        maximumClockAngle : createDynamicPropertyDescriptor('maximumClockAngle', '_maximumClockAngle'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the cone's inner half-angle.
         * @memberof DynamicCone.prototype
         * @type {Property}
         */
        innerHalfAngle : createDynamicPropertyDescriptor('innerHalfAngle', '_innerHalfAngle'),

        /**
         * Gets or sets the numeric {@link Property} specifying the the cone's outer half-angle.
         * @memberof DynamicCone.prototype
         * @type {Property}
         */
        outerHalfAngle : createDynamicPropertyDescriptor('outerHalfAngle', '_outerHalfAngle'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the the cone's cap material.
         * @memberof DynamicCone.prototype
         * @type {MaterialProperty}
         */
        capMaterial : createDynamicPropertyDescriptor('capMaterial', '_capMaterial'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the the cone's inner material.
         * @memberof DynamicCone.prototype
         * @type {MaterialProperty}
         */
        innerMaterial : createDynamicPropertyDescriptor('innerMaterial', '_innerMaterial'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the the cone's outer material.
         * @memberof DynamicCone.prototype
         * @type {MaterialProperty}
         */
        outerMaterial : createDynamicPropertyDescriptor('outerMaterial', '_outerMaterial'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the the cone's silhouette material.
         * @memberof DynamicCone.prototype
         * @type {MaterialProperty}
         */
        silhouetteMaterial : createDynamicPropertyDescriptor('silhouetteMaterial', '_silhouetteMaterial'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the color of the line formed by the intersection of the cone and other central bodies.
         * @memberof DynamicCone.prototype
         * @type {Property}
         */
        intersectionColor : createDynamicPropertyDescriptor('intersectionColor', '_intersectionColor'),

        /**
         * Gets or sets the numeric {@link Property} specifying the width of the line formed by the intersection of the cone and other central bodies.
         * @memberof DynamicCone.prototype
         * @type {Property}
         */
        intersectionWidth : createDynamicPropertyDescriptor('intersectionWidth', '_intersectionWidth'),

        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the line formed by the intersection of the cone and other central bodies.
         * @memberof DynamicCone.prototype
         * @type {Property}
         */
        showIntersection : createDynamicPropertyDescriptor('showIntersection', '_showIntersection'),

        /**
         * Gets or sets the numeric {@link Property} specifying the radius of the cone's projection.
         * @memberof DynamicCone.prototype
         * @type {Property}
         */
        radius : createDynamicPropertyDescriptor('radius', '_radius'),

        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the cone.
         * @memberof DynamicCone.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show', '_show')
    });

    /**
     * Duplicates a DynamicCone instance.
     * @memberof DynamicCone
     *
     * @param {DynamicCone} [result] The object onto which to store the result.
     * @returns {DynamicCone} The modified result parameter or a new instance if one was not provided.
     */
    DynamicCone.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicCone();
        }
        result.show = this.show;
        result.innerHalfAngle = this.innerHalfAngle;
        result.outerHalfAngle = this.outerHalfAngle;
        result.minimumClockAngle = this.minimumClockAngle;
        result.maximumClockAngle = this.maximumClockAngle;
        result.radius = this.radius;
        result.showIntersection = this.showIntersection;
        result.intersectionColor = this.intersectionColor;
        result.intersectionWidth = this.intersectionWidth;
        result.capMaterial = this.capMaterial;
        result.innerMaterial = this.innerMaterial;
        result.outerMaterial = this.outerMaterial;
        result.silhouetteMaterial = this.silhouetteMaterial;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     * @memberof DynamicCone
     *
     * @param {DynamicCone} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicCone.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

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
