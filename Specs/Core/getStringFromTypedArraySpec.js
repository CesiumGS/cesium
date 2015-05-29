/*global defineSuite */
defineSuite([
        'Core/getStringFromTypedArray'
    ], function(
            getStringFromTypedArray) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function verifyString() {
        var buffer = new Uint8Array([67, 101, 115, 105, 117, 109]);
        var string = getStringFromTypedArray(buffer, 0, 6);
        expect(string).toEqual('Cesium');
        expect(getStringFromTypedArray(new Uint8Array(), 0, 0)).toEqual('');
    }

    it('Returns a string', function() {
        verifyString();
    });

    it('Returns a string with fromCharCode', function() {
        var previous = getStringFromTypedArray.decode;
        getStringFromTypedArray.decode = getStringFromTypedArray.decodeWithFromCharCode;

        verifyString();

        getStringFromTypedArray.decode = previous;
    });

    it('Throws without buffer', function() {
        expect(function() {
            getStringFromTypedArray();
        }).toThrowDeveloperError();
    });

    it('Throws without byteOffset', function() {
        var buffer = new Uint8Array();
        expect(function() {
            getStringFromTypedArray(buffer);
        }).toThrowDeveloperError();
    });

    it('Throws without length', function() {
        var buffer = new Uint8Array();
        expect(function() {
            getStringFromTypedArray(buffer, 0);
        }).toThrowDeveloperError();
    });
});