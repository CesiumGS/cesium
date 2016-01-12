/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/JulianDate',
        '../Core/Matrix3',
        '../Core/Quaternion',
        '../Core/Transforms',
        './Property'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Event,
        JulianDate,
        Matrix3,
        Quaternion,
        Transforms,
        Property) {
    "use strict";

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
        this._position = undefined;
        this._subscription = undefined;
        this._ellipsoid = undefined;
        this._definitionChanged = new Event();

        this.position = position;
        this.ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
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
                return Property.isConstant(this._position);
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
                return this._position;
            },
            set : function(value) {
                var oldValue = this._position;
                if (oldValue !== value) {
                    if (defined(oldValue)) {
                        this._subscription();
                    }

                    this._position = value;

                    if (defined(value)) {
                        this._subscription = value._definitionChanged.addEventListener(function() {
                            this._definitionChanged.raiseEvent(this);
                        }, this);
                    }

                    this._definitionChanged.raiseEvent(this);
                }
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

    var position1Scratch = new Cartesian3();
    var position2Scratch = new Cartesian3();
    var velocityScratch = new Cartesian3();
    var timeScratch = new JulianDate();
    var rotationScratch = new Matrix3();
    var step = 1.0 / 60.0;

    /**
     * Gets the value of the property at the provided time.
     *
     * @param {JulianDate} [time] The time for which to retrieve the value.
     * @param {Quaternion} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Quaternion} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    VelocityOrientationProperty.prototype.getValue = function(time, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required');
        }
        //>>includeEnd('debug');

        var property = this._position;
        if (Property.isConstant(property)) {
            return undefined;
        }

        var position1 = property.getValue(time, position1Scratch);
        var position2 = property.getValue(JulianDate.addSeconds(time, step, timeScratch), position2Scratch);

        //If we don't have a position for now, return undefined.
        if (!defined(position1)) {
            return undefined;
        }

        //If we don't have a position for now + step, see if we have a position for now - step.
        if (!defined(position2)) {
            position2 = position1;
            position1 = property.getValue(JulianDate.addSeconds(time, -step, timeScratch), position2Scratch);

            if (!defined(position1)) {
                return undefined;
            }
        }

        if (Cartesian3.equals(position1, position2)) {
            return undefined;
        }

        var velocity = Cartesian3.subtract(position2, position1, velocityScratch);
        Cartesian3.normalize(velocity, velocity);

        Transforms.rotationMatrixFromPositionVelocity(position1, velocity, this._ellipsoid, rotationScratch);
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
                Property.equals(this._position, other._position) &&
                (this._ellipsoid === other._ellipsoid ||
                 this._ellipsoid.equals(other._ellipsoid)));
    };

    return VelocityOrientationProperty;
});
