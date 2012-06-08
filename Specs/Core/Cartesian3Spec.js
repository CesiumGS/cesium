/*global defineSuite*/
defineSuite([
         'Core/Cartesian3',
         'Core/Cartesian2',
         'Core/Math'
     ], function(
         Cartesian3,
         Cartesian2,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('construct0', function() {
        var v = new Cartesian3();
        expect(v.x).toEqual(0);
        expect(v.y).toEqual(0);
        expect(v.z).toEqual(0);
    });

    it('construct1', function() {
        var v = new Cartesian3(1);
        expect(v.x).toEqual(1);
        expect(v.y).toEqual(0);
        expect(v.z).toEqual(0);
    });

    it('construct2', function() {
        var v = new Cartesian3(1, 2);
        expect(v.x).toEqual(1);
        expect(v.y).toEqual(2);
        expect(v.z).toEqual(0);
    });

    it('construct3', function() {
        var v = new Cartesian3(1, 2, 3);
        expect(v.x).toEqual(1);
        expect(v.y).toEqual(2);
        expect(v.z).toEqual(3);
    });

    it('clone', function() {
        var v = new Cartesian3(1, 2, 3);
        var w = v.clone();
        expect(v.equals(w)).toEqual(true);
    });

    it('ZERO', function() {
        var v = Cartesian3.ZERO;
        expect(v.x).toEqual(0);
        expect(v.y).toEqual(0);
        expect(v.z).toEqual(0);
    });

    it('UNIT_X', function() {
        var v = Cartesian3.UNIT_X;
        expect(v.x).toEqual(1);
        expect(v.y).toEqual(0);
        expect(v.z).toEqual(0);
    });

    it('UNIT_Y', function() {
        var v = Cartesian3.UNIT_Y;
        expect(v.x).toEqual(0);
        expect(v.y).toEqual(1);
        expect(v.z).toEqual(0);
    });

    it('UNIT_Z', function() {
        var v = Cartesian3.UNIT_Z;
        expect(v.x).toEqual(0);
        expect(v.y).toEqual(0);
        expect(v.z).toEqual(1);
    });

    it('getXY', function() {
        var v = new Cartesian3(1, 2, 3);
        expect(v.getXY().equals(new Cartesian2(1, 2))).toEqual(true);
        expect(v.z).toEqual(3);
    });

    it('magnitudeSquared', function() {
        var v = new Cartesian3(2, 3, 4);
        expect(v.magnitudeSquared()).toEqual(29);
    });

    it('magnitude', function() {
        var v = new Cartesian3(2, 3, 4);
        expect(v.magnitude()).toEqual(Math.sqrt(29));
    });

    it('normalize', function() {
        var v = new Cartesian3(0, 2, 0).normalize();
        expect(v.x).toEqual(0);
        expect(v.y).toEqual(1);
        expect(v.z).toEqual(0);
    });

    it('cross', function() {
        var c = new Cartesian3(1, 0, 0).cross(new Cartesian3(0, 1, 0));
        expect(c.equals(new Cartesian3(0, 0, 1))).toEqual(true);
    });

    it('dot', function() {
        var s = new Cartesian3(2, 3, 4).dot(new Cartesian3(5, 6, 7));
        expect(s).toEqual(2 * 5 + 3 * 6 + 4 * 7);
    });

    it('add', function() {
        var v = new Cartesian3(1, 2, 3).add(new Cartesian3(4, 5, 6));
        expect(v.equals(new Cartesian3(5, 7, 9))).toEqual(true);
    });

    it('multiplyWithScalar', function() {
        var v = new Cartesian3(1, 2, 3).multiplyWithScalar(2);
        expect(v.equals(new Cartesian3(2, 4, 6))).toEqual(true);
    });

    it('multiplyComponents', function() {
        var v = new Cartesian3(1, 2, 3).multiplyComponents(new Cartesian3(4, 5, 6));
        expect(v.equals(new Cartesian3(4, 10, 18))).toEqual(true);
    });

    it('divideByScalar', function() {
        var v = new Cartesian3(2, 4, 6).divideByScalar(2);
        expect(v.equals(new Cartesian3(1, 2, 3))).toEqual(true);
    });

    it('getMinimumComponent', function() {
        var v = new Cartesian3(1, 2, 3);
        expect(v.getMinimumComponent()).toEqual(1);
    });

    it('getMaximumComponent', function() {
        var v = new Cartesian3(1, 2, 3);
        expect(v.getMaximumComponent()).toEqual(3);
    });

    it('mostOrthogonalAxis', function() {
        expect(new Cartesian3(1, 2, 3).mostOrthogonalAxis().equals(Cartesian3.UNIT_X)).toEqual(true);
        expect(new Cartesian3(3, 1, 2).mostOrthogonalAxis().equals(Cartesian3.UNIT_Y)).toEqual(true);
        expect(new Cartesian3(2, 3, 1).mostOrthogonalAxis().equals(Cartesian3.UNIT_Z)).toEqual(true);
    });

    it('angleBetween', function() {
        var x = Cartesian3.UNIT_X;
        var y = Cartesian3.UNIT_Y;
        expect(x.angleBetween(x)).toEqual(0);
        expect(x.angleBetween(y)).toEqual(CesiumMath.PI_OVER_TWO);
    });

    it('rotateAroundAxis', function() {
        var x = Cartesian3.UNIT_X;
        var z = Cartesian3.UNIT_Z;
        expect(x.rotateAroundAxis(z, CesiumMath.PI_OVER_TWO).equalsEpsilon(Cartesian3.UNIT_Y, CesiumMath.EPSILON14)).toEqual(true);
        expect(x.rotateAroundAxis(z, Math.PI).equalsEpsilon(x.negate(), CesiumMath.EPSILON14)).toEqual(true);
    });

    it('negate', function() {
        var v = new Cartesian3(1, 2, 3).negate();
        expect(v.equals(new Cartesian3(-1, -2, -3))).toEqual(true);
    });

    it('abs', function() {
        var v = new Cartesian2(-1, -2, -3).abs();
        expect(v.equals(new Cartesian2(1, 2, 3))).toEqual(true);
    });

    it('subtract', function() {
        var v = new Cartesian3(3, 4, 5).subtract(new Cartesian3(3, 2, 1));
        expect(v.equals(new Cartesian3(0, 2, 4))).toEqual(true);
    });

    it('lerp', function() {
        var v = new Cartesian3(4, 8, 12).lerp(new Cartesian3(8, 20, 16), 0.25);
        expect(v.equals(new Cartesian3(5, 11, 13))).toEqual(true);
    });

    it('equalsEpsilon', function() {
        expect(new Cartesian3(1, 2, 1).equalsEpsilon(new Cartesian3(1, 2, 1), 0)).toEqual(true);
        expect(new Cartesian3(1, 2, 1).equalsEpsilon(new Cartesian3(1, 2, 2), 1)).toEqual(true);
        expect(new Cartesian3(1, 2, 1).equalsEpsilon(new Cartesian3(1, 2, 3), 1)).toEqual(false);
    });

    it('toString', function() {
        var v = new Cartesian3(1, 2, 3);
        expect(v.toString()).toEqual('(1, 2, 3)');
    });
});