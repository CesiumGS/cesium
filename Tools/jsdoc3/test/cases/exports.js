/**
 * An example of a server-side JavaScript module.
 * @module hello/world
 * @example
 *    var g = require('hello/world').sayHello('Gracie');
 */

/**
 * Generate a greeting.
 * @param {string} [subject="world"] To whom we greet.
 * @returns {string}
 */
exports.sayHello = function(subject) {
    return 'Hello ' + (subject || 'World');
};
