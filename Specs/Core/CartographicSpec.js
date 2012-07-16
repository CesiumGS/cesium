/*global defineSuite*/
defineSuite([
         'Core/Cartographic'
     ], function(
         Cartographic) {
    "use strict";
    /*global it,expect*/

    it('default constructor sets expected properties', function() {
        var c = new Cartographic();
        expect(c.longitude).toEqual(0);
        expect(c.latitude).toEqual(0);
        expect(c.height).toEqual(0);
    });

    it('constructor sets expected properties from parameters', function() {
        var c = new Cartographic(1.0, 2.0, 3.0);
        expect(c.longitude).toEqual(1);
        expect(c.latitude).toEqual(2);
        expect(c.height).toEqual(3);
    });

    it('fromDegrees sets expected default properties', function() {
        var c = Cartographic.fromDegrees();
        expect(c.longitude).toEqual(0);
        expect(c.latitude).toEqual(0);
        expect(c.height).toEqual(0);
    });

    it('fromDegrees works without a result parameter', function() {
        var c = Cartographic.fromDegrees(90.0, 45.0, 100.0);
        expect(c.longitude).toEqual(Math.PI/2);
        expect(c.latitude).toEqual(Math.PI/4);
        expect(c.height).toEqual(100);
    });

    it('fromDegrees works with a result parameter', function() {
        var result = new Cartographic();
        var c = Cartographic.fromDegrees(90.0, 45.0, 100.0, result);
        expect(result).toBe(c);
        expect(c.longitude).toEqual(Math.PI/2);
        expect(c.latitude).toEqual(Math.PI/4);
        expect(c.height).toEqual(100);
    });

    it('clone without a result parameter', function() {
        var cartographic = new Cartographic(1.0, 2.0, 3.0);
        var result = cartographic.clone();
        expect(cartographic).toNotBe(result);
        expect(cartographic).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var cartographic = new Cartographic(1.0, 2.0, 3.0);
        var result = new Cartographic();
        var returnedResult = cartographic.clone(result);
        expect(cartographic).toNotBe(result);
        expect(result).toBe(returnedResult);
        expect(cartographic).toEqual(result);
    });

    it('clone works with "this" result parameter', function() {
        var cartographic = new Cartographic(1.0, 2.0, 3.0);
        var returnedResult = cartographic.clone(cartographic);
        expect(cartographic).toBe(returnedResult);
    });

    it('equals', function() {
        var cartographic = new Cartographic(1.0, 2.0, 3.0);
        expect(cartographic.equals(new Cartographic(1.0, 2.0, 3.0))).toEqual(true);
        expect(cartographic.equals(new Cartographic(2.0, 2.0, 3.0))).toEqual(false);
        expect(cartographic.equals(new Cartographic(2.0, 1.0, 3.0))).toEqual(false);
        expect(cartographic.equals(new Cartographic(1.0, 2.0, 4.0))).toEqual(false);
        expect(cartographic.equals(undefined)).toEqual(false);
    });

    it('equalsEpsilon', function() {
        var cartographic = new Cartographic(1.0, 2.0, 3.0);
        expect(cartographic.equalsEpsilon(new Cartographic(1.0, 2.0, 3.0), 0.0)).toEqual(true);
        expect(cartographic.equalsEpsilon(new Cartographic(1.0, 2.0, 3.0), 1.0)).toEqual(true);
        expect(cartographic.equalsEpsilon(new Cartographic(2.0, 2.0, 3.0), 1.0)).toEqual(true);
        expect(cartographic.equalsEpsilon(new Cartographic(1.0, 3.0, 3.0), 1.0)).toEqual(true);
        expect(cartographic.equalsEpsilon(new Cartographic(1.0, 2.0, 4.0), 1.0)).toEqual(true);
        expect(cartographic.equalsEpsilon(new Cartographic(2.0, 2.0, 3.0), 0.99999)).toEqual(false);
        expect(cartographic.equalsEpsilon(new Cartographic(1.0, 3.0, 3.0), 0.99999)).toEqual(false);
        expect(cartographic.equalsEpsilon(new Cartographic(1.0, 2.0, 4.0), 0.99999)).toEqual(false);
        expect(cartographic.equalsEpsilon(undefined, 1)).toEqual(false);
    });

    it('toString', function() {
        var cartographic = new Cartographic(1.123, 2.345, 6.789);
        expect(cartographic.toString()).toEqual('(1.123, 2.345, 6.789)');
    });

    it('static clone throws without cartographic parameter', function() {
        expect(function() {
            Cartographic.clone(undefined);
        }).toThrow();
    });

    it('static toString throws without cartographic parameter', function() {
        expect(function() {
            Cartographic.toString(undefined);
        }).toThrow();
    });

    it('equalsEpsilon throws without numeric epsilon', function() {
        expect(function() {
            Cartographic.equalsEpsilon(new Cartographic(), new Cartographic(), {});
        }).toThrow();
    });
});
