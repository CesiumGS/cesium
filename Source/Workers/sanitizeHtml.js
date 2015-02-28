/*global define*/
define([
        '../Core/defined',
        '../Core/deprecationWarning',
        '../Core/RuntimeError',
        './createTaskProcessorWorker'
    ], function(
        defined,
        deprecationWarning,
        RuntimeError,
        createTaskProcessorWorker) {
    "use strict";

    var cajaScript = 'https://caja.appspot.com/html-css-sanitizer-minified.js';
    var html_sanitize;

    /**
     * A worker that loads the Google Caja HTML & CSS sanitizer and sanitizes the
     * provided HTML string.
     *
     * @exports sanitize
     *
     * @see TaskProcessor
     * @see {@link http://www.w3.org/TR/workers/|Web Workers}
     */
    var sanitizeHtml = function(html) {
        deprecationWarning('sanitize', 'The sanitize worker has been deprecated and will be removed in Cesium 1.10.');

        if (!defined(html_sanitize)) {
            /*global self,importScripts*/
            self.window = {};
            importScripts(cajaScript); // importScripts is synchronous
            html_sanitize = window.html_sanitize;

            if (!defined(html_sanitize)) {
                throw new RuntimeError('Unable to load Google Caja sanitizer script.');
            }
        }

        return html_sanitize(html);
    };

    return createTaskProcessorWorker(sanitizeHtml);
});
