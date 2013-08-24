/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/ReferenceFrame',
        './PositionProperty',
        './SampledProperty'
       ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        ReferenceFrame,
        PositionProperty,
        SampledProperty) {
    "use strict";

    /**
     * A {@link Property} whose value never changes.
     *
     * @alias SampledPositionProperty
     * @constructor
     *
     * @exception {DeveloperError} value is required.
     */
    var SampledPositionProperty = function(referenceFrame) {
        this._property = new SampledProperty(Cartesian3);
        this._referenceFrame = defaultValue(referenceFrame, ReferenceFrame.FIXED);
    };

    defineProperties(SampledPositionProperty.prototype, {
        referenceFrame : {
            get : function() {
                return this._referenceFrame;
            }
        },
        interpolationDegree : {
            get : function() {
                return this._property.interpolationDegree;
            },
            set : function(value) {
                this._property.interpolationDegree = value;
            }
        },
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
     * Gets the value of the property, optionally cloning it.
     * @memberof SampledPositionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.  This parameter is unused.
     * @param {Object} [result] The object to store the value into if the value is clonable.  If the result is omitted or the value does not implement clone, the actual value is returned.
     * @returns The modified result parameter or the actual value instance if the value is not clonable.
     *
     * @exception {DeveloperError} time is required.
     */
    SampledPositionProperty.prototype.getValue = function(time, result) {
        return this.getValueInReferenceFrame(time, ReferenceFrame.FIXED, result);
    };

    SampledPositionProperty.prototype.getValueInReferenceFrame = function(time, referenceFrame, result) {
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }

        result = this._property.getValue(time, result);
        if (defined(result)) {
            return PositionProperty.convertToReferenceFrame(time, result, this._referenceFrame, referenceFrame, result);
        }
        return result;
    };

    SampledPositionProperty.prototype.addSample = function(time, value) {
        this._property.addSample(time, value);
    };

    SampledPositionProperty.prototype.addSamples = function(times, values) {
        this._property.addSamples(times, values);
    };

    SampledPositionProperty.prototype.addSamplesFlatArray = function(data, epoch) {
        this._property.addSamplesFlatArray(data, epoch);
    };

    return SampledPositionProperty;
});