/*global define*/
define(['./DeveloperError'],
        function(
                DeveloperError) {
    "use strict";
    /*global EventSource console*/

    /**
     * Uses <a href="http://www.w3.org/TR/eventsource/">EventSource</a> to retrieve the JSON data from the given url.
     * EventSource is a way to enable servers to push data to Web pages over HTTP or using dedicated server-push protocols.
     * Use this to stream data to your client to make better use of network resources in cases where the user
     * agent implementor and the network operator are able to coordinate in advance. Amongst other benefits,
     * this can result in significant savings in battery life on portable devices.
     *
     * @exports incrementalGet
     *
     * @param {String} url The url to retrieve the JSON data.
     * @param {Function} itemCallback The function to use when data is retrieved from the <a href="http://www.w3.org/TR/eventsource/">EventSource</a>.
     * @param {Function} doneCallback The function to use when the EventSource is closed.
     * @returns A handle to close the <a href="http://www.w3.org/TR/eventsource/">EventSource</a>.
     *
     * @exception {DeveloperError} url is required.

     * @example
     * incrementalGet("http://localhost/test", function(json){
     *  //process json data.
     * }, function(){
     *  //The event source closed, do clean up.
     * });
     *
     * @see <a href="http://www.w3.org/TR/eventsource/">EventSource</a>
     */
    var incrementalGet = function(url, itemCallback, doneCallback) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }
        var eventSource = new EventSource(url);

        if (itemCallback) {
            eventSource.onmessage = function(event) {
                if (event.data !== '') {
                    try {
                        itemCallback(JSON.parse(event.data));
                    } catch (e) {
                        console.log(e);
                        eventSource.onerror();
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
    return incrementalGet;
});