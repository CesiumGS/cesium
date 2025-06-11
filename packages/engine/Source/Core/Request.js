import Frozen from "./Frozen.js";
import defined from "./defined.js";
import RequestState from "./RequestState.js";
import RequestType from "./RequestType.js";

/**
 * Stores information for making a request. In general this does not need to be constructed directly.
 *
 * @alias Request
 * @constructor

 * @param {object} [options] An object with the following properties:
 * @param {string} [options.url] The url to request.
 * @param {Request.RequestCallback} [options.requestFunction] The function that makes the actual data request.
 * @param {Request.CancelCallback} [options.cancelFunction] The function that is called when the request is cancelled.
 * @param {Request.PriorityCallback} [options.priorityFunction] The function that is called to update the request's priority, which occurs once per frame.
 * @param {number} [options.priority=0.0] The initial priority of the request.
 * @param {boolean} [options.throttle=false] Whether to throttle and prioritize the request. If false, the request will be sent immediately. If true, the request will be throttled and sent based on priority.
 * @param {boolean} [options.throttleByServer=false] Whether to throttle the request by server.
 * @param {RequestType} [options.type=RequestType.OTHER] The type of request.
 * @param {string} [options.serverKey] A key used to identify the server that a request is going to.
 */
function Request(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  const throttleByServer = options.throttleByServer ?? false;
  const throttle = options.throttle ?? false;

  /**
   * The URL to request.
   *
   * @type {string}
   */
  this.url = options.url;

  /**
   * The function that makes the actual data request.
   *
   * @type {Request.RequestCallback}
   */
  this.requestFunction = options.requestFunction;

  /**
   * The function that is called when the request is cancelled.
   *
   * @type {Request.CancelCallback}
   */
  this.cancelFunction = options.cancelFunction;

  /**
   * The function that is called to update the request's priority, which occurs once per frame.
   *
   * @type {Request.PriorityCallback}
   */
  this.priorityFunction = options.priorityFunction;

  /**
   * Priority is a unit-less value where lower values represent higher priority.
   * For world-based objects, this is usually the distance from the camera.
   * A request that does not have a priority function defaults to a priority of 0.
   *
   * If priorityFunction is defined, this value is updated every frame with the result of that call.
   *
   * @type {number}
   * @default 0.0
   */
  this.priority = options.priority ?? 0.0;

  /**
   * Whether to throttle and prioritize the request. If false, the request will be sent immediately. If true, the
   * request will be throttled and sent based on priority.
   *
   * @type {boolean}
   * @readonly
   *
   * @default false
   */
  this.throttle = throttle;

  /**
   * Whether to throttle the request by server. Browsers typically support about 6-8 parallel connections
   * for HTTP/1 servers, and an unlimited amount of connections for HTTP/2 servers. Setting this value
   * to <code>true</code> is preferable for requests going through HTTP/1 servers.
   *
   * @type {boolean}
   * @readonly
   *
   * @default false
   */
  this.throttleByServer = throttleByServer;

  /**
   * Type of request.
   *
   * @type {RequestType}
   * @readonly
   *
   * @default RequestType.OTHER
   */
  this.type = options.type ?? RequestType.OTHER;

  /**
   * A key used to identify the server that a request is going to. It is derived from the url's authority and scheme.
   *
   * @type {string}
   *
   * @private
   */
  this.serverKey = options.serverKey;

  /**
   * The current state of the request.
   *
   * @type {RequestState}
   * @readonly
   */
  this.state = RequestState.UNISSUED;

  /**
   * The requests's deferred promise.
   *
   * @type {object}
   *
   * @private
   */
  this.deferred = undefined;

  /**
   * Whether the request was explicitly cancelled.
   *
   * @type {boolean}
   *
   * @private
   */
  this.cancelled = false;
}

/**
 * Mark the request as cancelled.
 *
 * @private
 */
Request.prototype.cancel = function () {
  this.cancelled = true;
};

/**
 * Duplicates a Request instance.
 *
 * @param {Request} [result] The object onto which to store the result.
 *
 * @returns {Request} The modified result parameter or a new Resource instance if one was not provided.
 */
Request.prototype.clone = function (result) {
  if (!defined(result)) {
    return new Request(this);
  }

  result.url = this.url;
  result.requestFunction = this.requestFunction;
  result.cancelFunction = this.cancelFunction;
  result.priorityFunction = this.priorityFunction;
  result.priority = this.priority;
  result.throttle = this.throttle;
  result.throttleByServer = this.throttleByServer;
  result.type = this.type;
  result.serverKey = this.serverKey;

  // These get defaulted because the cloned request hasn't been issued
  result.state = RequestState.UNISSUED;
  result.deferred = undefined;
  result.cancelled = false;

  return result;
};

/**
 * The function that makes the actual data request.
 * @callback Request.RequestCallback
 * @returns {Promise<void>} A promise for the requested data.
 */

/**
 * The function that is called when the request is cancelled.
 * @callback Request.CancelCallback
 */

/**
 * The function that is called to update the request's priority, which occurs once per frame.
 * @callback Request.PriorityCallback
 * @returns {number} The updated priority value.
 */
export default Request;
