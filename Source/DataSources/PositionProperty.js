define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Core/ReferenceFrame',
        '../Core/Transforms'
    ], function(
        Cartesian3,
        defined,
        defineProperties,
        DeveloperError,
        Matrix3,
        Matrix4,
        Quaternion,
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

    function framesEqual(frame1, frame2) {
      return frame1 && frame1.id ?
          frame1.id === (frame2 && frame2.id) :
          frame1 === frame2;
    }

    function frameParents(frame, resultArray) {
        var frames = resultArray;
        frames.length = 0;
        while (defined(frame)) {
            frames.unshift(frame);
            frame = frame.position && frame.position.referenceFrame;
        }
        return frames;
    }

    function lowestCommonAncestor(parents1, parents2) {
        if (!framesEqual(parents1[0],parents2[0])) {
            return -1;
        }

        var h = Math.min(parents1.length, parents2.length);
        for (var i = 0; i <= h; i++) {
            if (!framesEqual(parents1[i],parents2[i])) {
                return i-1;
            }
        }

        return -1;
    }

    var scratchIcrfToFixedMatrix3 = new Matrix3();

    function getIcrfToFixed(time) {
        var icrfToFixed = Transforms.computeIcrfToFixedMatrix(time, scratchIcrfToFixedMatrix3);
        if (!defined(icrfToFixed)) {
            icrfToFixed = Transforms.computeTemeToPseudoFixedMatrix(time, scratchIcrfToFixedMatrix3);
        }
        return icrfToFixed;
    }

    var scratchMatrix3 = new Matrix3();
    var scratchCartesian3 = new Cartesian3();
    var scratchQuaternion = new Quaternion();

    var scratchArray1 = [];
    var scratchArray2 = [];

    var t;

    function inputPositionAccumulator(accumulatedPositionValue, frame) {
        if (!defined(accumulatedPositionValue)) {
            return accumulatedPositionValue;
        }

        var framePositionProperty = frame.position;
        if (!defined(framePositionProperty)) {
            return undefined;
        }

        var frameReferenceFrame = framePositionProperty.referenceFrame;
        var framePositionValue = framePositionProperty.getValueInReferenceFrame(t, frameReferenceFrame, scratchCartesian3);
        if (!defined(framePositionValue)) {
            return undefined;
        }

        var frameOrientationProperty = frame.orientation;
        if (defined(frameOrientationProperty)) {
            var frameOrientationValue = frameOrientationProperty.getValue(t, scratchQuaternion);
            if (!defined(frameOrientationValue)) {
                return undefined;
            }

            Matrix3.fromQuaternion(frameOrientationValue, scratchMatrix3);
            Matrix3.multiplyByVector(scratchMatrix3, accumulatedPositionValue, accumulatedPositionValue);
            return Cartesian3.add(framePositionValue, accumulatedPositionValue, accumulatedPositionValue);
        }

        return Cartesian3.add(framePositionValue, accumulatedPositionValue, accumulatedPositionValue);
    }

    function outputPositionAccumulator(accumulatedPositionValue, frame) {
        if (!defined(accumulatedPositionValue)) {
            return accumulatedPositionValue;
        }

        var framePositionProperty = frame.position;
        if (!defined(framePositionProperty)) {
            return undefined;
        }

        var frameReferenceFrame = framePositionProperty.referenceFrame;
        var framePositionValue = framePositionProperty.getValueInReferenceFrame(t, frameReferenceFrame, scratchCartesian3);
        if (!defined(framePositionValue)) {
            return undefined;
        }

        accumulatedPositionValue = Cartesian3.subtract(accumulatedPositionValue, framePositionValue, accumulatedPositionValue);

        var frameOrientationProperty = frame.orientation;
        if (defined(frameOrientationProperty)) {
            var frameOrientationValue = frameOrientationProperty.getValue(t, scratchQuaternion);
            if (!defined(frameOrientationValue)) {
                return undefined;
            }

            Quaternion.conjugate(frameOrientationValue, frameOrientationValue);
            Matrix3.fromQuaternion(frameOrientationValue, scratchMatrix3);
            Matrix3.multiplyByVector(scratchMatrix3, accumulatedPositionValue, accumulatedPositionValue);
        }

        return accumulatedPositionValue;
    }

    function reduce(array, callback, initialValue) {
        var nextValue = initialValue;
        for (var i = 0; i < array.length; i++) {
            nextValue = callback(nextValue, array[i]);
        }
        return nextValue;
    }

    function reduceRight(array, callback, initialValue) {
        var nextValue = initialValue;
        for (var i = array.length-1; i > -1; i--) {
            nextValue = callback(nextValue, array[i]);
        }
        return nextValue;
    }

    /**
     * @private
     */
    PositionProperty.convertToReferenceFrame = function(time, value, inputFrame, outputFrame, result) {
      if (!defined(value)) {
          return value;
      }
      if (!defined(result)) {
          result = new Cartesian3();
      }

      if (inputFrame === outputFrame) {
          return Cartesian3.clone(value, result);
      }

      if (!defined(inputFrame) || !defined(outputFrame)) {
          return undefined;
      }

      t = time;
      var inputFrameParents = frameParents(inputFrame, scratchArray1);
      var outputFrameParents = frameParents(outputFrame, scratchArray2);
      var lcaIndex = lowestCommonAncestor(inputFrameParents, outputFrameParents);
      var lcaFrame = inputFrameParents[lcaIndex];

      if (defined(lcaFrame)) {
          for (var i=0; i < lcaIndex+1; i++) {
            inputFrameParents.shift();
            outputFrameParents.shift();
          }

          var lcaFrameValue = reduceRight(inputFrameParents, inputPositionAccumulator, Cartesian3.clone(value, result));
          if (!defined(lcaFrameValue)) {
              return undefined;
          }

          return reduce(outputFrameParents, outputPositionAccumulator, lcaFrameValue);
      }

      var inputRootFrame = inputFrameParents.shift();
      var outputRootFrame = outputFrameParents.shift();
      var fixedFrameValue, inertialFrameValue;

      if (inputRootFrame === ReferenceFrame.INERTIAL && outputRootFrame === ReferenceFrame.FIXED) {
          inertialFrameValue = reduceRight(inputFrameParents, inputPositionAccumulator, Cartesian3.clone(value, result));
          if (!defined(inertialFrameValue)) {
              return undefined;
          }

          fixedFrameValue = Matrix3.multiplyByVector(getIcrfToFixed(time), inertialFrameValue, result);
          return reduce(outputFrameParents, outputPositionAccumulator, fixedFrameValue);
      }

      if (inputRootFrame === ReferenceFrame.FIXED && outputRootFrame === ReferenceFrame.INERTIAL) {
          fixedFrameValue = reduceRight(inputFrameParents, inputPositionAccumulator, Cartesian3.clone(value, result));
          if (!defined(fixedFrameValue)) {
              return undefined;
          }

          var fixedToIcrf = Matrix3.transpose(getIcrfToFixed(time), scratchMatrix3);
          inertialFrameValue = Matrix3.multiplyByVector(fixedToIcrf, fixedFrameValue, result);
          return reduce(outputFrameParents, outputPositionAccumulator, inertialFrameValue);
      }

      return undefined;
    };

    return PositionProperty;
});
