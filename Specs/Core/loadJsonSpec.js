defineSuite([
        'Core/loadJson',
        'Core/Request',
        'Core/RequestErrorEvent',
        'Core/RequestScheduler'
    ], function(
        loadJson,
        Request,
        RequestErrorEvent,
        RequestScheduler) {
    'use strict';

    var fakeXHR;

    beforeEach(function() {
        fakeXHR = jasmine.createSpyObj('XMLHttpRequest', ['send', 'open', 'setRequestHeader', 'abort', 'getAllResponseHeaders']);
        fakeXHR.simulateLoad = function(response) {
            fakeXHR.simulateHttpResponse(200, response);
        };
        fakeXHR.simulateError = function() {
            fakeXHR.response = '';
            if (typeof fakeXHR.onerror === 'function') {
                fakeXHR.onerror();
            }
        };
        fakeXHR.simulateHttpResponse = function(statusCode, response) {
            fakeXHR.status = statusCode;
            fakeXHR.response = response;
            if (typeof fakeXHR.onload === 'function') {
                fakeXHR.onload();
            }
        };

        spyOn(window, 'XMLHttpRequest').and.returnValue(fakeXHR);
    });

    it('throws with no url', function() {
        expect(function() {
            loadJson();
        }).toThrowDeveloperError();
    });

    it('creates and sends request, adding Accept header when headers are provided', function() {
        var headers = {
            'Cache-Control' : 'no-cache'
        };
        loadJson('test', headers);

        expect(fakeXHR.open).toHaveBeenCalledWith('GET', 'test', true);
        expect(fakeXHR.setRequestHeader.calls.count()).toEqual(2);
        expect(fakeXHR.setRequestHeader).toHaveBeenCalledWith('Accept', 'application/json,*/*;q=0.01');
        expect(fakeXHR.setRequestHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
        expect(fakeXHR.send).toHaveBeenCalled();

        // the headers object we passed in should not have been modified
        expect(Object.keys(headers)).toEqual(['Cache-Control']);
    });

    it('creates and sends request, adding Accept header when headers are not provided', function() {
        loadJson('test');

        expect(fakeXHR.open).toHaveBeenCalledWith('GET', 'test', true);
        expect(fakeXHR.setRequestHeader.calls.count()).toEqual(1);
        expect(fakeXHR.setRequestHeader).toHaveBeenCalledWith('Accept', 'application/json,*/*;q=0.01');
        expect(fakeXHR.send).toHaveBeenCalled();
    });

    it('returns a promise that resolves when the request loads', function() {
        var testUrl = 'http://example.invalid/testuri';
        var promise = loadJson(testUrl);

        expect(promise).toBeDefined();

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeUndefined();

        var response = '{"good":"data"}';
        fakeXHR.simulateLoad(response);
        expect(resolvedValue).toEqual({
            good : 'data'
        });
        expect(rejectedError).toBeUndefined();
    });

    it('returns a promise that rejects when the request errors', function() {
        var testUrl = 'http://example.invalid/testuri';
        var promise = loadJson(testUrl);

        expect(promise).toBeDefined();

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeUndefined();

        fakeXHR.simulateError();
        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RequestErrorEvent).toBe(true);
        expect(rejectedError.statusCode).toBeUndefined();
        expect(rejectedError.response).toBeUndefined();
    });

    it('returns a promise that rejects when the request results in an HTTP error code', function() {
        var testUrl = 'http://example.invalid/testuri';
        var promise = loadJson(testUrl);

        expect(promise).toBeDefined();

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeUndefined();

        var error = 'some error';
        fakeXHR.simulateHttpResponse(404, error);
        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RequestErrorEvent).toBe(true);
        expect(rejectedError.statusCode).toEqual(404);
        expect(rejectedError.response).toEqual(error);
    });

    it('returns a promise that resolves with undefined when the status code ise 204', function() {
        var testUrl = 'http://example.invalid/testuri';
        var promise = loadJson(testUrl);

        expect(promise).toBeDefined();

        var resolved = false;
        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolved = true;
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeUndefined();

        fakeXHR.simulateHttpResponse(204);
        expect(resolved).toBe(true);
        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeUndefined();
    });

    it('returns undefined if the request is throttled', function() {
        var oldMaximumRequests = RequestScheduler.maximumRequests;
        RequestScheduler.maximumRequests = 0;

        var request = new Request({
            throttle : true
        });

        var testUrl = 'http://example.invalid/testuri';
        var promise = loadJson(testUrl, undefined, request);
        expect(promise).toBeUndefined();

        RequestScheduler.maximumRequests = oldMaximumRequests;
    });
});
