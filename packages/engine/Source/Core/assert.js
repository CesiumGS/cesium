// @ts-check

import DeveloperError from "./DeveloperError.js";

/**
 * @function
 *
 * @param {*} condition
 * @param {string} msg
 * @returns {asserts condition}
 * @ignore
 */
function assert(condition, msg) {
  if (!condition) {
    throw new DeveloperError(msg);
  }
}

export default assert;
