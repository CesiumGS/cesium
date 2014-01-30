/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
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
        ReferenceFrame,
        PositionProperty,
        Property,
        SampledProperty) {
    "use strict";

    /**
     * A {@link SampledProperty} which is also a {@link PositionProperty}.
     *
     * @alias SampledPositionProperty
     * @constructor
     *
     * @param {ReferenceFrame} [referenceFrame=ReferenceFrame.FIXED] The reference frame in which the position is defined.
     */
    var SampledPositionProperty = function(referenceFrame) {
        this._property = new SampledProperty(Cartesian3);
        this._referenceFrame = defaultValue(referenceFrame, ReferenceFrame.FIXED);
    };

    defineProperties(SampledPositionProperty.prototype, {
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
         * Gets or sets the degree of interpolation to perform when retrieving a value.
         * @memberof SampledPositionProperty.prototype
         *
         * @type {Object}
         * @default 1
         */
        interpolationDegree : {
            get : function() {
                return this._property.interpolationDegree;
            },
            set : function(value) {
                this._property.interpolationDegree = value;
            }
        },
        /**
         * Gets or sets the interpolation algorithm to use when retrieving a value.
         * @memberof SampledPositionProperty.prototype
         *
         * @type {InterpolationAlgorithm}
         * @default LinearApproximation
         */
        interpolationAlgorithm : {
            get : function() {
                return this._property.interpolationAlgorithm;
            },
            set : function(value) {
                this._property.interpolationAlgorithm = value;
            }
        }
    });

    /**
     * Gets the value of the property at the provided time.
     * @memberof SampledPositionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     *
     * @exception {DeveloperError} time is required.
     */
    SampledPositionProperty.prototype.getValue = function(time, result) {
        return this.getValueInReferenceFrame(time, ReferenceFrame.FIXED, result);
    };

    /**
     * Gets the value of the property at the provided time and in the provided reference frame.
     * @memberof SampledPositionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {ReferenceFrame} referenceFrame The desired referenceFrame of the result.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     *
     * @exception {DeveloperError} time is required.
     * @exception {DeveloperError} referenceFrame is required.
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
            return PositionProperty.convertToReferenceFrame(time, result, this._referenceFrame, referenceFrame, result);
        }
        return result;
    };

    /**
     * Adds a new sample
     * @memberof SampledPositionProperty
     *
     * @param {JulianDate} time The sample time.
     * @param {Cartesian3} value The value at the provided time.
     *
     * @exception {DeveloperError} time is required.
     * @exception {DeveloperError} value is required.
     */
    SampledPositionProperty.prototype.addSample = function(time, value) {
        this._property.addSample(time, value);
    };

    /**
     * Adds an array of samples
     * @memberof SampledPositionProperty
     *
     * @param {Array} times An array of JulianDate instances where each index is a sample time.
     * @param {Array} values The array of Cartesian3 instances, where each value corresponds to the provided times index.
     *
     * @exception {DeveloperError} times is required.
     * @exception {DeveloperError} values is required.
     * @exception {DeveloperError} times and values must be the same length..
     */
    SampledPositionProperty.prototype.addSamples = function(times, values) {
        this._property.addSamples(times, values);
    };

    /**
     * Adds samples as a single packed array where each new sample is represented as a date, followed by the packed representation of the corresponding value.
     * @memberof SampledPositionProperty
     *
     * @param {Array} packedSamples The array of packed samples.
     * @param {JulianDate} [epoch] If any of the dates in packedSamples are numbers, they are considered an offset from this epoch, in seconds.
     *
     * @exception {DeveloperError} packedSamples is required.
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