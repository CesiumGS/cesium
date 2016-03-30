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
    'use strict';

    /**
     * The interface for all {@link Property} objects that define a world
     * location as a {@link Cartesian3} with an associated {@link ReferenceFrame}.
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
    function PositionProperty() {
        DeveloperError.throwInstantiationError();
    }

    defineProperties(PositionProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof PositionProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof PositionProperty.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets the reference frame that the position is defined in.
         * @memberof PositionProperty.prototype
         * @type {ReferenceFrame}
         */
        referenceFrame : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Gets the value of the property at the provided time in the fixed frame.
     * @function
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    PositionProperty.prototype.getValue = DeveloperError.throwInstantiationError;

    /**
     * Gets the value of the property at the provided time and in the provided reference frame.
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
     * @function
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
        if (!defined(value)) {
            return value;
        }
        if (!defined(result)){
            result = new Cartesian3();
        }

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
