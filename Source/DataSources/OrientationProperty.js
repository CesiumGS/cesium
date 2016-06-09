/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Matrix3',
        '../Core/Quaternion',
        '../Core/ReferenceFrame',
        '../Core/Transforms'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        Matrix3,
        Quaternion,
        ReferenceFrame,
        Transforms) {
    "use strict";

    /**
     * The interface for all {@link Property} objects that define a
     * orientation as a {@link Quaternion}.
     * This type defines an interface and cannot be instantiated directly.
     *
     * @alias OrientationProperty
     * @constructor
     */
    var OrientationProperty = function() {
        DeveloperError.throwInstantiationError();
    };

    defineProperties(OrientationProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof OrientationProperty.prototype
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
         * @memberof OrientationProperty.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Gets the value of the property at the provided time relative to the position's reference frame.
     * @function
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Quaternion} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Quaternion} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    OrientationProperty.prototype.getValue = DeveloperError.throwInstantiationError;

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    OrientationProperty.prototype.equals = DeveloperError.throwInstantiationError;

    function framesEqual(frame1, frame2) {
        return frame1 && frame1.id ?
            frame1.id === (frame2 && frame2.id) :
            frame1 === frame2;
    }

    function frameParents(frame) {
        var frames = [];
        while (defined(frame) && frame !== null) {
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
    var scratchIcrfToFixed = new Quaternion();

    function getIcrfToFixed(time) {
        var icrfToFixedRotation = Transforms.computeIcrfToFixedMatrix(time, scratchIcrfToFixedMatrix3);
        if (!defined(icrfToFixedRotation)) {
            icrfToFixedRotation = Transforms.computeTemeToPseudoFixedMatrix(time, scratchIcrfToFixedMatrix3);
        }
        return Quaternion.fromRotationMatrix(icrfToFixedRotation, scratchIcrfToFixed);
    }

    var scratchQuaternion = new Quaternion();

    /**
     * @private
     */
    OrientationProperty.convertToReferenceFrame = function(time, value, inputFrame, outputFrame, result) {
      if (!defined(value)) {
          return value;
      }
      if (!defined(result)) {
          result = new Quaternion();
      }

      if (inputFrame === outputFrame) {
          return Quaternion.clone(value, result);
      }

      if (inputFrame === null || outputFrame === null) {
          return undefined;
      }

      var inputFrameParents = frameParents(inputFrame);
      var outputFrameParents = frameParents(outputFrame);
      var lcaIndex = lowestCommonAncestor(inputFrameParents, outputFrameParents);
      var lcaFrame = inputFrameParents[lcaIndex];

      var inputOrientationAccumulator = function (accumulatedOrientationValue, frame) {
          if (!defined(accumulatedOrientationValue)) {
              return accumulatedOrientationValue;
          }

          var frameOrientationProperty = frame.orientation;
          if (!defined(frameOrientationProperty)) {
              return undefined;
          }

          var frameOrientationValue = frameOrientationProperty.getValue(time, scratchQuaternion);
          if (!defined(frameOrientationValue)) {
              return undefined;
          }

          return Quaternion.multiply(frameOrientationValue, accumulatedOrientationValue, accumulatedOrientationValue);
      };

      var outputOrientationAccumulator = function (accumulatedOrientationValue, frame) {
          if (!defined(accumulatedOrientationValue)) {
              return accumulatedOrientationValue;
          }

          var frameOrientationProperty = frame.orientation;
          if (!defined(frameOrientationProperty)) {
              return undefined;
          }

          var frameOrientationValue = frameOrientationProperty.getValue(time, scratchQuaternion);
          if (!defined(frameOrientationValue)) {
              return undefined;
          }

          Quaternion.conjugate(frameOrientationValue, frameOrientationValue);
          return Quaternion.multiply(frameOrientationValue, accumulatedOrientationValue, accumulatedOrientationValue);
      };

      if (defined(lcaFrame)) {
          inputFrameParents = inputFrameParents.slice(lcaIndex+1);
          outputFrameParents = outputFrameParents.slice(lcaIndex+1);

          var lcaFrameValue = inputFrameParents.reduceRight(inputOrientationAccumulator, Quaternion.clone(value, result));
          if (!defined(lcaFrameValue)) {
            return undefined;
          }

          return outputFrameParents.reduce(outputOrientationAccumulator, lcaFrameValue);
      }

      var inputRootFrame = inputFrameParents.shift();
      var outputRootFrame = outputFrameParents.shift();
      var fixedFrameValue, inertialFrameValue;

      if (inputRootFrame === ReferenceFrame.INERTIAL && outputRootFrame === ReferenceFrame.FIXED) {
          inertialFrameValue = inputFrameParents.reduceRight(inputOrientationAccumulator, Quaternion.clone(value, result));
          if (!defined(inertialFrameValue)) {
            return undefined;
          }

          fixedFrameValue = Quaternion.multiply(getIcrfToFixed(time), inertialFrameValue, result);
          return outputFrameParents.reduce(outputOrientationAccumulator, fixedFrameValue);
      }

      if (inputRootFrame === ReferenceFrame.FIXED && outputRootFrame === ReferenceFrame.INERTIAL) {
          fixedFrameValue = inputFrameParents.reduceRight(inputOrientationAccumulator, Quaternion.clone(value, result));
          if (!defined(fixedFrameValue)) {
            return undefined;
          }

          var fixedToIcrf = Quaternion.conjugate(getIcrfToFixed(time), scratchQuaternion);
          inertialFrameValue = Quaternion.multiply(fixedToIcrf, fixedFrameValue, result);
          return outputFrameParents.reduce(outputOrientationAccumulator, inertialFrameValue);
      }

      return undefined;
    };

    return OrientationProperty;
});
