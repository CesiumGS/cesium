/*global define*/
define([
        './ConstantProperty',
        './PositionProperty',
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/ReferenceFrame'
    ], function(
        ConstantProperty,
        PositionProperty,
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        ReferenceFrame) {
    "use strict";

    /**
     * A {@link PositionProperty} whose value never changes.
     *
     * @alias ConstantPositionProperty
     * @constructor
     *
     * @exception {DeveloperError} value is required.
     */
    var ConstantPositionProperty = function(value, referenceFrame) {
        this._property = new ConstantProperty(value, Cartesian3.clone);
        this._referenceFrame = defaultValue(referenceFrame, ReferenceFrame.FIXED);
    };

    defineProperties(ConstantPositionProperty.prototype, {
        /**
         * Always returns true, since this property always varies with simulation time.
         * @memberof SampledProperty
         *
         * @type {Boolean}
         */
        isTimeVarying : {
            get : function() {
                return this._property.isTimeVarying;
            }
        },
        /**
         * Gets the reference frame that the position is defined in.
         * @Type {ReferenceFrame}
         */
        referenceFrame : {
            get : function() {
                return this._referenceFrame;
            }
        }
    });

    /**
     * Returns the value of the property at the specified simulation time in the fixed frame.
     * @memberof PositionProperty
     *
     * @param {JulianDate} time The simulation time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    ConstantPositionProperty.prototype.getValue = function(time, result) {
        return this.getValueInReferenceFrame(time, ReferenceFrame.FIXED, result);
    };

    /**
     * Returns the value of the property at the specified simulation time in the specified reference frame.
     * @memberof PositionProperty
     *
     * @param {JulianDate} time The simulation time for which to retrieve the value.
     * @param {ReferenceFrame} [referenceFrame=ReferenceFrame.FIXED] The desired referenceFrame of the result.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    ConstantPositionProperty.prototype.getValueInReferenceFrame = function(time, referenceFrame, result) {
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        var value = this._property.getValue(time, result);
        return PositionProperty.convertToReferenceFrame(time, value, this._referenceFrame, referenceFrame, value);
    };

    return ConstantPositionProperty;
});