/*global define*/
define([
        './loadText',
        './DeveloperError'
    ], function(
        loadText,
        DeveloperError) {
    "use strict";

    /**
     * Asynchronously loads the given URL as text.  Returns a promise that will resolve to
     * a JSON object once loaded, or reject if the URL failed to load.  The data is loaded
     * using XMLHttpRequest, which means that in order to make requests to another origin,
     * the server must have Cross-Origin Resource Sharing (CORS) headers enabled. This method
     * always adds 'Accept: application/json' to the request header.
     *
     * @exports loadJson
     *
     * @param {String} url The url to retrieve the JSON data.
     * @param {Object} headers An associative array of name value pairs to append to the request header. 'Accept: application/json' is added to the request header internally and does not need to be specified.
     * @returns {Promise} a promise that will resolve to the requested data when loaded.
     *
     * @exception {DeveloperError} url is required.
     *
     * @example
     * loadJson('http://someUrl.com/someJson.txt').then(function(jsonData){
     *     //Do something with the JSON object
     * });
     *
     * @see loadText
     * @see when
     */
    var loadJson = function loadJson(url, headers) {
        if(typeof headers === 'undefined'){
            headers = {};
        }
        headers.Accept = 'application/json';
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }
        return loadText(url, headers).then(function(value) {
            return JSON.parse(value);
        });
    };

    return loadJson;
});