/*global define*/
define(['./defined'], function(defined) {
    "use strict";

    var _supportsFullscreen;
    var _names = {
        requestFullscreen : undefined,
        exitFullscreen : undefined,
        fullscreenEnabled : undefined,
        fullscreenElement : undefined,
        fullscreenchange : undefined,
        fullscreenerror : undefined
    };

    /**
     * Browser-independent functions for working with the standard fullscreen API.
     *
     * @exports Fullscreen
     *
     * @see <a href='http://dvcs.w3.org/hg/fullscreen/raw-file/tip/Overview.html'>W3C Fullscreen Living Specification</a>
     */
    var Fullscreen = {};

    /**
     * Detects whether the browser supports the standard fullscreen API.
     *
     * @returns <code>true</code> if the browser supports the standard fullscreen API,
     * <code>false</code> otherwise.
     */
    Fullscreen.supportsFullscreen = function() {
        if (defined(_supportsFullscreen)) {
            return _supportsFullscreen;
        }

        _supportsFullscreen = false;

        var body = document.body;
        if (typeof body.requestFullscreen === 'function') {
            // go with the unprefixed, standard set of names
            _names.requestFullscreen = 'requestFullscreen';
            _names.exitFullscreen = 'exitFullscreen';
            _names.fullscreenEnabled = 'fullscreenEnabled';
            _names.fullscreenElement = 'fullscreenElement';
            _names.fullscreenchange = 'fullscreenchange';
            _names.fullscreenerror = 'fullscreenerror';
            _supportsFullscreen = true;
            return _supportsFullscreen;
        }

        //check for the correct combination of prefix plus the various names that browsers use
        var prefixes = ['webkit', 'moz', 'o', 'ms', 'khtml'];
        var name;
        for ( var i = 0, len = prefixes.length; i < len; ++i) {
            var prefix = prefixes[i];

            // casing of Fullscreen differs across browsers
            name = prefix + 'RequestFullscreen';
            if (typeof body[name] === 'function') {
                _names.requestFullscreen = name;
                _supportsFullscreen = true;
            } else {
                name = prefix + 'RequestFullScreen';
                if (typeof body[name] === 'function') {
                    _names.requestFullscreen = name;
                    _supportsFullscreen = true;
                }
            }

            // disagreement about whether it's "exit" as per spec, or "cancel"
            name = prefix + 'ExitFullscreen';
            if (typeof document[name] === 'function') {
                _names.exitFullscreen = name;
            } else {
                name = prefix + 'CancelFullScreen';
                if (typeof document[name] === 'function') {
                    _names.exitFullscreen = name;
                }
            }

            // casing of Fullscreen differs across browsers
            name = prefix + 'FullscreenEnabled';
            if (defined(document[name])) {
                _names.fullscreenEnabled = name;
            } else {
                name = prefix + 'FullScreenEnabled';
                if (defined(document[name])) {
                    _names.fullscreenEnabled = name;
                }
            }

            // casing of Fullscreen differs across browsers
            name = prefix + 'FullscreenElement';
            if (defined(document[name])) {
                _names.fullscreenElement = name;
            } else {
                name = prefix + 'FullScreenElement';
                if (defined(document[name])) {
                    _names.fullscreenElement = name;
                }
            }

            // thankfully, event names are all lowercase per spec
            name = prefix + 'fullscreenchange';
            // event names do not have 'on' in the front, but the property on the document does
            if (defined(document['on' + name])) {
                //except on IE
                if (prefix === 'ms') {
                    name = 'MSFullscreenChange';
                }
                _names.fullscreenchange = name;
            }

            name = prefix + 'fullscreenerror';
            if (defined(document['on' + name])) {
                //except on IE
                if (prefix === 'ms') {
                    name = 'MSFullscreenError';
                }
                _names.fullscreenerror = name;
            }
        }

        return _supportsFullscreen;
    };

    /**
     * Asynchronously requests the browser to enter fullscreen mode on the given element.
     * If fullscreen mode is not supported by the browser, does nothing.
     *
     * @param {Object} element The HTML element which will be placed into fullscreen mode.
     *
     * @example
     * // Put the entire page into fullscreen.
     * Cesium.Fullscreen.requestFullscreen(document.body)
     *
     * // Place only the Cesium canvas into fullscreen.
     * Cesium.Fullscreen.requestFullscreen(scene.canvas)
     */
    Fullscreen.requestFullscreen = function(element) {
        if (!Fullscreen.supportsFullscreen()) {
            return;
        }

        element[_names.requestFullscreen]();
    };

    /**
     * Asynchronously exits fullscreen mode.  If the browser is not currently
     * in fullscreen, or if fullscreen mode is not supported by the browser, does nothing.
     */
    Fullscreen.exitFullscreen = function() {
        if (!Fullscreen.supportsFullscreen()) {
            return;
        }

        document[_names.exitFullscreen]();
    };

    /**
     * Determine whether the browser will allow an element to be made fullscreen, or not.
     * For example, by default, iframes cannot go fullscreen unless the containing page
     * adds an "allowfullscreen" attribute (or prefixed equivalent).
     *
     * @returns {Boolean} <code>true</code> if the browser is able to enter fullscreen mode,
     * <code>false</code> if not, and <code>undefined</code> if the browser does not
     * support fullscreen mode.
     */
    Fullscreen.isFullscreenEnabled = function() {
        if (!Fullscreen.supportsFullscreen()) {
            return undefined;
        }

        return document[_names.fullscreenEnabled];
    };

    /**
     * Gets the element that is currently fullscreen, if any.  To simply check if the
     * browser is in fullscreen mode or not, use {@link Fullscreen#isFullscreen}.
     *
     * @returns {Object} the element that is currently fullscreen, or <code>null</code> if the browser is
     * not in fullscreen mode, or <code>undefined</code> if the browser does not support fullscreen
     * mode.
     */
    Fullscreen.getFullscreenElement = function() {
        if (!Fullscreen.supportsFullscreen()) {
            return undefined;
        }

        return document[_names.fullscreenElement];
    };

    /**
     * Determines if the browser is currently in fullscreen mode.
     *
     * @returns {Boolean} <code>true</code> if the browser is currently in fullscreen mode, <code>false</code>
     * if it is not, or <code>undefined</code> if the browser does not support fullscreen mode.
     */
    Fullscreen.isFullscreen = function() {
        if (!Fullscreen.supportsFullscreen()) {
            return undefined;
        }

        return Fullscreen.getFullscreenElement() !== null;
    };

    /**
     * Gets the name of the event on the document that is fired when fullscreen is
     * entered or exited.  This event name is intended for use with addEventListener.
     *
     * In your event handler, to determine if the browser is in fullscreen mode or not,
     * use {@link Fullscreen#isFullscreen}.
     *
     * @returns {String} the name of the event that is fired when fullscreen is entered or
     * exited, or <code>undefined</code> if fullscreen is not supported.
     */
    Fullscreen.getFullscreenChangeEventName = function() {
        if (!Fullscreen.supportsFullscreen()) {
            return undefined;
        }

        return _names.fullscreenchange;
    };

    /**
     * Gets the name of the event that is fired when a fullscreen error
     * occurs.  This event name is intended for use with addEventListener.
     *
     * @returns {String} the name of the event that is fired when a fullscreen error occurs,
     * or <code>undefined</code> if fullscreen is not supported.
     */
    Fullscreen.getFullscreenErrorEventName = function() {
        if (!Fullscreen.supportsFullscreen()) {
            return undefined;
        }

        return _names.fullscreenerror;
    };

    return Fullscreen;
});