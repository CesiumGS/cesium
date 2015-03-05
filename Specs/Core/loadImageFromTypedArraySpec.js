/*global defineSuite*/
defineSuite([
        'Core/loadImageFromTypedArray',
        'Core/defined',
        'Core/loadArrayBuffer',
        'ThirdParty/when',
        'Specs/waitsForPromise'
    ], function(
        loadImageFromTypedArray,
        defined,
        loadArrayBuffer,
        when,
        waitsForPromise) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('can load an image', function() {
        waitsForPromise(loadArrayBuffer('./Data/Images/Blue10x10.png'), function(arrayBuffer) {
            var imagePromise = loadImageFromTypedArray(arrayBuffer, 0, arrayBuffer.byteLength, 'image/png');
            waitsForPromise(imagePromise, function(image) {
                expect(image.width).toEqual(10);
                expect(image.height).toEqual(10);
            });
        });
    });

    it('can not load an invalid image', function() {
        var notApng = new Uint8Array([67, 101, 115, 105, 117, 109]);
        waitsForPromise.toReject(loadImageFromTypedArray(notApng, 0, notApng.byteLength, 'image/png'));
    });

    it('Throws without buffer', function() {
        expect(function() {
            loadImageFromTypedArray();
        }).toThrowDeveloperError();
    });

    it('Throws without byteOffset', function() {
        var buffer = new Uint8Array();
        expect(function() {
            loadImageFromTypedArray(buffer);
        }).toThrowDeveloperError();
    });

    it('Throws without length', function() {
        var buffer = new Uint8Array();
        expect(function() {
            loadImageFromTypedArray(buffer, 0);
        }).toThrowDeveloperError();
    });

    it('Throws without format', function() {
        var buffer = new Uint8Array();
        expect(function() {
            loadImageFromTypedArray(buffer, 0, buffer.byteLength);
        }).toThrowDeveloperError();
    });
});
