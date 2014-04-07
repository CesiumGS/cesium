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
     * An optionally time-dynamic fan.
     *
     * @alias DynamicFan
     * @constructor
     */
    var DynamicFan = function() {
        this._show = undefined;
        this._showSubscription = undefined;
        this._radius = undefined;
        this._radiusSubscription = undefined;
        this._perDirectionRadius = undefined;
        this._perDirectionRadiusSubscription = undefined;
        this._directions = undefined;
        this._directionsSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._fill = undefined;
        this._fillSubscription = undefined;
        this._outline = undefined;
        this._outlineSubscription = undefined;
        this._outlineColor = undefined;
        this._outlineColorSubscription = undefined;
        this._numberOfRings = undefined;
        this._numberOfRingsSubscription = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(DynamicFan.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicFan.prototype
         * @type {Event}
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the boolean Property specifying the fan's visibility.
         * @memberof DynamicFan.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show'),

        /**
         * Gets or sets the numeric Property specifying the radius of the fan.
         * @memberof DynamicFan.prototype
         * @type {Property}
         */
        radius : createDynamicPropertyDescriptor('radius'),

        /**
         * Gets or sets the boolean Property specifying whether or not to use the magnitude of each direction instead of a constant radius.
         * @memberof DynamicFan.prototype
         * @type {Property}
         */
        perDirectionRadius : createDynamicPropertyDescriptor('perDirectionRadius'),

        /**
         * Gets or sets the {@link Spherical} Property specifying the directions that define the fan.
         * @memberof DynamicFan.prototype
         * @type {Property}
         */
        directions : createDynamicPropertyDescriptor('directions'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the fan.
         * @memberof DynamicFan.prototype
         * @type {MaterialProperty}
         */
        material : createDynamicPropertyDescriptor('material'),

        /**
         * Gets or sets the Boolean Property specifying whether the fan should be filled.
         * @memberof DynamicFan.prototype
         * @type {Property}
         */
        fill : createDynamicPropertyDescriptor('fill'),

        /**
         * Gets or sets the Boolean Property specifying whether the fan should be outlined.
         * @memberof DynamicFan.prototype
         * @type {Property}
         */
        outline : createDynamicPropertyDescriptor('outline'),

        /**
         * Gets or sets the Color Property specifying whether the color of the outline.
         * @memberof DynamicFan.prototype
         * @type {Property}
         */
        outlineColor : createDynamicPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the numberic Property specifying the number of outline rings to draw for the outline, starting from the outer edge and equidistantly spaced towards the center.
         * @memberof DynamicFan.prototype
         * @type {Property}
         */
        numberOfRings : createDynamicPropertyDescriptor('numberOfRings')
    });

    /**
     * Duplicates a DynamicFan instance.
     * @memberof DynamicFan
     *
     * @param {DynamicFan} [result] The object onto which to store the result.
     * @returns {DynamicFan} The modified result parameter or a new instance if one was not provided.
     */
    DynamicFan.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicFan();
        }
        result.show = this.show;
        result.radius = this.radius;
        result.perDirectionRadius = this.perDirectionRadius;
        result.directions = this.directions;
        result.material = this.material;
        result.fill = this.fill;
        result.outline = this.outline;
        result.outlineColor = this.outlineColor;
        result.numberOfRings = this.numberOfRings;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     * @memberof DynamicFan
     *
     * @param {DynamicFan} source The object to be merged into this object.
     */
    DynamicFan.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.radius = defaultValue(this.radius, source.radius);
        this.perDirectionRadius = defaultValue(this.perDirectionRadius, source.perDirectionRadius);
        this.directions = defaultValue(this.directions, source.directions);
        this.material = defaultValue(this.material, source.material);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.numberOfRings = defaultValue(this.numberOfRings, source.numberOfRings);
    };

    return DynamicFan;
});
