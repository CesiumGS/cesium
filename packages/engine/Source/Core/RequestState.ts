/**
 * State of the request.
 *
 * @enum {number}
 */
const RequestState = {
  /**
   * Initial unissued state.
   *
   * @type {number}
   * @constant
   */
  UNISSUED: 0,

  /**
   * Issued but not yet active. Will become active when open slots are available.
   *
   * @type {number}
   * @constant
   */
  ISSUED: 1,

  /**
   * Actual http request has been sent.
   *
   * @type {number}
   * @constant
   */
  ACTIVE: 2,

  /**
   * Request completed successfully.
   *
   * @type {number}
   * @constant
   */
  RECEIVED: 3,

  /**
   * Request was cancelled, either explicitly or automatically because of low priority.
   *
   * @type {number}
   * @constant
   */
  CANCELLED: 4,

  /**
   * Request failed.
   *
   * @type {number}
   * @constant
   */
  FAILED: 5,
};
export default Object.freeze(RequestState);
