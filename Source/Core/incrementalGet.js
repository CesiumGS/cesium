/*global define*/
define(function() {
    "use strict";
    /*global EventSource console*/

    return function(uri, itemCallback, doneCallback) {
        var eventSource = new EventSource(uri);

        if (itemCallback) {
            eventSource.onmessage = function(event) {
                if (event.data !== '') {
                    try {
                        itemCallback(JSON.parse(event.data));
                    } catch (e) {
                        console.log(e);
                    }
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