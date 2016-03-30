/*global defineSuite*/
defineSuite([
        'Core/loadImageFromTypedArray',
        'Core/defined',
        'Core/loadArrayBuffer',
        'ThirdParty/when'
    ], function(
        loadImageFromTypedArray,
        defined,
        loadArrayBuffer,
        when) {
    'use strict';

    it('can load an image', function() {
        return loadArrayBuffer('./Data/Images/Blue10x10.png').then(function(arrayBuffer) {
            var arr = new Uint8Array(arrayBuffer);
            return loadImageFromTypedArray(arr, 'image/png').then(function(image) {
                expect(image.width).toEqual(10);
                expect(image.height).toEqual(10);
            });
        });
    });

    it('can not load an invalid image', function() {
        var notApng = new Uint8Array([67, 101, 115, 105, 117, 109]);
        return loadImageFromTypedArray(notApng, 'image/png').then(function(image) {
            fail('should not be called');
        }).otherwise(function() {
        });
    });

    it('Throws without array', function() {
        expect(function() {
            loadImageFromTypedArray();
        }).toThrowDeveloperError();
    });

    it('Throws without format', function() {
        expect(function() {
            loadImageFromTypedArray(new Uint8Array());
        }).toThrowDeveloperError();
    });
});
