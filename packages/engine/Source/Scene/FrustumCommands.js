import defaultValue from "../Core/defaultValue.js";
import Pass from "../Renderer/Pass.js";

/**
 * Defines a list of commands whose geometry are bound by near and far distances from the camera.
 * @alias FrustumCommands
 * @constructor
 *
 * @param {number} [near=0.0] The lower bound or closest distance from the camera.
 * @param {number} [far=0.0] The upper bound or farthest distance from the camera.
 *
 * @private
 */
function FrustumCommands(near, far) {
  this.near = defaultValue(near, 0.0);
  this.far = defaultValue(far, 0.0);

  const numPasses = Pass.NUMBER_OF_PASSES;
  const commands = new Array(numPasses);
  const indices = new Array(numPasses);

  for (let i = 0; i < numPasses; ++i) {
    commands[i] = [];
    indices[i] = 0;
  }

  this.commands = commands;
  this.indices = indices;
}
export default FrustumCommands;
