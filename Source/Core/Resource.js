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
    function parseQuery(queryString) {
        if (queryString.length === 0) {
            return {};
        }

        // Special case we run into where the querystring is just a string, not key/value pairs
        if (queryString.indexOf('=') === -1) {
            var result = {};
            result[queryString] = undefined;
            return result;
        }

        return queryToObject(queryString);
    }

    /**
     * @private
     */
    function stringifyQuery(queryObject) {
        var keys = Object.keys(queryObject);

        // We have 1 key with an undefined value, so this is just a string, not key/value pairs
        if (keys.length === 1 && !defined(queryObject[keys[0]])) {
            return keys[0];
        }

        return objectToQuery(queryObject);
    }

    /**
     * @private
     */
    function encodeValues(object) {
        var result = {};
        for(var key in object) {
            if (object.hasOwnProperty(key)) {
                result[key] = encodeURIComponent(object[key]);
            }
        }

        return result;
    }

    /**
     * A resource the location and any other parameters we need to retrieve it or create derived resources.
     *
     * @param {Object} options An object with the following properties
     * @param {String} options.url The url of the resource.
     * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
     * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
     * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
     * @param {String} [options.responseType] The type of response.
     * @param {String} [options.method='GET'] The method to use.
     * @param {Object} [options.data] Data that is sent with the resource request.
     * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
     * @param {DefaultProxy} [options.proxy] A proxy to be used when loading the resource.
     * @param {Boolean} [options.isDirectory=false] The url should be a directory, so make sure there is a trailing slash.
     * @param {Function} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
     * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
     * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
     *
     * @constructor
     */
    function Resource(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('options.url', options.url);
        //>>includeEnd('debug');

        this._url = '';
        this._templateValues = encodeValues(defaultValue(options.templateValues, {}));
        this._queryParameters = defaultValue(options.queryParameters, {});
        this._isDirectory = defaultValue(options.isDirectory, false);
        this.url = options.url;

        /**
         * Additional HTTP headers that will be sent with the request.
         *
         * @type {Object}
         */
        this.headers = defined(options.headers) ? clone(options.headers) : {};

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
         * Function to call when a request for this resource fails. If it returns true, the request will be retried.
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
    }

    /**
     * A helper function to create a resource depending on whether we have a String or a Resource
     *
     * @param {Resource|String} resource A Resource or a String to use when creating a new Resource.
     * @param {Object{ options If resource is a String, these are the options passed to the Resource constructor. It is ignored otherwise.
     *
     * @returns {Resource} If resource is a String, a Resource constructed with the url and options. Otherwise the resource parameter is returned.
     *
     * @private
     */
    Resource.createIfNeeded = function(resource, options) {
        if (!defined(resource)) {
            return;
        }

        if (typeof resource === 'string') {
            var args = defined(options) ? clone(options) : {};
            args.url = resource;
            resource = new Resource(args);
        }

        return resource;
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
         * The url to the resource.
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

                if (defined(uri.query)) {
                    var query = parseQuery(uri.query);
                    this._queryParameters = combine(this._queryParameters, query);
                    uri.query = undefined;
                }

                // Remove the fragment as it's not sent with a request
                uri.fragment = undefined;

                this._url = uri.toString();

                if (this._isDirectory) {
                    this._url = appendForwardSlash(this._url);
                }
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
         * True if the Resource refers to a directory. A trailing forward slash will be maintained.
         *
         * @memberof Resource.prototype
         * @type {Boolean}
         */
        isDirectory: {
            get: function() {
                return this._isDirectory;
            },
            set: function(value) {
                if (this._isDirectory !== value) {
                    var url = this._url;
                    if (value) {
                        this._url = appendForwardSlash(url);
                    } else if (url[url.length-1] === '/') {
                        this._url = url.slice(0, -1);
                    }

                    this._isDirectory = value;
                }
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
     * @param {Boolean{ [proxy=false] If true, the url is processed the proxy object if defined.
     */
    Resource.prototype.getUrlComponent = function(query, proxy) {
        if(this.isDataUri) {
            return this._url;
        }

        var uri = new Uri(this._url);

        if (query) {
            uri.query = stringifyQuery(this._queryParameters);
        }

        // objectToQuery escapes the placeholders.  Undo that.
        var url = uri.toString().replace(/%7B/g, '{').replace(/%7D/g, '}');

        var template = this._templateValues;
        var keys = Object.keys(template);
        if (keys.length > 0) {
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = template[key];
                url = url.replace(new RegExp('{' + key + '}', 'g'), value);
            }
        }
        if (proxy && defined(this.proxy)) {
            url = this.proxy.getURL(url);
        }
        return url;
    };

    /**
     * Adds query parameters
     *
     * @param {Object{ params The query parameters
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
     * Adds template values
     *
     * @param {Object{ params The template values
     * @param {Boolean} [useAsDefault=false] If true the values will be used as the default values, so they will only be set if they are undefined.
     */
    Resource.prototype.addTemplateValues = function(template, useAsDefault) {
        if (useAsDefault) {
            this._templateValues = combine(this._templateValues, encodeValues(template));
        } else {
            this._templateValues = combine(encodeValues(template), this._templateValues);
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
     * @param {Object} [options.data] Data that is sent with the request.
     * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
     * @param {DefaultProxy} [options.proxy] A proxy to be used when loading the resource.
     * @param {Boolean} [options.isDirectory=false] The url should be a directory, so make sure there is a trailing slash.
     * @param {Function} [options.retryCallback] The function to call when loading the resource fails.
     * @param {Number} [options.retryAttempts] The number of times the retryCallback should be called before giving up.
     * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
     */
    Resource.prototype.getDerivedResource = function(options) {
        var resource = this.clone();
        resource._isDirectory = false; // By default derived resources aren't a directory, but this can be overridden
        resource._retryCount = 0;

        if (defined(options.url)) {
            var uri = new Uri(options.url);

            // Remove the fragment as it's not sent with a request
            uri.fragment = undefined;

            if (defined(uri.query)) {
                var query = parseQuery(uri.query);
                uri.query = undefined;
                resource._queryParameters = combine(query, resource._queryParameters);
            }

            resource._url = uri.resolve(new Uri(getAbsoluteUri(this._url))).toString();
        }

        if (defined(options.queryParameters)) {
            resource._queryParameters = combine(options.queryParameters, resource._queryParameters);
        }
        if (defined(options.templateValues)) {
            resource._templateValues = combine(encodeValues(options.templateValues), resource.templateValues);
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
        if (defined(options.isDirectory)) {
            resource._isDirectory = options.isDirectory;
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
        result._queryParameters = this._queryParameters;
        result._templateValues = this._templateValues;
        result.headers = this.headers;
        result.request = this.request;
        result.responseType = this.responseType;
        result.method = this.method;
        result.data = this.data;
        result.overrideMimeType = this.overrideMimeType;
        result.proxy = this.proxy;
        result._isDirectory = this._isDirectory;
        result.retryCallback = this.retryCallback;
        result.retryAttempts = this.retryAttempts;
        result._retryCount = 0;

        return result;
    };

    /**
     * Called when a request succeeds
     */
    Resource.prototype.succeeded = function() {
        this._retryCount = 0;
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
     * A resource instance initialized to the current browser location
     *
     * @type {Resource}
     * @constant
     */
    Resource.DEFAULT = freezeObject(new Resource({
        url: (typeof document === 'undefined') ? '' : document.location.href.split('?')[0]
    }));

    return Resource;
});
