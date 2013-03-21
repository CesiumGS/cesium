/*global define*/
define([
        './Fullscreen'
    ], function(
        Fullscreen) {
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

    var isChromeResult;
    var chromeVersionResult;
    function isChrome() {
        if (typeof isChromeResult === 'undefined') {
            var fields = (/ Chrome\/([\.0-9]+)/).exec(navigator.userAgent);
            if (fields === null) {
                isChromeResult = false;
            } else {
                isChromeResult = true;
                chromeVersionResult = extractVersion(fields[1]);
            }
        }

        return isChromeResult;
    }

    function chromeVersion() {
        return isChrome() && chromeVersionResult;
    }

    var isSafariResult;
    var safariVersionResult;
    function isSafari() {
        if (typeof isSafariResult === 'undefined') {
            // Chrome contains Safari in the user agent too
            if (isChrome() || !(/ Safari\/[\.0-9]+/).test(navigator.userAgent)) {
                isSafariResult = false;
            } else {
                var fields = (/ Version\/([\.0-9]+)/).exec(navigator.userAgent);
                if (fields === null) {
                    isSafariResult = false;
                } else {
                    isSafariResult = true;
                    safariVersionResult = extractVersion(fields[1]);
                }
            }
        }

        return isSafariResult;
    }

    function safariVersion() {
        return isSafari() && safariVersionResult;
    }

    var isWebkitResult;
    var webkitVersionResult;
    function isWebkit() {
        if (typeof isWebkitResult === 'undefined') {
            var fields = (/ AppleWebKit\/([\.0-9]+)(\+?)/).exec(navigator.userAgent);
            if (fields === null) {
                isWebkitResult = false;
            } else {
                isWebkitResult = true;
                webkitVersionResult = extractVersion(fields[1]);
                webkitVersionResult.isNightly = !!fields[2];
            }
        }

        return isWebkitResult;
    }

    function webkitVersion() {
        return isWebkit() && webkitVersionResult;
    }

    var supportsCrossOriginImagery;

    /**
     * Detects whether the current browser supports the use of cross-origin
     * requests to load streaming imagery.
     *
     * @returns true if the browser can load cross-origin streaming imagery, false if not.
     *
     * @see <a href='http://www.w3.org/TR/cors/'>Cross-Origin Resource Sharing</a>
     */
    FeatureDetection.supportsCrossOriginImagery = function() {
        if (typeof supportsCrossOriginImagery === 'undefined') {
            if (isSafari() && webkitVersion()[0] < 536) {
                // versions of Safari below this incorrectly throw a DOM error when calling
                // readPixels on a canvas containing a cross-origin image.
                supportsCrossOriginImagery = false;
            } else {
                // any other versions of browsers that incorrectly block
                // readPixels on canvas containing crossOrigin images?
                supportsCrossOriginImagery = 'withCredentials' in new XMLHttpRequest();
            }
        }
        return supportsCrossOriginImagery;
    };

    /**
     * Detects whether the current browser supports the full screen standard.
     *
     * @returns true if the supports the full screen standard, false if not.
     *
     * @see Fullscreen
     * @see <a href='http://dvcs.w3.org/hg/fullscreen/raw-file/tip/Overview.html'>W3C Fullscreen Living Specification</a>
     */
    FeatureDetection.supportsFullscreen = function() {
        return Fullscreen.supportsFullscreen();
    };

    return FeatureDetection;
});