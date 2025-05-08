/**
 * A function used to reject a promise upon failure.
 * @typedef {Function} Reject
 * @param {any} [reason] - An optional reason for the rejection.
 * @private
 */
export type Reject = (reason?: any) => void;

/**
 * A function used to resolve a promise upon completion .
 * @template T The type of the resolved value.
 * @typedef {Function} Resolve
 * @param {T} value - An optional reason for the rejection.
 * @private
 */
export type Resolve<T> = (value: T) => void;

/**
 * Represents a deferred object, which contains a promise along with resolve and reject functions.
 *
 * @template T The type of the resolved value.
 * @typedef {Object} Deferred
 * @property {Resolve<T>} resolve - Resolves the promise.
 * @property {Reject} reject - Rejects the promise.
 * @property {Promise<T>} promise - The associated promise.
 * @private
 */
export type Deferred<T> = {
  resolve: Resolve<T>;
  reject: Reject;
  promise: Promise<T>;
};

/**
 * Creates a deferred object, containing a promise and functions to resolve or reject it.
 *
 * @function defer
 * @template T
 * @param {T} value
 * @returns {Deferred<T>} - A deferred object with `resolve`, `reject`, and `promise` properties.
 * @private
 */
export default function defer<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}
