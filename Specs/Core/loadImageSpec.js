defineSuite([
        'Core/loadImage',
        'Core/Request',
        'Core/RequestScheduler',
        'Core/Resource',
        'ThirdParty/when'
    ], function(
        loadImage,
        Request,
        RequestScheduler,
        Resource,
        when) {
    'use strict';

    var dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2Nk+M/wHwAEBgIA5agATwAAAABJRU5ErkJggg==';

    it('can load an image', function() {
        return loadImage('./Data/Images/Green.png').then(function(loadedImage) {
            expect(loadedImage.width).toEqual(1);
            expect(loadedImage.height).toEqual(1);
        });
    });

    it('can load an image from a data URI', function() {
        return loadImage(dataUri).then(function(loadedImage) {
            expect(loadedImage.width).toEqual(1);
            expect(loadedImage.height).toEqual(1);
        });
    });

    it('throws with if url is missing', function() {
        expect(function() {
            loadImage();
        }).toThrowDeveloperError();
    });

    it('sets the crossOrigin property for cross-origin images', function() {
        var fakeImage = {};
        var imageConstructorSpy = spyOn(window, 'Image').and.returnValue(fakeImage);

        loadImage('http://example.invalid/someImage.png');
        expect(imageConstructorSpy).toHaveBeenCalled();
        expect(fakeImage.crossOrigin).toEqual('');
    });

    it('does not set the crossOrigin property for cross-origin images when allowCrossOrigin is false', function() {
        var fakeImage = {};
        var imageConstructorSpy = spyOn(window, 'Image').and.returnValue(fakeImage);

        loadImage('http://example.invalid/someImage.png', false);
        expect(imageConstructorSpy).toHaveBeenCalled();
        expect(fakeImage.crossOrigin).toBeUndefined();
    });

    it('does not set the crossOrigin property for non-cross-origin images', function() {
        var fakeImage = {};
        var imageConstructorSpy = spyOn(window, 'Image').and.returnValue(fakeImage);

        loadImage('./someImage.png', false);
        expect(imageConstructorSpy).toHaveBeenCalled();
        expect(fakeImage.crossOrigin).toBeUndefined();
    });

    it('does not set the crossOrigin property for data URIs', function() {
        var fakeImage = {};
        var imageConstructorSpy = spyOn(window, 'Image').and.returnValue(fakeImage);

        loadImage(dataUri);
        expect(imageConstructorSpy).toHaveBeenCalled();
        expect(fakeImage.crossOrigin).toBeUndefined();
    });

    it('resolves the promise when the image loads', function() {
        var fakeImage = {};
        spyOn(window, 'Image').and.returnValue(fakeImage);

        var success = false;
        var failure = false;
        var loadedImage;

        when(loadImage(dataUri), function(image) {
            success = true;
            loadedImage = image;
        }, function() {
            failure = true;
        });

        // neither callback has fired yet
        expect(success).toEqual(false);
        expect(failure).toEqual(false);

        fakeImage.onload();
        expect(success).toEqual(true);
        expect(failure).toEqual(false);
        expect(loadedImage).toBe(fakeImage);
    });

    it('rejects the promise when the image errors', function() {
        var fakeImage = {};
        spyOn(window, 'Image').and.returnValue(fakeImage);

        var success = false;
        var failure = false;
        var loadedImage;

        when(loadImage(dataUri), function(image) {
            success = true;
            loadedImage = image;
        }, function() {
            failure = true;
        });

        // neither callback has fired yet
        expect(success).toEqual(false);
        expect(failure).toEqual(false);

        fakeImage.onerror();
        expect(success).toEqual(false);
        expect(failure).toEqual(true);
        expect(loadedImage).toBeUndefined();
    });

    it('returns undefined if the request is throttled', function() {
        var oldMaximumRequests = RequestScheduler.maximumRequests;
        RequestScheduler.maximumRequests = 0;

        var request = new Request({
            throttle : true
        });

        var testUrl = 'http://example.invalid/testuri';
        var promise = loadImage(testUrl, undefined, request);
        expect(promise).toBeUndefined();

        RequestScheduler.maximumRequests = oldMaximumRequests;
    });

    it('Calls loadWithXhr with blob response type if headers is set', function() {
        var expectedUrl = 'http://example.invalid/testuri.png';
        var expectedHeaders = {
            'X-my-header': 'my-value'
        };
        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            expect(url).toEqual(expectedUrl);
            expect(headers).toEqual(expectedHeaders);
            expect(responseType).toEqual('blob');

            var binary = atob(dataUri.split(',')[1]);
            var array = [];
            for(var i = 0; i < binary.length; i++) {
                array.push(binary.charCodeAt(i));
            }

            deferred.resolve(new Blob([new Uint8Array(array)], {type: 'image/png'}));
        });

        var testResource = new Resource({
            url: expectedUrl,
            headers: expectedHeaders
        });
        var promise = loadImage(testResource);
        expect(promise).toBeDefined();

        return promise
            .then(function(image) {
                expect(image).toBeDefined();
            });
    });

    it('Doesn\'t call loadWithXhr with blob response type if headers is set but is a data URI', function() {
        spyOn(Resource._Implementations, 'loadWithXhr').and.callFake(function(url, responseType, method, data, headers, deferred, overrideMimeType) {
            deferred.reject('this shouldn\'t happen');
        });

        spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
            expect(url).toEqual(dataUri);
            return loadImage.defaultCreateImage(url, crossOrigin, deferred);
        });

        var testResource = new Resource({
            url: dataUri,
            headers: {
                'X-my-header': 'my-value'
            }
        });
        var promise = loadImage(testResource);
        expect(promise).toBeDefined();

        return promise
            .then(function(image) {
                expect(image).toBeDefined();
            });
    });

    describe('retries when Resource has the callback set', function() {
        it('rejects after too many retries', function() {
            var fakeImage = {};
            spyOn(window, 'Image').and.returnValue(fakeImage);

            var cb = jasmine.createSpy('retry').and.returnValue(true);

            var resource = new Resource({
                url : 'http://example.invalid/image.png',
                retryCallback: cb,
                retryAttempts: 1
            });

            var promise = loadImage(resource);

            expect(promise).toBeDefined();

            var success = false;
            var failure = false;
            promise.then(function() {
                success = true;
            }).otherwise(function () {
                failure = true;
            });

            expect(success).toBe(false);
            expect(failure).toBe(false);

            fakeImage.onerror('some error'); // This should retry
            expect(success).toBe(false);
            expect(failure).toBe(false);

            expect(cb.calls.count()).toEqual(1);
            var receivedResource = cb.calls.argsFor(0)[0];
            expect(receivedResource.url).toEqual(resource.url);
            expect(receivedResource._retryCount).toEqual(1);
            expect(cb.calls.argsFor(0)[1]).toEqual('some error');

            fakeImage.onerror(); // This fails because we only retry once
            expect(success).toBe(false);
            expect(failure).toBe(true);
        });

        it('rejects after callback returns false', function() {
            var fakeImage = {};
            spyOn(window, 'Image').and.returnValue(fakeImage);

            var cb = jasmine.createSpy('retry').and.returnValue(false);

            var resource = new Resource({
                url : 'http://example.invalid/image.png',
                retryCallback: cb,
                retryAttempts: 2
            });

            var promise = loadImage(resource);

            expect(promise).toBeDefined();

            var success = false;
            var failure = false;
            promise.then(function(value) {
                success = true;
            }).otherwise(function (error) {
                failure = true;
            });

            expect(success).toBe(false);
            expect(failure).toBe(false);

            fakeImage.onerror('some error'); // This fails because the callback returns false
            expect(success).toBe(false);
            expect(failure).toBe(true);

            expect(cb.calls.count()).toEqual(1);
            var receivedResource = cb.calls.argsFor(0)[0];
            expect(receivedResource.url).toEqual(resource.url);
            expect(receivedResource._retryCount).toEqual(1);
            expect(cb.calls.argsFor(0)[1]).toEqual('some error');
        });

        it('resolves after retry', function() {
            var fakeImage = {};
            spyOn(window, 'Image').and.returnValue(fakeImage);

            var cb = jasmine.createSpy('retry').and.returnValue(true);

            var resource = new Resource({
                url : 'http://example.invalid/image.png',
                retryCallback: cb,
                retryAttempts: 1
            });

            var promise = loadImage(resource);

            expect(promise).toBeDefined();

            var success = false;
            var failure = false;
            promise.then(function(value) {
                success = true;
            }).otherwise(function (error) {
                failure = true;
            });

            expect(success).toBe(false);
            expect(failure).toBe(false);

            fakeImage.onerror('some error'); // This should retry
            expect(success).toBe(false);
            expect(failure).toBe(false);

            expect(cb.calls.count()).toEqual(1);
            var receivedResource = cb.calls.argsFor(0)[0];
            expect(receivedResource.url).toEqual(resource.url);
            expect(receivedResource._retryCount).toEqual(1);
            expect(cb.calls.argsFor(0)[1]).toEqual('some error');

            fakeImage.onload();
            expect(success).toBe(true);
            expect(failure).toBe(false);
        });
    });
});
