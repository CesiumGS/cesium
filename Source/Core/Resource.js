import Uri from "../ThirdParty/Uri.js";
import when from "../ThirdParty/when.js";
import appendForwardSlash from "./appendForwardSlash.js";
import Check from "./Check.js";
import clone from "./clone.js";
import combine from "./combine.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import getAbsoluteUri from "./getAbsoluteUri.js";
import getBaseUri from "./getBaseUri.js";
import getExtensionFromUri from "./getExtensionFromUri.js";
import getImagePixels from "./getImagePixels.js";
import isBlobUri from "./isBlobUri.js";
import isCrossOriginUrl from "./isCrossOriginUrl.js";
import isDataUri from "./isDataUri.js";
import loadAndExecuteScript from "./loadAndExecuteScript.js";
import CesiumMath from "./Math.js";
import objectToQuery from "./objectToQuery.js";
import queryToObject from "./queryToObject.js";
import Request from "./Request.js";
import RequestErrorEvent from "./RequestErrorEvent.js";
import RequestScheduler from "./RequestScheduler.js";
import RequestState from "./RequestState.js";
import RuntimeError from "./RuntimeError.js";
import TrustedServers from "./TrustedServers.js";

const xhrBlobSupported = (function () {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "#", true);
    xhr.responseType = "blob";
    return xhr.responseType === "blob";
  } catch (e) {
    return false;
  }
})();

/**
 * Parses a query string and returns the object equivalent.
 *
 * @param {Uri} uri The Uri with a query object.
 * @param {Resource} resource The Resource that will be assigned queryParameters.
 * @param {Boolean} merge If true, we'll merge with the resource's existing queryParameters. Otherwise they will be replaced.
 * @param {Boolean} preserveQueryParameters If true duplicate parameters will be concatenated into an array. If false, keys in uri will take precedence.
 *
 * @private
 */
function parseQuery(uri, resource, merge, preserveQueryParameters) {
  const queryString = uri.query();
  if (queryString.length === 0) {
    return {};
  }

  let query;
  // Special case we run into where the querystring is just a string, not key/value pairs
  if (queryString.indexOf("=") === -1) {
    const result = {};
    result[queryString] = undefined;
    query = result;
  } else {
    query = queryToObject(queryString);
  }

  if (merge) {
    resource._queryParameters = combineQueryParameters(
      query,
      resource._queryParameters,
      preserveQueryParameters
    );
  } else {
    resource._queryParameters = query;
  }
  uri.search("");
}

/**
 * Converts a query object into a string.
 *
 * @param {Uri} uri The Uri object that will have the query object set.
 * @param {Resource} resource The resource that has queryParameters
 *
 * @private
 */
function stringifyQuery(uri, resource) {
  const queryObject = resource._queryParameters;

  const keys = Object.keys(queryObject);

  // We have 1 key with an undefined value, so this is just a string, not key/value pairs
  if (keys.length === 1 && !defined(queryObject[keys[0]])) {
    uri.search(keys[0]);
  } else {
    uri.search(objectToQuery(queryObject));
  }
}

/**
 * Clones a value if it is defined, otherwise returns the default value
 *
 * @param {*} [val] The value to clone.
 * @param {*} [defaultVal] The default value.
 *
 * @returns {*} A clone of val or the defaultVal.
 *
 * @private
 */
function defaultClone(val, defaultVal) {
  if (!defined(val)) {
    return defaultVal;
  }

  return defined(val.clone) ? val.clone() : clone(val);
}

/**
 * Checks to make sure the Resource isn't already being requested.
 *
 * @param {Request} request The request to check.
 *
 * @private
 */
function checkAndResetRequest(request) {
  if (
    request.state === RequestState.ISSUED ||
    request.state === RequestState.ACTIVE
  ) {
    throw new RuntimeError("The Resource is already being fetched.");
  }

  request.state = RequestState.UNISSUED;
  request.deferred = undefined;
}

/**
 * This combines a map of query parameters.
 *
 * @param {Object} q1 The first map of query parameters. Values in this map will take precedence if preserveQueryParameters is false.
 * @param {Object} q2 The second map of query parameters.
 * @param {Boolean} preserveQueryParameters If true duplicate parameters will be concatenated into an array. If false, keys in q1 will take precedence.
 *
 * @returns {Object} The combined map of query parameters.
 *
 * @example
 * const q1 = {
 *   a: 1,
 *   b: 2
 * };
 * const q2 = {
 *   a: 3,
 *   c: 4
 * };
 * const q3 = {
 *   b: [5, 6],
 *   d: 7
 * }
 *
 * // Returns
 * // {
 * //   a: [1, 3],
 * //   b: 2,
 * //   c: 4
 * // };
 * combineQueryParameters(q1, q2, true);
 *
 * // Returns
 * // {
 * //   a: 1,
 * //   b: 2,
 * //   c: 4
 * // };
 * combineQueryParameters(q1, q2, false);
 *
 * // Returns
 * // {
 * //   a: 1,
 * //   b: [2, 5, 6],
 * //   d: 7
 * // };
 * combineQueryParameters(q1, q3, true);
 *
 * // Returns
 * // {
 * //   a: 1,
 * //   b: 2,
 * //   d: 7
 * // };
 * combineQueryParameters(q1, q3, false);
 *
 * @private
 */
function combineQueryParameters(q1, q2, preserveQueryParameters) {
  if (!preserveQueryParameters) {
    return combine(q1, q2);
  }

  const result = clone(q1, true);
  for (const param in q2) {
    if (q2.hasOwnProperty(param)) {
      let value = result[param];
      const q2Value = q2[param];
      if (defined(value)) {
        if (!Array.isArray(value)) {
          value = result[param] = [value];
        }

        result[param] = value.concat(q2Value);
      } else {
        result[param] = Array.isArray(q2Value) ? q2Value.slice() : q2Value;
      }
    }
  }

  return result;
}

/**
 * A resource that includes the location and any other parameters we need to retrieve it or create derived resources. It also provides the ability to retry requests.
 *
 * @alias Resource
 * @constructor
 *
 * @param {String|Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 *
 * @example
 * function refreshTokenRetryCallback(resource, error) {
 *   if (error.statusCode === 403) {
 *     // 403 status code means a new token should be generated
 *     return getNewAccessToken()
 *       .then(function(token) {
 *         resource.queryParameters.access_token = token;
 *         return true;
 *       })
 *       .otherwise(function() {
 *         return false;
 *       });
 *   }
 *
 *   return false;
 * }
 *
 * const resource = new Resource({
 *    url: 'http://server.com/path/to/resource.json',
 *    proxy: new DefaultProxy('/proxy/'),
 *    headers: {
 *      'X-My-Header': 'valueOfHeader'
 *    },
 *    queryParameters: {
 *      'access_token': '123-435-456-000'
 *    },
 *    retryCallback: refreshTokenRetryCallback,
 *    retryAttempts: 1
 * });
 */
