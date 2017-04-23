/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/JulianDate',
        './Property'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        JulianDate,
        Property) {
    'use strict';

    /**
     * A {@link Property} which evaluates to a {@link Cartesian3} vector
     * based on the velocity of the provided {@link PositionProperty}.
     *
     * @alias VelocityVectorProperty
     * @constructor
     *
     * @param {Property} [position] The position property used to compute the velocity.
     * @param {Boolean} [normalize=true] Whether to normalize the computed velocity vector.
     *
     * @example
     * //Create an entity with a billboard rotated to match its velocity.
     * var position = new Cesium.SampledProperty();
     * position.addSamples(...);
     * var entity = viewer.entities.add({
     *   position : position,
     *   billboard : {
     *     image : 'image.png',
     *     alignedAxis : new Cesium.VelocityVectorProperty(position, true) // alignedAxis must be a unit vector
     *   }
     * }));
     */
    function VelocityVectorProperty(position, normalize) {
        this._position = undefined;
        this._subscription = undefined;
        this._definitionChanged = new Event();
        this._normalize = defaultValue(normalize, true);

        this.position = position;
    }

    defineProperties(VelocityVectorProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.
         * @memberof VelocityVectorProperty.prototype
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
         * @memberof VelocityVectorProperty.prototype
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
         * Gets or sets the position property used to compute the velocity vector.
         * @memberof VelocityVectorProperty.prototype
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
         * Gets or sets whether the vector produced by this property
         * will be normalized or not.
         * @memberof VelocityVectorProperty.prototype
         *
         * @type {Boolean}
         */
        normalize : {
            get : function() {
                return this._normalize;
            },
            set : function(value) {
                if (this._normalize === value) {
                    return;
                }

                this._normalize = value;
                this._definitionChanged.raiseEvent(this);
            }
        }
    });

    var position1Scratch = new Cartesian3();
    var position2Scratch = new Cartesian3();
    var timeScratch = new JulianDate();
    var step = 1.0 / 60.0;

    /**
     * Gets the value of the property at the provided time.
     *
     * @param {JulianDate} [time] The time for which to retrieve the value.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    VelocityVectorProperty.prototype.getValue = function(time, result) {
        return this._getValue(time, result);
    };

    /**
     * @private
     */
    VelocityVectorProperty.prototype._getValue = function(time, velocityResult, positionResult) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required');
        }
        //>>includeEnd('debug');

        if (!defined(velocityResult)) {
            velocityResult = new Cartesian3();
        }

        var property = this._position;
        if (Property.isConstant(property)) {
            return this._normalize ? undefined : Cartesian3.clone(Cartesian3.ZERO, velocityResult);
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
            return this._normalize ? undefined : Cartesian3.clone(Cartesian3.ZERO, velocityResult);
        }

        if (defined(positionResult)) {
            position1.clone(positionResult);
        }

        var velocity = Cartesian3.subtract(position2, position1, velocityResult);
        if (this._normalize) {
            return Cartesian3.normalize(velocity, velocityResult);
        } else {
            return Cartesian3.divideByScalar(velocity, step, velocityResult);
        }
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    VelocityVectorProperty.prototype.equals = function(other) {
        return this === other ||//
               (other instanceof VelocityVectorProperty &&
                Property.equals(this._position, other._position));
    };

    return VelocityVectorProperty;
});
