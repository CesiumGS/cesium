// @ts-check

import DeveloperError from "./DeveloperError.js";

/**
 * Checks that a condition is truthy, throwing a specified message if condition
 * fails. The `asserts condition` return type allows TypeScript to narrow the
 * types of the condition and enforce stricter types without further if/else
 * checks or nullish coalescing.
 *
 * @example
 * assert(object.optionalProperty, 'Missing .optionalProperty');
 * object.optionalProperty.toString(); // safe; no type error.
 *
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
