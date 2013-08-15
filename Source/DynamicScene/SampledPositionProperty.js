/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/ReferenceFrame',
        './PositionProperty',
        './SampledProperty'
       ], function(
        Cartesian3,
        defined,
        defineProperties,
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
    var SampledPositionProperty = function() {
        this._property = new SampledProperty(Cartesian3);
    };

    defineProperties(SampledPositionProperty.prototype, {
        /**
         * Always returns true, since this property always varies with simulation time.
         * @memberof SampledPositionProperty
         *
         * @type {Boolean}
         */
        isTimeVarying : {
            get : function() {
                return this._property.isTimeVarying;
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