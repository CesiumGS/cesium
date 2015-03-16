/*global defineSuite*/
defineSuite([
        'Scene/DiscardMissingTileImagePolicy',
        'Core/Cartesian2',
        'Core/defined',
        'Core/loadImage',
        'Core/loadWithXhr',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        DiscardMissingTileImagePolicy,
        Cartesian2,
        defined,
        loadImage,
        loadWithXhr,
        pollToPromise,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

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

            spyOn(loadImage, 'createImage').and.callFake(function(url, crossOrigin, deferred) {
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

            return pollToPromise(function() {
                return policy.isReady();
            }).then(function() {
                expect(loadImage.createImage).toHaveBeenCalled();
            });
        });
    });

    describe('shouldDiscardImage', function() {
        it('discards an image that is identical to the missing image', function() {
            var promises = [];

            promises.push(loadImage('Data/Images/Red16x16.png'));
            promises.push(loadImage('Data/Images/Green4x4.png'));

            var missingImageUrl = 'Data/Images/Red16x16.png';
            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : missingImageUrl,
                pixelsToCheck : [new Cartesian2(0, 0)]
            });

            promises.push(pollToPromise(function() {
                return policy.isReady();
            }));

            return when.all(promises, function(results) {
                var redImage = results[0];
                var greenImage = results[1];

                expect(policy.shouldDiscardImage(redImage)).toEqual(true);
                expect(policy.shouldDiscardImage(greenImage)).toEqual(false);
            });
        });

        it('discards an image that is identical to the missing image even if the missing image is transparent', function() {
            var promises = [];

            var transparentImage;
            promises.push(loadImage('Data/Images/Transparent.png'));

            var missingImageUrl = 'Data/Images/Transparent.png';
            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : missingImageUrl,
                pixelsToCheck : [new Cartesian2(0, 0)]
            });

            promises.push(pollToPromise(function() {
                return policy.isReady();
            }));

            return when.all(promises, function(results) {
                var transparentImage = results[0];
                expect(policy.shouldDiscardImage(transparentImage)).toEqual(true);
            });
        });

        it('does not discard at all when the missing image is transparent and disableCheckIfAllPixelsAreTransparent is set', function() {
            var promises = [];

            promises.push(loadImage('Data/Images/Transparent.png'));

            var missingImageUrl = 'Data/Images/Transparent.png';
            var policy = new DiscardMissingTileImagePolicy({
                missingImageUrl : missingImageUrl,
                pixelsToCheck : [new Cartesian2(0, 0)],
                disableCheckIfAllPixelsAreTransparent : true
            });

            promises.push(pollToPromise(function() {
                return policy.isReady();
            }));

            return when.all(promises, function(results) {
                var transparentImage = results[0];
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