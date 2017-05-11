/*global defineSuite*/
defineSuite([
        'Core/loadKTX',
        'Core/PixelFormat',
        'Core/RequestErrorEvent',
        'Core/RuntimeError'
    ], function(
        loadKTX,
        PixelFormat,
        RequestErrorEvent,
        RuntimeError) {
    'use strict';

    var validCompressed = new Uint8Array([171, 75, 84, 88, 32, 49, 49, 187, 13, 10, 26, 10, 1, 2, 3, 4, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 241, 131, 0, 0, 8, 25, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 224, 7, 224, 7, 0, 0, 0, 0]);
    var validUncompressed = new Uint8Array([171, 75, 84, 88, 32, 49, 49, 187, 13, 10, 26, 10, 1, 2, 3, 4, 1, 20, 0, 0, 1, 0, 0, 0, 8, 25, 0, 0, 88, 128, 0, 0, 8, 25, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 32, 0, 0, 0, 27, 0, 0, 0, 75, 84, 88, 79, 114, 105, 101, 110, 116, 97, 116, 105, 111, 110, 0, 83, 61, 114, 44, 84, 61, 100, 44, 82, 61, 105, 0, 0, 64, 0, 0, 0, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255]);

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
            loadKTX();
        }).toThrowDeveloperError();
    });

    it('creates and sends request without any custom headers', function() {
        var testUrl = 'http://example.invalid/testuri';
        loadKTX(testUrl);

        expect(fakeXHR.open).toHaveBeenCalledWith('GET', testUrl, true);
        expect(fakeXHR.setRequestHeader).not.toHaveBeenCalled();
        expect(fakeXHR.send).toHaveBeenCalled();
    });

    it('creates and sends request with custom headers', function() {
        var testUrl = 'http://example.invalid/testuri';
        loadKTX(testUrl, {
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
        var promise = loadKTX(testUrl);

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
        var promise = loadKTX(testUrl);

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

    it('returns a promise that resolves to an uncompressed texture when the request loads', function() {
        var testUrl = 'http://example.invalid/testuri';
        var promise = loadKTX(testUrl);

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

        var response = validUncompressed.buffer;
        fakeXHR.simulateLoad(response);
        expect(resolvedValue).toBeDefined();
        expect(resolvedValue.width).toEqual(4);
        expect(resolvedValue.height).toEqual(4);
        expect(PixelFormat.isCompressedFormat(resolvedValue.internalFormat)).toEqual(false);
        expect(resolvedValue.bufferView).toBeDefined();
        expect(rejectedError).toBeUndefined();
    });

    it('returns a promise that resolves to an compressed texture when the request loads', function() {
        var testUrl = 'http://example.invalid/testuri';
        var promise = loadKTX(testUrl);

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

        var response = validCompressed.buffer;
        fakeXHR.simulateLoad(response);
        expect(resolvedValue).toBeDefined();
        expect(resolvedValue.width).toEqual(4);
        expect(resolvedValue.height).toEqual(4);
        expect(PixelFormat.isCompressedFormat(resolvedValue.internalFormat)).toEqual(true);
        expect(resolvedValue.bufferView).toBeDefined();
        expect(rejectedError).toBeUndefined();
    });

    it('cannot parse invalid KTX buffer', function() {
        var invalidKTX = new Uint8Array(validCompressed);
        invalidKTX[0] = 0;

        var promise = loadKTX(invalidKTX.buffer);

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RuntimeError).toEqual(true);
        expect(rejectedError.message).toEqual('Invalid KTX file.');
    });

    it('cannot parse KTX buffer with invalid endianness', function() {
        var reinterprestBuffer = new Uint32Array(validCompressed.buffer);
        var invalidKTX = new Uint32Array(reinterprestBuffer);
        invalidKTX[3] = 0x01020304;

        var promise = loadKTX(invalidKTX.buffer);

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RuntimeError).toEqual(true);
        expect(rejectedError.message).toEqual('File is the wrong endianness.');
    });

    it('cannot parse KTX buffer with invalid internal format', function() {
        var reinterprestBuffer = new Uint32Array(validCompressed.buffer);
        var invalidKTX = new Uint32Array(reinterprestBuffer);
        invalidKTX[7] = 0;

        var promise = loadKTX(invalidKTX.buffer);

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RuntimeError).toEqual(true);
        expect(rejectedError.message).toEqual('glInternalFormat is not a valid format.');
    });

    it('cannot parse KTX buffer with compressed texture and invalid type', function() {
        var reinterprestBuffer = new Uint32Array(validCompressed.buffer);
        var invalidKTX = new Uint32Array(reinterprestBuffer);
        invalidKTX[4] = 15;

        var promise = loadKTX(invalidKTX.buffer);

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RuntimeError).toEqual(true);
        expect(rejectedError.message).toEqual('glType must be zero when the texture is compressed.');
    });

    it('cannot parse KTX buffer with compressed texture and invalid type size', function() {
        var reinterprestBuffer = new Uint32Array(validCompressed.buffer);
        var invalidKTX = new Uint32Array(reinterprestBuffer);
        invalidKTX[5] = 15;

        var promise = loadKTX(invalidKTX.buffer);

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RuntimeError).toEqual(true);
        expect(rejectedError.message).toEqual('The type size for compressed textures must be 1.');
    });

    it('cannot parse KTX buffer with compressed texture and needs to generate mipmaps', function() {
        var reinterprestBuffer = new Uint32Array(validCompressed.buffer);
        var invalidKTX = new Uint32Array(reinterprestBuffer);
        invalidKTX[14] = 0;

        var promise = loadKTX(invalidKTX.buffer);

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RuntimeError).toEqual(true);
        expect(rejectedError.message).toEqual('Generating mipmaps for a compressed texture is unsupported.');
    });

    it('cannot parse KTX buffer with uncompressed texture and base format is not the same as format', function() {
        var reinterprestBuffer = new Uint32Array(validUncompressed.buffer);
        var invalidKTX = new Uint32Array(reinterprestBuffer);
        invalidKTX[8] = invalidKTX[6] + 1;

        var promise = loadKTX(invalidKTX.buffer);

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RuntimeError).toEqual(true);
        expect(rejectedError.message).toEqual('The base internal format must be the same as the format for uncompressed textures.');
    });

    it('3D textures are unsupported', function() {
        var reinterprestBuffer = new Uint32Array(validUncompressed.buffer);
        var invalidKTX = new Uint32Array(reinterprestBuffer);
        invalidKTX[11] = 15;

        var promise = loadKTX(invalidKTX.buffer);

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RuntimeError).toEqual(true);
        expect(rejectedError.message).toEqual('3D textures are unsupported.');
    });

    it('Texture arrays are unsupported', function() {
        var reinterprestBuffer = new Uint32Array(validUncompressed.buffer);
        var invalidKTX = new Uint32Array(reinterprestBuffer);
        invalidKTX[12] = 15;

        var promise = loadKTX(invalidKTX.buffer);

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RuntimeError).toEqual(true);
        expect(rejectedError.message).toEqual('Texture arrays are unsupported.');
    });

    it('Cubemaps are unsupported', function() {
        var reinterprestBuffer = new Uint32Array(validUncompressed.buffer);
        var invalidKTX = new Uint32Array(reinterprestBuffer);
        invalidKTX[13] = 6;

        var promise = loadKTX(invalidKTX.buffer);

        var resolvedValue;
        var rejectedError;
        promise.then(function(value) {
            resolvedValue = value;
        }, function(error) {
            rejectedError = error;
        });

        expect(resolvedValue).toBeUndefined();
        expect(rejectedError instanceof RuntimeError).toEqual(true);
        expect(rejectedError.message).toEqual('Cubemaps are unsupported.');
    });
});