function Resource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  if (typeof options === "string") {
    options = {
      url: options,
    };
  }

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.url", options.url);
  //>>includeEnd('debug');

  this._url = undefined;
  this._templateValues = defaultClone(options.templateValues, {});
  this._queryParameters = defaultClone(options.queryParameters, {});

  /**
   * Additional HTTP headers that will be sent with the request.
   *
   * @type {Object}
   */
  this.headers = defaultClone(options.headers, {});

  /**
   * A Request object that will be used. Intended for internal use only.
   *
   * @type {Request}
   */
  this.request = defaultValue(options.request, new Request());

  /**
   * A proxy to be used when loading the resource.
   *
   * @type {Proxy}
   */
  this.proxy = options.proxy;

  /**
   * Function to call when a request for this resource fails. If it returns true or a Promise that resolves to true, the request will be retried.
   *
   * @type {Function}
   */
  this.retryCallback = options.retryCallback;

  /**
   * The number of times the retryCallback should be called before giving up.
   *
   * @type {Number}
   */
  this.retryAttempts = defaultValue(options.retryAttempts, 0);
  this._retryCount = 0;

  const uri = new Uri(options.url);
  parseQuery(uri, this, true, true);

  // Remove the fragment as it's not sent with a request
  uri.fragment("");

  this._url = uri.toString();
}

/**
 * A helper function to create a resource depending on whether we have a String or a Resource
 *
 * @param {Resource|String} resource A Resource or a String to use when creating a new Resource.
 *
 * @returns {Resource} If resource is a String, a Resource constructed with the url and options. Otherwise the resource parameter is returned.
 *
 * @private
 */
Resource.createIfNeeded = function (resource) {
  if (resource instanceof Resource) {
    // Keep existing request object. This function is used internally to duplicate a Resource, so that it can't
    //  be modified outside of a class that holds it (eg. an imagery or terrain provider). Since the Request objects
    //  are managed outside of the providers, by the tile loading code, we want to keep the request property the same so if it is changed
    //  in the underlying tiling code the requests for this resource will use it.
    return resource.getDerivedResource({
      request: resource.request,
    });
  }

  if (typeof resource !== "string") {
    return resource;
  }

  return new Resource({
    url: resource,
  });
};

let supportsImageBitmapOptionsPromise;
/**
 * A helper function to check whether createImageBitmap supports passing ImageBitmapOptions.
 *
 * @returns {Promise<Boolean>} A promise that resolves to true if this browser supports creating an ImageBitmap with options.
 *
 * @private
 */
Resource.supportsImageBitmapOptions = function () {
  // Until the HTML folks figure out what to do about this, we need to actually try loading an image to
  // know if this browser supports passing options to the createImageBitmap function.
  // https://github.com/whatwg/html/pull/4248
  //
  // We also need to check whether the colorSpaceConversion option is supported.
  // We do this by loading a PNG with an embedded color profile, first with
  // colorSpaceConversion: "none" and then with colorSpaceConversion: "default".
  // If the pixel color is different then we know the option is working.
  // As of Webkit 17612.3.6.1.6 the createImageBitmap promise resolves but the
  // option is not actually supported.
  if (defined(supportsImageBitmapOptionsPromise)) {
    return supportsImageBitmapOptionsPromise;
  }

  if (typeof createImageBitmap !== "function") {
    supportsImageBitmapOptionsPromise = when.resolve(false);
    return supportsImageBitmapOptionsPromise;
  }

  const imageDataUri =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAABGdBTUEAAE4g3rEiDgAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAADElEQVQI12Ng6GAAAAEUAIngE3ZiAAAAAElFTkSuQmCC";

  supportsImageBitmapOptionsPromise = Resource.fetchBlob({
    url: imageDataUri,
  })
    .then(function (blob) {
      const imageBitmapOptions = {
        imageOrientation: "flipY", // default is "none"
        premultiplyAlpha: "none", // default is "default"
        colorSpaceConversion: "none", // default is "default"
      };
      return when.all([
        createImageBitmap(blob, imageBitmapOptions),
        createImageBitmap(blob),
      ]);
    })
    .then(function (imageBitmaps) {
      // Check whether the colorSpaceConversion option had any effect on the green channel
      const colorWithOptions = getImagePixels(imageBitmaps[0]);
      const colorWithDefaults = getImagePixels(imageBitmaps[1]);
      return colorWithOptions[1] !== colorWithDefaults[1];
    })
    .otherwise(function () {
      return false;
    });

  return supportsImageBitmapOptionsPromise;
};

Object.defineProperties(Resource, {
  /**
   * Returns true if blobs are supported.
   *
   * @memberof Resource
   * @type {Boolean}
   *
   * @readonly
   */
  isBlobSupported: {
    get: function () {
      return xhrBlobSupported;
    },
  },
});

Object.defineProperties(Resource.prototype, {
  /**
   * Query parameters appended to the url.
   *
   * @memberof Resource.prototype
   * @type {Object}
   *
   * @readonly
   */
  queryParameters: {
    get: function () {
      return this._queryParameters;
    },
  },

  /**
   * The key/value pairs used to replace template parameters in the url.
   *
   * @memberof Resource.prototype
   * @type {Object}
   *
   * @readonly
   */
  templateValues: {
    get: function () {
      return this._templateValues;
    },
  },

  /**
   * The url to the resource with template values replaced, query string appended and encoded by proxy if one was set.
   *
   * @memberof Resource.prototype
   * @type {String}
   */
  url: {
    get: function () {
      return this.getUrlComponent(true, true);
    },
    set: function (value) {
      const uri = new Uri(value);

      parseQuery(uri, this, false);

      // Remove the fragment as it's not sent with a request
      uri.fragment("");

      this._url = uri.toString();
    },
  },

  /**
   * The file extension of the resource.
   *
   * @memberof Resource.prototype
   * @type {String}
   *
   * @readonly
   */
  extension: {
    get: function () {
      return getExtensionFromUri(this._url);
    },
  },

  /**
   * True if the Resource refers to a data URI.
   *
   * @memberof Resource.prototype
   * @type {Boolean}
   */
  isDataUri: {
    get: function () {
      return isDataUri(this._url);
    },
  },

  /**
   * True if the Resource refers to a blob URI.
   *
   * @memberof Resource.prototype
   * @type {Boolean}
   */
  isBlobUri: {
    get: function () {
      return isBlobUri(this._url);
    },
  },

  /**
   * True if the Resource refers to a cross origin URL.
   *
   * @memberof Resource.prototype
   * @type {Boolean}
   */
  isCrossOriginUrl: {
    get: function () {
      return isCrossOriginUrl(this._url);
    },
  },

  /**
   * True if the Resource has request headers. This is equivalent to checking if the headers property has any keys.
   *
   * @memberof Resource.prototype
   * @type {Boolean}
   */
  hasHeaders: {
    get: function () {
      return Object.keys(this.headers).length > 0;
    },
  },
});

