/**
 * Utilities helpful for setting a default value for a parameter.
 *
 * @namespace Frozen
 */
const Frozen = {};

/**
 * A frozen empty object that can be used as the default value for options passed as
 * an object literal.
 * @type {object}
 * @memberof Frozen
 */
Frozen.EMPTY_OBJECT = Object.freeze({});

/**
 * A frozen empty array that can be used as the default value for options passed as
 * an array literal.
 * @type {array}
 * @memberof Frozen
 */
Frozen.EMPTY_ARRAY = Object.freeze([]);

export default Frozen;
