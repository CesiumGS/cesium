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
     * An optionally time-dynamic pyramid.
     *
     * @alias DynamicPyramid
     * @constructor
     */
    var DynamicPyramid = function() {
        this._show = undefined;
        this._directions = undefined;
        this._radius = undefined;
        this._showIntersection = undefined;
        this._intersectionColor = undefined;
        this._intersectionWidth = undefined;
        this._material = undefined;
        this._propertyChanged = new Event();
    };

    defineProperties(DynamicPyramid.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicPyramid.prototype
         * @type {Event}
         */
        propertyChanged : {
            get : function() {
                return this._propertyChanged;
            }
        },

        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the pyramid.
         * @memberof DynamicPyramid.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show', '_show'),

        /**
         * A {@link Property} which returns an array of {@link Spherical} instances representing the pyramid's projection.
         * @memberof DynamicPyramid.prototype
         * @type {Property}
         */
        directions : createDynamicPropertyDescriptor('directions', '_directions'),

        /**
         * Gets or sets the numeric {@link Property} specifying the radius of the pyramid's projection.
         * @memberof DynamicPyramid.prototype
         * @type {Property}
         */
        radius : createDynamicPropertyDescriptor('radius', '_radius'),

        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the line formed by the intersection of the pyramid and other central bodies.
         * @memberof DynamicPyramid.prototype
         * @type {Property}
         */
        showIntersection : createDynamicPropertyDescriptor('showIntersection', '_showIntersection'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the color of the line formed by the intersection of the pyramid and other central bodies.
         * @memberof DynamicPyramid.prototype
         * @type {Property}
         */
        intersectionColor : createDynamicPropertyDescriptor('intersectionColor', '_intersectionColor'),

        /**
         * Gets or sets the numeric {@link Property} specifying the width of the line formed by the intersection of the pyramid and other central bodies.
         * @memberof DynamicPyramid.prototype
         * @type {Property}
         */
        intersectionWidth : createDynamicPropertyDescriptor('intersectionWidth', '_intersectionWidth'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the the pyramid's appearance.
         * @memberof DynamicPyramid.prototype
         * @type {MaterialProperty}
         */
        material : createDynamicPropertyDescriptor('material', '_material')
    });

    /**
     * Duplicates a DynamicPyramid instance.
     * @memberof DynamicPyramid
     *
     * @param {DynamicPyramid} [result] The object onto which to store the result.
     * @returns {DynamicPyramid} The modified result parameter or a new instance if one was not provided.
     */
    DynamicPyramid.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicPyramid();
        }
        result.show = this.show;
        result.directions = this.directions;
        result.radius = this.radius;
        result.showIntersection = this.showIntersection;
        result.intersectionColor = this.intersectionColor;
        result.intersectionWidth = this.intersectionWidth;
        result.material = this.material;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     * @memberof DynamicPyramid
     *
     * @param {DynamicPyramid} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicPyramid.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

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
