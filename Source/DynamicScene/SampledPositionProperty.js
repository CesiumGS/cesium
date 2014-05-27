/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/ReferenceFrame',
        './PositionProperty',
        './Property',
        './SampledProperty'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        ReferenceFrame,
        PositionProperty,
        Property,
        SampledProperty) {
    "use strict";

    var PositionVelocity = function(position, velocity) {
        this.position = position;
        this.velocity = velocity;
    };

    PositionVelocity.packedLength = Cartesian3.packedLength * 2;

    PositionVelocity.pack = function(value, array, startingIndex) {
        Cartesian3.pack(value.position, array, startingIndex);
        Cartesian3.pack(value.velocity, array, startingIndex + Cartesian3.packedLength);
    };

    PositionVelocity.unpack = function(array, startingIndex, result) {
        if (!defined(result)) {
            result = new PositionVelocity();
        }

        result.position = Cartesian3.unpack(array, startingIndex, result.position);
        result.velocity = Cartesian3.unpack(array, startingIndex + Cartesian3.packedLength, result.velocity);
        return result;
    };

    /**
     * A {@link SampledProperty} which is also a {@link PositionProperty}.
     *
     * @alias SampledPositionProperty
     * @constructor
     *
     * @param {ReferenceFrame} [referenceFrame=ReferenceFrame.FIXED] The reference frame in which the position is defined.
     * @param {Boolean} [hasVelocity=false] The reference frame in which the position is defined.
     */
    var SampledPositionProperty = function(referenceFrame, hasVelocity) {
        this._hasVelocity = defaultValue(hasVelocity, false);
        this._property = new SampledProperty(hasVelocity ? PositionVelocity : Cartesian3);
        if (this._hasVelocity){
            this._property._inputOrder = 1;
        }
        this._definitionChanged = new Event();
        this._referenceFrame = defaultValue(referenceFrame, ReferenceFrame.FIXED);

        this._property._definitionChanged.addEventListener(function() {
            this._definitionChanged.raiseEvent(this);
        }, this);
    };

    defineProperties(SampledPositionProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof SampledPositionProperty.prototype
         * @type {Boolean}
         */
        isConstant : {
            get : function() {
                return this._property.isConstant;
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof SampledPositionProperty.prototype
         * @type {Event}
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },
        /**
         * Gets the reference frame in which the position is defined.
         * @memberof SampledPositionProperty.prototype
         * @Type {ReferenceFrame}
         * @default ReferenceFrame.FIXED;
         */
        referenceFrame : {
            get : function() {
                return this._referenceFrame;
            }
        },
        /**
         * Gets the degree of interpolation to perform when retrieving a value.
         * @memberof SampledPositionProperty.prototype
         *
         * @type {Number}
         * @default 1
         */
        interpolationDegree : {
            get : function() {
                return this._property.interpolationDegree;
            }
        },
        /**
         * Gets the interpolation algorithm to use when retrieving a value.
         * @memberof SampledPositionProperty.prototype
         *
         * @type {InterpolationAlgorithm}
         * @default LinearApproximation
         */
        interpolationAlgorithm : {
            get : function() {
                return this._property.interpolationAlgorithm;
            }
        },
        /**
         * Gets whether or not this property contains velocity information.
         * @memberof SampledPositionProperty.prototype
         *
         * @type {Boolean}
         * @default false
         */
        hasVelocity : {
            get : function() {
                return this._hasVelocity;
            }
        }
    });

    /**
     * Gets the position at the provided time.
     * @memberof SampledPositionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    SampledPositionProperty.prototype.getValue = function(time, result) {
        return this.getValueInReferenceFrame(time, ReferenceFrame.FIXED, result);
    };

    /**
     * Gets the position at the provided time and in the provided reference frame.
     * @memberof SampledPositionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {ReferenceFrame} referenceFrame The desired referenceFrame of the result.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    SampledPositionProperty.prototype.getValueInReferenceFrame = function(time, referenceFrame, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        if (!defined(referenceFrame)) {
            throw new DeveloperError('referenceFrame is required.');
        }
        //>>includeEnd('debug');

        result = this._property.getValue(time, result);
        if (defined(result)) {
            if (this._hasVelocity) {
                return PositionProperty.convertToReferenceFrame(time, result.position, this._referenceFrame, referenceFrame, result.position);
            }
            return PositionProperty.convertToReferenceFrame(time, result, this._referenceFrame, referenceFrame, result);
        }
        return undefined;
    };

    /**
     * Sets the algorithm and degree to use when interpolating a position.
     * @memberof SampledPositionProperty
     *
     * @param {Object} options The options
     * @param {InterpolationAlgorithm} [options.interpolationAlgorithm] The new interpolation algorithm.  If undefined, the existing property will be unchanged.
     * @param {Number} [options.interpolationDegree] The new interpolation degree.  If undefined, the existing property will be unchanged.
     */
    SampledPositionProperty.prototype.setInterpolationOptions = function(options) {
        this._property.setInterpolationOptions(options);
    };

    /**
     * Adds a new sample
     * @memberof SampledPositionProperty
     *
     * @param {JulianDate} time The sample time.
     * @param {Cartesian3} position The position at the provided time.
     * @param {Cartesian3} [velocity] The velocity at the provided time. This value is required when an instance contains velocity information.
     */
    SampledPositionProperty.prototype.addSample = function(time, position, velocity) {
        if (this._hasVelocity) {
            if (!defined(velocity)) {
                throw new DeveloperError('velocity is required.');
            }
            this._property.addSample(time, new PositionVelocity(position, velocity));
        } else {
            this._property.addSample(time, position);
        }
    };

    /**
     * Adds multiple samples via parallel arrays.
     * @memberof SampledPositionProperty
     *
     * @param {JulianDate[]} times An array of JulianDate instances where each index is a sample time.
     * @param {Cartesian3[]} positions The array of Cartesian3 position instances, where each value corresponds to the provided times index.
     * @param {Cartesian3[]} [velocities] The array of Cartesian3 velocity instances, where each value corresponds to the provided times index. This value is required when an instance contains velocity information.
     *
     * @exception {DeveloperError} All arrays must be the same length.
     */
    SampledPositionProperty.prototype.addSamples = function(times, positions, velocities) {
        if (this._hasVelocity) {
            if (!defined(velocities)) {
                throw new DeveloperError('velocities is required.');
            }

            if (times.length !== positions.length || times.length !== velocities.length) {
                throw new DeveloperError('All arrays must be the same length.');
            }

            var values = [];
            for (var i = 0; i < positions.length; i++) {
                values.push(new PositionVelocity(positions[i], velocities[i]));
            }
            this._property.addSamples(times, values);
        } else {
            if (times.length !== positions.length) {
                throw new DeveloperError('All arrays must be the same length.');
            }

            this._property.addSamples(times, positions);
        }
    };

    /**
     * Adds samples as a single packed array where each new sample is represented as a date, followed by the packed representation of the corresponding value.
     * @memberof SampledPositionProperty
     *
     * @param {Number[]} packedSamples The array of packed samples.
     * @param {JulianDate} [epoch] If any of the dates in packedSamples are numbers, they are considered an offset from this epoch, in seconds.
     */
    SampledPositionProperty.prototype.addSamplesPackedArray = function(data, epoch) {
        this._property.addSamplesPackedArray(data, epoch);
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof SampledPositionProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    SampledPositionProperty.prototype.equals = function(other) {
        return this === other || //
               (Property.equals(this._property, other._property) && //
                this._referenceFrame === other._referenceFrame);
    };

    return SampledPositionProperty;
});