/**
 * Override Object#toString so that implicit string conversion gives the
 * complete URL represented by this Resource.
 *
 * @returns {String} The URL represented by this Resource
 */
Resource.prototype.toString = function () {
  return this.getUrlComponent(true, true);
};

/**
 * Returns the url, optional with the query string and processed by a proxy.
 *
 * @param {Boolean} [query=false] If true, the query string is included.
 * @param {Boolean} [proxy=false] If true, the url is processed by the proxy object, if defined.
 *
 * @returns {String} The url with all the requested components.
 */
Resource.prototype.getUrlComponent = function (query, proxy) {
  if (this.isDataUri) {
    return this._url;
  }

  const uri = new Uri(this._url);

  if (query) {
    stringifyQuery(uri, this);
  }

  // objectToQuery escapes the placeholders.  Undo that.
  let url = uri.toString().replace(/%7B/g, "{").replace(/%7D/g, "}");

  const templateValues = this._templateValues;
  url = url.replace(/{(.*?)}/g, function (match, key) {
    const replacement = templateValues[key];
    if (defined(replacement)) {
      // use the replacement value from templateValues if there is one...
      return encodeURIComponent(replacement);
    }
    // otherwise leave it unchanged
    return match;
  });

  if (proxy && defined(this.proxy)) {
    url = this.proxy.getURL(url);
  }
  return url;
};

/**
 * Combines the specified object and the existing query parameters. This allows you to add many parameters at once,
 *  as opposed to adding them one at a time to the queryParameters property. If a value is already set, it will be replaced with the new value.
 *
 * @param {Object} params The query parameters
 * @param {Boolean} [useAsDefault=false] If true the params will be used as the default values, so they will only be set if they are undefined.
 */
Resource.prototype.setQueryParameters = function (params, useAsDefault) {
  if (useAsDefault) {
    this._queryParameters = combineQueryParameters(
      this._queryParameters,
      params,
      false
    );
  } else {
    this._queryParameters = combineQueryParameters(
      params,
      this._queryParameters,
      false
    );
  }
};

/**
 * Combines the specified object and the existing query parameters. This allows you to add many parameters at once,
 *  as opposed to adding them one at a time to the queryParameters property.
 *
 * @param {Object} params The query parameters
 */
Resource.prototype.appendQueryParameters = function (params) {
  this._queryParameters = combineQueryParameters(
    params,
    this._queryParameters,
    true
  );
};

/**
 * Combines the specified object and the existing template values. This allows you to add many values at once,
 *  as opposed to adding them one at a time to the templateValues property. If a value is already set, it will become an array and the new value will be appended.
 *
 * @param {Object} template The template values
 * @param {Boolean} [useAsDefault=false] If true the values will be used as the default values, so they will only be set if they are undefined.
 */
Resource.prototype.setTemplateValues = function (template, useAsDefault) {
  if (useAsDefault) {
    this._templateValues = combine(this._templateValues, template);
  } else {
    this._templateValues = combine(template, this._templateValues);
  }
};

/**
 * Returns a resource relative to the current instance. All properties remain the same as the current instance unless overridden in options.
 *
 * @param {Object} options An object with the following properties
 * @param {String} [options.url]  The url that will be resolved relative to the url of the current instance.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be combined with those of the current instance.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}). These will be combined with those of the current instance.
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The function to call when loading the resource fails.
 * @param {Number} [options.retryAttempts] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @param {Boolean} [options.preserveQueryParameters=false] If true, this will keep all query parameters from the current resource and derived resource. If false, derived parameters will replace those of the current resource.
 *
 * @returns {Resource} The resource derived from the current one.
 */
Resource.prototype.getDerivedResource = function (options) {
  const resource = this.clone();
  resource._retryCount = 0;

  if (defined(options.url)) {
    const uri = new Uri(options.url);

    const preserveQueryParameters = defaultValue(
      options.preserveQueryParameters,
      false
    );
    parseQuery(uri, resource, true, preserveQueryParameters);

    // Remove the fragment as it's not sent with a request
    uri.fragment("");

    if (uri.scheme() !== "") {
      resource._url = uri.toString();
    } else {
      resource._url = uri
        .absoluteTo(new Uri(getAbsoluteUri(this._url)))
        .toString();
    }
  }

  if (defined(options.queryParameters)) {
    resource._queryParameters = combine(
      options.queryParameters,
      resource._queryParameters
    );
  }
  if (defined(options.templateValues)) {
    resource._templateValues = combine(
      options.templateValues,
      resource.templateValues
    );
  }
  if (defined(options.headers)) {
    resource.headers = combine(options.headers, resource.headers);
  }
  if (defined(options.proxy)) {
    resource.proxy = options.proxy;
  }
  if (defined(options.request)) {
    resource.request = options.request;
  }
  if (defined(options.retryCallback)) {
    resource.retryCallback = options.retryCallback;
  }
  if (defined(options.retryAttempts)) {
    resource.retryAttempts = options.retryAttempts;
  }

  return resource;
};

/**
 * Called when a resource fails to load. This will call the retryCallback function if defined until retryAttempts is reached.
 *
 * @param {Error} [error] The error that was encountered.
 *
 * @returns {Promise<Boolean>} A promise to a boolean, that if true will cause the resource request to be retried.
 *
 * @private
 */
Resource.prototype.retryOnError = function (error) {
  const retryCallback = this.retryCallback;
  if (
    typeof retryCallback !== "function" ||
    this._retryCount >= this.retryAttempts
  ) {
    return when(false);
  }

  const that = this;
  return when(retryCallback(this, error)).then(function (result) {
    ++that._retryCount;

    return result;
  });
};

/**
 * Duplicates a Resource instance.
 *
 * @param {Resource} [result] The object onto which to store the result.
 *
 * @returns {Resource} The modified result parameter or a new Resource instance if one was not provided.
 */
