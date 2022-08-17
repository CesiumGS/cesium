import Cartesian3 from "../../Core/Cartesian3.js";
import Check from "../../Core/Check.js";
import ConstantSpline from "../../Core/ConstantSpline.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import HermiteSpline from "../../Core/HermiteSpline.js";
import InterpolationType from "../../Core/InterpolationType.js";
import LinearSpline from "../../Core/LinearSpline.js";
import ModelComponents from "../ModelComponents.js";
import SteppedSpline from "../../Core/SteppedSpline.js";
import Quaternion from "../../Core/Quaternion.js";
import QuaternionSpline from "../../Core/QuaternionSpline.js";

const AnimatedPropertyType = ModelComponents.AnimatedPropertyType;

/**
 * A runtime animation channel for a {@link ModelAnimation}. An animation
 * channel is responsible for interpolating between the keyframe values of an animated
 * property, then applying the change to the target node.
 *
 * @param {Object} options An object containing the following options:
 * @param {ModelComponents.AnimationChannel} options.channel The corresponding animation channel components from the 3D model.
 * @param {ModelAnimation} options.runtimeAnimation The runtime animation containing this channel.
 * @param {ModelRuntimeNode} options.runtimeNode The runtime node that this channel will animate.
 *
 * @alias ModelAnimationChannel
 * @constructor
 *
 * @private
 */
function ModelAnimationChannel(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const channel = options.channel;
  const runtimeAnimation = options.runtimeAnimation;
  const runtimeNode = options.runtimeNode;
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.channel", channel);
  Check.typeOf.object("options.runtimeAnimation", runtimeAnimation);
  Check.typeOf.object("options.runtimeNode", runtimeNode);
  //>>includeEnd('debug');

  this._channel = channel;
  this._runtimeAnimation = runtimeAnimation;
  this._runtimeNode = runtimeNode;

  // An animation channel can have multiple splines if it animates
  // a node's morph weights, which will involve multiple morph targets.
  this._splines = [];
  this._path = undefined;

  initialize(this);
}

Object.defineProperties(ModelAnimationChannel.prototype, {
  /**
   * The glTF animation channel.
   *
   * @memberof ModelAnimationChannel.prototype
   *
   * @type {ModelComponents.AnimationChannel}
   * @readonly
   *
   * @private
   */
  channel: {
    get: function () {
      return this._channel;
    },
  },

  /**
   * The runtime animation that owns this channel.
   *
   * @memberof ModelAnimationChannel.prototype
   *
   * @type {ModelAnimation}
   * @readonly
   *
   * @private
   */
  runtimeAnimation: {
    get: function () {
      return this._runtimeAnimation;
    },
  },

  /**
   * The runtime node that this channel animates.
   *
   * @memberof ModelAnimationChannel.prototype
   *
   * @type {ModelRuntimeNode}
   * @readonly
   *
   * @private
   */
  runtimeNode: {
    get: function () {
      return this._runtimeNode;
    },
  },

  /**
   * The splines used to evaluate this animation channel.
   *
   * @memberof ModelAnimationChannel.prototype
   *
   * @type {Spline[]}
   * @readonly
   *
   * @private
   */
  splines: {
    get: function () {
      return this._splines;
    },
  },
});

function createCubicSpline(times, points) {
  const cubicPoints = [];
  const inTangents = [];
  const outTangents = [];

  const length = points.length;
  for (let i = 0; i < length; i += 3) {
    inTangents.push(points[i]);
    cubicPoints.push(points[i + 1]);
    outTangents.push(points[i + 2]);
  }

  // Remove the first in-tangent and last out-tangent, since they
  // are not used in the spline calculations
  inTangents.splice(0, 1);
  outTangents.length = outTangents.length - 1;

  return new HermiteSpline({
    times: times,
    points: cubicPoints,
    inTangents: inTangents,
    outTangents: outTangents,
  });
}

function createSpline(times, points, interpolation, path) {
  if (times.length === 1 && points.length === 1) {
    return new ConstantSpline(points[0]);
  }

  switch (interpolation) {
    case InterpolationType.STEP:
      return new SteppedSpline({
        times: times,
        points: points,
      });
    case InterpolationType.CUBICSPLINE:
      return createCubicSpline(times, points);
    case InterpolationType.LINEAR:
      if (path === AnimatedPropertyType.ROTATION) {
        return new QuaternionSpline({
          times: times,
          points: points,
        });
      }
      return new LinearSpline({
        times: times,
        points: points,
      });
  }
}

