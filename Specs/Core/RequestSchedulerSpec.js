/*global defineSuite*/
defineSuite([
        'Core/RequestScheduler',
        'ThirdParty/when'
    ], function(
        RequestScheduler,
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

    it('throttleRequest throws when url is undefined', function() {
        expect(function() {
            RequestScheduler.throttleRequest();
        }).toThrowDeveloperError();
    });

    it('throttleRequest throws when requestFunction is undefined', function() {
        expect(function() {
            RequestScheduler.throttleRequest('http://foo.com/1');
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

        var promise1 = RequestScheduler.throttleRequest('http://foo.com/1', requestFunction);
        var promise2 = RequestScheduler.throttleRequest('http://foo.com/2', requestFunction);
        var promise3 = RequestScheduler.throttleRequest('http://foo.com/3', requestFunction);

        expect(deferreds.length).toBe(2);
        expect(promise1).toBeDefined();
        expect(promise2).toBeDefined();
        expect(promise3).not.toBeDefined();

        deferreds[0].resolve();

        var promise4 = RequestScheduler.throttleRequest('http://foo.com/3', requestFunction);
        expect(deferreds.length).toBe(3);
        expect(promise4).toBeDefined();

        var promise5 = RequestScheduler.throttleRequest('http://foo.com/4', requestFunction);
        expect(deferreds.length).toBe(3);
        expect(promise5).not.toBeDefined();

        RequestScheduler.maximumRequests = 3;
        var promise6 = RequestScheduler.throttleRequest('http://foo.com/4', requestFunction);
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

        var promise1 = RequestScheduler.throttleRequest('http://foo.com/1', requestFunction);
        var promise2 = RequestScheduler.throttleRequest('http://foo.com/2', requestFunction);
        var promise3 = RequestScheduler.throttleRequest('http://foo.com/3', requestFunction);

        expect(deferreds.length).toBe(2);
        expect(promise1).toBeDefined();
        expect(promise2).toBeDefined();
        expect(promise3).not.toBeDefined();

        deferreds[0].resolve();

        var promise4 = RequestScheduler.throttleRequest('http://foo.com/3', requestFunction);
        expect(deferreds.length).toBe(3);
        expect(promise4).toBeDefined();

        var promise5 = RequestScheduler.throttleRequest('http://foo.com/4', requestFunction);
        expect(deferreds.length).toBe(3);
        expect(promise5).not.toBeDefined();

        RequestScheduler.maximumRequestsPerServer = 3;
        var promise6 = RequestScheduler.throttleRequest('http://foo.com/4', requestFunction);
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

        RequestScheduler.throttleRequest('http://foo.com/1', requestFunction);
        RequestScheduler.throttleRequest('http://foo.com/2', requestFunction);
        RequestScheduler.throttleRequest('http://foo.com/3', requestFunction);

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

        RequestScheduler.throttleRequest('http://foo.com/1', requestFunction);
        RequestScheduler.throttleRequest('http://foo.com/2', requestFunction);
        RequestScheduler.throttleRequest('http://bar.com/3', requestFunction);

        expect(RequestScheduler.maximumRequestsPerServer).toBe(6);
        expect(RequestScheduler.getNumberOfAvailableRequestsByServer('http://foo.com')).toBe(4);
        expect(RequestScheduler.getNumberOfAvailableRequestsByServer('http://bar.com')).toBe(5);

        deferreds[0].resolve();
        deferreds[1].resolve();
        deferreds[2].resolve();

        expect(RequestScheduler.getNumberOfAvailableRequestsByServer('http://foo.com')).toBe(6);
        expect(RequestScheduler.getNumberOfAvailableRequestsByServer('http://bar.com')).toBe(6);
    });

    it('getServer with https', function() {
        var server = RequestScheduler.getServer('https://foo.com/1');
        expect(server).toEqual('foo.com:443');
    });

    it('getServer with http', function() {
        var server = RequestScheduler.getServer('http://foo.com/1');
        expect(server).toEqual('foo.com:80');
    });

    it('getServer throws if url is undefined', function() {
        expect(function() {
            return RequestScheduler.getServer();
        }).toThrowDeveloperError();
    });

    it('hasAvailableRequests', function() {
        RequestScheduler.maximumRequestsPerServer = 2;
        RequestScheduler.maximumRequests = 3;

        var deferreds = [];

        function requestFunction(url) {
            var deferred = when.defer();
            deferreds.push(deferred);
            return deferred.promise;
        }

        RequestScheduler.throttleRequest('http://foo.com/1', requestFunction);
        expect(RequestScheduler.hasAvailableRequests('http://foo.com')).toEqual(true);
        RequestScheduler.throttleRequest('http://foo.com/2', requestFunction);
        expect(RequestScheduler.hasAvailableRequests('http://foo.com')).toEqual(false);

        expect(RequestScheduler.hasAvailableRequests()).toEqual(true);
        RequestScheduler.throttleRequest('http://bar.com/1', requestFunction);
        expect(RequestScheduler.hasAvailableRequests()).toEqual(false);

        expect(RequestScheduler.getNumberOfAvailableRequests()).toEqual(0);

        deferreds[0].resolve();
        deferreds[1].resolve();
        deferreds[2].resolve();
    });
});