Resource.prototype.clone = function (result) {
  if (!defined(result)) {
    result = new Resource({
      url: this._url,
    });
  }

  result._url = this._url;
  result._queryParameters = clone(this._queryParameters);
  result._templateValues = clone(this._templateValues);
  result.headers = clone(this.headers);
  result.proxy = this.proxy;
  result.retryCallback = this.retryCallback;
  result.retryAttempts = this.retryAttempts;
  result._retryCount = 0;
  result.request = this.request.clone();

  return result;
};

/**
 * Returns the base path of the Resource.
 *
 * @param {Boolean} [includeQuery = false] Whether or not to include the query string and fragment form the uri
 *
 * @returns {String} The base URI of the resource
 */
Resource.prototype.getBaseUri = function (includeQuery) {
  return getBaseUri(this.getUrlComponent(includeQuery), includeQuery);
};

/**
 * Appends a forward slash to the URL.
 */
Resource.prototype.appendForwardSlash = function () {
  this._url = appendForwardSlash(this._url);
};

/**
 * Asynchronously loads the resource as raw binary data.  Returns a promise that will resolve to
 * an ArrayBuffer once loaded, or reject if the resource failed to load.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
 *
 * @returns {Promise.<ArrayBuffer>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 * @example
 * // load a single URL asynchronously
 * resource.fetchArrayBuffer().then(function(arrayBuffer) {
 *     // use the data
 * }).otherwise(function(error) {
 *     // an error occurred
 * });
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.fetchArrayBuffer = function () {
  return this.fetch({
    responseType: "arraybuffer",
  });
};

/**
 * Creates a Resource and calls fetchArrayBuffer() on it.
 *
 * @param {String|Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @returns {Promise.<ArrayBuffer>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.fetchArrayBuffer = function (options) {
  const resource = new Resource(options);
  return resource.fetchArrayBuffer();
};

/**
 * Asynchronously loads the given resource as a blob.  Returns a promise that will resolve to
 * a Blob once loaded, or reject if the resource failed to load.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
 *
 * @returns {Promise.<Blob>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 * @example
 * // load a single URL asynchronously
 * resource.fetchBlob().then(function(blob) {
 *     // use the data
 * }).otherwise(function(error) {
 *     // an error occurred
 * });
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.fetchBlob = function () {
  return this.fetch({
    responseType: "blob",
  });
};

/**
 * Creates a Resource and calls fetchBlob() on it.
 *
 * @param {String|Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @returns {Promise.<Blob>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.fetchBlob = function (options) {
  const resource = new Resource(options);
  return resource.fetchBlob();
};

/**
 * Asynchronously loads the given image resource.  Returns a promise that will resolve to
 * an {@link https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap|ImageBitmap} if <code>preferImageBitmap</code> is true and the browser supports <code>createImageBitmap</code> or otherwise an
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement|Image} once loaded, or reject if the image failed to load.
 *
 * @param {Object} [options] An object with the following properties.
 * @param {Boolean} [options.preferBlob=false] If true, we will load the image via a blob.
 * @param {Boolean} [options.preferImageBitmap=false] If true, image will be decoded during fetch and an <code>ImageBitmap</code> is returned.
 * @param {Boolean} [options.flipY=false] If true, image will be vertically flipped during decode. Only applies if the browser supports <code>createImageBitmap</code>.
 * @param {Boolean} [options.skipColorSpaceConversion=false] If true, any custom gamma or color profiles in the image will be ignored. Only applies if the browser supports <code>createImageBitmap</code>.
 * @returns {Promise.<ImageBitmap>|Promise.<HTMLImageElement>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 *
 * @example
 * // load a single image asynchronously
 * resource.fetchImage().then(function(image) {
 *     // use the loaded image
 * }).otherwise(function(error) {
 *     // an error occurred
 * });
 *
 * // load several images in parallel
 * when.all([resource1.fetchImage(), resource2.fetchImage()]).then(function(images) {
 *     // images is an array containing all the loaded images
 * });
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.fetchImage = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const preferImageBitmap = defaultValue(options.preferImageBitmap, false);
  const preferBlob = defaultValue(options.preferBlob, false);
  const flipY = defaultValue(options.flipY, false);
  const skipColorSpaceConversion = defaultValue(
    options.skipColorSpaceConversion,
    false
  );

  checkAndResetRequest(this.request);
  // We try to load the image normally if
  // 1. Blobs aren't supported
  // 2. It's a data URI
  // 3. It's a blob URI
  // 4. It doesn't have request headers and we preferBlob is false
  if (
    !xhrBlobSupported ||
    this.isDataUri ||
    this.isBlobUri ||
    (!this.hasHeaders && !preferBlob)
  ) {
    return fetchImage({
      resource: this,
      flipY: flipY,
      skipColorSpaceConversion: skipColorSpaceConversion,
      preferImageBitmap: preferImageBitmap,
    });
  }

  const blobPromise = this.fetchBlob();
  if (!defined(blobPromise)) {
    return;
  }

  let supportsImageBitmap;
  let useImageBitmap;
  let generatedBlobResource;
  let generatedBlob;
  return Resource.supportsImageBitmapOptions()
    .then(function (result) {
      supportsImageBitmap = result;
      useImageBitmap = supportsImageBitmap && preferImageBitmap;
      return blobPromise;
    })
    .then(function (blob) {
      if (!defined(blob)) {
        return;
      }
      generatedBlob = blob;
      if (useImageBitmap) {
        return Resource.createImageBitmapFromBlob(blob, {
          flipY: flipY,
          premultiplyAlpha: false,
          skipColorSpaceConversion: skipColorSpaceConversion,
        });
      }
      const blobUrl = window.URL.createObjectURL(blob);
      generatedBlobResource = new Resource({
        url: blobUrl,
      });

      return fetchImage({
        resource: generatedBlobResource,
        flipY: flipY,
        skipColorSpaceConversion: skipColorSpaceConversion,
        preferImageBitmap: false,
      });
    })
    .then(function (image) {
      if (!defined(image)) {
        return;
      }

      // The blob object may be needed for use by a TileDiscardPolicy,
      // so attach it to the image.
      image.blob = generatedBlob;

      if (useImageBitmap) {
        return image;
      }

      window.URL.revokeObjectURL(generatedBlobResource.url);
      return image;
    })
    .otherwise(function (error) {
      if (defined(generatedBlobResource)) {
        window.URL.revokeObjectURL(generatedBlobResource.url);
      }

      // If the blob load succeeded but the image decode failed, attach the blob
      // to the error object for use by a TileDiscardPolicy.
      // In particular, BingMapsImageryProvider uses this to detect the
      // zero-length response that is returned when a tile is not available.
      error.blob = generatedBlob;

      return when.reject(error);
    });
};

/**
 * Fetches an image and returns a promise to it.
 *
 * @param {Object} [options] An object with the following properties.
 * @param {Resource} [options.resource] Resource object that points to an image to fetch.
 * @param {Boolean} [options.preferImageBitmap] If true, image will be decoded during fetch and an <code>ImageBitmap</code> is returned.
 * @param {Boolean} [options.flipY] If true, image will be vertically flipped during decode. Only applies if the browser supports <code>createImageBitmap</code>.
 * @param {Boolean} [options.skipColorSpaceConversion=false] If true, any custom gamma or color profiles in the image will be ignored. Only applies if the browser supports <code>createImageBitmap</code>.
 * @private
 */
