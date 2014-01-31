/*global define*/
define([
        '../Core/defined',
        './createTaskProcessorWorker'
    ], function(
        defined,
        createTaskProcessorWorker) {
    "use strict";

    var cajaScript = '//caja.appspot.com/html-css-sanitizer-minified.js';
    var html_sanitize;

    /**
     * A worker that loads the Google Caja HTML & CSS sanitizer and sanitizes the
     * provided HTML string.
     *
     * @exports sanitize
     *
     * @see TaskProcessor
     * @see <a href='http://www.w3.org/TR/workers/'>Web Workers</a>
     */
    var sanitizeHtml = function(html) {
        if (!defined(html_sanitize)) {
            /*global self,importScripts*/
            self.window = {};
            importScripts(cajaScript); // importScripts is synchronous
            html_sanitize = window.html_sanitize;
        }

        return html_sanitize(html);
    };

    return createTaskProcessorWorker(sanitizeHtml);
});
