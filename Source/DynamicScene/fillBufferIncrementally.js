/*global define*/
define(['../Core/incrementalGet',
        './processCzml'
       ], function(
         incrementalGet,
         processCzml) {
    "use strict";

    function fillBufferIncrementally(buffer, url, updaterFunctions, doneCallback) {
        return incrementalGet(url, function(item) {
            processCzml(item, buffer, url, updaterFunctions);
        }, doneCallback);
    }

    return fillBufferIncrementally;
});