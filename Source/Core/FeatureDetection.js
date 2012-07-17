/*global define*/
define([
        './FullScreen'
    ], function(
        FullScreen) {
    "use strict";

    /**
     * A set of functions to detect whether the current browser supports
     * various features.
     *
     * @exports FeatureDetection
     */
    var FeatureDetection = {};

    function extractVersion(versionString) {
        return versionString.split('.').map(function(v) {
            return parseInt(v, 10);
        });
    }

    var _isChrome;
    var _chromeVersion;
    function isChrome() {
        if (typeof _isChrome === 'undefined') {
            var fields = (/ Chrome\/([\.0-9]+)/).exec(navigator.userAgent);
            if (!fields) {
                return (_isChrome = false);
            }

            _isChrome = true;
            _chromeVersion = extractVersion(fields[1]);
        }

        return _isChrome;
    }

    function chromeVersion() {
        return isChrome() && _chromeVersion;
    }

    var _isSafari;
    var _safariVersion;
    function isSafari() {
        if (typeof _isSafari === 'undefined') {
            // Chrome contains Safari in the user agent too
            if (isChrome() || !(/ Safari\/[\.0-9]+/).test(navigator.userAgent)) {
                return (_isSafari = false);
            }

            var fields = (/ Version\/([\.0-9]+)/).exec(navigator.userAgent);
            if (!fields) {
                return (_isSafari = false);
            }

            _isSafari = true;
            _safariVersion = extractVersion(fields[1]);
        }

        return _isSafari;
    }

    function safariVersion() {
        return isSafari() && _safariVersion;
    }

    var _isWebkit;
    var _webkitVersion;
    function isWebkit() {
        if (typeof _isWebkit === 'undefined') {
            var fields = (/ AppleWebKit\/([\.0-9]+)(\+?)/).exec(navigator.userAgent);
            if (!fields) {
                return (_isWebkit = false);
            }

            _isWebkit = true;
            _webkitVersion = extractVersion(fields[1]);
            _webkitVersion.isNightly = !!fields[2];
        }

        return _isWebkit;
    }

    function webkitVersion() {
        return isWebkit() && _webkitVersion;
    }

    var _supportsCrossOriginImagery;

    /**
     * Detects whether the current browser supports the use of cross-origin
     * requests to load streaming imagery.
     *
     * @returns true if the browser can load cross-origin streaming imagery, false if not.
     *
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     */
    FeatureDetection.supportsCrossOriginImagery = function() {
        if (typeof _supportsCrossOriginImagery === 'undefined') {
            if (isSafari() && webkitVersion()[0] < 536) {
                // versions of Safari below this incorrectly throw a DOM error when calling
                // readPixels on a canvas containing a cross-origin image.
                _supportsCrossOriginImagery = false;
            } else {
                // any other versions of browsers that incorrectly block
                // readPixels on canvas containing crossOrigin images?
                _supportsCrossOriginImagery = 'withCredentials' in new XMLHttpRequest();
            }
        }
        return _supportsCrossOriginImagery;
    };

    /**
     * Detects whether the current browser supports the full screen standard.
     *
     * @returns true if the supports the full screen standard, false if not.
     *
     * @see FullScreen
     * @see <a href='http://dvcs.w3.org/hg/fullscreen/raw-file/tip/Overview.html'>W3C Fullscreen Living Specification</a>
     */
    FeatureDetection.supportsFullScreen = function() {
        return FullScreen.supportsFullScreen();
    };

    return FeatureDetection;
});