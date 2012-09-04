/*global define*/
define(['../Core/incrementalGet',
        './processCzml'
       ], function(
         incrementalGet,
         processCzml) {
    "use strict";

    function fillBufferIncrementally(buffer, url, processCallback, doneCallback) {
        return incrementalGet(url, function(item) {
            processCallback(item, buffer, url);
        }, doneCallback);
    }

    return fillBufferIncrementally;
});