function createSplines(times, points, interpolation, path, count) {
  const splines = [];
  if (path === AnimatedPropertyType.WEIGHTS) {
    const pointsLength = points.length;
    // Get the number of keyframes in each weight's output.
    const outputLength = pointsLength / count;

    // Iterate over the array using the number of morph targets in the model.
    let targetIndex, i;
    for (targetIndex = 0; targetIndex < count; targetIndex++) {
      const output = new Array(outputLength);

      // Weights are ordered such that they are keyframed in the order in which
      // their targets appear the glTF. For example, the weights of three targets
      // may appear as [w(0,0), w(0,1), w(0,2), w(1,0), w(1,1), w(1,2) ...],
      // where i and j in w(i,j) are the time indices and target indices, respectively.

      // However, for morph targets with cubic interpolation, the data is stored per
      // keyframe in the order [a1, a2, ..., an, v1, v2, ... vn, b1, b2, ..., bn],
      // where ai, vi, and bi are the in-tangent, property, and out-tangents of
      // the ith morph target respectively.
      let pointsIndex = targetIndex;
      if (interpolation === InterpolationType.CUBICSPLINE) {
        for (i = 0; i < outputLength; i += 3) {
          output[i] = points[pointsIndex];
          output[i + 1] = points[pointsIndex + count];
          output[i + 2] = points[pointsIndex + 2 * count];
          pointsIndex += count * 3;
        }
      } else {
        for (i = 0; i < outputLength; i++) {
          output[i] = points[pointsIndex];
          pointsIndex += count;
        }
      }

      splines.push(createSpline(times, output, interpolation, path));
    }
  } else {
    splines.push(createSpline(times, points, interpolation, path));
  }

  return splines;
}

let scratchVariable;

function initialize(runtimeChannel) {
  const channel = runtimeChannel._channel;

  const sampler = channel.sampler;
  const times = sampler.input;
  const points = sampler.output;

  const interpolation = sampler.interpolation;
  const target = channel.target;
  const path = target.path;

  const runtimeNode = runtimeChannel._runtimeNode;
  const count = defined(runtimeNode.morphWeights)
    ? runtimeNode.morphWeights.length
    : 1;
  const splines = createSplines(times, points, interpolation, path, count);

  runtimeChannel._splines = splines;
  runtimeChannel._path = path;

  switch (path) {
    case AnimatedPropertyType.TRANSLATION:
    case AnimatedPropertyType.SCALE:
      scratchVariable = new Cartesian3();
      break;
    case AnimatedPropertyType.ROTATION:
      scratchVariable = new Quaternion();
      break;
    case AnimatedPropertyType.WEIGHTS:
      // This is unused when setting a node's morph weights.
      break;
  }
}

/**
 * Animates the target node property based on its spline.
 *
 * @param {Number} time The local animation time.
 *
 * @private
 */
ModelAnimationChannel.prototype.animate = function (time) {
  const splines = this._splines;
  const path = this._path;
  const model = this._runtimeAnimation.model;
  const runtimeNode = this._runtimeNode;

  // Weights are handled differently than the other properties because
  // they need to be updated in place.
  if (path === AnimatedPropertyType.WEIGHTS) {
    const morphWeights = runtimeNode.morphWeights;
    const length = morphWeights.length;
    for (let i = 0; i < length; i++) {
      const spline = splines[i];
      const localAnimationTime = model.clampAnimations
        ? spline.clampTime(time)
        : spline.wrapTime(time);
      morphWeights[i] = spline.evaluate(localAnimationTime);
    }
  } else if (runtimeNode.userAnimated) {
    // If the node is being animated externally, ignore the glTF animation.
    return;
  } else {
    const spline = splines[0];
    const localAnimationTime = model.clampAnimations
      ? spline.clampTime(time)
      : spline.wrapTime(time);

    // This sets the translate, rotate, and scale properties.
    runtimeNode[path] = spline.evaluate(localAnimationTime, scratchVariable);
  }
};

export default ModelAnimationChannel;
