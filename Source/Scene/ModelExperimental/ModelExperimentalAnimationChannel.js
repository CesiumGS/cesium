import Check from "../../Core/Check.js";
import ConstantSpline from "../../Core/ConstantSpline.js";
import defaultValue from "../../Core/defaultValue.js";
import InterpolationType from "../InterpolationType.js";
import LinearSpline from "../../Core/LinearSpline.js";
import ModelComponents from "../ModelComponents.js";
import MorphWeightSpline from "../../Core/MorphWeightSpline.js";
import SteppedSpline from "../../Core/SteppedSpline.js";
import QuaternionSpline from "../../Core/QuaternionSpline.js";

const AnimatedPropertyType = ModelComponents.AnimatedPropertyType;

/**
 * A runtime animation channel for a {@link ModelExperimentalAnimation}. An animation
 * channel is responsible for interpolating between the keyframe values of an animated
 * property, then applying the change to the target node.
 *
 * @param {Object} options An object containing the following options:
 * @param {ModelComponents.AnimationChannel} options.channel The corresponding animation channel components from the 3D model.
 * @param {ModelExperimentalAnimation} options.runtimeAnimation The runtime animation containing this channel.
 * @param {ModelExperimentalNode} options.runtimeNode The runtime node that this channel will animate.
 *
 * @alias ModelExperimentalAnimationChannel
 * @constructor
 *
 * @private
 */
function ModelExperimentalAnimationChannel(options) {
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

  this._spline = undefined;
  this._pathString = undefined;

  initialize(this);
}

Object.defineProperties(ModelExperimentalAnimationChannel.prototype, {
  /**
   * The glTF animation channel.
   *
   * @memberof ModelExperimentalAnimationChannel.prototype
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
   * The splines used to evaluate this animation channel.
   *
   * @memberof ModelExperimentalAnimationChannel.prototype
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

function createSpline(times, points, interpolation, path) {
  if (times.length === 1 && points.length === 1) {
    return new ConstantSpline(points[0]);
  }

  if (path === AnimatedPropertyType.WEIGHTS) {
    return new MorphWeightSpline({
      times: times,
      weights: points,
      interpolation: interpolation,
    });
  }

  switch (interpolation) {
    case InterpolationType.STEP:
      return new SteppedSpline({
        times: times,
        points: points,
      });
    case InterpolationType.CUBICSPLINE:
      // TODO
      return;
    case InterpolationType.LINEAR:
    default:
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

function initialize(runtimeChannel) {
  const channel = runtimeChannel._channel;

  const sampler = channel.sampler;
  const times = sampler.input;
  const points = sampler.output;

  const target = channel.target;
  const interpolation = channel.interpolation;
  const path = target.path;
  const spline = createSpline(times, points, interpolation, path);

  runtimeChannel._spline = spline;

  let pathString;
  switch (path) {
    case AnimatedPropertyType.TRANSLATION:
      pathString = "translation";
      break;
    case AnimatedPropertyType.ROTATION:
      pathString = "rotation";
      break;
    case AnimatedPropertyType.SCALE:
      pathString = "scale";
      break;
    case AnimatedPropertyType.WEIGHTS:
      pathString = "morphWeights";
      break;
  }

  runtimeChannel._pathString = pathString;
}

/**
 * Animates the target node property based on its spline.
 *
 * @param {Number} time The local animation time.
 */
ModelExperimentalAnimationChannel.prototype.animate = function (time) {
  const spline = this._spline;
  const pathString = this._pathString;
  this._runtimeNode[pathString] = spline.evaluate(
    time,
    this._runtimeNode[pathString]
  );
};

export default ModelExperimentalAnimationChannel;
