// @ts-check

/*
 * This file is an implementation detail of Conditional3DTileContent.
 * It should not be used by other classes.
 */

import { defined } from "@cesium/core";
import Request from "../Core/Request.js";
import RequestState from "../Core/RequestState.js";
import RequestType from "../Core/RequestType.js";
import defer from "../Core/defer.js";

/** @import Resource from "../Core/Resource.js"; */

/**
 * A compile time flag for excessive logging, as long as there is
 * active development and testing.
 *
 * @private
 */
const REQUEST_HANDLE_LOGGING = false;

/**
 * Interface for all classes that want to be informed about the
 * state of a request.
 *
 * Note: The functions in this interface should be documented
 * more extensively, but their structure, the point where they
 * are called, and their purpose had to be reverse engineered
 * from the existing Request/Resource/RequestScheduler classes.
 *
 * @ignore
 */
class RequestListener {
  /**
   * Will be called when the given request was attempted.
   *
   * This means that the request was started, and then
   * was cancelled or failed (but not completed).
   *
   * @param {Request} request The request
   */
  requestAttempted(request) {}

  /**
   * Will be called when the given request was started.
   *
   * @param {Request} request The request
   */
  requestStarted(request) {}

  /**
   * Will be called when the given request was cancelled.
   *
   * @param {Request} request The request
   */
  requestCancelled(request) {}

  /**
   * Will be called when the given request was completed.
   *
   * @param {Request} request The request
   */
  requestCompleted(request) {}

  /**
   * Will be called when the given request failed
   *
   * @param {Request} request The request
   */
  requestFailed(request) {}
}

/**
 * Implementation of a RequestListener that just logs the
 * request states to the console.
 *
 * @ignore
 * @extends {RequestListener}
 */
class LoggingRequestListener extends RequestListener {
  /**
   * @param {Request} request
   */
  requestAttempted(request) {
    console.log(`requestAttempted for ${request.url}`);
  }
  /**
   * @param {Request} request
   */
  requestStarted(request) {
    console.log(`requestStarted   for ${request.url}`);
  }
  /**
   * @param {Request} request
   */
  requestCancelled(request) {
    console.log(`requestCancelled for ${request.url}`);
  }
  /**
   * @param {Request} request
   */
  requestCompleted(request) {
    console.log(`requestCompleted for ${request.url}`);
  }
  /**
   * @param {Request} request
   */
  requestFailed(request) {
    console.log(`requestFailed    for ${request.url}`);
  }
}

/**
 * A class serving as a convenience wrapper around a request for
 * a resource.
 *
 * @ignore
 */
class RequestHandle {
  /**
   * Creates a new request handle for requesting the data for
   * the given resource.
   *
   * @param {Resource} resource The resource
   * @param {Function} priorityFunction The priority function that
   * will be passed to the 'Request' objects that are created
   * internally.
   */
  constructor(resource, priorityFunction) {
    /**
     * The resource that data is requested from
     *
     * @type {Resource}
     * @readonly
     */
    this._resource = resource;

    /**
     * The actual CesiumJS Request object.
     *
     * This created when 'ensureRequested' is called and no
     * request (promise) is currently pending.
     *
     * @type {Request|undefined}
     */
    this._request = undefined;

    /**
     * The possibly pending request promise.
     *
     * This created when 'ensureRequested' is called and no
     * request (promise) is currently pending.
     *
     * @type {Promise<ArrayBuffer>|undefined}
     */
    this._requestPromise = undefined;

    /**
     * The deferred object that contains the promise for the
     * actual result (i.e. the response from the request).
     *
     * This is created once and never changes. Its promise can
     * be obtained with 'getResultPromise'.
     *
     * @type {any}
     * @readonly
     */
    this._deferred = defer();

    /**
     * The listeners that will be informed about the request state
     *
     * @type {Set<RequestListener>}
     * @readonly
     */
    this._requestListeners = new Set();

    /**
     * The priority function that will be passed to the 'Request' objects
     * that are created internally.
     *
     * @type {Function}
     * @readonly
     */
    this._priorityFunction = priorityFunction;
  }

  /**
   * Add the given listener to be informed about the state of the
   * underlying request.
   *
   * @param {RequestListener} requestListener The listener
   */
  addRequestListener(requestListener) {
    this._requestListeners.add(requestListener);
  }

  /**
   * Remove the given listener
   *
   * @param {RequestListener} requestListener The listener
   */
  removeRequestListener(requestListener) {
    this._requestListeners.delete(requestListener);
  }

  /**
   * Returns the promise for the result of the request.
   *
   * This will never be 'undefined'. It will never change. It will
   * just be a promise that is either fulfilled with the response
   * data from the request, or rejected with an error indicating
   * the reason for the rejection.
   *
   * The error may simply indicate that the request was cancelled
   * (or never issued due to this throttling thingy).
   *
   * @returns {Promise<ArrayBuffer>} The promise
   */
  getResultPromise() {
    return this._deferred.promise;
  }