function fetchImage(options) {
  const resource = options.resource;
  const flipY = options.flipY;
  const skipColorSpaceConversion = options.skipColorSpaceConversion;
  const preferImageBitmap = options.preferImageBitmap;

  const request = resource.request;
  request.url = resource.url;
  request.requestFunction = function () {
    let crossOrigin = false;

    // data URIs can't have crossorigin set.
    if (!resource.isDataUri && !resource.isBlobUri) {
      crossOrigin = resource.isCrossOriginUrl;
    }

    const deferred = when.defer();
    Resource._Implementations.createImage(
      request,
      crossOrigin,
      deferred,
      flipY,
      skipColorSpaceConversion,
      preferImageBitmap
    );

    return deferred.promise;
  };

  const promise = RequestScheduler.request(request);
  if (!defined(promise)) {
    return;
  }

  return promise.otherwise(function (e) {
    // Don't retry cancelled or otherwise aborted requests
    if (request.state !== RequestState.FAILED) {
      return when.reject(e);
    }
    return resource.retryOnError(e).then(function (retry) {
      if (retry) {
        // Reset request so it can try again
        request.state = RequestState.UNISSUED;
        request.deferred = undefined;

        return fetchImage({
          resource: resource,
          flipY: flipY,
          skipColorSpaceConversion: skipColorSpaceConversion,
          preferImageBitmap: preferImageBitmap,
        });
      }
      return when.reject(e);
    });
  });
}

/**
 * Creates a Resource and calls fetchImage() on it.
 *
 * @param {String|Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Boolean} [options.flipY=false] Whether to vertically flip the image during fetch and decode. Only applies when requesting an image and the browser supports <code>createImageBitmap</code>.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @param {Boolean} [options.preferBlob=false]  If true, we will load the image via a blob.
 * @param {Boolean} [options.preferImageBitmap=false] If true, image will be decoded during fetch and an <code>ImageBitmap</code> is returned.
 * @param {Boolean} [options.skipColorSpaceConversion=false] If true, any custom gamma or color profiles in the image will be ignored. Only applies when requesting an image and the browser supports <code>createImageBitmap</code>.
 * @returns {Promise.<ImageBitmap>|Promise.<HTMLImageElement>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.fetchImage = function (options) {
  const resource = new Resource(options);
  return resource.fetchImage({
    flipY: options.flipY,
    skipColorSpaceConversion: options.skipColorSpaceConversion,
    preferBlob: options.preferBlob,
    preferImageBitmap: options.preferImageBitmap,
  });
};

/**
 * Asynchronously loads the given resource as text.  Returns a promise that will resolve to
 * a String once loaded, or reject if the resource failed to load.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
 *
 * @returns {Promise.<String>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 * @example
 * // load text from a URL, setting a custom header
 * const resource = new Resource({
 *   url: 'http://someUrl.com/someJson.txt',
 *   headers: {
 *     'X-Custom-Header' : 'some value'
 *   }
 * });
 * resource.fetchText().then(function(text) {
 *     // Do something with the text
 * }).otherwise(function(error) {
 *     // an error occurred
 * });
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest|XMLHttpRequest}
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.fetchText = function () {
  return this.fetch({
    responseType: "text",
  });
};

/**
 * Creates a Resource and calls fetchText() on it.
 *
 * @param {String|Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @returns {Promise.<String>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.fetchText = function (options) {
  const resource = new Resource(options);
  return resource.fetchText();
};

// note: &#42;&#47;&#42; below is */* but that ends the comment block early
/**
 * Asynchronously loads the given resource as JSON.  Returns a promise that will resolve to
 * a JSON object once loaded, or reject if the resource failed to load.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled. This function
 * adds 'Accept: application/json,&#42;&#47;&#42;;q=0.01' to the request headers, if not
 * already specified.
 *
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 *
 * @example
 * resource.fetchJson().then(function(jsonData) {
 *     // Do something with the JSON object
 * }).otherwise(function(error) {
 *     // an error occurred
 * });
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.fetchJson = function () {
  const promise = this.fetch({
    responseType: "text",
    headers: {
      Accept: "application/json,*/*;q=0.01",
    },
  });

  if (!defined(promise)) {
    return undefined;
  }

  return promise.then(function (value) {
    if (!defined(value)) {
      return;
    }
    return JSON.parse(value);
  });
};

/**
 * Creates a Resource and calls fetchJson() on it.
 *
 * @param {String|Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.fetchJson = function (options) {
  const resource = new Resource(options);
  return resource.fetchJson();
};

/**
 * Asynchronously loads the given resource as XML.  Returns a promise that will resolve to
 * an XML Document once loaded, or reject if the resource failed to load.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
 *
 * @returns {Promise.<XMLDocument>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 *
 * @example
 * // load XML from a URL, setting a custom header
 * Cesium.loadXML('http://someUrl.com/someXML.xml', {
 *   'X-Custom-Header' : 'some value'
 * }).then(function(document) {
 *     // Do something with the document
 * }).otherwise(function(error) {
 *     // an error occurred
 * });
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest|XMLHttpRequest}
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.fetchXML = function () {
  return this.fetch({
    responseType: "document",
    overrideMimeType: "text/xml",
  });
};

/**
 * Creates a Resource and calls fetchXML() on it.
 *
 * @param {String|Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @returns {Promise.<XMLDocument>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.fetchXML = function (options) {
  const resource = new Resource(options);
  return resource.fetchXML();
};

/**
 * Requests a resource using JSONP.
 *
 * @param {String} [callbackParameterName='callback'] The callback parameter name that the server expects.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 *
 * @example
 * // load a data asynchronously
 * resource.fetchJsonp().then(function(data) {
 *     // use the loaded data
 * }).otherwise(function(error) {
 *     // an error occurred
 * });
 *
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.fetchJsonp = function (callbackParameterName) {
  callbackParameterName = defaultValue(callbackParameterName, "callback");

  checkAndResetRequest(this.request);

  //generate a unique function name
  let functionName;
  do {
    functionName = `loadJsonp${CesiumMath.nextRandomNumber()
      .toString()
      .substring(2, 8)}`;
  } while (defined(window[functionName]));

  return fetchJsonp(this, callbackParameterName, functionName);
};

function fetchJsonp(resource, callbackParameterName, functionName) {
  const callbackQuery = {};
  callbackQuery[callbackParameterName] = functionName;
  resource.setQueryParameters(callbackQuery);

  const request = resource.request;
  request.url = resource.url;
  request.requestFunction = function () {
    const deferred = when.defer();

    //assign a function with that name in the global scope
    window[functionName] = function (data) {
      deferred.resolve(data);

      try {
        delete window[functionName];
      } catch (e) {
        window[functionName] = undefined;
      }
    };

    Resource._Implementations.loadAndExecuteScript(
      resource.url,
      functionName,
      deferred
    );
    return deferred.promise;
  };

  const promise = RequestScheduler.request(request);
  if (!defined(promise)) {
    return;
  }

  return promise.otherwise(function (e) {
    if (request.state !== RequestState.FAILED) {
      return when.reject(e);
    }

    return resource.retryOnError(e).then(function (retry) {
      if (retry) {
        // Reset request so it can try again
        request.state = RequestState.UNISSUED;
        request.deferred = undefined;

        return fetchJsonp(resource, callbackParameterName, functionName);
      }

      return when.reject(e);
    });
  });
}

/**
 * Creates a Resource from a URL and calls fetchJsonp() on it.
 *
 * @param {String|Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @param {String} [options.callbackParameterName='callback'] The callback parameter name that the server expects.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.fetchJsonp = function (options) {
  const resource = new Resource(options);
  return resource.fetchJsonp(options.callbackParameterName);
};

/**
 * @private
 */
