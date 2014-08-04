/*global defineSuite*/
defineSuite([
        'Core/Oct',
        'Core/Cartesian2',
        'Core/Cartesian3'
    ], function(
        Oct,
        Cartesian2,
        Cartesian3) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var negativeUnitZ = new Cartesian3(0.0, 0.0, -1.0);
    it('oct decode(0, 0)', function() {
        var result = new Cartesian3();
        Oct.decode(0, 0, result);
        expect(result).toEqual(negativeUnitZ);
    });

    it('oct encode(0, 0, -1)', function() {
        var result = new Cartesian2();
        Oct.encode(negativeUnitZ, result);
        expect(result).toEqual(new Cartesian2(255, 255));
    });

    it('oct encode(0, 0, 1)', function() {
        var result = new Cartesian2();
        Oct.encode(Cartesian3.UNIT_Z, result);
        expect(result).toEqual(new Cartesian2(128, 128));
    });

    it('oct extents are equal', function() {
        var result = new Cartesian3();
        // lower left
        Oct.decode(0, 0, result);
        expect(result).toEqual(negativeUnitZ);
        // lower right
        Oct.decode(255, 0, result);
        expect(result).toEqual(negativeUnitZ);
        // upper right
        Oct.decode(255, 255, result);
        expect(result).toEqual(negativeUnitZ);
        // upper left
        Oct.decode(255, 0, result);
        expect(result).toEqual(negativeUnitZ);
    });

    it('throws oct encode vector undefined', function() {
        var vector;
        var result = new Cartesian3();
        expect(function() {
            Oct.encode(vector, result);
        }).toThrowDeveloperError();
    });

    it('throws oct encode result undefined', function() {
        var result;
        expect(function() {
            Oct.encode(Cartesian3.UNIT_Z, result);
        }).toThrowDeveloperError();
    });

    it('throws oct encode non unit vector', function() {
        var nonUnitLengthVector = new Cartesian3(2.0, 0.0, 0.0);
        var result = new Cartesian2();
        expect(function() {
            Oct.encode(nonUnitLengthVector, result);
        }).toThrowDeveloperError();
    });

    it('throws oct encode zero length vector', function() {
        var result = new Cartesian2();
        expect(function() {
            Oct.encode(Cartesian3.ZERO, result);
        }).toThrowDeveloperError();
    });

    it('throws oct decode result undefined', function() {
        var result;
        expect(function() {
            Oct.decode(Cartesian2.ZERO, result);
        }).toThrowDeveloperError();
    });

    it('throws oct decode x out of bounds', function() {
        var result = new Cartesian3();
        var invalidSNorm = new Cartesian2(256, 0);
        expect(function() {
            Oct.decode(invalidSNorm, result);
        }).toThrowDeveloperError();
    });

    it('throws oct decode y out of bounds', function() {
        var result = new Cartesian3();
        var invalidSNorm = new Cartesian2(0, 256);
        expect(function() {
            Oct.decode(invalidSNorm, result);
        }).toThrowDeveloperError();
    });

});
