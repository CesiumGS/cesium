/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createPropertyDescriptor) {
    "use strict";

    /**
     * An optionally time-dynamic pyramid.
     *
     * @alias PyramidGraphics
     * @constructor
     */
    var PyramidGraphics = function() {
        this._directions = undefined;
        this._directionsSubscription = undefined;

        this._lateralSurfaceMaterial = undefined;
        this._lateralSurfaceMaterialSubscription = undefined;

        this._portionToDisplay = undefined;
        this._portionToDisplaySubscription = undefined;
        this._intersectionColor = undefined;
        this._intersectionColorSubscription = undefined;
        this._intersectionWidth = undefined;
        this._intersectionWidthSubscription = undefined;
        this._showIntersection = undefined;
        this._showIntersectionSubscription = undefined;
        this._radius = undefined;
        this._radiusSubscription = undefined;
        this._show = undefined;
        this._showSubscription = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(PyramidGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof PyramidGraphics.prototype
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
         * A {@link Property} which returns an array of {@link Spherical} instances representing the pyramid's projection.
         * @memberof PyramidGraphics.prototype
         * @type {Property}
         */
        directions : createPropertyDescriptor('directions'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the the pyramid's appearance.
         * @memberof PyramidGraphics.prototype
         * @type {MaterialProperty}
         */
        lateralSurfaceMaterial : createPropertyDescriptor('lateralSurfaceMaterial'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the color of the line formed by the intersection of the pyramid and other central bodies.
         * @memberof PyramidGraphics.prototype
         * @type {Property}
         */
        intersectionColor : createPropertyDescriptor('intersectionColor'),

        /**
         * Gets or sets the numeric {@link Property} specifying the width of the line formed by the intersection of the pyramid and other central bodies.
         * @memberof PyramidGraphics.prototype
         * @type {Property}
         */
        intersectionWidth : createPropertyDescriptor('intersectionWidth'),

        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the line formed by the intersection of the pyramid and other central bodies.
         * @memberof PyramidGraphics.prototype
         * @type {Property}
         */
        showIntersection : createPropertyDescriptor('showIntersection'),

        /**
         * Gets or sets the numeric {@link Property} specifying the radius of the pyramid's projection.
         * @memberof PyramidGraphics.prototype
         * @type {Property}
         */
        radius : createPropertyDescriptor('radius'),

        /**
         * Gets or sets the boolean {@link Property} specifying the visibility of the pyramid.
         * @memberof PyramidGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show')
    });

    /**
     * Duplicates a PyramidGraphics instance.
     *
     * @param {PyramidGraphics} [result] The object onto which to store the result.
     * @returns {PyramidGraphics} The modified result parameter or a new instance if one was not provided.
     */
    PyramidGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new PyramidGraphics();
        }
        result.directions = this.directions;
        result.radius = this.radius;
        result.show = this.show;
        result.showIntersection = this.showIntersection;
        result.intersectionColor = this.intersectionColor;
        result.intersectionWidth = this.intersectionWidth;
        result.lateralSurfaceMaterial = this.lateralSurfaceMaterial;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {PyramidGraphics} source The object to be merged into this object.
     */
    PyramidGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.directions = defaultValue(this.directions, source.directions);
        this.radius = defaultValue(this.radius, source.radius);
        this.show = defaultValue(this.show, source.show);
        this.showIntersection = defaultValue(this.showIntersection, source.showIntersection);
        this.intersectionColor = defaultValue(this.intersectionColor, source.intersectionColor);
        this.intersectionWidth = defaultValue(this.intersectionWidth, source.intersectionWidth);
        this.lateralSurfaceMaterial = defaultValue(this.lateralSurfaceMaterial, source.lateralSurfaceMaterial);
    };

    return PyramidGraphics;
});
