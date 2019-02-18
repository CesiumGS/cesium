defineSuite([
        'Core/loadImageFromTypedArray',
        'Core/FeatureDetection',
        'Core/Resource'
    ], function(
        loadImageFromTypedArray,
        FeatureDetection,
        Resource) {
    'use strict';

    beforeAll(function() {
        return FeatureDetection.supportsImageBitmapOptions();
    });

    it('can load an image', function() {
        return Resource.fetchArrayBuffer('./Data/Images/Blue10x10.png').then(function(arrayBuffer) {
            var options = {
                uint8Array: new Uint8Array(arrayBuffer),
                format: 'image/png'
            };

            return loadImageFromTypedArray(options).then(function(image) {
                expect(image.width).toEqual(10);
                expect(image.height).toEqual(10);
            });
        });
    });

    it('flips image when ImageBitmapOptions are supported', function() {
        var options = {
            uint8Array: new Uint8Array([67, 101, 115, 105, 117, 109]), // This is an invalid PNG.
            format: 'image/png',
            flipY: true
        };
        spyOn(window, 'createImageBitmap');
        var blob = new Blob([options.uint8Array], {
            type : options.format
        });

        return loadImageFromTypedArray(options).then(function() {
            if (FeatureDetection.supportsImageBitmapOptionsSync()) {
                expect(window.createImageBitmap).toHaveBeenCalledWith(blob, {
                    imageOrientation: 'flipY'
                });
            } else {
                expect(window.createImageBitmap).toHaveBeenCalledWith(blob);
            }

            options.flipY = false;
            window.createImageBitmap.calls.reset();
            return loadImageFromTypedArray(options);
        })
        .then(function() {
            if (FeatureDetection.supportsImageBitmapOptionsSync()) {
                expect(window.createImageBitmap).toHaveBeenCalledWith(blob, {
                    imageOrientation: 'none'
                });
            } else {
                expect(window.createImageBitmap).toHaveBeenCalledWith(blob);
            }
        });
    });

    it('can load an image when ImageBitmap is not supported', function() {
        spyOn(FeatureDetection, 'supportsCreateImageBitmap').and.returnValue(false);
        spyOn(window, 'createImageBitmap').and.callThrough();
        return Resource.fetchArrayBuffer('./Data/Images/Blue10x10.png').then(function(arrayBuffer) {
            var options = {
                uint8Array: new Uint8Array(arrayBuffer),
                format: 'image/png'
            };

            return loadImageFromTypedArray(options).then(function(image) {
                expect(image.width).toEqual(10);
                expect(image.height).toEqual(10);
                expect(window.createImageBitmap).not.toHaveBeenCalled();
            });
        });
    });

    it('can not load an invalid image', function() {
        var options = {
            uint8Array: new Uint8Array([67, 101, 115, 105, 117, 109]), // This is an invalid PNG.
            format: 'image/png'
        };
        return loadImageFromTypedArray(options).then(function(image) {
            fail('should not be called');
        }).otherwise(function() {
        });
    });

    it('Throws without array', function() {
        expect(function() {
            loadImageFromTypedArray({});
        }).toThrowDeveloperError();
    });

    it('Throws without format', function() {
        expect(function() {
            loadImageFromTypedArray({
                uint8Array: new Uint8Array()
            });
        }).toThrowDeveloperError();
    });
});
