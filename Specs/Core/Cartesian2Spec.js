/*global defineSuite*/
defineSuite(['Core/Cartesian2'], function(Cartesian2) {
    "use strict";
    /*global it,expect*/

    it('construct0', function() {
        var v = new Cartesian2();
        expect(v.x).toEqual(0);
        expect(v.y).toEqual(0);
    });

    it('construct1', function() {
        var v = new Cartesian2(1);
        expect(v.x).toEqual(1);
        expect(v.y).toEqual(0);
    });

    it('construct2', function() {
        var v = new Cartesian2(1, 2);
        expect(v.x).toEqual(1);
        expect(v.y).toEqual(2);
    });

    it('clone', function() {
        var v = new Cartesian2(1, 2);
        var w = v.clone();
        expect(v.equals(w)).toEqual(true);
    });

    it('non-prototypal clone', function() {
        var v = new Cartesian2(1, 2);
        var w = Cartesian2.clone(v);
        expect(v.equals(w)).toEqual(true);
    });

    it('ZERO', function() {
        var v = Cartesian2.ZERO;
        expect(v.x).toEqual(0);
        expect(v.y).toEqual(0);
    });

    it('UNIT_X', function() {
        var v = Cartesian2.UNIT_X;
        expect(v.x).toEqual(1);
        expect(v.y).toEqual(0);
    });

    it('UNIT_Y', function() {
        var v = Cartesian2.UNIT_Y;
        expect(v.x).toEqual(0);
        expect(v.y).toEqual(1);
    });

    it('magnitudeSquared', function() {
        var v = new Cartesian2(2, 3);
        expect(v.magnitudeSquared()).toEqual(13);
    });

    it('magnitude', function() {
        var v = new Cartesian2(2, 3);
        expect(v.magnitude()).toEqual(Math.sqrt(13));
    });

    it('normalize', function() {
        var v = new Cartesian2(2, 0).normalize();
        expect(v.x).toEqual(1);
        expect(v.y).toEqual(0);
    });

    it('dot', function() {
        var s = new Cartesian2(2, 3).dot(new Cartesian2(4, 5));
        expect(s).toEqual(2 * 4 + 3 * 5);
    });

    it('add', function() {
        var v = new Cartesian2(1, 2).add(new Cartesian2(3, 4));
        expect(v.equals(new Cartesian2(4, 6))).toEqual(true);
    });

    it('multiplyWithScalar', function() {
        var v = new Cartesian2(1, 2).multiplyWithScalar(2);
        expect(v.equals(new Cartesian2(2, 4))).toEqual(true);
    });

    it('divideByScalar', function() {
        var v = new Cartesian2(2, 4).divideByScalar(2);
        expect(v.equals(new Cartesian2(1, 2))).toEqual(true);
    });

    it('negate', function() {
        var v = new Cartesian2(1, 2).negate();
        expect(v.equals(new Cartesian2(-1, -2))).toEqual(true);
    });

    it('abs', function() {
        var v = new Cartesian2(-1, -2).abs();
        expect(v.equals(new Cartesian2(1, 2))).toEqual(true);
    });

    it('subtract', function() {
        var v = new Cartesian2(3, 4).subtract(new Cartesian2(2, 1));
        expect(v.equals(new Cartesian2(1, 3))).toEqual(true);
    });

    it('equalsEpsilon', function() {
        expect(new Cartesian2(1, 2).equalsEpsilon(new Cartesian2(1, 2), 0)).toEqual(true);
        expect(new Cartesian2(1, 2).equalsEpsilon(new Cartesian2(2, 2), 1)).toEqual(true);
        expect(new Cartesian2(1, 2).equalsEpsilon(new Cartesian2(3, 2), 1)).toEqual(false);
    });

    it('toString', function() {
        var v = new Cartesian2(1, 2);
        expect(v.toString()).toEqual('(1, 2)');
    });
});
