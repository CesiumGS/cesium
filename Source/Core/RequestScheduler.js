/*global define*/
define([
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Queue',
        './Request'
    ], function(
        Uri,
        when,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Queue,
        Request) {
    "use strict";

    function RequestTypeBudget(request) {
        /**
         * Total requests allowed this frame.
         */
        this.total = 0;

        /**
         * Total requests used this frame.
         */
        this.used = 0;

        /**
         * Server of the request.
         */
        this.server = request.server;

        /**
         * Type of request. Used for more fine-grained priority sorting.
         */
        this.requestType = request.requestType;
    }

    var activeRequestsByServer = {};
    var activeRequests = 0;
    var budgets = [];
    var leftoverRequests = [];
    var deferredRequests = new Queue();

    var stats = {
        numberOfRequestsThisFrame : 0
    };

    /**
     * Because browsers throttle the number of parallel requests allowed to each server
     * and across all servers, this class tracks the number of active requests in progress
     * and prioritizes incoming requests.
     *
     * @exports RequestScheduler
     *
     * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
     *
     * @private
     */
    function RequestScheduler() {
    }

    function distanceSortFunction(a, b) {
        return a.distance - b.distance;
    }

    function getBudget(request) {
        var budget;
        var length = budgets.length;
        for (var i = 0; i < length; ++i) {
            budget = budgets[i];
            if ((budget.server === request.server) && (budget.requestType === request.requestType)) {
                return budget;
            }
        }
        // Not found, create a new budget
        budget = new RequestTypeBudget(request);
        budgets.push(budget);
        return budget;
    }

    RequestScheduler.resetBudgets = function() {
        showStats();
        clearStats();

        if (!RequestScheduler.prioritize) {
            return;
        }

        // Reset budget totals
        var length = budgets.length;
        for (var i = 0; i < length; ++i) {
            budgets[i].total = 0;
            budgets[i].used = 0;
        }

        // Sort all leftover requests by distance
        var requests = leftoverRequests;
        requests.sort(distanceSortFunction);

        // Allocate new budgets based on the distances of leftover requests
        var availableRequests = RequestScheduler.getNumberOfAvailableRequests();
        var requestsLength = requests.length;
        for (var j = 0; (j < requestsLength) && (availableRequests > 0); ++j) {
            var request = requests[j];
            var budget = getBudget(request);
            var budgetAvailable = RequestScheduler.getNumberOfAvailableRequestsByServer(request.url);
            if (budget.total < budgetAvailable) {
                ++budget.total;
                --availableRequests;
            }
        }

        requests.length = 0;
    };

    var pageUri = typeof document !== 'undefined' ? new Uri(document.location.href) : new Uri();

    /**
     * Get the server name from a given url.
     *
     * @param {String} url The url.
     * @returns {String} The server name.
     */
    RequestScheduler.getServer = function(url) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');

        var uri = new Uri(url).resolve(pageUri);
        uri.normalize();
        var server = uri.authority;
        if (!/:/.test(server)) {
            server = server + ':' + (uri.scheme === 'https' ? '443' : '80');
        }
        return server;
    };

    /**
     * Get the number of available slots for the given server.
     *
     * @param {String} url The url to check.
     * @returns {Number} The number of available slots.
     */
    RequestScheduler.getNumberOfAvailableRequestsByServer = function(url) {
        var server = RequestScheduler.getServer(url);
        var activeRequestsForServer = defaultValue(activeRequestsByServer[server], 0);
        return RequestScheduler.maximumRequestsPerServer - activeRequestsForServer;
    };

    /**
     * Get the number of available slots across all servers.
     *
     * @returns {Number} The number of available slots.
     */
    RequestScheduler.getNumberOfAvailableRequests = function() {
        return RequestScheduler.maximumRequests - activeRequests;
    };

    /**
     * Checks if there are available slots to make a request.
     * It considers the total number of available slots across all servers, and
     * if a url is provided, the total number of available slots at the url's server.
     *
     * @param {String} [url] The url to check.
     * @returns {Boolean} Returns true if there are available slots, otherwise false.
     */
    RequestScheduler.hasAvailableRequests = function(url) {
        if (activeRequests >= RequestScheduler.maximumRequests) {
            return false;
        }

        if (defined(url)) {
            var server = RequestScheduler.getServer(url);
            var activeRequestsForServer = defaultValue(activeRequestsByServer[server], 0);
            if (activeRequestsForServer >= RequestScheduler.maximumRequestsPerServer) {
                return false;
            }
        }

        return true;
    };

    function requestComplete(request) {
        --activeRequests;
        --activeRequestsByServer[request.server];

        // Start a deferred request immediately now that a slot is open
        var deferredRequest = deferredRequests.dequeue();
        if (defined(deferredRequest)) {
            deferredRequest.startPromise.resolve(deferredRequest);
        }
    }

    function startRequest(request) {
        ++activeRequests;
        ++activeRequestsByServer[request.server];

        return when(request.requestFunction(request.url, request.parameters), function(result) {
            requestComplete(request);
            return result;
        }).otherwise(function(error) {
            requestComplete(request);
            return when.reject(error);
        });
    }

    function deferRequest(request) {
        deferredRequests.enqueue(request);
        var deferred = when.defer();
        request.startPromise = deferred;
        return deferred.promise.then(startRequest);
    }

    function handleLeftoverRequest(request) {
        if (RequestScheduler.prioritize) {
            leftoverRequests.push(request);
        }
    }

    /**
     * A function that will make a request if there are available slots to the server.
     * Returns undefined immediately if the request would exceed the maximum, allowing
     * the caller to retry later instead of queueing indefinitely under the browser's control.
     *
     * @param {Request} request The request object.
     *
     * @returns {Promise.<Object>|undefined} Either undefined, meaning the request would exceed the maximum number of
     *          parallel requests, or a Promise for the requested data.
     *
     * @example
     * // throttle requests for an image
     * var url = 'http://madeupserver.example.com/myImage.png';
     * var requestFunction = function(url) {
     *   // in this simple example, loadImage could be used directly as requestFunction.
     *   return Cesium.loadImage(url);
     * };
     * var request = new Request({
     *   url : url,
     *   requestFunction : requestFunction
     * });
     * var promise = Cesium.RequestScheduler.throttleRequest(request);
     * if (!Cesium.defined(promise)) {
     *   // too many active requests in progress, try again later.
     * } else {
     *   promise.then(function(image) {
     *     // handle loaded image
     *   });
     * }
     *
     */
    RequestScheduler.throttleRequest = function(request) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(request)) {
            throw new DeveloperError('request is required.');
        }
        if (!defined(request.url)) {
            throw new DeveloperError('request.url is required.');
        }
        if (!defined(request.requestFunction)) {
            throw new DeveloperError('request.requestFunction is required.');
        }
        //>>includeEnd('debug');

        ++stats.numberOfRequestsThisFrame;

        if (!RequestScheduler.throttle) {
            return request.requestFunction(request.url, request.parameters);
        }

        var server = RequestScheduler.getServer(request.url);
        request.server = server;
        activeRequestsByServer[server] = defaultValue(activeRequestsByServer[server], 0);

        if (!RequestScheduler.hasAvailableRequests(request.url)) {
            if (!request.defer) {
                // No available slots to make the request, return undefined
                handleLeftoverRequest(request);
                return undefined;
            } else {
                // If no slots are available, the request is deferred until a slot opens up.
                // Return a promise even if the request can't be completed immediately.
                return deferRequest(request);
            }
        }

        if (RequestScheduler.prioritize && defined(request.requestType) && !request.defer) {
            var budget = getBudget(request);
            if (budget.used >= budget.total) {
                // Request does not fit in the budget, return undefined
                handleLeftoverRequest(request);
                return undefined;
            }
            ++budget.used;
        }

        return startRequest(request);
    };

    /**
     * A function that will make a request when an open slot is available. Always returns
     * a promise, which is suitable for data sources and utility functions.
     *
     * @param {String} url The URL to request.
     * @param {RequestScheduler~RequestFunction} requestFunction The actual function that
     *        makes the request.
     * @param {Object} [parameters] Extra parameters to send with the request.
     *
     * @returns {Promise.<Object>} A Promise for the requested data.
     */
    RequestScheduler.request = function(url, requestFunction, parameters) {
        return RequestScheduler.throttleRequest(new Request({
            url : url,
            parameters : parameters,
            requestFunction : requestFunction,
            defer : true
        }));
    };

    function clearStats() {
        stats.numberOfRequestsThisFrame = 0;
    }

    function showStats() {
        if (!RequestScheduler.debugShowStatistics) {
            return;
        }

        if (stats.numberOfRequestsThisFrame > 0) {
            console.log('Number of requests attempted: ' + stats.numberOfRequestsThisFrame);
        }

        var numberOfActiveRequests = RequestScheduler.maximumRequests - RequestScheduler.getNumberOfAvailableRequests();
        if (numberOfActiveRequests > 0) {
            console.log('Number of active requests: ' + numberOfActiveRequests);
        }
    }

    /**
     * Specifies the maximum number of requests that can be simultaneously open to a single server.  If this value is higher than
     * the number of requests per server actually allowed by the web browser, Cesium's ability to prioritize requests will be adversely
     * affected.
     * @type {Number}
     * @default 6
     */
    RequestScheduler.maximumRequestsPerServer = 6;

    /**
     * Specifies the maximum number of requests that can be simultaneously open for all servers.  If this value is higher than
     * the number of requests actually allowed by the web browser, Cesium's ability to prioritize requests will be adversely
     * affected.
     * @type {Number}
     * @default 10
     */
    RequestScheduler.maximumRequests = 10;

    /**
     * Specifies if the request scheduler should prioritize incoming requests
     * @type {Boolean}
     * @default true
     */
    RequestScheduler.prioritize = true;

    /**
     * Specifies if the request scheduler should throttle incoming requests, or let the browser queue requests under its control.
     * @type {Boolean}
     * @default true
     */
    RequestScheduler.throttle = true;

    /**
     * When true, log statistics to the console every frame
     * @type {Boolean}
     * @default true
     */
    RequestScheduler.debugShowStatistics = false;

    return RequestScheduler;
});
