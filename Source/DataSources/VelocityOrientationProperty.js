/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/Matrix3',
        '../Core/Quaternion',
        '../Core/Transforms',
        './Property',
        './VelocityVectorProperty'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        Ellipsoid,
        Event,
        Matrix3,
        Quaternion,
        Transforms,
        Property,
        VelocityVectorProperty) {
    'use strict';

    /**
     * A {@link Property} which evaluates to a {@link Quaternion} rotation
     * based on the velocity of the provided {@link PositionProperty}.
     *
     * @alias VelocityOrientationProperty
     * @constructor
     *
     * @param {Property} [position] The position property used to compute the orientation.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid used to determine which way is up.
     *
     * @example
     * //Create an entity with position and orientation.
     * var position = new Cesium.SampledProperty();
     * position.addSamples(...);
     * var entity = viewer.entities.add({
     *   position : position,
     *   orientation : new Cesium.VelocityOrientationProperty(position)
     * }));
     */
    function VelocityOrientationProperty(position, ellipsoid) {
        this._velocityVectorProperty = new VelocityVectorProperty(position, true);
        this._subscription = undefined;
        this._ellipsoid = undefined;
        this._definitionChanged = new Event();

        this.ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        var that = this;
        this._velocityVectorProperty.definitionChanged.addEventListener(function() {
            that._definitionChanged.raiseEvent(that);
        });
    }

    defineProperties(VelocityOrientationProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.
         * @memberof VelocityOrientationProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._velocityVectorProperty);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * @memberof VelocityOrientationProperty.prototype
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
         * Gets or sets the position property used to compute orientation.
         * @memberof VelocityOrientationProperty.prototype
         *
         * @type {Property}
         */
        position : {
            get : function() {
                return this._velocityVectorProperty.position;
            },
            set : function(value) {
                this._velocityVectorProperty.position = value;
            }
        },
        /**
         * Gets or sets the ellipsoid used to determine which way is up.
         * @memberof VelocityOrientationProperty.prototype
         *
         * @type {Property}
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            },
            set : function(value) {
                var oldValue = this._ellipsoid;
                if (oldValue !== value) {
                    this._ellipsoid = value;
                    this._definitionChanged.raiseEvent(this);
                }
            }
        }
    });

    var positionScratch = new Cartesian3();
    var velocityScratch = new Cartesian3();
    var rotationScratch = new Matrix3();

    /**
     * Gets the value of the property at the provided time.
     *
     * @param {JulianDate} [time] The time for which to retrieve the value.
     * @param {Quaternion} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Quaternion} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    VelocityOrientationProperty.prototype.getValue = function(time, result) {
        var velocity = this._velocityVectorProperty._getValue(time, velocityScratch, positionScratch);

        if (!defined(velocity)) {
            return undefined;
        }

        Transforms.rotationMatrixFromPositionVelocity(positionScratch, velocity, this._ellipsoid, rotationScratch);
        return Quaternion.fromRotationMatrix(rotationScratch, result);
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    VelocityOrientationProperty.prototype.equals = function(other) {
        return this === other ||//
               (other instanceof VelocityOrientationProperty &&
                Property.equals(this._velocityVectorProperty, other._velocityVectorProperty) &&
                (this._ellipsoid === other._ellipsoid ||
                 this._ellipsoid.equals(other._ellipsoid)));
    };

    return VelocityOrientationProperty;
});
