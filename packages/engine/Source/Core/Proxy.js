import DeveloperError from "./DeveloperError.js";

/**
 * Base class for proxying requested made by {@link Resource}.
 *
 * @alias Proxy
 * @constructor
 *
 * @see DefaultProxy
 */
function Proxy() {
  DeveloperError.throwInstantiationError();
}

/**
 * Get the final URL to use to request a given resource.
 *
 * @param {string} resource The resource to request.
 * @returns {string} proxied resource
 * @function
 */
Proxy.prototype.getURL = DeveloperError.throwInstantiationError;

export default Proxy;