Resource.prototype._makeRequest = function (options) {
  const resource = this;
  checkAndResetRequest(resource.request);

  const request = resource.request;
  request.url = resource.url;

  request.requestFunction = function () {
    const responseType = options.responseType;
    const headers = combine(options.headers, resource.headers);
    const overrideMimeType = options.overrideMimeType;
    const method = options.method;
    const data = options.data;
    const deferred = when.defer();
    const xhr = Resource._Implementations.loadWithXhr(
      resource.url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    );
    if (defined(xhr) && defined(xhr.abort)) {
      request.cancelFunction = function () {
        xhr.abort();
      };
    }
    return deferred.promise;
  };

  const promise = RequestScheduler.request(request);
  if (!defined(promise)) {
    return;
  }

  return promise
    .then(function (data) {
      // explicitly set to undefined to ensure GC of request response data. See #8843
      request.cancelFunction = undefined;
      return data;
    })
    .otherwise(function (e) {
      request.cancelFunction = undefined;
      if (request.state !== RequestState.FAILED) {
        return when.reject(e);
      }

      return resource.retryOnError(e).then(function (retry) {
        if (retry) {
          // Reset request so it can try again
          request.state = RequestState.UNISSUED;
          request.deferred = undefined;

          return resource.fetch(options);
        }

        return when.reject(e);
      });
    });
};

const dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/;

function decodeDataUriText(isBase64, data) {
  const result = decodeURIComponent(data);
  if (isBase64) {
    return atob(result);
  }
  return result;
}

function decodeDataUriArrayBuffer(isBase64, data) {
  const byteString = decodeDataUriText(isBase64, data);
  const buffer = new ArrayBuffer(byteString.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < byteString.length; i++) {
    view[i] = byteString.charCodeAt(i);
  }
  return buffer;
}

function decodeDataUri(dataUriRegexResult, responseType) {
  responseType = defaultValue(responseType, "");
  const mimeType = dataUriRegexResult[1];
  const isBase64 = !!dataUriRegexResult[2];
  const data = dataUriRegexResult[3];
  let buffer;
  let parser;

  switch (responseType) {
    case "":
    case "text":
      return decodeDataUriText(isBase64, data);
    case "arraybuffer":
      return decodeDataUriArrayBuffer(isBase64, data);
    case "blob":
      buffer = decodeDataUriArrayBuffer(isBase64, data);
      return new Blob([buffer], {
        type: mimeType,
      });
    case "document":
      parser = new DOMParser();
      return parser.parseFromString(
        decodeDataUriText(isBase64, data),
        mimeType
      );
    case "json":
      return JSON.parse(decodeDataUriText(isBase64, data));
    default:
      //>>includeStart('debug', pragmas.debug);
      throw new DeveloperError(`Unhandled responseType: ${responseType}`);
    //>>includeEnd('debug');
  }
}

