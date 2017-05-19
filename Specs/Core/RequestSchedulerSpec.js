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
    });

    // it('sorts requests by distance', function() {
    //     var currentDistance = 0.0;
    //
    //     function getRequestFunction(distance) {
    //         return function() {
    //             expect(distance).toBeGreaterThan(currentDistance);
    //             currentDistance = distance;
    //             return when.resolve();
    //         };
    //     }
    //
    //     function createRequest(distance) {
    //         return new Request({
    //             throttle : true,
    //             url : 'https://foo.com/1',
    //             requestFunction : getRequestFunction(distance),
    //             distance : distance
    //         });
    //     }
    //
    //     var length = RequestScheduler.priorityHeapSize;
    //     for (var i = 0; i < length; ++i) {
    //         var distance = Math.random();
    //         RequestScheduler.request(createRequest(distance));
    //     }
    //
    //     RequestScheduler.update();
    // });
});
