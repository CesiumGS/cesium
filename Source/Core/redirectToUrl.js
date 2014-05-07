/*global define*/
define([], function() {
    "use strict";

    var redirectToUrl = function(url) {
        redirectToUrl.implementation(url);
    };

    // The implementation is broken out into a separate function so it can be mocked for testing.
    redirectToUrl.implementation = function(url) {
        window.location.href = url;
    };

    redirectToUrl.defaultImplementation = redirectToUrl.implementation;

    return redirectToUrl;
});