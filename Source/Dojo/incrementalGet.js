/*global define EventSource*/
define(function() {
    "use strict";

    return function(uri, itemCallback, doneCallback) {
        var eventSource = new EventSource(uri);

        if (itemCallback) {
            eventSource.onmessage = function(event) {
                if (event.data !== '') {
                    itemCallback(JSON.parse(event.data));
                }
            };
        }

        var finish = function() {
            if (doneCallback) {
                doneCallback();
            }
            eventSource.close();
        };

        eventSource.onerror = finish;

        return {
            abort : finish
        };
    };
});