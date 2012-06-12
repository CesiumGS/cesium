/*global defineSuite*/
defineSuite([
         'Core/Spherical',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         Spherical,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('construct0', function() {
        var v = new Spherical();
        expect(v.clock).toEqual(0);
        expect(v.cone).toEqual(0);
        expect(v.magnitude).toEqual(1.0);
    });

    it('construct1', function() {
        var v = new Spherical(1);
        expect(v.clock).toEqual(1);
        expect(v.cone).toEqual(0);
        expect(v.magnitude).toEqual(1.0);
    });

    it('construct2', function() {
        var v = new Spherical(1, 2);
        expect(v.clock).toEqual(1);
        expect(v.cone).toEqual(2);
        expect(v.magnitude).toEqual(1.0);
    });

    it('construct3', function() {
        var v = new Spherical(1, 2, 3);
        expect(v.clock).toEqual(1);
        expect(v.cone).toEqual(2);
        expect(v.magnitude).toEqual(3);
    });

    it('clone', function() {
        var v = new Spherical(1, 2, 3);
        var w = v.clone();
        expect(v.equals(w)).toBeTruthy();
    });

    it('normalize', function() {
        var v = new Spherical(0, 2, 3).normalize();
        expect(v.clock).toEqual(0);
        expect(v.cone).toEqual(2);
        expect(v.magnitude).toEqual(1);
    });

    it('equalsEpsilon', function() {
        expect(new Spherical(1, 2, 1).equalsEpsilon(new Spherical(1, 2, 1), 0)).toBeTruthy();
        expect(new Spherical(1, 2, 1).equalsEpsilon(new Spherical(1, 2, 2), 1)).toBeTruthy();
        expect(new Spherical(1, 2, 1).equalsEpsilon(new Spherical(1, 2, 3), 1)).toBeFalsy();
    });

    it('toString', function() {
        var v = new Spherical(1, 2, 3);
        expect(v.toString()).toEqual('(1, 2, 3)');
    });

    it('toCartesian', function() {
        var fortyFiveDegrees = Math.PI / 4.0;
        var sixtyDegrees = Math.PI / 3.0;
        var cartesian = new Cartesian3(1.0, Math.sqrt(3.0), -2.0);
        var spherical = new Spherical(sixtyDegrees, fortyFiveDegrees + Math.PI / 2.0, Math.sqrt(8.0));
        expect(cartesian).toEqualEpsilon(Spherical.toCartesian(spherical), CesiumMath.EPSILON15);
    });

    it('fromCartesian', function() {
        var fortyFiveDegrees = Math.PI / 4.0;
        var sixtyDegrees = Math.PI / 3.0;
        var cartesian = new Cartesian3(1.0, Math.sqrt(3.0), -2.0);
        var spherical = new Spherical(sixtyDegrees, fortyFiveDegrees + Math.PI / 2.0, Math.sqrt(8.0));
        expect(spherical).toEqualEpsilon(Spherical.fromCartesian3(cartesian), CesiumMath.EPSILON15);
    });
});