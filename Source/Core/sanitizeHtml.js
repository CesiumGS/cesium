/*global define*/
define([
        './defined',
        './TaskProcessor'
    ], function(
        defined,
        TaskProcessor) {
    "use strict";

    var sanitizerTaskProcessor;

    /**
     *
     */
    function sanitizeHtml(html) {
        if (!defined(sanitizerTaskProcessor)) {
            sanitizerTaskProcessor = new TaskProcessor('sanitizeHtml', Infinity);
        }
        return sanitizerTaskProcessor.scheduleTask(html);
    }

    return sanitizeHtml;
});