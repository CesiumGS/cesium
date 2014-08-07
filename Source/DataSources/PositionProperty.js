/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Core/ReferenceFrame',
        '../Core/Transforms',
        './Entity'
    ], function(
        Cartesian3,
        defined,
        defineProperties,
        DeveloperError,
        Matrix3,
        Matrix4,
        Quaternion,
        ReferenceFrame,
        Transforms,
        Entity) {
    "use strict";

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
    var PositionProperty = function() {
        DeveloperError.throwInstantiationError();
    };

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


    /**
     * @private
     */
    PositionProperty.convertToReferenceFrame = function(time, value, inputFrame, outputFrame, result, first) {
        if(!defined(first)){
            first = true;
        }
        if (!defined(value)) {
            return value;
        }
        if (!defined(result)){
            result = new Cartesian3();
        }

        if (inputFrame === outputFrame) {
            return Cartesian3.clone(value, result);
        }

        if (!defined(result)) {
            result = new Cartesian3();
        }

        var scratchMatrix3 = new Matrix3();
        var framePositionValue = new Cartesian3();
        var frameOrientationValue = new Quaternion();
        var subResult = new Cartesian3();

        if (first && inputFrame instanceof Entity) {
            var inFramePosition = inputFrame.position;
            var inFrameReferenceFrame = inFramePosition.referenceFrame;
            var inFramePositionValue = inFramePosition.getValueInReferenceFrame(time, inFrameReferenceFrame, framePositionValue);

            var inFrameOrientationProperty = inputFrame.orientation;
            if (defined(inFrameOrientationProperty)) {
                var inFrameOrientation = inFrameOrientationProperty.getValue(time, frameOrientationValue);
                Matrix3.fromQuaternion(inFrameOrientation, scratchMatrix3);
                Matrix3.multiplyByVector(scratchMatrix3, value, result);
            } else {
                return Cartesian3.add(inFramePositionValue, value, result);
            }

            subResult = PositionProperty.convertToReferenceFrame(time, inFramePositionValue, inFrameReferenceFrame, outputFrame, subResult);
            return Cartesian3.add(subResult, result, result);
        }

        if (outputFrame instanceof Entity) {
            var outFramePosition = outputFrame.position;
            var outFrameReferenceFrame = outFramePosition.referenceFrame;
            var outFramePositionValue = outFramePosition.getValueInReferenceFrame(time, outFrameReferenceFrame, framePositionValue);

            var outFrameOrientationProperty = outputFrame.orientation;
            if (defined(outFrameOrientationProperty)) {
                var outFrameOrientation = outFrameOrientationProperty.getValue(time, frameOrientationValue);
                Matrix3.fromQuaternion(Quaternion.conjugate(outFrameOrientation, outFrameOrientation), scratchMatrix3);
                Matrix3.multiplyByVector(scratchMatrix3, value, result);
                Cartesian3.subtract(result, outFramePositionValue, result);
            } else {
                Cartesian3.subtract(value, outFramePositionValue, result);
            }
            return PositionProperty.convertToReferenceFrame(time, result, outFrameReferenceFrame, outputFrame, result, false);
        }

        var icrfToFixed = Transforms.computeIcrfToFixedMatrix(time, scratchMatrix3);
        if (!defined(icrfToFixed)) {
            icrfToFixed = Transforms.computeTemeToPseudoFixedMatrix(time, scratchMatrix3);
        }
        if (inputFrame === ReferenceFrame.INERTIAL && outputFrame === ReferenceFrame.FIXED) {
            return Matrix3.multiplyByVector(icrfToFixed, value, result);
        }
        if (inputFrame === ReferenceFrame.FIXED && outputFrame === ReferenceFrame.INERTIAL) {
            return Matrix3.multiplyByVector(Matrix3.transpose(icrfToFixed, scratchMatrix3), value, result);
        }
    };

    return PositionProperty;
});
