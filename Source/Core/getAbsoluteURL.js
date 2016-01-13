/*global define*/
define([
        '../ThirdParty/Uri',
        './defaultValue',
        './defined',
        './DeveloperError'
    ], function(
        Uri,
        defaultValue,
        defined,
        DeveloperError) {
    "use strict";

    /**
     * Given a URI, returns the extension of the URI.
     * @exports getAbsoluteURL
     *
     * @param {String} url The Url.
     * @param {String} base The base.
     * @returns {String} The absolute url of the Url.
     *
     * @example
     * //absolute url will be "http://localhost:8080/Specs/awesome.png";
     * var absoluteURL = Cesium.getAbsoluteURL('awesome.png');
     */
    function getAbsoluteURL(url, base) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('uri is required.');
        }
        //>>includeEnd('debug');

        base = defaultValue(base, document.location.href);
        var baseUri = new Uri(base);
        var urlUri = new Uri(url);
        return urlUri.resolve(baseUri).toString();
    }

    return getAbsoluteURL;

});
