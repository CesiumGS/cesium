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
     * @returns A handle to the <a href="http://www.w3.org/TR/eventsource/">EventSource</a>.
     *
     * @example
     * var buffer = {
     *   update:function(item){
     *      //add item to buffer
     *   },
     *   cleanup:function(){
     *    //cleanup
     *   }
     * };
     * var handle = fillBufferIncrementally(buffer, 'http://localhost/test', function(item, buffer, url){
     *     buffer.update(item);
     * },
     * function(){
     *   buffer.cleanup();
     * });
     *  //to close use handle.abort();
     *
     * @see incrementalGet
     */
    var fillBufferIncrementally = function fillBufferIncrementally(buffer, url, processCallback, doneCallback) {
        return incrementalGet(url, function(item) {
            processCallback(item, buffer, url);
        }, doneCallback);
    };

    return fillBufferIncrementally;
});