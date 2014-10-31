/*global define*/
define([
        '../Core/defined',
        '../Core/RuntimeError',
        './createTaskProcessorWorker'
    ], function(
        defined,
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
