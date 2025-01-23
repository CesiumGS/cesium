/**
 * A function used to resolve a promise upon completion .
 * @callback defer.resolve
 *
 * @param {*} value The resulting value.
 */

/**
 * A function used to reject a promise upon failure.
 * @callback defer.reject
 *
 * @param {*} error The error.
 */

/**
 * An object which contains a promise object, and functions to resolve or reject the promise.
 *
 * @typedef {object} defer.deferred
 * @property {defer.resolve} resolve Resolves the promise when called.
 * @property {defer.reject} reject Rejects the promise when called.
 * @property {Promise} promise Promise object.
 */

/**
 * Creates a deferred object, containing a promise object, and functions to resolve or reject the promise.
 * @returns {defer.deferred}
 * @private
 */
function defer() {
  let resolve;
  let reject;
  const promise = new Promise(function (res, rej) {
    resolve = res;
    reject = rej;
  });

  return {
    resolve: resolve,
    reject: reject,
    promise: promise,
  };
}

export default defer;
