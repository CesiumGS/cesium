/*global defineSuite*/
defineSuite([
        'Core/NearFarScalar',
        'Specs/createPackableSpecs'
    ], function(
        NearFarScalar,
        createPackableSpecs) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructs without arguments', function() {
        var scalar = new NearFarScalar();
        expect(scalar.near).toEqual(0.0);
        expect(scalar.nearValue).toEqual(0.0);
        expect(scalar.far).toEqual(1.0);
        expect(scalar.farValue).toEqual(0.0);
    });

    it('constructs with arguments', function() {
        var scalar = new NearFarScalar(1.0, 1.0, 1.0e6, 0.5);
        expect(scalar.near).toEqual(1.0);
        expect(scalar.nearValue).toEqual(1.0);
        expect(scalar.far).toEqual(1.0e6);
        expect(scalar.farValue).toEqual(0.5);
    });

    it('clone with a result parameter', function() {
        var scalar = new NearFarScalar(1.0, 2.0, 3.0, 4.0);
        var result = new NearFarScalar();
        var returnedResult = NearFarScalar.clone(scalar, result);
        expect(scalar).toNotBe(result);
        expect(result).toBe(returnedResult);
        expect(scalar).toEqual(result);
    });

    it('clone without a result parameter', function() {
        var scalar = new NearFarScalar(1.0, 2.0, 3.0, 4.0);
        var result = NearFarScalar.clone(scalar);
        expect(scalar).toNotBe(result);
        expect(scalar).toEqual(result);
    });

    it('clone works with "this" result parameter', function() {
        var scalar = new NearFarScalar(1.0, 2.0, 3.0, 4.0);
        var returnedResult = NearFarScalar.clone(scalar, scalar);
        expect(scalar).toBe(returnedResult);
    });

    createPackableSpecs(NearFarScalar, new NearFarScalar(1, 2, 3, 4), [1, 2, 3, 4]);
});
