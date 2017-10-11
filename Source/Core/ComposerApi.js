define([
    './Credit',
    './defined',
    './DeveloperError'
], function(
    Credit,
    defined,
    DeveloperError) {
    'use strict';

    /**
     * Object for setting and retrieving the default Composer API access token.
     *
     * @exports ComposerApi
     */
    var ComposerApi = {
    };

    /**
     * The default cesium.com access token to use if one is not provided to the
     * constructor of an object that uses the Composer API.
     * @type {String}
     */
    ComposerApi.defaultToken = undefined;

    /**
     * Returns the provided token, or the default token if none was provided
     * @param {String} [token] A cesium.com access token
     * @return {String} A cesium.com access token
     */
    ComposerApi.getToken = function(token) {
        if (defined(token)) {
            return token;
        }

        //>>includeStart('debug', pragmas.debug);
        if (!defined(ComposerApi.defaultToken)) {
            throw new DeveloperError('Assign your cesium.com token to ComposerApi.defaultToken before using the cesium.com asset type');
        }
        //>>includeEnd('debug');

        return ComposerApi.defaultKey;
    };

    return ComposerApi;
});
