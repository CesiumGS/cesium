/*global defineSuite*/
defineSuite([
        'Core/loadXML',
        'Core/RequestErrorEvent'
    ], function(
        loadXML,
        RequestErrorEvent) {
    'use strict';

    var fakeXHR;

    beforeEach(function() {
        fakeXHR = jasmine.createSpyObj('XMLHttpRequest', ['send', 'open', 'setRequestHeader', 'abort', 'overrideMimeType', 'getAllResponseHeaders']);
        fakeXHR.simulateLoad = function(response) {
            var parser = new DOMParser();
            fakeXHR.status = 200;
            fakeXHR.response = parser.parseFromString(response, 'text/xml');
            fakeXHR.responseXML = fakeXHR.response;
            if (typeof fakeXHR.onload === 'function') {
                fakeXHR.onload();
            }
        };
        fakeXHR.simulateError = function() {
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
            loadXML();
        }).toThrowDeveloperError();
    });

    it('creates and sends request without any custom headers', function() {
        var testUrl = 'http://example.invalid/testuri';
        loadXML(testUrl);

        expect(fakeXHR.open).toHaveBeenCalledWith('GET', testUrl, true);
        expect(fakeXHR.setRequestHeader).not.toHaveBeenCalled();
        expect(fakeXHR.send).toHaveBeenCalled();
    });

    it('creates and sends request with custom headers', function() {
        var testUrl = 'http://example.invalid/testuri';
        loadXML(testUrl, {
            'Accept' : 'application/json',
            'Cache-Control' : 'no-cache'
        });

        expect(fakeXHR.open).toHaveBeenCalledWith('GET', testUrl, true);
        expect(fakeXHR.setRequestHeader.calls.count()).toEqual(2);
        expect(fakeXHR.setRequestHeader).toHaveBeenCalledWith('Accept', 'application/json');
        expect(fakeXHR.setRequestHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
        expect(fakeXHR.send).toHaveBeenCalled();
    });

    it('returns a promise that resolves when the request loads', function() {
        var testUrl = 'http://example.invalid/testuri';
        var promise = loadXML(testUrl);

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

        var response = '<some>response</some>';
        fakeXHR.simulateLoad(response);
        var someElements = resolvedValue.getElementsByTagName('some');
        expect(someElements.length).toBeGreaterThan(0);
        expect(rejectedError).toBeUndefined();
    });

    it('returns a promise that rejects when the request errors', function() {
        var testUrl = 'http://example.invalid/testuri';
        var promise = loadXML(testUrl);

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
        var promise = loadXML(testUrl);

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
