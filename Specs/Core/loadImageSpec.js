/*global defineSuite*/
defineSuite([
        'Core/loadImage',
        'Core/defined',
        'ThirdParty/when'
    ], function(
        loadImage,
        defined,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2Nk+M/wHwAEBgIA5agATwAAAABJRU5ErkJggg==';

    it('can load an image', function() {
        var loadedImage;
        when(loadImage('./Data/Images/Green.png'), function(image) {
            loadedImage = image;
        });

        waitsFor(function() {
            return defined(loadedImage);
        }, 'The image should load.', 5000);

        runs(function() {
            expect(loadedImage.width).toEqual(1);
            expect(loadedImage.height).toEqual(1);
        });
    });

    it('can load an image from a data URI', function() {
        var loadedImage;
        when(loadImage(dataUri), function(image) {
            loadedImage = image;
        });

        waitsFor(function() {
            return defined(loadedImage);
        }, 'The image should load.');

        runs(function() {
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
        var imageConstructorSpy = spyOn(window, 'Image').andReturn(fakeImage);

        loadImage('http://example.invalid/someImage.png');
        expect(imageConstructorSpy).toHaveBeenCalled();
        expect(fakeImage.crossOrigin).toEqual('');
    });

    it('does not set the crossOrigin property for cross-origin images when allowCrossOrigin is false', function() {
        var fakeImage = {};
        var imageConstructorSpy = spyOn(window, 'Image').andReturn(fakeImage);

        loadImage('http://example.invalid/someImage.png', false);
        expect(imageConstructorSpy).toHaveBeenCalled();
        expect(fakeImage.crossOrigin).toBeUndefined();
    });

    it('does not set the crossOrigin property for non-cross-origin images', function() {
        var fakeImage = {};
        var imageConstructorSpy = spyOn(window, 'Image').andReturn(fakeImage);

        loadImage('./someImage.png', false);
        expect(imageConstructorSpy).toHaveBeenCalled();
        expect(fakeImage.crossOrigin).toBeUndefined();
    });

    it('does not set the crossOrigin property for data URIs', function() {
        var fakeImage = {};
        var imageConstructorSpy = spyOn(window, 'Image').andReturn(fakeImage);

        loadImage(dataUri);
        expect(imageConstructorSpy).toHaveBeenCalled();
        expect(fakeImage.crossOrigin).toBeUndefined();
    });

    it('resolves the promise when the image loads', function() {
        var fakeImage = {};
        spyOn(window, 'Image').andReturn(fakeImage);

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
        spyOn(window, 'Image').andReturn(fakeImage);

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
});
