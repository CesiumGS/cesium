import Check from "../../Core/Check.js";
import ConstantSpline from "../Core/ConstantSpline.js";
import defaultValue from "../../Core/defaultValue.js";
import LinearSpline from "../Core/LinearSpline.js";
import ModelComponents from "../ModelComponents.js";
import SteppedSpline from "../../Core/SteppedSpline.js";
import QuaternionSpline from "../Core/QuaternionSpline.js";

const InterpolationType = ModelComponents.InterpolationType;
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

  // A channel can have multiple splines if it animates the morph weights
  // of a model. The weights for each target are separated into individual splines.
  this._splines = undefined;

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
  switch (interpolation) {
    case InterpolationType.STEP:
      return new SteppedSpline({
        times: times,
        points: points,
      });
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
    case InterpolationType.CUBICSPLINE:
      return;
  }
}

function initialize(runtimeChannel) {
  const channel = runtimeChannel._channel;

  const sampler = channel.sampler;
  const times = sampler.input;
  const points = sampler.output;

  const target = channel.target;

  const splines = [];

  if (times.length === 1 && points.length === 1) {
    splines.push(new ConstantSpline(points[0]));
  }

  // If the points are an array of morph weights,
  // separate them each into their own arrays of points
  if (typeof points[0] === Number) {
    const runtimeNode = runtimeChannel._runtimeNode;
    // need to add runtimeNode.morphWeights
    const morphTargetCount = runtimeNode.morphWeights.length;
    for (let i = 0; i < morphTargetCount; i++) {
      const morphTargetPoints = [];
      // TODO
    }
  } else {
    const interpolation = channel.interpolation;

    const path = target.path;
    const spline = createSpline(times, points, interpolation, path);
    splines.push(spline);
  }
}

/**
 * Animates the target node property based on its spline.
 *
 * @param {Number} time The local animation time.
 */

ModelExperimentalAnimationChannel.prototype.animate = function (time) {
  // might not be efficent to do a switch statement; is it possible to
  // pass stuff to the node better?
  // or maybe, store a reference to the property itself? and update?

  const splines = this._splines;
  const length = splines.length;
  for (let i = 0; i < length; i++) {
    const value = splines[i].evaluate(time);

    // TODO: update node
  }
};

export default ModelExperimentalAnimationChannel;
