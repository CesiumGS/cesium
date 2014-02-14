/*global define*/
define([
        './ConstantProperty',
        './PositionProperty',
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/ReferenceFrame',
        './Property'
    ], function(
        ConstantProperty,
        PositionProperty,
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        ReferenceFrame,
        Property) {
    "use strict";

    /**
     * A {@link PositionProperty} whose value does not change in respect to the
     * {@link ReferenceFrame} in which is it defined.
     *
     * @alias ConstantPositionProperty
     * @constructor
     *
     * @param {Cartesian3} value The property value.
     * @param {ReferenceFrame} [referenceFrame=ReferenceFrame.FIXED] The reference frame in which the position is defined.
     *
     * @example
     * //Create a constant position in the inertial frame.
     * var constantProperty = new Cesium.ConstantPositionProperty(new Cesium.Cartesian3(-4225824.0, 1261219.0, -5148934.0), Cesium.ReferenceFrame.INERTIAL);
     */
    var ConstantPositionProperty = function(value, referenceFrame) {
        this._property = new ConstantProperty(value);
        this._referenceFrame = defaultValue(referenceFrame, ReferenceFrame.FIXED);
    };

    defineProperties(ConstantPositionProperty.prototype, {
        /**
         * Gets the reference frame in which the position is defined.
         * @memberof ConstantPositionProperty.prototype
         * @Type {ReferenceFrame}
         * @default ReferenceFrame.FIXED;
         */
        referenceFrame : {
            get : function() {
                return this._referenceFrame;
            }
        }
    });

    /**
     * Gets the value of the property at the provided time in the fixed frame.
     * @memberof ConstantPositionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    ConstantPositionProperty.prototype.getValue = function(time, result) {
        return this.getValueInReferenceFrame(time, ReferenceFrame.FIXED, result);
    };

    /**
     * Gets the value of the property at the provided time and in the provided reference frame.
     * @memberof ConstantPositionProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {ReferenceFrame} referenceFrame The desired referenceFrame of the result.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    ConstantPositionProperty.prototype.getValueInReferenceFrame = function(time, referenceFrame, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        if (!defined(referenceFrame)) {
            throw new DeveloperError('referenceFrame is required.');
        }
        //>>includeEnd('debug');

        var value = this._property.getValue(time, result);
        return PositionProperty.convertToReferenceFrame(time, value, this._referenceFrame, referenceFrame, value);
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof ConstantPositionProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    ConstantPositionProperty.prototype.equals = function(other) {
        return this === other ||
               (other instanceof ConstantPositionProperty &&
                Property.equals(this._property, other._property) &&
                this._referenceFrame === other._referenceFrame);
    };

    return ConstantPositionProperty;
});