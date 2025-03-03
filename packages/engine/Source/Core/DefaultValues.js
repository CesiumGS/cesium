/**
 * Utilities helpful for setting a default value for a parameter.
 *
 * @namespace DefaultValues
 */
const DefaultValues = {};

/**
 * A frozen empty object that can be used as the default value for options passed as
 * an object literal.
 * @type {object}
 * @memberof DefaultValues
 */
DefaultValues.EMPTY_OBJECT = Object.freeze({});

/**
 * A frozen empty array that can be used as the default value for options passed as
 * an array literal.
 * @type {array}
 * @memberof DefaultValues
 */
DefaultValues.EMPTY_ARRAY = Object.freeze([]);

export default DefaultValues;
