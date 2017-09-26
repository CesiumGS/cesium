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

    var previous;
    beforeEach(function() {
        previous = getStringFromTypedArray.decode;
    });

    afterEach(function() {
        getStringFromTypedArray.decode = previous;
    });

    it('converts a typed array to string', function() {
        verifyString();
    });

    it('converts a typed array to string when forced to use fromCharCode', function() {
        getStringFromTypedArray.decode = getStringFromTypedArray.decodeWithFromCharCode;

        verifyString();
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

    it('Unicode characters work', function() {
        var arr = new Uint8Array([90, 195, 188, 114, 105, 99, 104]);
        expect(getStringFromTypedArray(arr, 0, arr.length)).toEqual('Zürich');
    });

    it('Unicode characters work with decodeWithFromCharCode forced', function() {
        getStringFromTypedArray.decode = getStringFromTypedArray.decodeWithFromCharCode;

        var arr = new Uint8Array([90, 195, 188, 114, 105, 99, 104]);
        expect(getStringFromTypedArray(arr, 0, arr.length)).toEqual('Zürich');
    });
});
