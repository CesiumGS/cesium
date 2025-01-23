/**
 * A simple proxy that appends the desired resource as the sole query parameter
 * to the given proxy URL.
 *
 * @alias DefaultProxy
 * @constructor
 * @extends {Proxy}
 *
 * @param {string} proxy The proxy URL that will be used to requests all resources.
 */
function DefaultProxy(proxy) {
  this.proxy = proxy;
}

/**
 * Get the final URL to use to request a given resource.
 *
 * @param {string} resource The resource to request.
 * @returns {string} proxied resource
 */
DefaultProxy.prototype.getURL = function (resource) {
  const prefix = this.proxy.indexOf("?") === -1 ? "?" : "";
  return this.proxy + prefix + encodeURIComponent(resource);
};

export default DefaultProxy;
