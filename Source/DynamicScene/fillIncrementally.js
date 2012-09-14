/*global define*/
define([
        '../Core/incrementalGet'
    ], function(
        incrementalGet) {
    "use strict";

    /**
     * Uses {@link incrementalGet} to load data into a given {@link DynamicObjectCollection}.
     *
     * @exports fillIncrementally
     *
     * @param {DynamicObjectCollection} dynamicObjectCollection The collection to update.
     * @param {String} url The URL of the event stream.
     * @param {function} processCallback The callback function to process the data.
     * @param {function} doneCallback Called when {@link incrementalGet} is finished.
     * @returns A handle to the <a href="http://www.w3.org/TR/eventsource/">EventSource</a>.
     *
     * @example
     * var dynamicObjectCollection = {
     *   update : function(item) {
     *      //add item to the dynamicObjectCollection
     *   },
     *   cleanup : function() {
     *    //cleanup
     *   }
     * };
     * var abort = fillIncrementally(dynamicObjectCollection, 'http://localhost/test', function(item, doc, url) {
     *     doc.update(item);
     * }, function() {
     *   doc.cleanup();
     * });
     * //to close call abort();
     *
     * @see incrementalGet
     */
    var fillIncrementally = function fillIncrementally(dynamicObjectCollection, url, processCallback, doneCallback) {
        return incrementalGet(url, function(item) {
            processCallback(item, dynamicObjectCollection, url);
        }, doneCallback);
    };

    return fillIncrementally;
});