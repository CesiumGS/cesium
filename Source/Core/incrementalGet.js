/*global define*/
define([
        './DeveloperError',
        './defaultValue'
    ], function(
        DeveloperError,
        defaultValue) {
    "use strict";
    /*global EventSource*/

    /**
     * Uses <a href="http://www.w3.org/TR/eventsource/">EventSource</a> to load JSON data
     * incrementally from the given url.  Each event in the stream is expected to be a
     * JSON object.  itemCallback is called asynchronously once for each object as it arrives.
     *
     * @exports incrementalGet
     *
     * @param {String} url The URL of the event stream.
     * @param {Function} [itemCallback] A function that will be called with each item as it arrives.
     * @param {Function} [doneCallback] A function that will be called when the event stream closes.
     * @param {String} [eventName='message'] The event name to listen to.  By default, all events will be listened to.
     * @returns A function that will close the stream.
     *
     * @exception {DeveloperError} url is required.

     * @example
     * var abort = incrementalGet('http://example.com/test', function(item) {
     *  // process item.
     * }, function() {
     *  // no more items.
     * });
     *
     * @see <a href="http://www.w3.org/TR/eventsource/">EventSource</a>
     */
    var incrementalGet = function(url, itemCallback, doneCallback, eventName) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        eventName = defaultValue(eventName, 'message');

        var eventSource = new EventSource(url);

        if (typeof itemCallback !== 'undefined') {
            eventSource.addEventListener(eventName, function(event) {
                var data = event.data;
                if (data !== '') {
                    itemCallback(JSON.parse(data));
                }
            });
        }

        function finish() {
            if (typeof doneCallback !== 'undefined') {
                doneCallback();
            }
            eventSource.close();
        }

        eventSource.onerror = finish;
        return finish;
    };

    return incrementalGet;
});