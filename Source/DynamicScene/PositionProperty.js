/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Matrix3',
        '../Core/ReferenceFrame',
        '../Core/Transforms'
    ], function(
        Cartesian3,
        defined,
        defineProperties,
        DeveloperError,
        Matrix3,
        ReferenceFrame,
        Transforms) {
    "use strict";

    /**
     * The interface for all position {@link Property} objects. Position properties
     * represent a world location as a {@link Cartesian3} with an associated
     * {@link ReferenceFrame}.
     * This type defines an interface and cannot be instantiated directly.
     *
     * @alias PositionProperty
     * @constructor
     *
     * @see CompositePositionProperty
     * @see ConstantPositionProperty
     * @see SampledPositionProperty
     * @see TimeIntervalCollectionPositionProperty
     */
    var PositionProperty = function() {
        DeveloperError.throwInstantiationError();
    };

    defineProperties(PositionProperty.prototype, {
        /**
         * Gets the reference frame that the position is defined in.
         * @memberof PositionProperty.prototype
         * @Type {ReferenceFrame}
         */
        referenceFrame : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Gets the value of the property at the provided time.
     * @memberof PositionProperty
     * @function
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    PositionProperty.prototype.getValue = DeveloperError.throwInstantiationError;

    /**
     * Gets the value of the property at the provided time and in the provided reference frame.
     * @memberof PositionProperty
     * @function
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {ReferenceFrame} referenceFrame The desired referenceFrame of the result.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    PositionProperty.prototype.getValueInReferenceFrame = DeveloperError.throwInstantiationError;

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof PositionProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    PositionProperty.prototype.equals = DeveloperError.throwInstantiationError;

    var scratchMatrix3 = new Matrix3();

    /**
     * @private
     */
    PositionProperty.convertToReferenceFrame = function(time, value, inputFrame, outputFrame, result) {
        if (inputFrame === outputFrame) {
            return Cartesian3.clone(value, result);
        }

        var icrfToFixed = Transforms.computeIcrfToFixedMatrix(time, scratchMatrix3);
        if (!defined(icrfToFixed)) {
            icrfToFixed = Transforms.computeTemeToPseudoFixedMatrix(time, scratchMatrix3);
        }
        if (inputFrame === ReferenceFrame.INERTIAL) {
            return Matrix3.multiplyByVector(icrfToFixed, value, result);
        }
        if (inputFrame === ReferenceFrame.FIXED) {
            return Matrix3.multiplyByVector(Matrix3.transpose(icrfToFixed, scratchMatrix3), value, result);
        }
    };

    return PositionProperty;
});
