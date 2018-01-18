defineSuite([
        'Core/loadJsonp',
        'Core/DefaultProxy',
        'Core/queryToObject',
        'Core/Request',
        'Core/RequestErrorEvent',
        'Core/RequestScheduler',
        'Core/Resource',
        'ThirdParty/Uri'
    ], function(
        loadJsonp,
        DefaultProxy,
        queryToObject,
        Request,
        RequestErrorEvent,
        RequestScheduler,
        Resource,
        Uri) {
    'use strict';

    it('throws with no url', function() {
        expect(function() {
            loadJsonp();
        }).toThrowDeveloperError();
    });

    it('returns a promise that resolves when the request loads', function() {
        var testUrl = 'http://example.invalid/testuri';
        spyOn(loadJsonp, 'loadAndExecuteScript').and.callFake(function (url, name, deffered){
            expect(url).toContain(testUrl);
            expect(name).toContain('loadJsonp');
            expect(deffered).toBeDefined();
        });
        loadJsonp(testUrl);
    });

    it('returns a promise that rejects when the request errors', function() {
        var testUrl = 'http://example.invalid/testuri';
        return loadJsonp(testUrl).otherwise(function(error) {
            expect(error).toBeDefined();
        });
    });

    it('Appends parameters specified in options', function() {
        var testUrl = 'test';
        var options = {
            parameters: {
                isTest : 'true',
                myNum : 8
            }
        };
        spyOn(loadJsonp, 'loadAndExecuteScript').and.callFake(function(url, functionName, deferred) {
            expect(url).toContain('isTest=true&myNum=8');
        });
        loadJsonp(testUrl, options);
    });

    it('Uses callback name specified in options', function() {
        var testUrl = 'test';
        var options = {
            callbackParameterName : 'testCallback'
        };
        spyOn(loadJsonp, 'loadAndExecuteScript').and.callFake(function(url, functionName, deferred) {
            expect(url).toContain('testCallback=loadJsonp');
        });
        loadJsonp(testUrl, options);
    });

    it('Uses proxy url is proxy is specified', function() {
        var testUrl = 'test';
        var testProxy = '/proxy/';
        var options = {
            proxy: new DefaultProxy(testProxy)
        };
        spyOn(loadJsonp, 'loadAndExecuteScript').and.callFake(function(url, functionName, deferred) {
            expect(url).toStartWith(options.proxy.getURL(testUrl));
        });
        loadJsonp(testUrl, options);
    });

    it('returns undefined if the request is throttled', function() {
        var oldMaximumRequests = RequestScheduler.maximumRequests;
        RequestScheduler.maximumRequests = 0;

        var request = new Request({
            throttle : true
        });

        var testUrl = 'http://example.invalid/testuri';
        var promise = loadJsonp(testUrl, undefined, request);
        expect(promise).toBeUndefined();

        RequestScheduler.maximumRequests = oldMaximumRequests;
    });

    describe('retries when Resource has the callback set', function() {
        it('rejects after too many retries', function() {
            //var cb = jasmine.createSpy('retry').and.returnValue(true);
            var cb = jasmine.createSpy('retry').and.callFake(function(resource, error) {
                return true;
            });

            var lastDeferred;
            spyOn(loadJsonp, 'loadAndExecuteScript').and.callFake(function(url, functionName, deferred) {
                lastDeferred = deferred;
            });

            var resource = new Resource({
                url : 'http://example.invalid',
                retryCallback: cb,
                retryAttempts: 1
            });

            var promise = loadJsonp(resource);

            expect(promise).toBeDefined();

            var resolvedValue;
            var rejectedError;
            promise.then(function(value) {
                resolvedValue = value;
            }).otherwise(function (error) {
                rejectedError = error;
            });

            expect(resolvedValue).toBeUndefined();
            expect(rejectedError).toBeUndefined();

            lastDeferred.reject('some error'); // This should retry
            expect(resolvedValue).toBeUndefined();
            expect(rejectedError).toBeUndefined();

            expect(cb.calls.count()).toEqual(1);
            var receivedResource = cb.calls.argsFor(0)[0];
            expect(receivedResource.url).toEqual(resource.url + '?callback=' + receivedResource.queryParameters.callback);
            expect(receivedResource._retryCount).toEqual(1);
            expect(cb.calls.argsFor(0)[1]).toEqual('some error');

            lastDeferred.reject('another error'); // This fails because we only retry once
            expect(resolvedValue).toBeUndefined();
            expect(rejectedError).toEqual('another error');
        });

        it('rejects after callback returns false', function() {
            var cb = jasmine.createSpy('retry').and.returnValue(false);

            var lastDeferred;
            spyOn(loadJsonp, 'loadAndExecuteScript').and.callFake(function(url, functionName, deferred) {
                lastDeferred = deferred;
            });

            var resource = new Resource({
                url : 'http://example.invalid',
                retryCallback: cb,
                retryAttempts: 2
            });

            var promise = loadJsonp(resource);

            expect(promise).toBeDefined();

            var resolvedValue;
            var rejectedError;
            promise.then(function(value) {
                resolvedValue = value;
            }).otherwise(function (error) {
                rejectedError = error;
            });

            expect(resolvedValue).toBeUndefined();
            expect(rejectedError).toBeUndefined();

            lastDeferred.reject('some error'); // This fails because the callback returns false
            expect(resolvedValue).toBeUndefined();
            expect(rejectedError).toEqual('some error');

            expect(cb.calls.count()).toEqual(1);
            var receivedResource = cb.calls.argsFor(0)[0];
            expect(receivedResource.url).toEqual(resource.url + '?callback=' + receivedResource.queryParameters.callback);
            expect(receivedResource._retryCount).toEqual(1);
            expect(cb.calls.argsFor(0)[1]).toEqual('some error');
        });

        it('resolves after retry', function() {
            var cb = jasmine.createSpy('retry').and.returnValue(true);

            var lastDeferred;
            var lastUrl;
            spyOn(loadJsonp, 'loadAndExecuteScript').and.callFake(function(url, functionName, deferred) {
                lastUrl = url;
                lastDeferred = deferred;
            });

            var resource = new Resource({
                url : 'http://example.invalid',
                retryCallback: cb,
                retryAttempts: 1
            });

            var promise = loadJsonp(resource);

            expect(promise).toBeDefined();

            var resolvedValue;
            var rejectedError;
            promise.then(function(value) {
                resolvedValue = value;
            }).otherwise(function (error) {
                rejectedError = error;
            });

            expect(resolvedValue).toBeUndefined();
            expect(rejectedError).toBeUndefined();

            lastDeferred.reject('some error'); // This should retry
            expect(resolvedValue).toBeUndefined();
            expect(rejectedError).toBeUndefined();

            expect(cb.calls.count()).toEqual(1);
            var receivedResource = cb.calls.argsFor(0)[0];
            expect(receivedResource.url).toEqual(resource.url + '?callback=' + receivedResource.queryParameters.callback);
            expect(receivedResource._retryCount).toEqual(1);
            expect(cb.calls.argsFor(0)[1]).toEqual('some error');

            var uri = new Uri(lastUrl);
            var query = queryToObject(uri.query);
            window[query.callback]('something good');
            expect(resolvedValue).toEqual('something good');
            expect(rejectedError).toBeUndefined();
        });
    });
});
