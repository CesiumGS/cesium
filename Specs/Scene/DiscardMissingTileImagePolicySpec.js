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

            spyOn(loadImage, 'createImage').andCallFake(function(url, crossOrigin, deferred) {
                if (/^blob:/.test(url)) {
                    // load blob url normally
                    loadImage.defaultCreateImage(url, crossOrigin, deferred);
                } else {
                    expect(url).toEqual(missingImageUrl);
                    loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
                }
            });

            loadWithXhr.load = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
                expect(url).toEqual(missingImageUrl);
                return loadWithXhr.defaultLoad('Data/Images/Red16x16.png', responseType, method, data, headers, deferred);
            };

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : missingImageUrl,
                pixelsToCheck : [new Cartesian2(0, 0)]
            });

            waitsFor(function() {
                return policy.isReady();
            }, 'policy to become ready');

            runs(function() {
                expect(loadImage.createImage).toHaveBeenCalled();
            });
        });
    });

    describe('shouldDiscardImage', function() {
        it('discards an image that is identical to the missing image', function() {
            var missingImageUrl = 'Data/Images/Red16x16.png';

            var redImage;
            when(loadImage('Data/Images/Red16x16.png'), function(image) {
                redImage = image;
            });

            var greenImage;
            when(loadImage('Data/Images/Green4x4.png'), function(image) {
                greenImage = image;
            });

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : missingImageUrl,
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
            var missingImageUrl = 'Data/Images/Transparent.png';

            var transparentImage;
            when(loadImage('Data/Images/Transparent.png'), function(image) {
                transparentImage = image;
            });

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : missingImageUrl,
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
            var missingImageUrl = 'Data/Images/Transparent.png';

            var transparentImage;
            when(loadImage('Data/Images/Transparent.png'), function(image) {
                transparentImage = image;
            });

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : missingImageUrl,
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
            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : 'Data/Images/Transparent.png',
                pixelsToCheck : [new Cartesian2(0, 0)],
                disableCheckIfAllPixelsAreTransparent : true
            });

            expect(function() {
                policy.shouldDiscardImage(new Image());
            }).toThrowDeveloperError();
        });
    });
});