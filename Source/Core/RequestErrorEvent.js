import defined from "./defined.js";
import parseResponseHeaders from "./parseResponseHeaders.js";

/**
 * An event that is raised when a request encounters an error.
 *
 * @constructor
 * @alias RequestErrorEvent
 *
 * @param {Number} [statusCode] The HTTP error status code, such as 404.
 * @param {Object} [response] The response included along with the error.
 * @param {String|Object} [responseHeaders] The response headers, represented either as an object literal or as a
 *                        string in the format returned by XMLHttpRequest's getAllResponseHeaders() function.
 */
function RequestErrorEvent(statusCode, response, responseHeaders) {
  /**
   * The HTTP error status code, such as 404.  If the error does not have a particular
   * HTTP code, this property will be undefined.
   *
   * @type {Number}
   */
  this.statusCode = statusCode;

  /**
   * The response included along with the error.  If the error does not include a response,
   * this property will be undefined.
   *
   * @type {Object}
   */
  this.response = response;

  /**
   * The headers included in the response, represented as an object literal of key/value pairs.
   * If the error does not include any headers, this property will be undefined.
   *
   * @type {Object}
   */
  this.responseHeaders = responseHeaders;

  if (typeof this.responseHeaders === "string") {
    this.responseHeaders = parseResponseHeaders(this.responseHeaders);
  }
}

/**
 * Creates a string representing this RequestErrorEvent.
 * @memberof RequestErrorEvent
 *
 * @returns {String} A string representing the provided RequestErrorEvent.
 */
RequestErrorEvent.prototype.toString = function () {
  let str = "Request has failed.";
  if (defined(this.statusCode)) {
    str += ` Status Code: ${this.statusCode}`;
  }
  if (defined(this.response)) {
    let rspMsg;
    try {
      rspMsg = JSON.stringify(this.response);
    } catch (e) {
      rspMsg = "failed to serializer response";
    }
    str += `\nResponse was: ${rspMsg}`;
  }
  if (defined(this.responseHeaders)) {
    let rspHeadersMsg;
    try {
      rspHeadersMsg = JSON.stringify(this.responseHeaders);
    } catch (e) {
      rspHeadersMsg = "failed to serializer response headers";
    }
    str += `\nResponse headers were: ${rspHeadersMsg}`;
  }
  return str;
};
export default RequestErrorEvent;