/**
 * Asynchronously loads the given resource.  Returns a promise that will resolve to
 * the result once loaded, or reject if the resource failed to load.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled. It's recommended that you use
 * the more specific functions eg. fetchJson, fetchBlob, etc.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 *
 * @example
 * resource.fetch()
 *   .then(function(body) {
 *       // use the data
 *   }).otherwise(function(error) {
 *       // an error occurred
 *   });
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.fetch = function (options) {
  options = defaultClone(options, {});
  options.method = "GET";

  return this._makeRequest(options);
};

/**
 * Creates a Resource from a URL and calls fetch() on it.
 *
 * @param {String|Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.fetch = function (options) {
  const resource = new Resource(options);
  return resource.fetch({
    // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType,
  });
};

/**
 * Asynchronously deletes the given resource.  Returns a promise that will resolve to
 * the result once loaded, or reject if the resource failed to load.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 *
 * @example
 * resource.delete()
 *   .then(function(body) {
 *       // use the data
 *   }).otherwise(function(error) {
 *       // an error occurred
 *   });
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.delete = function (options) {
  options = defaultClone(options, {});
  options.method = "DELETE";

  return this._makeRequest(options);
};

/**
 * Creates a Resource from a URL and calls delete() on it.
 *
 * @param {String|Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} [options.data] Data that is posted with the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.delete = function (options) {
  const resource = new Resource(options);
  return resource.delete({
    // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType,
    data: options.data,
  });
};

/**
 * Asynchronously gets headers the given resource.  Returns a promise that will resolve to
 * the result once loaded, or reject if the resource failed to load.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 *
 * @example
 * resource.head()
 *   .then(function(headers) {
 *       // use the data
 *   }).otherwise(function(error) {
 *       // an error occurred
 *   });
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.head = function (options) {
  options = defaultClone(options, {});
  options.method = "HEAD";

  return this._makeRequest(options);
};

/**
 * Creates a Resource from a URL and calls head() on it.
 *
 * @param {String|Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.head = function (options) {
  const resource = new Resource(options);
  return resource.head({
    // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType,
  });
};

/**
 * Asynchronously gets options the given resource.  Returns a promise that will resolve to
 * the result once loaded, or reject if the resource failed to load.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 *
 * @example
 * resource.options()
 *   .then(function(headers) {
 *       // use the data
 *   }).otherwise(function(error) {
 *       // an error occurred
 *   });
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.options = function (options) {
  options = defaultClone(options, {});
  options.method = "OPTIONS";

  return this._makeRequest(options);
};

/**
 * Creates a Resource from a URL and calls options() on it.
 *
 * @param {String|Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.options = function (options) {
  const resource = new Resource(options);
  return resource.options({
    // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType,
  });
};

/**
 * Asynchronously posts data to the given resource.  Returns a promise that will resolve to
 * the result once loaded, or reject if the resource failed to load.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
 *
 * @param {Object} data Data that is posted with the resource.
 * @param {Object} [options] Object with the following properties:
 * @param {Object} [options.data] Data that is posted with the resource.
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 *
 * @example
 * resource.post(data)
 *   .then(function(result) {
 *       // use the result
 *   }).otherwise(function(error) {
 *       // an error occurred
 *   });
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.post = function (data, options) {
  Check.defined("data", data);

  options = defaultClone(options, {});
  options.method = "POST";
  options.data = data;

  return this._makeRequest(options);
};

/**
 * Creates a Resource from a URL and calls post() on it.
 *
 * @param {Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} options.data Data that is posted with the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.post = function (options) {
  const resource = new Resource(options);
  return resource.post(options.data, {
    // Make copy of just the needed fields because headers can be passed to both the constructor and to post
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType,
  });
};

/**
 * Asynchronously puts data to the given resource.  Returns a promise that will resolve to
 * the result once loaded, or reject if the resource failed to load.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
 *
 * @param {Object} data Data that is posted with the resource.
 * @param {Object} [options] Object with the following properties:
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 *
 * @example
 * resource.put(data)
 *   .then(function(result) {
 *       // use the result
 *   }).otherwise(function(error) {
 *       // an error occurred
 *   });
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.put = function (data, options) {
  Check.defined("data", data);

  options = defaultClone(options, {});
  options.method = "PUT";
  options.data = data;

  return this._makeRequest(options);
};

/**
 * Creates a Resource from a URL and calls put() on it.
 *
 * @param {Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} options.data Data that is posted with the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.put = function (options) {
  const resource = new Resource(options);
  return resource.put(options.data, {
    // Make copy of just the needed fields because headers can be passed to both the constructor and to post
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType,
  });
};

/**
 * Asynchronously patches data to the given resource.  Returns a promise that will resolve to
 * the result once loaded, or reject if the resource failed to load.  The data is loaded
 * using XMLHttpRequest, which means that in order to make requests to another origin,
 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
 *
 * @param {Object} data Data that is posted with the resource.
 * @param {Object} [options] Object with the following properties:
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 *
 *
 * @example
 * resource.patch(data)
 *   .then(function(result) {
 *       // use the result
 *   }).otherwise(function(error) {
 *       // an error occurred
 *   });
 *
 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
 */
Resource.prototype.patch = function (data, options) {
  Check.defined("data", data);

  options = defaultClone(options, {});
  options.method = "PATCH";
  options.data = data;

  return this._makeRequest(options);
};

/**
 * Creates a Resource from a URL and calls patch() on it.
 *
 * @param {Object} options A url or an object with the following properties
 * @param {String} options.url The url of the resource.
 * @param {Object} options.data Data that is posted with the resource.
 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
 */
Resource.patch = function (options) {
  const resource = new Resource(options);
  return resource.patch(options.data, {
    // Make copy of just the needed fields because headers can be passed to both the constructor and to post
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType,
  });
};

/**
 * Contains implementations of functions that can be replaced for testing
 *
 * @private
 */
Resource._Implementations = {};

function loadImageElement(url, crossOrigin, deferred) {
  const image = new Image();

  image.onload = function () {
    deferred.resolve(image);
  };

  image.onerror = function (e) {
    deferred.reject(e);
  };

  if (crossOrigin) {
    if (TrustedServers.contains(url)) {
      image.crossOrigin = "use-credentials";
    } else {
      image.crossOrigin = "";
    }
  }

  image.src = url;
}

Resource._Implementations.createImage = function (
  request,
  crossOrigin,
  deferred,
  flipY,
  skipColorSpaceConversion,
  preferImageBitmap
) {
  const url = request.url;
  // Passing an Image to createImageBitmap will force it to run on the main thread
  // since DOM elements don't exist on workers. We convert it to a blob so it's non-blocking.
  // See:
  //    https://bugzilla.mozilla.org/show_bug.cgi?id=1044102#c38
  //    https://bugs.chromium.org/p/chromium/issues/detail?id=580202#c10
  Resource.supportsImageBitmapOptions()
    .then(function (supportsImageBitmap) {
      // We can only use ImageBitmap if we can flip on decode.
      // See: https://github.com/CesiumGS/cesium/pull/7579#issuecomment-466146898
      if (!(supportsImageBitmap && preferImageBitmap)) {
        loadImageElement(url, crossOrigin, deferred);
        return;
      }
      const responseType = "blob";
      const method = "GET";
      const xhrDeferred = when.defer();
      const xhr = Resource._Implementations.loadWithXhr(
        url,
        responseType,
        method,
        undefined,
        undefined,
        xhrDeferred,
        undefined,
        undefined,
        undefined
      );

      if (defined(xhr) && defined(xhr.abort)) {
        request.cancelFunction = function () {
          xhr.abort();
        };
      }
      return xhrDeferred.promise
        .then(function (blob) {
          if (!defined(blob)) {
            deferred.reject(
              new RuntimeError(
                `Successfully retrieved ${url} but it contained no content.`
              )
            );
            return;
          }

          return Resource.createImageBitmapFromBlob(blob, {
            flipY: flipY,
            premultiplyAlpha: false,
            skipColorSpaceConversion: skipColorSpaceConversion,
          });
        })
        .then(deferred.resolve);
    })
    .otherwise(deferred.reject);
};

/**
 * Wrapper for createImageBitmap
 *
 * @private
 */
Resource.createImageBitmapFromBlob = function (blob, options) {
  Check.defined("options", options);
  Check.typeOf.bool("options.flipY", options.flipY);
  Check.typeOf.bool("options.premultiplyAlpha", options.premultiplyAlpha);
  Check.typeOf.bool(
    "options.skipColorSpaceConversion",
    options.skipColorSpaceConversion
  );

  return createImageBitmap(blob, {
    imageOrientation: options.flipY ? "flipY" : "none",
    premultiplyAlpha: options.premultiplyAlpha ? "premultiply" : "none",
    colorSpaceConversion: options.skipColorSpaceConversion ? "none" : "default",
  });
};

