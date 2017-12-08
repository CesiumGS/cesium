define([
    './combine',
    './defaultValue',
    './defined',
    './defineProperties',
    './joinUrls',
    './objectToQuery',
    './queryToObject',
    './Check',
    '../ThirdParty/Uri'
], function(combine,
            defaultValue,
            defined,
            defineProperties,
            joinUrls,
            objectToQuery,
            queryToObject,
            Check,
            Uri) {
    'use strict';

    /**
     * @param {Object} options An object with the following properties
     * @param {String} options.url
     * @param {Object} [options.queryParameters]
     * @param {Object} [options.headers]
     * @param {Request} [options.request]
     * @param {String} [options.method='GET']
     * @param {Object} [options.data]
     * @param {String} [options.overrideMimeType]
     * @param {DefaultProxy} [options.proxy]
     * @param {Boolean} [options.allowCrossOrigin]
     *
     * @constructor
     */
    function Resource(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.url', options.url);
        //>>includeEnd('debug');

        this._url = '';
        this._urlTemplateValues = defaultValue(options.urlTemplateValues, {});
        this._queryParameters = defaultValue(options.queryParameters, {});
        this._fragment = defaultValue(options.fragment, '');

        this.url = options.url;

        this.headers = options.headers;
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

    defineProperties(Resource.prototype, {
        url: {
            get: function() {
                var uri = new Uri(this._url);
                uri.query = objectToQuery(this._queryParameters);
                uri.fragment = this._fragment;
                var url = uri.toString();
                var template = this._urlTemplateValues;
                var keys = Object.keys(template);
                if (keys.length > 0) {
                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        var value = template[key];
                        url = url.replace(new RegExp('{' + key + '}', 'g'), value);
                    }
                }
                if (defined(this.proxy)) {
                    url = this.proxy.getURL(url);
                }
                return url;
            },
            set: function(value) {
                var uri = new Uri(value);

                if (defined(uri.query)) {
                    var query = queryToObject(uri.query);
                    this._queryParameters = combine(this._queryParameters, query);
                    uri.query = undefined;
                }

                if (defined(uri.fragment)) {
                    var fragment = uri.fragment;
                    uri.fragment = undefined;
                    this._fragment = fragment;
                }

                this._url = uri.toString();
            }
        }
    });

    Resource.prototype.setQueryParameters = function(params) {
        this._queryParameters = combine(params, this._queryParameters);
    };

    Resource.prototype.setTemplateValues = function(template) {
        this._urlTemplateValues = combine(template, this._urlTemplateValues);
    };

    Resource.prototype.getDerivedResource = function(options) {
        var resource = this.clone();

        if (defined(options.url)) {
            var uri = new Uri(options.url);

            if (defined(uri.fragment)) {
                var fragment = uri.fragment;
                uri.fragment = undefined;
                resource._fragment = fragment;
            }

            if (defined(uri.query)) {
                var query = queryToObject(uri.query);
                uri.query = undefined;
                resource._queryParameters = combine(query, resource._queryParameters);
            }

            resource._url = joinUrls(resource._url, uri.toString());
        }
        if (defined(options.queryParameters)) {
            resource._queryParameters = combine(options.queryParameters, resource._queryParameters);
        }
        if (defined(options.urlTemplateValues)) {
            resource.urlTemplateValues = combine(options.urlTemplateValues, resource.urlTemplateValues);
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
            return new Resource(this);
        }

        result._url = this._url;
        result._queryParameters = this._queryParameters;
        result._urlTemplateValues = this._urlTemplateValues;
        result._fragment = this._fragment;
        result.headers = this.headers;
        result.request = this.request;
        result.responseType = this.responseType;
        result.method = this.method;
        result.data = this.data;
        result.overrideMimeType = this.overrideMimeType;
        result.proxy = this.proxy;
        result.allowCrossOrigin = this.allowCrossOrigin;

        return result;
    };

    return Resource;
});
