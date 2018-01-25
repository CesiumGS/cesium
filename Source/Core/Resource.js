define([
    './appendForwardSlash',
    './Check',
    './clone',
    './combine',
    './defaultValue',
    './defined',
    './defineProperties',
    './freezeObject',
    './getAbsoluteUri',
    './getBaseUri',
    './getExtensionFromUri',
    './isDataUri',
    './objectToQuery',
    './queryToObject',
    '../ThirdParty/Uri',
    '../ThirdParty/when'
], function(appendForwardSlash,
            Check,
            clone,
            combine,
            defaultValue,
            defined,
            defineProperties,
            freezeObject,
            getAbsoluteUri,
            getBaseUri,
            getExtensionFromUri,
            isDataUri,
            objectToQuery,
            queryToObject,
            Uri,
            when) {
    'use strict';

    /**
     * @private
     */
    function parseQuery(uri, resource) {
        var queryString = uri.query;
        if (!defined(queryString) || (queryString.length === 0)) {
            return {};
        }

        var query;
        // Special case we run into where the querystring is just a string, not key/value pairs
        if (queryString.indexOf('=') === -1) {
            var result = {};
            result[queryString] = undefined;
            query = result;
        } else {
            query = queryToObject(queryString);
        }

        resource._queryParameters = combine(resource._queryParameters, query);
        uri.query = undefined;
    }

    /**
     * @private
     */
    function stringifyQuery(uri, resource) {
        var queryObject = resource._queryParameters;

        var keys = Object.keys(queryObject);

        // We have 1 key with an undefined value, so this is just a string, not key/value pairs
        if (keys.length === 1 && !defined(queryObject[keys[0]])) {
            uri.query = keys[0];
        } else {
            uri.query = objectToQuery(queryObject);
        }
    }

    /**
     * @private
     */
    function defaultClone(obj, defaultVal) {
        if (!defined(obj)) {
            return defaultVal;
        }

        return defined(obj.clone) ? obj.clone() : clone(obj);
    }

    /**
     * A resource that includes the location and any other parameters we need to retrieve it or create derived resources. It also provides the ability to retry requests.
     *
     * @param {Object} options An object with the following properties
     * @param {String} options.url The url of the resource.
     * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
     * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
     * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
     * @param {String} [options.responseType] The type of response.
     * @param {String} [options.method='GET'] The method to use.
     * @param {Object} [options.data] Data that is sent with the resource request if method is PUT or POST.
     * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
     * @param {DefaultProxy} [options.proxy] A proxy to be used when loading the resource.
     * @param {Resource~RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
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
     * var resource = new Resource({
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
     *
     * @constructor
     */
    function Resource(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('options.url', options.url);
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
        this.request = options.request;

        /**
         * The type of response expected from the request.
         *
         * @type {String}
         */
        this.responseType = options.responseType;

        /**
         * The method to use for the request.
         *
         * @type {String}
         */
        this.method = defaultValue(options.method, 'GET');

        /**
         * Data to be sent with the request.
         *
         * @type {Object}
         */
        this.data = options.data;

        /**
         * Overrides the MIME type returned by the server.
         *
         * @type {String}
         */
        this.overrideMimeType = options.overrideMimeType;

        /**
         * A proxy to be used when loading the resource.
         *
         * @type {DefaultProxy}
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

        this.url = options.url;
    }

    /**
     * A helper function to create a resource depending on whether we have a String or a Resource
     *
     * @param {Resource|String} resource A Resource or a String to use when creating a new Resource.
     * @param {Object} options If resource is a String, these are the options passed to the Resource constructor. It is ignored otherwise.
     *
     * @returns {Resource} If resource is a String, a Resource constructed with the url and options. Otherwise the resource parameter is returned.
     *
     * @private
     */
    Resource.createIfNeeded = function(resource, options) {
        if (resource instanceof Resource) {
            return resource.clone();
        }

        if (typeof resource !== 'string') {
            return resource;
        }

        var args = defaultClone(options, {});
        args.url = resource;
        return new Resource(args);
    };

    defineProperties(Resource.prototype, {
        /**
         * Query parameters appended to the url.
         *
         * @memberof Resource.prototype
         * @type {Object}
         *
         * @readonly
         */
        queryParameters: {
            get: function() {
                return this._queryParameters;
            }
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
            get: function() {
                return this._templateValues;
            }
        },

        /**
         * The url to the resource with template values replaced, query string appended and encoded by proxy if one was set.
         *
         * @memberof Resource.prototype
         * @type {String}
         */
        url: {
            get: function() {
                return this.getUrlComponent(true, true);
            },
            set: function(value) {
                var uri = new Uri(value);

                parseQuery(uri, this);

                // Remove the fragment as it's not sent with a request
                uri.fragment = undefined;

                this._url = uri.toString();
            }
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
            get: function() {
                return getExtensionFromUri(this._url);
            }
        },

        /**
         * True if the Resource refers to a data URI.
         *
         * @memberof Resource.prototype
         * @type {Boolean}
         */
        isDataUri: {
            get: function() {
                return isDataUri(this._url);
            }
        }
    });

    /**
     * Returns the url, optional with the query string and processed by a proxy.
     *
     * @param {Boolean} [query=false] If true, the query string is included.
     * @param {Boolean} [proxy=false] If true, the url is processed the proxy object if defined.
     *
     * @returns {String} The url with all the requested components.
     */
    Resource.prototype.getUrlComponent = function(query, proxy) {
        if(this.isDataUri) {
            return this._url;
        }

        var uri = new Uri(this._url);

        if (query) {
            stringifyQuery(uri, this);
        }

        // objectToQuery escapes the placeholders.  Undo that.
        var url = uri.toString().replace(/%7B/g, '{').replace(/%7D/g, '}');

        var template = this._templateValues;
        var keys = Object.keys(template);
        if (keys.length > 0) {
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = template[key];
                url = url.replace(new RegExp('{' + key + '}', 'g'), encodeURIComponent(value));
            }
        }
        if (proxy && defined(this.proxy)) {
            url = this.proxy.getURL(url);
        }
        return url;
    };

    /**
     * Combines the specified object and the existing query parameters. This allows you to add many parameters at once,
     *  as opposed to adding them one at a time to the queryParameters property.
     *
     * @param {Object} params The query parameters
     * @param {Boolean} [useAsDefault=false] If true the params will be used as the default values, so they will only be set if they are undefined.
     */
    Resource.prototype.addQueryParameters = function(params, useAsDefault) {
        if (useAsDefault) {
            this._queryParameters = combine(this._queryParameters, params);
        } else {
            this._queryParameters = combine(params, this._queryParameters);
        }
    };

    /**
     * Combines the specified object and the existing template values. This allows you to add many values at once,
     *  as opposed to adding them one at a time to the templateValues property.
     *
     * @param {Object} params The template values
     * @param {Boolean} [useAsDefault=false] If true the values will be used as the default values, so they will only be set if they are undefined.
     */
    Resource.prototype.addTemplateValues = function(template, useAsDefault) {
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
     * @param {String} [options.responseType] The type of response.
     * @param {String} [options.method] The method to use.
     * @param {Object} [options.data] Data that is sent with the resource request if method is PUT or POST.
     * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
     * @param {DefaultProxy} [options.proxy] A proxy to be used when loading the resource.
     * @param {Resource~RetryCallback} [options.retryCallback] The function to call when loading the resource fails.
     * @param {Number} [options.retryAttempts] The number of times the retryCallback should be called before giving up.
     * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
     *
     * @returns {Resource} The resource derived from the current one.
     */
    Resource.prototype.getDerivedResource = function(options) {
        var resource = this.clone();
        resource._retryCount = 0;

        if (defined(options.url)) {
            var uri = new Uri(options.url);

            parseQuery(uri, resource);

            // Remove the fragment as it's not sent with a request
            uri.fragment = undefined;

            resource._url = uri.resolve(new Uri(getAbsoluteUri(this._url))).toString();
        }

        if (defined(options.queryParameters)) {
            resource._queryParameters = combine(options.queryParameters, resource._queryParameters);
        }
        if (defined(options.templateValues)) {
            resource._templateValues = combine(options.templateValues, resource.templateValues);
        }
        if (defined(options.headers)) {
            resource.headers = combine(options.headers, resource.headers);
        }
        if (defined(options.responseType)) {
            resource.responseType = options.responseType;
        }
        if (defined(options.method)) {
            resource.method = options.method;
        }
        if (defined(options.data)) {
            resource.data = options.data;
        }
        if (defined(options.overrideMimeType)) {
            resource.overrideMimeType = options.overrideMimeType;
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
     */
    Resource.prototype.retryOnError = function(error) {
        var retryCallback = this.retryCallback;
        if ((typeof retryCallback !== 'function') || (this._retryCount >= this.retryAttempts)) {
            return when(false);
        }

        var that = this;
        return when(retryCallback(this, error))
            .then(function(result) {
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
    Resource.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new Resource({
                url : this._url
            });
        }

        result._url = this._url;
        result._queryParameters = clone(this._queryParameters);
        result._templateValues = clone(this._templateValues);
        result.headers = clone(this.headers);
        result.responseType = this.responseType;
        result.method = this.method;
        result.data = this.data;
        result.overrideMimeType = this.overrideMimeType;
        result.proxy = this.proxy;
        result.retryCallback = this.retryCallback;
        result.retryAttempts = this.retryAttempts;
        result._retryCount = 0;

        // In practice, we don't want this cloned. It usually not set, unless we purposely set it internally and not
        //  using the request will break the request scheduler.
        result.request = this.request;

        return result;
    };

    /**
     * Returns the base path of the Resource.
     *
     * @param {Boolean} [includeQuery = false] Whether or not to include the query string and fragment form the uri
     *
     * @returns {String} The base URI of the resource
     */
    Resource.prototype.getBaseUri = function(includeQuery) {
        return getBaseUri(this.getUrlComponent(includeQuery), includeQuery);
    };

    /**
     * Appends a forward slash to the URL.
     */
    Resource.prototype.appendForwardSlash = function() {
        this._url = appendForwardSlash(this._url);
    };


    /**
     * A resource instance initialized to the current browser location
     *
     * @type {Resource}
     * @constant
     */
    Resource.DEFAULT = freezeObject(new Resource({
        url: (typeof document === 'undefined') ? '' : document.location.href.split('?')[0]
    }));

    /**
     * A function that returns the value of the property.
     * @callback Resource~RetryCallback
     *
     * @param {Resource} [resource] The resource that failed to load.
     * @param {Error} [error] The error that occurred during the loading of the resource.
     * @returns {Boolean|Promise<Boolean>} If true or a promise that resolved to true, the resource will be retried. Otherwise the failure will be returned.
     */

    return Resource;
});