function decodeResponse(loadWithHttpResponse, responseType) {
  switch (responseType) {
    case "text":
      return loadWithHttpResponse.toString("utf8");
    case "json":
      return JSON.parse(loadWithHttpResponse.toString("utf8"));
    default:
      return new Uint8Array(loadWithHttpResponse).buffer;
  }
}

function loadWithHttpRequest(
  url,
  responseType,
  method,
  data,
  headers,
  deferred,
  overrideMimeType
) {
  // Note: only the 'json' and 'text' responseTypes transforms the loaded buffer
  /* eslint-disable no-undef */
  const URL = require("url").parse(url);
  const http = URL.protocol === "https:" ? require("https") : require("http");
  const zlib = require("zlib");
  /* eslint-enable no-undef */

  const options = {
    protocol: URL.protocol,
    hostname: URL.hostname,
    port: URL.port,
    path: URL.path,
    query: URL.query,
    method: method,
    headers: headers,
  };

  http
    .request(options)
    .on("response", function (res) {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        deferred.reject(
          new RequestErrorEvent(res.statusCode, res, res.headers)
        );
        return;
      }

      const chunkArray = [];
      res.on("data", function (chunk) {
        chunkArray.push(chunk);
      });

      res.on("end", function () {
        // eslint-disable-next-line no-undef
        const result = Buffer.concat(chunkArray);
        if (res.headers["content-encoding"] === "gzip") {
          zlib.gunzip(result, function (error, resultUnzipped) {
            if (error) {
              deferred.reject(
                new RuntimeError("Error decompressing response.")
              );
            } else {
              deferred.resolve(decodeResponse(resultUnzipped, responseType));
            }
          });
        } else {
          deferred.resolve(decodeResponse(result, responseType));
        }
      });
    })
    .on("error", function (e) {
      deferred.reject(new RequestErrorEvent());
    })
    .end();
}

const noXMLHttpRequest = typeof XMLHttpRequest === "undefined";
Resource._Implementations.loadWithXhr = function (
  url,
  responseType,
  method,
  data,
  headers,
  deferred,
  overrideMimeType
) {
  const dataUriRegexResult = dataUriRegex.exec(url);
  if (dataUriRegexResult !== null) {
    deferred.resolve(decodeDataUri(dataUriRegexResult, responseType));
    return;
  }

  if (noXMLHttpRequest) {
    loadWithHttpRequest(
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    );
    return;
  }

  const xhr = new XMLHttpRequest();

  if (TrustedServers.contains(url)) {
    xhr.withCredentials = true;
  }

  xhr.open(method, url, true);

  if (defined(overrideMimeType) && defined(xhr.overrideMimeType)) {
    xhr.overrideMimeType(overrideMimeType);
  }

  if (defined(headers)) {
    for (const key in headers) {
      if (headers.hasOwnProperty(key)) {
        xhr.setRequestHeader(key, headers[key]);
      }
    }
  }

  if (defined(responseType)) {
    xhr.responseType = responseType;
  }

  // While non-standard, file protocol always returns a status of 0 on success
  let localFile = false;
  if (typeof url === "string") {
    localFile =
      url.indexOf("file://") === 0 ||
      (typeof window !== "undefined" && window.location.origin === "file://");
  }

  xhr.onload = function () {
    if (
      (xhr.status < 200 || xhr.status >= 300) &&
      !(localFile && xhr.status === 0)
    ) {
      deferred.reject(
        new RequestErrorEvent(
          xhr.status,
          xhr.response,
          xhr.getAllResponseHeaders()
        )
      );
      return;
    }

    const response = xhr.response;
    const browserResponseType = xhr.responseType;

    if (method === "HEAD" || method === "OPTIONS") {
      const responseHeaderString = xhr.getAllResponseHeaders();
      const splitHeaders = responseHeaderString.trim().split(/[\r\n]+/);

      const responseHeaders = {};
      splitHeaders.forEach(function (line) {
        const parts = line.split(": ");
        const header = parts.shift();
        responseHeaders[header] = parts.join(": ");
      });

      deferred.resolve(responseHeaders);
      return;
    }

    //All modern browsers will go into either the first or second if block or last else block.
    //Other code paths support older browsers that either do not support the supplied responseType
    //or do not support the xhr.response property.
    if (xhr.status === 204) {
      // accept no content
      deferred.resolve();
    } else if (
      defined(response) &&
      (!defined(responseType) || browserResponseType === responseType)
    ) {
      deferred.resolve(response);
    } else if (responseType === "json" && typeof response === "string") {
      try {
        deferred.resolve(JSON.parse(response));
      } catch (e) {
        deferred.reject(e);
      }
    } else if (
      (browserResponseType === "" || browserResponseType === "document") &&
      defined(xhr.responseXML) &&
      xhr.responseXML.hasChildNodes()
    ) {
      deferred.resolve(xhr.responseXML);
    } else if (
      (browserResponseType === "" || browserResponseType === "text") &&
      defined(xhr.responseText)
    ) {
      deferred.resolve(xhr.responseText);
    } else {
      deferred.reject(
        new RuntimeError("Invalid XMLHttpRequest response type.")
      );
    }
  };

  xhr.onerror = function (e) {
    deferred.reject(new RequestErrorEvent());
  };

  xhr.send(data);

  return xhr;
};

Resource._Implementations.loadAndExecuteScript = function (
  url,
  functionName,
  deferred
) {
  return loadAndExecuteScript(url, functionName).otherwise(deferred.reject);
};

/**
 * The default implementations
 *
 * @private
 */
Resource._DefaultImplementations = {};
Resource._DefaultImplementations.createImage =
  Resource._Implementations.createImage;
Resource._DefaultImplementations.loadWithXhr =
  Resource._Implementations.loadWithXhr;
Resource._DefaultImplementations.loadAndExecuteScript =
  Resource._Implementations.loadAndExecuteScript;

/**
 * A resource instance initialized to the current browser location
 *
 * @type {Resource}
 * @constant
 */
Resource.DEFAULT = Object.freeze(
  new Resource({
    url:
      typeof document === "undefined"
        ? ""
        : document.location.href.split("?")[0],
  })
);

/**
 * A function that returns the value of the property.
 * @callback Resource.RetryCallback
 *
 * @param {Resource} [resource] The resource that failed to load.
 * @param {Error} [error] The error that occurred during the loading of the resource.
 * @returns {Boolean|Promise<Boolean>} If true or a promise that resolved to true, the resource will be retried. Otherwise the failure will be returned.
 */
export default Resource;
