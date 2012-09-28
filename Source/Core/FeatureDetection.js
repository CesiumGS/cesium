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
     * @returns true if the current browser supports the full screen standard, false if not.
     *
     * @see FullScreen
     * @see <a href='http://dvcs.w3.org/hg/fullscreen/raw-file/tip/Overview.html'>W3C Fullscreen Living Specification</a>
     */
    FeatureDetection.supportsFullScreen = function() {
        return FullScreen.supportsFullScreen();
    };

    var _webGLSupport;

    /**
     * Detects whether the current browser supports WebGL.
     *
     * @returns A result object containing the following properties.
     * success: true if WebGL is supported.
     * contextID: If WebGL is supported, the contextID that is supported for WebGL.
     * browserNotSupported: true if the browser doesn't support the WebGL API at all.
     * couldNotCreateContext: true if the browser supports the API, but context creation failed.
     * createContextError: Any error that was thrown when creating a context.
     *
     * @example
     * var webGLSupport = FeatureDetection.getWebGLSupport();
     * if (!webGLSupport.success) {
     *   if (webGLSupport.browserNotSupported) {
     *     // get a better browser
     *   } else if (webGLSupport.couldNotCreateContext) {
     *     // browser should work, but drivers might be blacklisted
     *   }
     * }
     */
    FeatureDetection.detectWebGLSupport = function() {
        if (typeof _webGLSupport === 'undefined') {
            _webGLSupport = {
                success : false,
                contextID : undefined,
                browserNotSupported : false,
                couldNotCreateContext : false,
                createContextError : undefined
            };

            if (typeof window.WebGLRenderingContext === 'undefined') {
                _webGLSupport.browserNotSupported = true;
                return _webGLSupport;
            }

            var canvas = document.createElement('canvas');

            if (!canvas.getContext) {
                _webGLSupport.browserNotSupported = true;
                return _webGLSupport;
            }

            var contextID = 'webgl';
            try {
                var context = canvas.getContext(contextID);

                if (!context) {
                    contextID = 'experimental-webgl';
                    context = canvas.getContext(contextID);

                    if (!context) {
                        _webGLSupport.couldNotCreateContext = true;
                        return _webGLSupport;
                    }
                }
            } catch (e) {
                _webGLSupport.couldNotCreateContext = true;
                _webGLSupport.createContextError = e;
                return _webGLSupport;
            }

            _webGLSupport.success = true;
            _webGLSupport.contextID = contextID;
        }
        return _webGLSupport;
    };

    return FeatureDetection;
});