define([
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './Check',
        './defaultValue',
        './defined',
        './defineProperties',
        './Event',
        './Heap',
        './isBlobUri',
        './isDataUri',
        './RequestState'
    ], function(
        Uri,
        when,
        Check,
        defaultValue,
        defined,
        defineProperties,
        Event,
        Heap,
        isBlobUri,
        isDataUri,
        RequestState) {
    'use strict';

    function sortRequests(a, b) {
        return a.priority - b.priority;
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
    var requestHeap = new Heap({
        comparator : sortRequests
    });
    requestHeap.maximumLength = priorityHeapLength;
    requestHeap.reserve(priorityHeapLength);

    var activeRequests = [];
    var numberOfActiveRequestsByServer = {};

    var pageUri = typeof document !== 'undefined' ? new Uri(document.location.href) : new Uri();

    var requestCompletedEvent = new Event();

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
     * The maximum number of simultaneous active requests per server. Un-throttled requests or servers specifically
     * listed in requestsByServer do not observe this limit.
     * @type {Number}
     * @default 6
     */
    RequestScheduler.maximumRequestsPerServer = 6;

    /**
     * A per serverKey list of overrides to use for throttling instead of maximumRequestsPerServer
     */
    RequestScheduler.requestsByServer = {
        'api.cesium.com:443': 18,
        'assets.cesium.com:443': 18
    };

    /**
     * Specifies if the request scheduler should throttle incoming requests, or let the browser queue requests under its control.
     * @type {Boolean}
     * @default true
     */
    RequestScheduler.throttleRequests = true;

    /**
     * When true, log statistics to the console every frame
     * @type {Boolean}
     * @default false
     */
    RequestScheduler.debugShowStatistics = false;

    /**
     * An event that's raised when a request is completed.  Event handlers are passed
     * the error object if the request fails.
     *
     * @type {Event}
     * @default Event()
     */
    RequestScheduler.requestCompletedEvent = requestCompletedEvent;

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

    function updatePriority(request) {
        if (defined(request.priorityFunction)) {
            request.priority = request.priorityFunction();
        }
    }

    function serverHasOpenSlots(serverKey) {
        var maxRequests = defaultValue(RequestScheduler.requestsByServer[serverKey], RequestScheduler.maximumRequestsPerServer);
        return numberOfActiveRequestsByServer[serverKey] < maxRequests;
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
                // If the data request comes back but the request is cancelled, ignore it.
                return;
            }
            --statistics.numberOfActiveRequests;
            --numberOfActiveRequestsByServer[request.serverKey];
            requestCompletedEvent.raiseEvent();
            request.state = RequestState.RECEIVED;
            request.deferred.resolve(results);
        };
    }

    function getRequestFailedFunction(request) {
        return function(error) {
            if (request.state === RequestState.CANCELLED) {
                // If the data request comes back but the request is cancelled, ignore it.
                return;
            }
            ++statistics.numberOfFailedRequests;
            --statistics.numberOfActiveRequests;
            --numberOfActiveRequestsByServer[request.serverKey];
            requestCompletedEvent.raiseEvent(error);
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
        ++numberOfActiveRequestsByServer[request.serverKey];
        request.requestFunction().then(getRequestReceivedFunction(request)).otherwise(getRequestFailedFunction(request));
        return promise;
    }

    function cancelRequest(request) {
        var active = request.state === RequestState.ACTIVE;
        request.state = RequestState.CANCELLED;
        ++statistics.numberOfCancelledRequests;
        request.deferred.reject();

        if (active) {
            --statistics.numberOfActiveRequests;
            --numberOfActiveRequestsByServer[request.serverKey];
            ++statistics.numberOfCancelledActiveRequests;
        }

        if (defined(request.cancelFunction)) {
            request.cancelFunction();
        }
    }

    /**
     * Sort requests by priority and start requests.
     */
    RequestScheduler.update = function() {
        var i;
        var request;

        // Loop over all active requests. Cancelled, failed, or received requests are removed from the array to make room for new requests.
        var removeCount = 0;
        var activeLength = activeRequests.length;
        for (i = 0; i < activeLength; ++i) {
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

        // Update priority of issued requests and resort the heap
        var issuedRequests = requestHeap.internalArray;
        var issuedLength = requestHeap.length;
        for (i = 0; i < issuedLength; ++i) {
            updatePriority(issuedRequests[i]);
        }
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

            if (request.throttleByServer && !serverHasOpenSlots(request.serverKey)) {
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
     * Get the server key from a given url.
     *
     * @param {String} url The url.
     * @returns {String} The server key.
     */
    RequestScheduler.getServerKey = function(url) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.string('url', url);
        //>>includeEnd('debug');

        var uri = new Uri(url).resolve(pageUri);
        uri.normalize();
        var serverKey = uri.authority;
        if (!/:/.test(serverKey)) {
            // If the authority does not contain a port number, add port 443 for https or port 80 for http
            serverKey = serverKey + ':' + (uri.scheme === 'https' ? '443' : '80');
        }

        var length = numberOfActiveRequestsByServer[serverKey];
        if (!defined(length)) {
            numberOfActiveRequestsByServer[serverKey] = 0;
        }

        return serverKey;
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
            requestCompletedEvent.raiseEvent();
            request.state = RequestState.RECEIVED;
            return request.requestFunction();
        }

        ++statistics.numberOfAttemptedRequests;

        if (!defined(request.serverKey)) {
            request.serverKey = RequestScheduler.getServerKey(request.url);
        }

        if (!RequestScheduler.throttleRequests || !request.throttle) {
            return startRequest(request);
        }

        if (activeRequests.length >= RequestScheduler.maximumRequests) {
            // Active requests are saturated. Try again later.
            return undefined;
        }

        if (request.throttleByServer && !serverHasOpenSlots(request.serverKey)) {
            // Server is saturated. Try again later.
            return undefined;
        }

        // Insert into the priority heap and see if a request was bumped off. If this request is the lowest
        // priority it will be returned.
        updatePriority(request);
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

    /**
     * For testing only. Clears any requests that may not have completed from previous tests.
     *
     * @private
     */
    RequestScheduler.clearForSpecs = function() {
        while (requestHeap.length > 0) {
            var request = requestHeap.pop();
            cancelRequest(request);
        }
        var length = activeRequests.length;
        for (var i = 0; i < length; ++i) {
            cancelRequest(activeRequests[i]);
        }
        activeRequests.length = 0;
        numberOfActiveRequestsByServer = {};

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
    RequestScheduler.numberOfActiveRequestsByServer = function(serverKey) {
        return numberOfActiveRequestsByServer[serverKey];
    };

    /**
     * For testing only.
     *
     * @private
     */
    RequestScheduler.requestHeap = requestHeap;

    return RequestScheduler;
});
