/*global define*/
define(['./get'], function(get) {
    "use strict";

    function fillBuffer(buffer, url, doneCallback) {
        var deferred = get(url).then(function(data) {
            buffer.addData(data, url);
            doneCallback();
        });

        return {
            abort : deferred.cancel
        };
    }

    return fillBuffer;
});