/*global defineSuite*/
defineSuite([
        'Core/getStringFromTypedArray'
    ], function(
        getStringFromTypedArray) {
    'use strict';

    function verifyString() {
        var arr = new Uint8Array([67, 101, 115, 105, 117, 109]);
        var string = getStringFromTypedArray(arr);
        expect(string).toEqual('Cesium');

        arr = new Uint8Array();
        string = getStringFromTypedArray(arr);
        expect(string).toEqual('');
    }

    it('converts a typed array to string', function() {
        verifyString();
    });

    it('converts a typed array to string when forced to use fromCharCode', function() {
        var previous = getStringFromTypedArray.decode;
        getStringFromTypedArray.decode = getStringFromTypedArray.decodeWithFromCharCode;

        verifyString();

        getStringFromTypedArray.decode = previous;
    });

    it('converts a sub-region of a typed array to a string', function() {
        var arr = new Uint8Array([67, 101, 115, 105, 117, 109]);
        var string = getStringFromTypedArray(arr, 1, 3);
        expect(string).toEqual('esi');
    });

    it('throws if sub-region exceeds array bounds', function() {
        var arr = new Uint8Array([67, 101, 115, 105, 117, 109]);
        expect(function() {
            getStringFromTypedArray(arr, 3, 4);
        }).toThrowDeveloperError();
    });

    it('throws if byteOffset is negative', function() {
        var arr = new Uint8Array([67, 101, 115, 105, 117, 109]);
        expect(function() {
            getStringFromTypedArray(arr, -1, 0);
        }).toThrowDeveloperError();
    });

    it('throws if byteLength is negative', function() {
        var arr = new Uint8Array([67, 101, 115, 105, 117, 109]);
        expect(function() {
            getStringFromTypedArray(arr, 0, -1);
        }).toThrowDeveloperError();
    });

    it('throws without array', function() {
        expect(function() {
            getStringFromTypedArray();
        }).toThrowDeveloperError();
    });
});
