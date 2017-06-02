/*global defineSuite*/
defineSuite([
        'Core/RequestScheduler',
        'Core/Request',
        'Core/RequestState',
        'Core/RequestType',
        'ThirdParty/when'
    ], function(
        RequestScheduler,
        Request,
        RequestState,
        RequestType,
        when) {
    'use strict';

    var originalMaximumRequests;
    var originalMaximumRequestsPerServer;

    beforeEach(function() {
        originalMaximumRequests = RequestScheduler.maximumRequests;
        originalMaximumRequestsPerServer = RequestScheduler.maximumRequestsPerServer;
    });

    afterEach(function() {
        RequestScheduler.maximumRequests = originalMaximumRequests;
        RequestScheduler.maximumRequestsPerServer = originalMaximumRequestsPerServer;
    });

    it('request throws when request is undefined', function() {
        expect(function() {
            RequestScheduler.request();
        }).toThrowDeveloperError();
    });

    it('request throws when request.url is undefined', function() {
        expect(function() {
            RequestScheduler.request(new Request({
                requestFunction : function(url) {
                    return undefined;
                }
            }));
        }).toThrowDeveloperError();
    });

    it('request throws when request.requestFunction is undefined', function() {
        expect(function() {
            RequestScheduler.request(new Request({
                url : 'file/path'
            }));
        }).toThrowDeveloperError();
    });

    it('getServer throws if url is undefined', function() {
        expect(function() {
            RequestScheduler.getServer();
        }).toThrowDeveloperError();
    });

    it('getServer with https', function() {
        var server = RequestScheduler.getServer('https://foo.com/1');
        expect(server).toEqual('foo.com:443');
    });

    it('getServer with http', function() {
        var server = RequestScheduler.getServer('http://foo.com/1');
        expect(server).toEqual('foo.com:80');
    });

    it('honors maximumRequests', function() {
        RequestScheduler.maximumRequests = 2;
        var statistics = RequestScheduler.statistics;

        var deferreds = [];

        function requestFunction() {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        function createRequest() {
            return new Request({
                url : 'http://foo.com/1',
                requestFunction : requestFunction,
                throttle : true
            });
        }

        var promise1 = RequestScheduler.request(createRequest());
        var promise2 = RequestScheduler.request(createRequest());
        RequestScheduler.update();

        // Scheduler is full, promise3 will be undefined
        var promise3 = RequestScheduler.request(createRequest());
        RequestScheduler.update();

        expect(statistics.numberOfActiveRequests).toBe(2);
        expect(promise1).toBeDefined();
        expect(promise2).toBeDefined();
        expect(promise3).not.toBeDefined();

        // Scheduler now has an empty slot, promise4 goes through
        deferreds[0].resolve();
        RequestScheduler.update();

        expect(statistics.numberOfActiveRequests).toBe(1);

        var promise4 = RequestScheduler.request(createRequest());
        RequestScheduler.update();

        expect(statistics.numberOfActiveRequests).toBe(2);
        expect(promise4).toBeDefined();

        // Scheduler is full, promise5 will be undefined
        var promise5 = RequestScheduler.request(createRequest());
        RequestScheduler.update();

        expect(statistics.numberOfActiveRequests).toBe(2);
        expect(promise5).not.toBeDefined();

        // maximumRequests increases, promise6 goes through
        RequestScheduler.maximumRequests = 3;
        var promise6 = RequestScheduler.request(createRequest());
        RequestScheduler.update();

        expect(statistics.numberOfActiveRequests).toBe(3);
        expect(promise6).toBeDefined();
    });

    it('honors maximumRequestsPerServer', function() {
        RequestScheduler.maximumRequestsPerServer = 2;

        var deferreds = [];

        function requestFunction() {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var url = 'http://foo.com/1';
        var server = RequestScheduler.getServer(url);

        function createRequest() {
            return new Request({
                url : url,
                requestFunction : requestFunction,
                throttleByServer : true
            });
        }

        var promise1 = RequestScheduler.request(createRequest());
        var promise2 = RequestScheduler.request(createRequest());
        RequestScheduler.update();

        // Scheduler is full, promise3 will be undefined
        var promise3 = RequestScheduler.request(createRequest());
        RequestScheduler.update();

        expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(2);
        expect(promise1).toBeDefined();
        expect(promise2).toBeDefined();
        expect(promise3).not.toBeDefined();

        // Scheduler now has an empty slot, promise4 goes through
        deferreds[0].resolve();
        RequestScheduler.update();

        expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(1);

        var promise4 = RequestScheduler.request(createRequest());
        RequestScheduler.update();

        expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(2);
        expect(promise4).toBeDefined();

        // Scheduler is full, promise5 will be undefined
        var promise5 = RequestScheduler.request(createRequest());
        RequestScheduler.update();

        expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(2);
        expect(promise5).not.toBeDefined();

        // maximumRequests increases, promise6 goes through
        RequestScheduler.maximumRequestsPerServer = 3;
        var promise6 = RequestScheduler.request(createRequest());
        RequestScheduler.update();

        expect(RequestScheduler.numberOfActiveRequestsByServer(server)).toBe(3);
        expect(promise6).toBeDefined();
    });

    it('honors priorityHeapLength', function() {
        var deferreds = [];
        var requests = [];

        function requestFunction() {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        function createRequest(distance) {
            var request = new Request({
                url : 'http://foo.com/1',
                requestFunction : requestFunction,
                throttle : true,
                distance : distance
            });
            requests.push(request);
            return request;
        }

        RequestScheduler.priorityHeapLength = 1;
        var firstRequest = createRequest(0.0);
        var promise = RequestScheduler.request(firstRequest);
        expect(promise).toBeDefined();
        promise = RequestScheduler.request(createRequest(1.0));
        expect(promise).toBeUndefined();

        RequestScheduler.priorityHeapLength = 3;
        promise = RequestScheduler.request(createRequest(1.0));
        expect(promise).toBeDefined();

        // A request is cancelled to accommodate the new heap length
        RequestScheduler.priorityHeapLength = 2;
        expect(firstRequest.state).toBe(RequestState.CANCELLED);
    });

    function testImmediateRequest(url, dataOrBlobUri) {
        var statistics = RequestScheduler.statistics;
        var deferreds = [];

        function requestFunction() {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var request = new Request({
            url : url,
            requestFunction : requestFunction
        });

        var promise = RequestScheduler.request(request);
        expect(promise).toBeDefined();

        if (dataOrBlobUri) {
            expect(request.server).toBeUndefined();
            expect(statistics.numberOfActiveRequests).toBe(0);
        } else {
            expect(statistics.numberOfActiveRequests).toBe(1);
            expect(RequestScheduler.numberOfActiveRequestsByServer(request.server)).toBe(1);
        }

        deferreds[0].resolve();

        return promise.then(function() {
            expect(request.state).toBe(RequestState.RECEIVED);
            expect(statistics.numberOfActiveRequests).toBe(0);
            if (!dataOrBlobUri) {
                expect(RequestScheduler.numberOfActiveRequestsByServer(request.server)).toBe(0);
            }
        });
    }

    it('data uri goes through immediately', function() {
        var dataUri = 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ%3D%3D';
        testImmediateRequest(dataUri, true);
    });

    it('blob uri goes through immediately', function() {
        var uint8Array = new Uint8Array(4);
        var blob = new Blob([uint8Array], {
            type : 'application/octet-stream'
        });

        var blobUrl = window.URL.createObjectURL(blob);
        testImmediateRequest(blobUrl, true);
    });

    it('request goes through immediately when throttle is false', function() {
        var url = 'https://foo.com/1';
        testImmediateRequest(url, false);
    });

    it('makes a throttled request', function() {
        var deferreds = [];

        function requestFunction() {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var request = new Request({
            throttle : true,
            url : 'https://foo.com/1',
            requestFunction : requestFunction
        });
        expect(request.state).toBe(RequestState.UNISSUED);

        var promise = RequestScheduler.request(request);
        expect(promise).toBeDefined();
        expect(request.state).toBe(RequestState.ISSUED);

        RequestScheduler.update();
        expect(request.state).toBe(RequestState.ACTIVE);

        deferreds[0].resolve();
        expect(request.state).toBe(RequestState.RECEIVED);
    });

    it('cancels an issued request', function() {
        var statistics = RequestScheduler.statistics;

        function requestFunction() {
            return when.resolve();
        }

        var request = new Request({
            throttle : true,
            url : 'https://foo.com/1',
            requestFunction : requestFunction
        });

        var promise = RequestScheduler.request(request);
        expect(request.state).toBe(RequestState.ISSUED);

        request.cancel();
        RequestScheduler.update();

        expect(request.state).toBe(RequestState.CANCELLED);
        expect(statistics.numberOfCancelledRequests).toBe(1);
        expect(statistics.numberOfCancelledActiveRequests).toBe(0);

        return promise.then(function() {
            fail('should not be called');
        }).otherwise(function(error) {
            expect(error).toBe('Cancelled');
        });
    });

    it('cancels an active request', function() {
        var statistics = RequestScheduler.statistics;
        var aborted = true;
        var mockXhr = {
            abort : function() {
                aborted = true;
            }
        };

        function requestFunction() {
            request.xhr = mockXhr;
            return when.defer().promise;
        }

        var request = new Request({
            throttle : true,
            url : 'https://foo.com/1',
            requestFunction : requestFunction
        });

        var promise = RequestScheduler.request(request);
        RequestScheduler.update();
        expect(request.state).toBe(RequestState.ACTIVE);

        request.cancel();
        RequestScheduler.update();

        expect(request.state).toBe(RequestState.CANCELLED);
        expect(statistics.numberOfCancelledRequests).toBe(1);
        expect(statistics.numberOfCancelledActiveRequests).toBe(1);
        expect(RequestScheduler.numberOfActiveRequestsByServer(request.server)).toBe(0);
        expect(aborted).toBe(true);

        return promise.then(function() {
            fail('should not be called');
        }).otherwise(function(error) {
            expect(error).toBe('Cancelled');
        });
    });

    it('handles request failure', function() {
        var statistics = RequestScheduler.statistics;
        var deferreds = [];

        function requestFunction() {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var request = new Request({
            url : 'https://foo.com/1',
            requestFunction : requestFunction
        });

        var promise = RequestScheduler.request(request);
        expect(request.state).toBe(RequestState.ACTIVE);
        expect(statistics.numberOfActiveRequests).toBe(1);

        deferreds[0].reject('Request failed');
        RequestScheduler.update();
        expect(statistics.numberOfActiveRequests).toBe(0);

        return promise.then(function() {
            fail('should not be called');
        }).otherwise(function(error) {
            expect(error).toBe('Request failed');
        });
    });

    it('prioritizes requests by distance', function() {
        var currentDistance = 0.0;

        function getRequestFunction(distance) {
            return function() {
                expect(distance).toBeGreaterThan(currentDistance);
                currentDistance = distance;
                return when.resolve();
            };
        }

        function createRequest(distance) {
            return new Request({
                throttle : true,
                url : 'https://foo.com/1',
                requestFunction : getRequestFunction(distance),
                distance : distance
            });
        }

        var length = RequestScheduler.priorityHeapLength;
        for (var i = 0; i < length; ++i) {
            var distance = Math.random();
            RequestScheduler.request(createRequest(distance));
        }

        RequestScheduler.update();
        expect(currentDistance).toBeGreaterThan(0.0); // Ensures that the expect in getRequestFunction is actually called
    });

    it('updates priority', function() {
        function requestFunction() {
            return when.resolve();
        }

        function createRequest(distance) {
            return new Request({
                throttle : true,
                url : 'https://foo.com/1',
                requestFunction : requestFunction,
                distance : distance
            });
        }

        var i;
        var request;
        var length = RequestScheduler.priorityHeapLength;
        for (i = 0; i < length; ++i) {
            var distance = i / (length - 1);
            request = createRequest(distance);
            request.testId = i;
            RequestScheduler.request(request);
        }

        RequestScheduler.maximumRequests = 0;
        RequestScheduler.update();

        var requestHeap = RequestScheduler._requestHeap;
        var requests = [];
        var currentTestId = 0;
        while (requestHeap.length > 0) {
            request = requestHeap.pop();
            requests.push(request);
            expect(request.testId).toBeGreaterThanOrEqualTo(currentTestId);
            currentTestId = request.testId;
        }

        for (i = 0; i < length; ++i) {
            requestHeap.insert(requests[i]);
        }

        for (i = 0; i < length; ++i) {
            requests[i].distance = 1.0 - requests[i].distance; // Invert priority
        }

        RequestScheduler.update();
        while (requestHeap.length > 0) {
            request = requestHeap.pop();
            expect(request.testId).toBeLessThanOrEqualTo(currentTestId);
            currentTestId = request.testId;
        }
    });

    it('handles low priority requests', function() {
        function requestFunction() {
            return when.resolve();
        }

        function createRequest(distance) {
            return new Request({
                throttle : true,
                url : 'https://foo.com/1',
                requestFunction : requestFunction,
                distance : distance
            });
        }

        var highPriority = 0.0;
        var mediumPriority = 0.5;
        var lowPriority = 1.0;

        var length = RequestScheduler.priorityHeapLength;
        for (var i = 0; i < length; ++i) {
            RequestScheduler.request(createRequest(mediumPriority));
        }

        // Heap is full so low priority request is not even issued
        var promise = RequestScheduler.request(createRequest(lowPriority));
        expect(promise).toBeUndefined();
        expect(RequestScheduler.statistics.numberOfCancelledRequests).toBe(0);

        // Heap is full so high priority request bumps off lower priority request
        promise = RequestScheduler.request(createRequest(highPriority));
        expect(promise).toBeDefined();
        expect(RequestScheduler.statistics.numberOfCancelledRequests).toBe(1);
    });

    it('unthrottled requests starve throttled requests', function() {
        var deferreds = [];

        function requestFunction() {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        function createRequest(throttle) {
            return new Request({
                url : 'http://foo.com/1',
                requestFunction : requestFunction,
                throttle : throttle
            });
        }

        var throttledRequest = createRequest(true);
        RequestScheduler.request(throttledRequest);

        for (var i = 0; i < RequestScheduler.maximumRequests; ++i) {
            RequestScheduler.request(createRequest(false));
        }
        RequestScheduler.update();

        expect(throttledRequest.state).toBe(RequestState.ISSUED);

        // Resolve one of the unthrottled requests
        deferreds[0].resolve();
        RequestScheduler.update();
        expect(throttledRequest.state).toBe(RequestState.ACTIVE);
    });

    it('request throttled by server is cancelled', function() {
        var deferreds = [];

        function requestFunction() {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        function createRequest(throttleByServer) {
            return new Request({
                url : 'http://foo.com/1',
                requestFunction : requestFunction,
                throttleByServer : throttleByServer
            });
        }

        for (var i = 0; i < RequestScheduler.maximumRequestsPerServer - 1; ++i) {
            RequestScheduler.request(createRequest(false));
        }

        var throttledRequest = createRequest(true);
        RequestScheduler.request(throttledRequest);
        RequestScheduler.request(createRequest(false));

        RequestScheduler.update();
        expect(throttledRequest.state).toBe(RequestState.CANCELLED);
    });

    it('debugThrottle', function() {
        RequestScheduler.maximumRequests = 0;

        function requestFunction() {
            return when.resolve();
        }

        RequestScheduler.debugThrottle = true;
        var request = new Request({
            throttle : true,
            url : 'https://foo.com/1',
            requestFunction : requestFunction
        });
        var promise = RequestScheduler.request(request);
        expect(promise).toBeUndefined();

        RequestScheduler.debugThrottle = false;
        request = new Request({
            throttle : true,
            url : 'https://foo.com/1',
            requestFunction : requestFunction
        });
        promise = RequestScheduler.request(request);
        expect(promise).toBeDefined();

        RequestScheduler.debugThrottle = true;
    });

    it('debugShowStatistics', function() {
        spyOn(console, 'log');
        RequestScheduler.debugShowStatistics = true;

        var deferreds = [];

        function requestFunction() {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        function createRequest() {
            return new Request({
                url : 'https://foo.com/1',
                requestFunction : requestFunction
            });
        }

        var requestToCancel = createRequest();
        RequestScheduler.request(createRequest());
        RequestScheduler.request(createRequest());
        RequestScheduler.request(requestToCancel);
        RequestScheduler.update();

        expect(console.log).toHaveBeenCalledWith('Number of attempted requests: 3');
        expect(console.log).toHaveBeenCalledWith('Number of active requests: 3');

        deferreds[0].reject();
        requestToCancel.cancel();
        RequestScheduler.update();

        expect(console.log).toHaveBeenCalledWith('Number of cancelled requests: 1');
        expect(console.log).toHaveBeenCalledWith('Number of cancelled active requests: 1');
        expect(console.log).toHaveBeenCalledWith('Number of failed requests: 1');
    });
});
