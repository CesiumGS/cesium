/*global defineSuite*/
defineSuite([
        'Core/RequestScheduler',
        'Core/Request',
        'Core/RequestType',
        'ThirdParty/when'
    ], function(
        RequestScheduler,
        Request,
        RequestType,
        when) {
    "use strict";

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

    it('schedule throws when request is undefined', function() {
        expect(function() {
            RequestScheduler.schedule();
        }).toThrowDeveloperError();
    });

    it('schedule throws when request.url is undefined', function() {
        expect(function() {
            RequestScheduler.schedule(new Request({
                requestFunction : function(url) {
                    return undefined;
                }
            }));
        }).toThrowDeveloperError();
    });

    it('schedule throws when request.requestFunction is undefined', function() {
        expect(function() {
            RequestScheduler.schedule(new Request({
                url : 'file/path'
            }));
        }).toThrowDeveloperError();
    });

    it('honors maximumRequests', function() {
        RequestScheduler.maximumRequests = 2;

        var deferreds = [];

        function requestFunction(url) {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var request = new Request({
            url : 'http://foo.com/1',
            requestFunction : requestFunction
        });

        var promise1 = RequestScheduler.schedule(request);
        var promise2 = RequestScheduler.schedule(request);
        var promise3 = RequestScheduler.schedule(request);

        expect(deferreds.length).toBe(2);
        expect(promise1).toBeDefined();
        expect(promise2).toBeDefined();
        expect(promise3).not.toBeDefined();

        deferreds[0].resolve();

        var promise4 = RequestScheduler.schedule(request);
        expect(deferreds.length).toBe(3);
        expect(promise4).toBeDefined();

        var promise5 = RequestScheduler.schedule(request);
        expect(deferreds.length).toBe(3);
        expect(promise5).not.toBeDefined();

        RequestScheduler.maximumRequests = 3;
        var promise6 = RequestScheduler.schedule(request);
        expect(deferreds.length).toBe(4);
        expect(promise6).toBeDefined();

        deferreds[1].resolve();
        deferreds[2].resolve();
        deferreds[3].resolve();
    });

    it('honors maximumRequestsPerServer', function() {
        RequestScheduler.maximumRequestsPerServer = 2;

        var deferreds = [];

        function requestFunction(url) {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var request = new Request({
            url : 'http://foo.com/1',
            requestFunction : requestFunction
        });

        var promise1 = RequestScheduler.schedule(request);
        var promise2 = RequestScheduler.schedule(request);
        var promise3 = RequestScheduler.schedule(request);

        expect(deferreds.length).toBe(2);
        expect(promise1).toBeDefined();
        expect(promise2).toBeDefined();
        expect(promise3).not.toBeDefined();

        deferreds[0].resolve();

        var promise4 = RequestScheduler.schedule(request);
        expect(deferreds.length).toBe(3);
        expect(promise4).toBeDefined();

        var promise5 = RequestScheduler.schedule(request);
        expect(deferreds.length).toBe(3);
        expect(promise5).not.toBeDefined();

        RequestScheduler.maximumRequestsPerServer = 3;
        var promise6 = RequestScheduler.schedule(request);
        expect(deferreds.length).toBe(4);
        expect(promise6).toBeDefined();

        deferreds[1].resolve();
        deferreds[2].resolve();
        deferreds[3].resolve();
    });

    it('getNumberOfAvailableRequests', function() {
        var deferreds = [];

        function requestFunction(url) {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var request = new Request({
            url : 'http://foo.com/1',
            requestFunction : requestFunction
        });

        RequestScheduler.schedule(request);
        RequestScheduler.schedule(request);
        RequestScheduler.schedule(request);

        expect(RequestScheduler.maximumRequests).toBe(10);
        expect(RequestScheduler.getNumberOfAvailableRequests()).toBe(7);

        deferreds[0].resolve();
        deferreds[1].resolve();
        deferreds[2].resolve();

        expect(RequestScheduler.getNumberOfAvailableRequests()).toBe(10);
    });

    it('getNumberOfAvailableRequestsByServer', function() {
        var deferreds = [];

        function requestFunction(url) {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var requestFoo = new Request({
            url : 'http://foo.com/1',
            requestFunction : requestFunction
        });

        var requestBar = new Request({
            url : 'http://bar.com/1',
            requestFunction : requestFunction
        });

        RequestScheduler.schedule(requestFoo);
        RequestScheduler.schedule(requestFoo);
        RequestScheduler.schedule(requestBar);

        expect(RequestScheduler.maximumRequestsPerServer).toBe(6);
        expect(RequestScheduler.getNumberOfAvailableRequestsByServer('http://foo.com')).toBe(4);
        expect(RequestScheduler.getNumberOfAvailableRequestsByServer('http://bar.com')).toBe(5);

        deferreds[0].resolve();
        deferreds[1].resolve();
        deferreds[2].resolve();

        expect(RequestScheduler.getNumberOfAvailableRequestsByServer('http://foo.com')).toBe(6);
        expect(RequestScheduler.getNumberOfAvailableRequestsByServer('http://bar.com')).toBe(6);
    });

    it('getServerName with https', function() {
        var server = RequestScheduler.getServerName('https://foo.com/1');
        expect(server).toEqual('foo.com:443');
    });

    it('getServerName with http', function() {
        var server = RequestScheduler.getServerName('http://foo.com/1');
        expect(server).toEqual('foo.com:80');
    });

    it('getServerName throws if url is undefined', function() {
        expect(function() {
            return RequestScheduler.getServerName();
        }).toThrowDeveloperError();
    });

    it('hasAvailableRequests and hasAvailableRequestsByServer', function() {
        RequestScheduler.maximumRequestsPerServer = 2;
        RequestScheduler.maximumRequests = 3;

        var deferreds = [];

        function requestFunction(url) {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var requestFoo = new Request({
            url : 'http://foo.com/1',
            requestFunction : requestFunction
        });

        var requestBar = new Request({
            url : 'http://bar.com/1',
            requestFunction : requestFunction
        });

        RequestScheduler.schedule(requestFoo);
        expect(RequestScheduler.hasAvailableRequestsByServer('http://foo.com')).toEqual(true);
        RequestScheduler.schedule(requestFoo);
        expect(RequestScheduler.hasAvailableRequestsByServer('http://foo.com')).toEqual(false);

        expect(RequestScheduler.hasAvailableRequests()).toEqual(true);
        RequestScheduler.schedule(requestBar);
        expect(RequestScheduler.hasAvailableRequests()).toEqual(false);

        expect(RequestScheduler.getNumberOfAvailableRequests()).toEqual(0);

        deferreds[0].resolve();
        deferreds[1].resolve();
        deferreds[2].resolve();
    });

    it('defers request when request scheduler is full', function() {
        RequestScheduler.maximumRequests = 3;

        var deferreds = [];

        function requestFunction(url) {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var request = new Request({
            url : 'http://foo.com/1',
            requestFunction : requestFunction
        });

        var requestDeferred = new Request({
            url : 'http://foo.com/1',
            requestFunction : requestFunction,
            defer : true
        });

        RequestScheduler.schedule(request);
        RequestScheduler.schedule(request);
        RequestScheduler.schedule(request);
        expect(RequestScheduler.hasAvailableRequests()).toEqual(false);

        // A deferred request will always return a promise, however its
        // requestFunction is not called until there is an open slot
        var deferredPromise = RequestScheduler.schedule(requestDeferred);
        expect(deferredPromise).toBeDefined();
        expect(deferreds[3]).not.toBeDefined();

        // When the first request completes, the deferred promise starts
        deferreds[0].resolve();
        expect(deferreds[3]).toBeDefined();

        deferreds[1].resolve();
        deferreds[2].resolve();
        deferreds[3].resolve();
    });

    it('makes a basic request', function() {
        RequestScheduler.maximumRequests = 2;

        var deferreds = [];

        function requestFunction(url) {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var promise1 = RequestScheduler.request('http://foo.com/1', requestFunction);
        var promise2 = RequestScheduler.request('http://foo.com/2', requestFunction);
        var promise3 = RequestScheduler.request('http://foo.com/3', requestFunction);

        expect(promise1).toBeDefined();
        expect(promise2).toBeDefined();
        expect(promise3).toBeDefined();

        expect(deferreds[2]).not.toBeDefined();

        // When the first request completes, the last request starts
        deferreds[0].resolve();
        expect(deferreds[2]).toBeDefined();

        deferreds[1].resolve();
        deferreds[2].resolve();
    });

    it('prioritize requests', function() {
        RequestScheduler.prioritize = true;
        RequestScheduler.maximumRequests = 2;

        var deferreds = [];

        function requestFunction(url) {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var terrainRequest1 = new Request({
            url : 'http://foo.com/1',
            type : RequestType.TERRAIN,
            requestFunction : requestFunction,
            distance : 10.0
        });

        var terrainRequest2 = new Request({
            url : 'http://foo.com/2',
            type : RequestType.TERRAIN,
            requestFunction : requestFunction,
            distance : 20.0
        });

        var imageryRequest = new Request({
            url : 'http://bar.com/1',
            type : RequestType.IMAGERY,
            requestFunction : requestFunction,
            distance : 15.0
        });

        var promise1 = RequestScheduler.schedule(terrainRequest1);
        var promise2 = RequestScheduler.schedule(terrainRequest2);
        var promise3 = RequestScheduler.schedule(imageryRequest);

        // The requests should all return undefined because the budgets haven't been created yet
        expect(promise1).not.toBeDefined();
        expect(promise2).not.toBeDefined();
        expect(promise3).not.toBeDefined();

        // Budgets should now allow one terrain request and one imagery request (based on their distances)
        RequestScheduler.resetBudgets();

        promise1 = RequestScheduler.schedule(terrainRequest1);
        promise2 = RequestScheduler.schedule(terrainRequest2);
        promise3 = RequestScheduler.schedule(imageryRequest);

        expect(promise1).toBeDefined();
        expect(promise2).not.toBeDefined();
        expect(promise3).toBeDefined();

        deferreds[0].resolve();
        deferreds[1].resolve();

        RequestScheduler.resetBudgets();
        RequestScheduler.prioritize = false;
    });

    it('does not throttle requests when RequestScheduler.throttle is false', function() {
        RequestScheduler.throttle = false;
        RequestScheduler.maximumRequests = 2;

        var deferreds = [];

        function requestFunction(url) {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var request = new Request({
            url : 'http://foo.com/',
            requestFunction : requestFunction
        });

        var promise1 = RequestScheduler.schedule(request);
        var promise2 = RequestScheduler.schedule(request);
        var promise3 = RequestScheduler.schedule(request);

        // All requests are passed through to the browser
        expect(promise1).toBeDefined();
        expect(promise2).toBeDefined();
        expect(promise3).toBeDefined();

        deferreds[0].resolve();
        deferreds[1].resolve();
        deferreds[2].resolve();

        RequestScheduler.throttle = true;
    });

    it('debugShowStatistics', function() {
        spyOn(console, 'log');

        var deferreds = [];

        function requestFunction(url) {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        var request = new Request({
            url : 'http://foo.com/1',
            requestFunction : requestFunction
        });

        RequestScheduler.debugShowStatistics = false;
        RequestScheduler.schedule(request);
        RequestScheduler.resetBudgets();
        expect(console.log).not.toHaveBeenCalled();

        RequestScheduler.debugShowStatistics = true;
        RequestScheduler.schedule(request);
        RequestScheduler.resetBudgets();
        expect(console.log).toHaveBeenCalled();

        deferreds[0].resolve();
        deferreds[1].resolve();

        RequestScheduler.resetBudgets();
    });
});
