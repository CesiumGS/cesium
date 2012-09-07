/*global define*/
define(['../Core/incrementalGet'
       ], function(
         incrementalGet) {
    "use strict";

    /**
     * Uses {@link incrementalGet} to load data into a given buffer.
     *
     * @exports fillBufferIncrementally
     *
     * @param {Object} buffer The buffer to update.
     * @param {String} url The url to retrieve the data.
     * @param {function} processCallback The callback function to process the data.
     * @param {function} doneCallback Called when {@link incrementalGet} is finished.
     * @example
     * var buffer = {...};
     * fillBufferIncrementally(buffer, 'http://localhost/test', function(item, buffer, url){});
     * @see incrementalGet
     */
    function fillBufferIncrementally(buffer, url, processCallback, doneCallback) {
        return incrementalGet(url, function(item) {
            processCallback(item, buffer, url);
        }, doneCallback);
    }

    return fillBufferIncrementally;
});