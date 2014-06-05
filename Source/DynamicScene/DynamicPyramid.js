/*global define*/
define([
        '../Core/defaultValue',
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
        this._showSubscription = undefined;
        this._directions = undefined;
        this._directionsSubscription = undefined;
        this._radius = undefined;
        this._radiusSubscription = undefined;
        this._showIntersection = undefined;
        this._showIntersectionSubscription = undefined;
        this._intersectionColor = undefined;
        this._intersectionColorSubscription = undefined;
        this._intersectionWidth = undefined;
        this._intersectionWidthSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(DynamicPyramid.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicPyramid.prototype
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
         * Gets or sets the boolean {@link Property} specifying the visibility of the pyramid.
         * @memberof DynamicPyramid.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show'),

        /**
         * A {@link Property} which returns an array of {@link Spherical} instances representing the pyramid's projection.
         * @memberof DynamicPyramid.prototype
         * @type {Property}
         */
        directions : createDynamicPropertyDescriptor('directions'),

        /**
         * Gets or sets the numeric {@link Property} specifying the radius of the pyramid's projection.
         * @memberof DynamicPyramid.prototype
         * @type {Property}
         */
        radius : createDynamicPropertyDescriptor('radius'),

        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the line formed by the intersection of the pyramid and other central bodies.
         * @memberof DynamicPyramid.prototype
         * @type {Property}
         */
        showIntersection : createDynamicPropertyDescriptor('showIntersection'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the color of the line formed by the intersection of the pyramid and other central bodies.
         * @memberof DynamicPyramid.prototype
         * @type {Property}
         */
        intersectionColor : createDynamicPropertyDescriptor('intersectionColor'),

        /**
         * Gets or sets the numeric {@link Property} specifying the width of the line formed by the intersection of the pyramid and other central bodies.
         * @memberof DynamicPyramid.prototype
         * @type {Property}
         */
        intersectionWidth : createDynamicPropertyDescriptor('intersectionWidth'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the the pyramid's appearance.
         * @memberof DynamicPyramid.prototype
         * @type {MaterialProperty}
         */
        material : createDynamicPropertyDescriptor('material')
    });

    /**
     * Duplicates a DynamicPyramid instance.
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
     *
     * @param {DynamicPyramid} source The object to be merged into this object.
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
