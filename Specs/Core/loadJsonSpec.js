/*global defineSuite*/
defineSuite([
        'Core/loadJson',
        'Core/RequestErrorEvent'
    ], function(
        loadJson,
        RequestErrorEvent) {
    'use strict';

    var fakeXHR;

    beforeEach(function() {
        fakeXHR = jasmine.createSpyObj('XMLHttpRequest', ['send', 'open', 'setRequestHeader', 'abort', 'getAllResponseHeaders']);
        fakeXHR.simulateLoad = function(response) {
            fakeXHR.status = 200;
            fakeXHR.response = response;
            if (typeof fakeXHR.onload === 'function') {
                fakeXHR.onload();
            }
        };
        fakeXHR.simulateError = function() {
            fakeXHR.response = '';
            if (typeof fakeXHR.onerror === 'function') {
                fakeXHR.onerror();
            }
        };
        fakeXHR.simulateHttpError = function(statusCode, response) {
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
        fakeXHR.simulateHttpError(404, error);
        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RequestErrorEvent).toBe(true);
        expect(rejectedError.statusCode).toEqual(404);
        expect(rejectedError.response).toEqual(error);
    });
});
