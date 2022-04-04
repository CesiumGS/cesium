/**
 * A function used to resolve a promise upon completion .
 * @callback resolve
 *
 * @param {*} value The resulting value.
 */

/**
 * A function used to reject a promise upon failure.
 * @callback reject
 *
 * @param {*} error The error.
 */

/**
 * An object which contains a promise object, and functions to resolve or reject the promise.
 * @typedef {Object} deferred
 * @property {resolve} resolve Resolves the promise when called.
 * @property {reject} reject Rejects the promise when called.
 * @property {Promise<any>} promise Promise object.
 */

/**
 * Creates a deferred object, containing a promise object, and functions to resolve or reject the promise.
 *
 * @function
 *
 * @returns {deferred}
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
