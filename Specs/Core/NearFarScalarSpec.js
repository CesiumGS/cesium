/*global defineSuite*/
defineSuite(['Core/NearFarScalar'], function(NearFarScalar) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructs without arguments', function() {
        var scalar = new NearFarScalar();
        expect(scalar.nearDistance).toEqual(0.0);
        expect(scalar.nearValue).toEqual(0.0);
        expect(scalar.farDistance).toEqual(1.0);
        expect(scalar.farValue).toEqual(0.0);
    });

    it('constructs with arguments', function() {
        var scalar = new NearFarScalar(1.0, 1.0, 1.0e6, 0.5);
        expect(scalar.nearDistance).toEqual(1.0);
        expect(scalar.nearValue).toEqual(1.0);
        expect(scalar.farDistance).toEqual(1.0e6);
        expect(scalar.farValue).toEqual(0.5);
    });

    it('fromArray creates a NearFarScalar', function() {
        var scalar = NearFarScalar.fromArray([1.0, 2.0, 3.0, 4.0]);
        expect(scalar).toEqual(new NearFarScalar(1.0, 2.0, 3.0, 4.0));
    });

    it('fromArray with an offset creates a NearFarScalar', function() {
        var scalar = NearFarScalar.fromArray([0.0, 1.0, 2.0, 3.0, 4.0, 0.0], 1);
        expect(scalar).toEqual(new NearFarScalar(1.0, 2.0, 3.0, 4.0));
    });

    it('fromArray creates a NearFarScalar with a result parameter', function() {
        var scalar = new NearFarScalar();
        var result = NearFarScalar.fromArray([1.0, 2.0, 3.0, 4.0], 0, scalar);
        expect(result).toBe(scalar);
        expect(result).toEqual(new NearFarScalar(1.0, 2.0, 3.0, 4.0));
    });

    it('fromArray throws without values', function() {
        expect(function() {
            NearFarScalar.fromArray();
        }).toThrow();
    });

    it('fromArray throws with an invalid offset', function() {
        expect(function() {
            NearFarScalar.fromArray([0.0, 0.0, 0.0, 0.0], 1);
        }).toThrow();
    });

    it('clone without a result parameter', function() {
        var scalar = new NearFarScalar(1.0, 2.0, 3.0, 4.0);
        var result = scalar.clone();
        expect(scalar).toNotBe(result);
        expect(scalar).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var scalar = new NearFarScalar(1.0, 2.0, 3.0);
        var result = new NearFarScalar();
        var returnedResult = scalar.clone(result);
        expect(scalar).toNotBe(result);
        expect(result).toBe(returnedResult);
        expect(scalar).toEqual(result);
    });

    it('clone works with "this" result parameter', function() {
        var scalar = new NearFarScalar(1.0, 2.0, 3.0);
        var returnedResult = scalar.clone(scalar);
        expect(scalar).toBe(returnedResult);
    });

    it('static equalsEpsilon throws with no epsilon', function() {
        expect(function() {
            NearFarScalar.equalsEpsilon(new NearFarScalar(), new NearFarScalar(), undefined);
        }).toThrow();
    });


    it('fromElements returns a NearFarScalar with corrrect coordinates', function(){
        var scalar = NearFarScalar.fromElements(2, 2, 4, 4);
        var expectedResult = new NearFarScalar(2, 2, 4, 4);
        expect(scalar).toEqual(expectedResult);
    });

    it('fromElements result param returns NearFarScalar with correct coordinates', function(){
        var scalar = new NearFarScalar();
        NearFarScalar.fromElements(2, 2, 4, 4, scalar);
        var expectedResult = new NearFarScalar(2, 2, 4, 4);
        expect(scalar).toEqual(expectedResult);
    });

});