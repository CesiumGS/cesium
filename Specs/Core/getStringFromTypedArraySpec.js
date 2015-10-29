/*global defineSuite */
defineSuite([
        'Core/getStringFromTypedArray'
    ], function(
        getStringFromTypedArray) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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

    it('throws without array', function() {
        expect(function() {
            getStringFromTypedArray();
        }).toThrowDeveloperError();
    });
});