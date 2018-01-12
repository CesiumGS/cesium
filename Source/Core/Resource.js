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
    './objectToQuery',
    './queryToObject',
    '../ThirdParty/Uri'
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
            objectToQuery,
            queryToObject,
            Uri) {
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
     * @param {Request} [options.request] A Request object that will be used.
     * @param {String} [options.method='GET'] The method to use.
     * @param {Object} [options.data] An object that can store user specific information
     * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
     * @param {DefaultProxy} [options.proxy] A proxy to be used when loading the resource.
     * @param {Boolean} [options.allowCrossOrigin=true] Whether to allow Cross-Origin.
     * @param {Boolean} [options.isDirectory=false] The url should be a directory, so make sure there is a trailing slash.
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

        this.headers = defined(options.headers) ? clone(options.headers) : {};
        this.request = options.request;
        this.responseType = options.responseType;
        this.method = defaultValue(options.method, 'GET');
        this.data = options.data;
        this.overrideMimeType = options.overrideMimeType;
        this.proxy = options.proxy;
        this.allowCrossOrigin = defaultValue(options.allowCrossOrigin, true);

        this._retryOnError = options.retryOnError;
        this._retryAttempts = defaultValue(options.retryAttempts, 0);
        this._retryCount = 0;
    }

    /**
     * A helper function to create a resource depending on whether we have a String or a Resource
     *
     * @param {Resource|String} resource A Resource or a String to use when creating a new Resource.
     * @param {Object{ options If resource is a String, these are the options passed to the Resource constructor. It is ignored otherwise.
     *
     * @returns {Resource} If resource is a String, a Resource constructed with the url and options. Otherwise the resource parameter is returned.
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
        queryParameters: {
            get: function() {
                return this._queryParameters;
            }
        },
        templateValues: {
            get: function() {
                return this._templateValues;
            }
        },
        url: {
            get: function() {
                return this.getUrl(true, true);
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
        extension: {
            get: function() {
                return getExtensionFromUri(this._url);
            }
        },
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
        }
    });

    Resource.prototype.getUrl = function(query, proxy) {
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

    Resource.prototype.addQueryParameters = function(params, useAsDefault) {
        if (useAsDefault) {
            this._queryParameters = combine(this._queryParameters, params);
        } else {
            this._queryParameters = combine(params, this._queryParameters);
        }
    };

    Resource.prototype.addTemplateValues = function(template) {
        this._templateValues = combine(encodeValues(template), this._templateValues);
    };
    
    /**
     * Returns a resource relative to the current instance. All properties remain the same as the current instance unless overridden in options.
     *
     * @param {Object} options An object with the following properties
     * @param {String} [options.url]  The url that will be resolved relative to the url of the current instance.
     * @param {Object} [options.queryParameters] An object containing query parameters that will be combined with those of the current instance.
     * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}). These will be combined with those of the current instance.
     * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
     * @param {Request} [options.request] A Request object that will be used.
     * @param {String} [options.method] The method to use.
     * @param {Object} [options.data] An object that can store user specific information
     * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
     * @param {DefaultProxy} [options.proxy] A proxy to be used when loading the resource.
     * @param {Boolean} [options.allowCrossOrigin] Whether to allow Cross-Origin.
     * @param {Boolean} [options.isDirectory=false] The url should be a directory, so make sure there is a trailing slash.
     */
    Resource.prototype.getDerivedResource = function(options) {
        var resource = this.clone();
        resource._isDirectory = false; // By default derived resources aren't a directory, but this can be overridden

        if (defined(options.url)) {
            var uri = new Uri(options.url);

            // Remove the fragment as it's not sent with a request
            uri.fragment = undefined;

            if (defined(uri.query)) {
                var query = parseQuery(uri.query);
                uri.query = undefined;
                resource._queryParameters = combine(query, resource._queryParameters);
            }

            resource._url = uri.resolve(new Uri(this._url)).toString();
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
        if (defined(options.allowCrossOrigin)) {
            resource.allowCrossOrigin = options.allowCrossOrigin;
        }
        if (defined(options.request)) {
            resource.request = options.request;
        }
        if (defined(options.isDirectory)) {
            resource._isDirectory = options.isDirectory;
        }

        return resource;
    };

    Resource.prototype.retryOnError = function(options) {
        if (this._retryCount > this._retryAttempts) {
            return false;
        }
        var retry = true;
        var callback = this._retryOnError;
        if (typeof callback === 'function') {
            retry = callback(this, options);
        }
        if (retry) {
            this._retryCount++;
        }
        return retry;
    };

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
        result.allowCrossOrigin = this.allowCrossOrigin;
        result._isDirectory = this._isDirectory;

        return result;
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
