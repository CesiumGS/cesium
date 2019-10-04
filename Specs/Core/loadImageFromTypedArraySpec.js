import { loadImageFromTypedArray } from '../../Source/Cesium.js';
import { Resource } from '../../Source/Cesium.js';
import { when } from '../../Source/Cesium.js';

describe('Core/loadImageFromTypedArray', function() {

    var supportsImageBitmapOptions;

    beforeAll(function() {
        return Resource.supportsImageBitmapOptions()
            .then(function(result) {
                supportsImageBitmapOptions = result;
            });
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

    it('flips image only when flipY is true', function() {
        if (!supportsImageBitmapOptions) {
            return;
        }

        var options = {
            uint8Array: new Uint8Array([67, 101, 115, 105, 117, 109]), // This is an invalid PNG.
            format: 'image/png',
            flipY: true
        };
        spyOn(window, 'createImageBitmap').and.returnValue(when.resolve({}));
        var blob = new Blob([options.uint8Array], {
            type : options.format
        });

        return Resource.supportsImageBitmapOptions()
            .then(function(result) {
                if (!result) {
                    return;
                }

                return loadImageFromTypedArray(options)
                    .then(function() {
                        expect(window.createImageBitmap).toHaveBeenCalledWith(blob, {
                            imageOrientation: 'flipY',
                            premultiplyAlpha: 'none'
                        });

                         window.createImageBitmap.calls.reset();
                         options.flipY = false;
                         return loadImageFromTypedArray(options);
                    })
                    .then(function() {
                        expect(window.createImageBitmap).toHaveBeenCalledWith(blob, {
                            imageOrientation: 'none',
                            premultiplyAlpha: 'none'
                        });
                    });
            });
    });

    it('can load an image when ImageBitmap is not supported', function() {
        if (!supportsImageBitmapOptions) {
            return;
        }

        spyOn(Resource, 'supportsImageBitmapOptions').and.returnValue(when.resolve(false));
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
