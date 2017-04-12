/*global defineSuite*/
defineSuite([
    'Core/loadCRN',
    'Core/PixelFormat',
    'Core/RequestErrorEvent'
], function(
    loadCRN,
    PixelFormat,
    RequestErrorEvent) {
    'use strict';

    var validCompressed = new Uint8Array([72, 120, 0, 74, 227, 123, 0, 0, 0, 138, 92, 167, 0, 4, 0, 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 74, 0, 0, 22, 0, 1, 0, 0, 96, 0, 0, 12, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 29, 0, 0, 108, 0, 0, 0, 137, 0, 10, 96, 0, 0, 0, 0, 0, 0, 16, 4, 9, 130, 0, 0, 0, 0, 0, 0, 109, 4, 0, 0, 198, 96, 128, 0, 0, 0, 0, 0, 26, 80, 0, 0, 6, 96, 0, 0, 0, 0, 0, 0, 16, 0, 51, 0, 0, 0, 0, 0, 0, 0, 128, 1, 152, 0, 0, 0, 0, 0, 0, 4, 0]);
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
            loadCRN();
        }).toThrowDeveloperError();
    });

    it('creates and sends request without any custom headers', function() {
        var testUrl = 'http://example.invalid/testuri';
        loadCRN(testUrl);

        expect(fakeXHR.open).toHaveBeenCalledWith('GET', testUrl, true);
        expect(fakeXHR.setRequestHeader).not.toHaveBeenCalled();
        expect(fakeXHR.send).toHaveBeenCalled();
    });

    it('creates and sends request with custom headers', function() {
        var testUrl = 'http://example.invalid/testuri';
        loadCRN(testUrl, {
            'Accept' : 'application/json',
            'Cache-Control' : 'no-cache'
        });

        expect(fakeXHR.open).toHaveBeenCalledWith('GET', testUrl, true);
        expect(fakeXHR.setRequestHeader.calls.count()).toEqual(2);
        expect(fakeXHR.setRequestHeader).toHaveBeenCalledWith('Accept', 'application/json');
        expect(fakeXHR.setRequestHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
        expect(fakeXHR.send).toHaveBeenCalled();
    });

    it('returns a promise that rejects when the request errors', function() {
        var testUrl = 'http://example.invalid/testuri';
        var promise = loadCRN(testUrl);

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
        var promise = loadCRN(testUrl);

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

    it('returns a promise that resolves to an compressed texture when the request loads', function() {
        var testUrl = 'http://example.invalid/testuri';
        var promise = loadCRN(testUrl);

        expect(promise).toBeDefined();

        var resolvedValue;
        var rejectedError;
        var newPromise = promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError).toBeUndefined();

        var response = validCompressed.buffer;
        fakeXHR.simulateLoad(response);

        return newPromise.then(function() {
            expect(resolvedValue).toBeDefined();
            expect(resolvedValue.width).toEqual(4);
            expect(resolvedValue.height).toEqual(4);
            expect(PixelFormat.isCompressedFormat(resolvedValue.internalFormat)).toEqual(true);
            expect(resolvedValue.bufferView).toBeDefined();
            expect(rejectedError).toBeUndefined();
        });
    });
});
