/*global define*/
define([
        './clone',
        './Check',
        './defined',
        './defineProperties',
        './Heap',
        './isBlobUri',
        './isDataUri',
        './RequestState',
        '../ThirdParty/Uri',
        '../ThirdParty/when'
    ], function(
        clone,
        Check,
        defined,
        defineProperties,
        Heap,
        isBlobUri,
        isDataUri,
        RequestState,
        Uri,
        when) {
    'use strict';

    function sortRequests(a, b) {
        return a.distance - b.distance;
    }

    var statistics = {
        numberOfAttemptedRequests : 0,
        numberOfActiveRequests : 0,
        numberOfCancelledRequests : 0,
        numberOfCancelledActiveRequests : 0,
        numberOfFailedRequests : 0,
        numberOfActiveRequestsEver : 0
    };

    var priorityHeapLength = 20;
    var requestHeap = new Heap(sortRequests);
    requestHeap.maximumLength = priorityHeapLength;
    requestHeap.reserve(priorityHeapLength);
    var activeRequests = [];

    var numberOfActiveRequestsByServer = {};

    var pageUri = typeof document !== 'undefined' ? new Uri(document.location.href) : new Uri();


    /**
     * Tracks the number of active requests and prioritizes incoming requests.
     *
     * @exports RequestScheduler
     *
     * @private
     */
    function RequestScheduler() {
    }

    /**
     * The maximum number of simultaneous active requests. Un-throttled requests do not observe this limit.
     * @type {Number}
     * @default 50
     */
    RequestScheduler.maximumRequests = 50;

    /**
     * The maximum number of simultaneous active requests per server. Un-throttled requests do not observe this limit.
     * @type {Number}
     * @default 50
     */
    RequestScheduler.maximumRequestsPerServer = 6;

    /**
     * Specifies if the request scheduler should throttle incoming requests, or let the browser queue requests under its control.
     * @type {Boolean}
     * @default true
     */
    RequestScheduler.debugThrottle = true;

    /**
     * When true, log statistics to the console every frame
     * @type {Boolean}
     * @default false
     */
    RequestScheduler.debugShowStatistics = false;

    defineProperties(RequestScheduler, {
        /**
         * Returns the statistics used by the request scheduler.
         *
         * @memberof RequestScheduler
         *
         * @type Object
         * @readonly
         */
        statistics : {
            get : function() {
                return statistics;
            }
        },

        /**
         * The maximum size of the priority heap. This limits the number of requests that are sorted by priority. Only applies to requests that are not yet active.
         *
         * @memberof RequestScheduler
         *
         * @type {Number}
         * @default 20
         */
        priorityHeapLength : {
            get : function() {
                return priorityHeapLength;
            },
            set : function(value) {
                // If the new length shrinks the heap, need to cancel some of the requests.
                // Since this value is not intended to be tweaked regularly it is fine to just cancel the high priority requests.
                if (value < priorityHeapLength) {
                    while (requestHeap.length > value) {
                        var request = requestHeap.pop();
                        cancelRequest(request);
                    }
                }
                priorityHeapLength = value;
                requestHeap.maximumLength = value;
                requestHeap.reserve(value);
            }
        }
    });

    /**
     * Get the server name from a given url.
     *
     * @param {String} url The url.
     * @returns {String} The server name.
     */
    RequestScheduler.getServer = function(url) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('url', url);
        //>>includeEnd('debug');

        var uri = new Uri(url).resolve(pageUri);
        uri.normalize();
        var serverName = uri.authority;
        if (!/:/.test(serverName)) {
            serverName = serverName + ':' + (uri.scheme === 'https' ? '443' : '80');
        }

        var length = numberOfActiveRequestsByServer[serverName];
        if (!defined(length)) {
            numberOfActiveRequestsByServer[serverName] = 0;
        }

        return serverName;
    };

    /**
     * For testing only.
     *
     * @private
     */
    RequestScheduler.clearForSpecs = function() {
        var length = activeRequests.length;
        for (var i = 0; i < length; ++i) {
            cancelRequest(activeRequests[i]);
        }
        activeRequests.length = 0;

        while (requestHeap.length > 0) {
            var request = requestHeap.pop();
            cancelRequest(request);
        }

        // Clear stats
        statistics.numberOfAttemptedRequests = 0;
        statistics.numberOfActiveRequests = 0;
        statistics.numberOfCancelledRequests = 0;
        statistics.numberOfCancelledActiveRequests = 0;
        statistics.numberOfFailedRequests = 0;
        statistics.numberOfActiveRequestsEver = 0;
    };

    /**
     * For testing only.
     *
     * @private
     */
    RequestScheduler.numberOfActiveRequestsByServer = function(serverName) {
        return numberOfActiveRequestsByServer[serverName];
    };

    function serverHasOpenSlots(server) {
        return numberOfActiveRequestsByServer[server] < RequestScheduler.maximumRequestsPerServer;
    }

    function issueRequest(request) {
        if (request.state === RequestState.UNISSUED) {
            request.state = RequestState.ISSUED;
            request.deferred = when.defer();
        }
        return request.deferred.promise;
    }

    function getRequestReceivedFunction(request) {
        return function(results) {
            if (request.state === RequestState.CANCELLED) {
                return;
            }
            --statistics.numberOfActiveRequests;
            --numberOfActiveRequestsByServer[request.server];
            request.state = RequestState.RECEIVED;
            request.deferred.resolve(results);
        };
    }

    function getRequestFailedFunction(request) {
        return function(error) {
            if (request.state === RequestState.CANCELLED) {
                return;
            }
            ++statistics.numberOfFailedRequests;
            --statistics.numberOfActiveRequests;
            --numberOfActiveRequestsByServer[request.server];
            request.state = RequestState.FAILED;
            request.deferred.reject(error);
        };
    }

    function startRequest(request) {
        var promise = issueRequest(request);
        request.state = RequestState.ACTIVE;
        activeRequests.push(request);
        ++statistics.numberOfActiveRequests;
        ++statistics.numberOfActiveRequestsEver;
        ++numberOfActiveRequestsByServer[request.server];

        request.requestFunction().then(getRequestReceivedFunction(request)).otherwise(getRequestFailedFunction(request));
        return promise;
    }

    function cancelRequest(request) {
        var active = request.state === RequestState.ACTIVE;
        request.state = RequestState.CANCELLED;
        ++statistics.numberOfCancelledRequests;
        request.deferred.reject('Cancelled');

        if (active) {
            // Despite the Request being cancelled, the xhr request is still in flight.
            // When it resolves getRequestReceivedFunction or getRequestFailedFunction will ignore it.
            --statistics.numberOfActiveRequests;
            --numberOfActiveRequestsByServer[request.server];
            ++statistics.numberOfCancelledActiveRequests;
            if (defined(request.xhr)) {
                request.xhr.abort();
            }
        }
    }

    /**
     * Issuers of a request should update properties of requests. At the end of the frame,
     * RequestScheduler.update is called to start, cancel, or defer requests.
     */
    RequestScheduler.update = function() {
        var request;

        // Loop over all active requests. Cancelled, failed, or received requests are removed from the array to make room for new requests.
        // If an active request is cancelled, its XMLHttpRequest will be aborted.
        var removeCount = 0;
        var activeLength = activeRequests.length;
        for (var i = 0; i < activeLength; ++i) {
            request = activeRequests[i];
            if (request.cancelled) {
                // Request was explicitly cancelled
                cancelRequest(request);
            }
            if (request.state !== RequestState.ACTIVE) {
                // Request is no longer active, remove from array
                ++removeCount;
                continue;
            }
            if (removeCount > 0) {
                // Shift back to fill in vacated slots from completed requests
                activeRequests[i - removeCount] = request;
            }
        }
        activeRequests.length -= removeCount;

        // Resort the heap since priority may have changed. Distance and sse are updated prior to getting here.
        requestHeap.resort();

        // Get the number of open slots and fill with the highest priority requests.
        // Un-throttled requests are automatically added to activeRequests, so activeRequests.length may exceed maximumRequests
        var openSlots = Math.max(RequestScheduler.maximumRequests - activeRequests.length, 0);
        var filledSlots = 0;
        while (filledSlots < openSlots && requestHeap.length > 0) {
            // Loop until all open slots are filled or the heap becomes empty
            request = requestHeap.pop();
            if (request.cancelled) {
                // Request was explicitly cancelled
                cancelRequest(request);
                continue;
            }

            if (request.throttleByServer && !serverHasOpenSlots(request.server)) {
                // Open slots are available, but the request is throttled by its server. Cancel and try again later.
                cancelRequest(request);
                continue;
            }

            startRequest(request);
            ++filledSlots;
        }

        updateStatistics();
    };

    /**
     * Issue a request. If request.throttle is false, the request is sent immediately. Otherwise the request will be
     * queued and sorted by priority before being sent.
     *
     * @param {Request} request The request object.
     *
     * @returns {Promise|undefined} A Promise for the requested data, or undefined if this request does not have high enough priority to be issued.
     */
    RequestScheduler.request = function(request) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('request', request);
        Check.typeOf.string('request.url', request.url);
        Check.typeOf.func('request.requestFunction', request.requestFunction);
        //>>includeEnd('debug');

        if (isDataUri(request.url) || isBlobUri(request.url)) {
            request.state = RequestState.RECEIVED;
            return request.requestFunction();
        }

        ++statistics.numberOfAttemptedRequests;

        if (!defined(request.server)) {
            request.server = RequestScheduler.getServer(request.url);
        }

        if (!RequestScheduler.debugThrottle || !request.throttle) {
            return startRequest(request);
        }

        if (activeRequests.length >= RequestScheduler.maximumRequests) {
            // Active requests are saturated. Try again later.
            return undefined;
        }

        if (request.throttleByServer && !serverHasOpenSlots(request.server)) {
            // Server is saturated. Try again later.
            return undefined;
        }

        // Insert into the priority heap and see if a request was bumped off. If this request is the lowest
        // priority it will be returned.
        var removedRequest = requestHeap.insert(request);

        if (defined(removedRequest)) {
            if (removedRequest === request) {
                // Request does not have high enough priority to be issued
                return undefined;
            }
            // A previously issued request has been bumped off the priority heap, so cancel it
            cancelRequest(removedRequest);
        }

        return issueRequest(request);
    };

    function clearStatistics() {
        statistics.numberOfAttemptedRequests = 0;
        statistics.numberOfCancelledRequests = 0;
        statistics.numberOfCancelledActiveRequests = 0;
    }

    function updateStatistics() {
        if (!RequestScheduler.debugShowStatistics) {
            return;
        }

        if (statistics.numberOfAttemptedRequests > 0) {
            console.log('Number of attempted requests: ' + statistics.numberOfAttemptedRequests);
        }
        if (statistics.numberOfActiveRequests > 0) {
            console.log('Number of active requests: ' + statistics.numberOfActiveRequests);
        }
        if (statistics.numberOfCancelledRequests > 0) {
            console.log('Number of cancelled requests: ' + statistics.numberOfCancelledRequests);
        }
        if (statistics.numberOfCancelledActiveRequests > 0) {
            console.log('Number of cancelled active requests: ' + statistics.numberOfCancelledActiveRequests);
        }
        if (statistics.numberOfFailedRequests > 0) {
            console.log('Number of failed requests: ' + statistics.numberOfFailedRequests);
        }

        clearStatistics();
    }

    // For testing
    RequestScheduler._requestHeap = requestHeap;

    return RequestScheduler;
});