  /**
   * Ensure that there is a pending request, and that the promise
   * that was returned bs 'getResultPromise' will eventually be
   * fulfilled or rejected.
   *
   * This has to be called ~"in each frame". It will take care of
   * making sure that the request is actually going out, eventually.
   */
  ensureRequested() {
    // Return immediately if there already is a pending promise.
    if (defined(this._requestPromise)) {
      return;
    }

    // Create the request and assign it to the resource.
    const request = this._createRequest();
    this._request = request;
    const resource = this._resource;
    resource.request = request;

    // Try to perform the actual request. Note that throttling may cause
    // 'fetchArrayBuffer' to return 'undefined'. In this case, wait for
    // the next call to 'ensureRequested'.
    const requestPromise = resource.fetchArrayBuffer();
    if (!defined(requestPromise)) {
      if (REQUEST_HANDLE_LOGGING) {
        console.log(
          `RequestHandle: Could not schedule request for ${request.url}, probably throttling`,
        );
      }
      this._fireRequestAttempted();
      return;
    }
    this._fireRequestStarted();
    this._requestPromise = requestPromise;

    // When the promise is fulfilled, resolve it with the array buffer
    // from the response.
    // Regardless of whether the promise is fulfilled or rejected (with
    // an 'undefined' error), it may always have been cancelled. No
    // matter where the cancellation appears, reject the result promise
    // with the CANCELLED state.
    const onFulfilled = (/** @type {ArrayBuffer} */ arrayBuffer) => {
      if (request.state === RequestState.CANCELLED) {
        if (REQUEST_HANDLE_LOGGING) {
          console.log(
            `RequestHandle: Resource promise fulfilled but cancelled for ${request.url}`,
          );
        }
        this._requestPromise = undefined;

        const rejectionError = new Error("Request was cancelled");
        // Note: The nonstandard "_code" property is added here,
        // so that it can be checked in "onRequestRejected"
        // @ts-expect-error A nonstandard property to describe the error reason
        rejectionError._code = RequestState.CANCELLED;
        this._deferred.reject(rejectionError);
        this._fireRequestCancelled();
        this._fireRequestAttempted();
        return;
      }
      if (REQUEST_HANDLE_LOGGING) {
        console.log(
          `RequestHandle: Resource promise fulfilled for ${request.url}`,
        );
      }
      this._deferred.resolve(arrayBuffer);
      this._fireRequestCompleted();
    };

    // Only when there is a real error, reject the result promise with
    // this exact error. Otherwise, do that CANCELLED handling.
    const onRejected = (/** @type {any} */ error) => {
      if (REQUEST_HANDLE_LOGGING) {
        console.log(
          `RequestHandle: Request promise rejected for ${request.url} with error ${error}, checking for cancellation....`,
        );
      }
      if (request.state === RequestState.CANCELLED) {
        if (REQUEST_HANDLE_LOGGING) {
          console.log(
            `RequestHandle: Request promise rejected but actually only cancelled for ${request.url} - better luck next time!`,
          );
        }
        this._requestPromise = undefined;
        const rejectionError = new Error("Request was cancelled internally");
        // Note: The nonstandard "_code" property is added here,
        // so that it can be checked in "onRequestRejected"
        // @ts-expect-error A nonstandard property to describe the error reason
        rejectionError._code = RequestState.CANCELLED;
        this._deferred.reject(rejectionError);
        this._fireRequestCancelled();
        this._fireRequestAttempted();
        return;
      }
      this._deferred.reject(error);
      this._fireRequestFailed();
      this._fireRequestAttempted();
    };
    requestPromise.then(onFulfilled, onRejected);
  }

  /**
   * Create and return the request.
   *
   * @returns {Request} The request
   */
  _createRequest() {
    const request = new Request({
      throttle: true,
      throttleByServer: true,
      type: RequestType.TILES3D,
      priorityFunction: this._priorityFunction,
    });
    return request;
  }

  /**
   * Cancel any pending request.
   *
   * This will cause a rejection of the result promise, regardless of
   * whether there actually was a pending CesiumJS Request or not.
   *
   * Listeners will only be informed about a cancelled/attempted
   * request if there was a pending request. Don't blame me.
   */
  cancel() {
    if (defined(this._request)) {
      // @ts-expect-error The 'cancel' method is private.
      this._request.cancel();
    }
    const rejectionError = new Error("Request was cancelled");
    // Note: The nonstandard "_code" property is added here,
    // so that it can be checked in "onRequestRejected"
    // @ts-expect-error A nonstandard property to describe the error reason
    rejectionError._code = RequestState.CANCELLED;
    this._deferred.reject(rejectionError);
    if (defined(this._request)) {
      this._fireRequestCancelled();
      this._fireRequestAttempted();
      this._request = undefined;
    }
  }

  /**
   * Inform all registered listeners that the request was attempted
   */
  _fireRequestAttempted() {
    for (const requestListener of this._requestListeners) {
      requestListener.requestAttempted(this._request);
    }
  }

  /**
   * Inform all registered listeners that the request was started
   */
  _fireRequestStarted() {
    for (const requestListener of this._requestListeners) {
      requestListener.requestStarted(this._request);
    }
  }

  /**
   * Inform all registered listeners that the request was cancelled
   */
  _fireRequestCancelled() {
    for (const requestListener of this._requestListeners) {
      requestListener.requestCancelled(this._request);
    }
  }

  /**
   * Inform all registered listeners that the request was completed
   */
  _fireRequestCompleted() {
    for (const requestListener of this._requestListeners) {
      requestListener.requestCompleted(this._request);
    }
  }

  /**
   * Inform all registered listeners that the request failed
   */
  _fireRequestFailed() {
    for (const requestListener of this._requestListeners) {
      requestListener.requestFailed(this._request);
    }
  }
}
export default RequestHandle;

export { RequestListener, LoggingRequestListener };
