/*global defineSuite*/
defineSuite([
         'Scene/DiscardMissingTileImagePolicy',
         'Core/Cartesian2',
         'Core/loadImage',
         'ThirdParty/when'
     ], function(
         DiscardMissingTileImagePolicy,
         Cartesian2,
         loadImage,
         when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    afterEach(function() {
        loadImage.createImage = loadImage.defaultCreateImage;
    });

    describe('construction', function() {
        it('throws if missingImageUrl is not provided', function() {
            function constructWithoutMissingImageUrl() {
                return new DiscardMissingTileImagePolicy({
                    pixelsToCheck : [new Cartesian2(0, 0)]
                });
            }
            expect(constructWithoutMissingImageUrl).toThrow();
        });

        it('throws if pixelsToCheck is not provided', function() {
            function constructWithoutPixelsToCheck() {
                return new DiscardMissingTileImagePolicy({
                    missingImageUrl : 'http://made.up.com/missingImage.png'
                });
            }
            expect(constructWithoutPixelsToCheck).toThrow();
        });

        it('requests the missing image url', function() {
            var missingImageUrl = 'http://made.up.com/missingImage.png';

            var createImageCalled = false;
            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url).toEqual(missingImageUrl);
                createImageCalled = true;
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : 'http://made.up.com/missingImage.png',
                pixelsToCheck : [new Cartesian2(0, 0)]
            });

            waitsFor(function() {
                return policy.isReady();
            }, 'policy to become ready');

            runs(function() {
                expect(createImageCalled).toEqual(true);
            });
        });
    });

    describe('shouldDiscardImage', function() {
        it('discards an image that is identical to the missing image', function() {
            var missingImageUrl = 'http://made.up.com/missingImage.png';

            var redImage;
            when(loadImage('Data/Images/Red16x16.png'), function(image) {
                redImage = image;
            });

            var greenImage;
            when(loadImage('Data/Images/Green4x4.png'), function(image) {
                greenImage = image;
            });

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url).toEqual(missingImageUrl);
                return loadImage.defaultCreateImage('Data/Images/Red16x16.png', crossOrigin, deferred);
            };

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : 'http://made.up.com/missingImage.png',
                pixelsToCheck : [new Cartesian2(0, 0)]
            });

            waitsFor(function() {
                return policy.isReady();
            }, 'policy to become ready');

            waitsFor(function() {
                return typeof redImage !== 'undefined';
            });

            waitsFor(function() {
                return typeof greenImage !== 'undefined';
            });

            runs(function() {
                expect(policy.shouldDiscardImage(redImage)).toEqual(true);
                expect(policy.shouldDiscardImage(greenImage)).toEqual(false);
            });
        });

        it('discards an image that is identical to the missing image even if the missing image is transparent', function() {
            var missingImageUrl = 'http://made.up.com/missingImage.png';

            var transparentImage;
            when(loadImage('Data/Images/Transparent.png'), function(image) {
                transparentImage = image;
            });

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url).toEqual(missingImageUrl);
                return loadImage.defaultCreateImage('Data/Images/Transparent.png', crossOrigin, deferred);
            };

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : 'http://made.up.com/missingImage.png',
                pixelsToCheck : [new Cartesian2(0, 0)]
            });

            waitsFor(function() {
                return policy.isReady();
            }, 'policy to become ready');

            waitsFor(function() {
                return typeof transparentImage !== 'undefined';
            });

            runs(function() {
                expect(policy.shouldDiscardImage(transparentImage)).toEqual(true);
            });
        });

        it('does not discard at all when the missing image is transparent and disableCheckIfAllPixelsAreTransparent is set', function() {
            var missingImageUrl = 'http://made.up.com/missingImage.png';

            var transparentImage;
            when(loadImage('Data/Images/Transparent.png'), function(image) {
                transparentImage = image;
            });

            loadImage.createImage = function(url, crossOrigin, deferred) {
                expect(url).toEqual(missingImageUrl);
                return loadImage.defaultCreateImage('Data/Images/Transparent.png', crossOrigin, deferred);
            };

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : 'http://made.up.com/missingImage.png',
                pixelsToCheck : [new Cartesian2(0, 0)],
                disableCheckIfAllPixelsAreTransparent : true
            });

            waitsFor(function() {
                return policy.isReady();
            }, 'policy to become ready');

            waitsFor(function() {
                return typeof transparentImage !== 'undefined';
            });

            runs(function() {
                expect(policy.shouldDiscardImage(transparentImage)).toEqual(false);
            });
        });

        it('throws if called before the policy is ready', function() {
            loadImage.createImage = function(url, crossOrigin, deferred) {
                return loadImage.defaultCreateImage('Data/Images/Transparent.png', crossOrigin, deferred);
            };

            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : 'http://made.up.com/missingImage.png',
                pixelsToCheck : [new Cartesian2(0, 0)],
                disableCheckIfAllPixelsAreTransparent : true
            });

            function callShouldDiscardImage() {
                policy.shouldDiscardImage(new Image());
            }

            expect(callShouldDiscardImage).toThrow();
        });
    });
});