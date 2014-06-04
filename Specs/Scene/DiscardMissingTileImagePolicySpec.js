/*global defineSuite*/
defineSuite([
        'Scene/DiscardMissingTileImagePolicy',
        'Core/Cartesian2',
        'Core/defined',
        'Core/loadImage',
        'Core/loadWithXhr',
        'ThirdParty/when'
    ], function(
        DiscardMissingTileImagePolicy,
        Cartesian2,
        defined,
        loadImage,
        loadWithXhr,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    afterEach(function() {
        loadImage.createImage = loadImage.defaultCreateImage;
        loadWithXhr.load = loadWithXhr.defaultLoad;
    });

    describe('construction', function() {
        it('throws if missingImageUrl is not provided', function() {
            function constructWithoutMissingImageUrl() {
                return new DiscardMissingTileImagePolicy({
                    pixelsToCheck : [new Cartesian2(0, 0)]
                });
            }
            expect(constructWithoutMissingImageUrl).toThrowDeveloperError();
        });

        it('throws if pixelsToCheck is not provided', function() {
            function constructWithoutPixelsToCheck() {
                return new DiscardMissingTileImagePolicy({
                    missingImageUrl : 'http://some.host.invalid/missingImage.png'
                });
            }
            expect(constructWithoutPixelsToCheck).toThrowDeveloperError();
        });

        it('requests the missing image url', function() {
            var missingImageUrl = 'http://some.host.invalid/missingImage.png';

            var imageDownloaded = false;
            loadImage.createImage = function(url, crossOrigin, deferred) {
                if (url.indexOf('blob:') !== 0) {
                    expect(url).toEqual(missingImageUrl);
                    imageDownloaded = true;
                }
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual(missingImageUrl);
                imageDownloaded = true;
                return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : 'http://some.host.invalid/missingImage.png',
                pixelsToCheck : [new Cartesian2(0, 0)]
            });

            waitsFor(function() {
                return policy.isReady();
            }, 'policy to become ready');

            runs(function() {
                expect(imageDownloaded).toEqual(true);
            });
        });
    });

    describe('shouldDiscardImage', function() {
        it('discards an image that is identical to the missing image', function() {
            var missingImageUrl = 'http://some.host.invalid/missingImage.png';

            var redImage;
            when(loadImage('Data/Images/Red16x16.png'), function(image) {
                redImage = image;
            });

            var greenImage;
            when(loadImage('Data/Images/Green4x4.png'), function(image) {
                greenImage = image;
            });

            loadImage.createImage = function(url, crossOrigin, deferred) {
                if (url.indexOf('blob:') !== 0) {
                    expect(url).toEqual(missingImageUrl);
                }
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual(missingImageUrl);
                return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : 'http://some.host.invalid/missingImage.png',
                pixelsToCheck : [new Cartesian2(0, 0)]
            });

            waitsFor(function() {
                return policy.isReady();
            }, 'policy to become ready');

            waitsFor(function() {
                return defined(redImage);
            });

            waitsFor(function() {
                return defined(greenImage);
            });

            runs(function() {
                expect(policy.shouldDiscardImage(redImage)).toEqual(true);
                expect(policy.shouldDiscardImage(greenImage)).toEqual(false);
            });
        });

        it('discards an image that is identical to the missing image even if the missing image is transparent', function() {
            var missingImageUrl = 'http://some.host.invalid/missingImage.png';

            var transparentImage;
            when(loadImage('Data/Images/Transparent.png'), function(image) {
                transparentImage = image;
            });

            loadImage.createImage = function(url, crossOrigin, deferred) {
                if (url.indexOf('blob:') !== 0) {
                    expect(url).toEqual(missingImageUrl);
                }
                return loadImage.defaultCreateImage('Data/Images/Transparent.png', crossOrigin, deferred);
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual(missingImageUrl);
                return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : 'http://some.host.invalid/missingImage.png',
                pixelsToCheck : [new Cartesian2(0, 0)]
            });

            waitsFor(function() {
                return policy.isReady();
            }, 'policy to become ready');

            waitsFor(function() {
                return defined(transparentImage);
            });

            runs(function() {
                expect(policy.shouldDiscardImage(transparentImage)).toEqual(true);
            });
        });

        it('does not discard at all when the missing image is transparent and disableCheckIfAllPixelsAreTransparent is set', function() {
            var missingImageUrl = 'http://some.host.invalid/missingImage.png';

            var transparentImage;
            when(loadImage('Data/Images/Transparent.png'), function(image) {
                transparentImage = image;
            });

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url).toEqual(missingImageUrl);
                return loadImage.defaultCreateImage('Data/Images/Transparent.png', crossOrigin, deferred);
            };

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : 'http://some.host.invalid/missingImage.png',
                pixelsToCheck : [new Cartesian2(0, 0)],
                disableCheckIfAllPixelsAreTransparent : true
            });

            waitsFor(function() {
                return policy.isReady();
            }, 'policy to become ready');

            waitsFor(function() {
                return defined(transparentImage);
            });

            runs(function() {
                expect(policy.shouldDiscardImage(transparentImage)).toEqual(false);
            });
        });

        it('throws if called before the policy is ready', function() {
            loadImage.createImage = function(url, crossOrigin, deferred) {
                return loadImage.defaultCreateImage('Data/Images/Transparent.png', crossOrigin, deferred);
            };

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                return loadWithXhr.defaultLoad('Data/Images/Transparent.png', responseType, method, data, headers, deferred);
            };

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : 'http://some.host.invalid/missingImage.png',
                pixelsToCheck : [new Cartesian2(0, 0)],
                disableCheckIfAllPixelsAreTransparent : true
            });

            function callShouldDiscardImage() {
                policy.shouldDiscardImage(new Image());
            }

            expect(callShouldDiscardImage).toThrowDeveloperError();
        });
    });
});