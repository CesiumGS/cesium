/*global defineSuite*/
defineSuite([
         'Core/Ray',
         'Core/Cartesian3'
     ], function(
         Ray,
         Cartesian3) {
    "use strict";
    /*global it,expect*/

    it('constructor throws without a position', function() {
        expect(function() {
            return new Ray();
        }).toThrow();
    });

    it('constructor throws without a direction', function() {
        expect(function() {
            return new Ray(Cartesian3.ZERO);
        });
    });

    it('constructor', function() {
        var origin = Cartesian3.ZERO;
        var direction = Cartesian3.UNIT_X;
        var ray = new Ray(origin, direction);
        expect(ray.origin.equals(origin)).toEqual(true);
        expect(ray.direction.equals(direction)).toEqual(true);
    });

    it('get point along ray', function() {
        var t = 5.0;
        var ray = new Ray(Cartesian3.ZERO, Cartesian3.UNIT_X);
        expect(ray.getPoint(t).equals(Cartesian3.UNIT_X.multiplyByScalar(t))).toEqual(true);
    });
});