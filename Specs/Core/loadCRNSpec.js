defineSuite([
        'Core/loadCRN',
        'Core/PixelFormat',
        'Core/Request',
        'Core/RequestErrorEvent',
        'Core/RequestScheduler',
        'Core/Resource'
    ], function(
        loadCRN,
        PixelFormat,
        Request,
        RequestErrorEvent,
        RequestScheduler,
        Resource) {
    'use strict';

    var validCompressed = new Uint8Array([72, 120, 0, 74, 227, 123, 0, 0, 0, 138, 92, 167, 0, 4, 0, 4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 74, 0, 0, 22, 0, 1, 0, 0, 96, 0, 0, 12, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 29, 0, 0, 108, 0, 0, 0, 137, 0, 10, 96, 0, 0, 0, 0, 0, 0, 16, 4, 9, 130, 0, 0, 0, 0, 0, 0, 109, 4, 0, 0, 198, 96, 128, 0, 0, 0, 0, 0, 26, 80, 0, 0, 6, 96, 0, 0, 0, 0, 0, 0, 16, 0, 51, 0, 0, 0, 0, 0, 0, 0, 128, 1, 152, 0, 0, 0, 0, 0, 0, 4, 0]);
    var validCompressedMipmap = new Uint8Array([72, 120, 0, 82, 183, 141, 0, 0, 0, 148, 151, 24, 0, 4, 0, 4, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 82, 0, 0, 22, 0, 1, 0, 0, 104, 0, 0, 12, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 29, 0, 0, 116, 0, 0, 0, 145, 0, 0, 0, 146, 0, 0, 0, 147, 0, 130, 97, 0, 0, 0, 0, 0, 4, 35, 37, 0, 3, 48, 0, 0, 0, 0, 0, 0, 8, 200, 0, 198, 96, 128, 0, 0, 0, 0, 0, 26, 80, 0, 0, 6, 96, 0, 0, 0, 0, 0, 0, 16, 0, 51, 0, 0, 0, 0, 0, 0, 0, 128, 1, 152, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0]);
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

    it('creates and sends request with custom headers with Resource', function() {
        var testUrl = 'http://example.invalid/testuri';
        var resource = new Resource({
            url: testUrl,
            headers: {
                'Accept' : 'application/json',
                'Cache-Control' : 'no-cache'
            }
        });

        loadCRN(resource);

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
        fakeXHR.simulateHttpResponse(404, error);
        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RequestErrorEvent).toBe(true);
        expect(rejectedError.statusCode).toEqual(404);
        expect(rejectedError.response).toEqual(error);
    });

    it('returns a promise that resolves with undefined when statusCode is 204', function() {
        var testUrl = 'http://example.invalid/testuri';
        var promise = loadCRN(testUrl);

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

    it('returns a promise that resolves to a compressed texture when the request loads', function() {
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

    it('returns a promise that resolves to a compressed texture containing the first mip level of the original texture', function() {
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

        var response = validCompressedMipmap.buffer;
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

    it('returns undefined if the request is throttled', function() {
        var oldMaximumRequests = RequestScheduler.maximumRequests;
        RequestScheduler.maximumRequests = 0;

        var promise = loadCRN(new Resource({
            url: 'http://example.invalid/testuri',
            request: new Request({
                throttle: true
            })
        }));
        expect(promise).toBeUndefined();

        RequestScheduler.maximumRequests = oldMaximumRequests;
    });
});
